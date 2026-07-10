const { sendInProgressGameUpdate } = require("../util");
const { completeGame } = require("./end-game");
const { startElection, shufflePolicies } = require("./common");
const { clearFlappyTimers } = require("./flappy-timers");
const { games } = require("../models");
const _ = require("lodash");

const FLAPPY_CONFIG = {
  tickMs: 50,
  // a "get ready" countdown before physics/pipes begin, so pilots (especially first-timers
  // who don't yet know they must flap) can orient before the birds start falling
  countdownMs: 3000,
  spawnMs: 1950,
  gravity: 0.4,
  flapVelocity: -5.5,
  maxFallVelocity: 8,
  laneHeight: 220,
  laneWidth: 750,
  birdX: 60,
  birdWidth: 34,
  birdHeight: 44,
  pylonWidth: 40,
  pylonSpeed: 16,
  gapSize: 140,
  graceMs: 1000,
  // during handoff grace gravity is reduced, not zeroed: the incoming pilot gets time to
  // orient but keeps descent control (zero gravity was an altitude lock that killed
  // skilled play when the next gap was below the bird)
  graceGravityMult: 0.4,
};

let pylonIdCounter = 0;

const graceTickCount = () => Math.round(FLAPPY_CONFIG.graceMs / FLAPPY_CONFIG.tickMs);

// takes the game's live config: difficulty escalation grows the bird mid-game, and a
// reset bird should center by its current size, not the base size
const newBird = (config = FLAPPY_CONFIG) => ({
  y: config.laneHeight / 2 - config.birdHeight / 2,
  velocity: 0,
  alive: true,
  // an untouched bird flies straight for graceMs after a fresh pair of hands takes over
  graceTicks: graceTickCount(),
});

// level flight for graceMs so a pilot who just received the bird mid-flight can orient;
// ends early the moment they flap
const grantHandoffGrace = (bird) => {
  bird.velocity = 0;
  bird.graceTicks = graceTickCount();
};

// wholesale engine discard for ERROR-RECOVERY paths only: timers, public state, and
// private control/continuation all go. The orderly terminal paths intentionally differ
// and keep their own teardown: finishFlappy keeps flappyState as the client's end
// screen (dropEngineLeftovers), cancelFlappy consumes preFlappy before nulling, and
// cleanupFlappy keeps the state husk but settles status. Don't unify them blindly.
const discardFlappyEngine = (game) => {
  clearFlappyTimers(game);
  game.flappyState = null;
  game.private.flappyControl = null;
  game.private.preFlappy = null;
};

// "this game is over and no timer may touch it": deleted/replaced in the registry,
// remade, or completed (mod force-end). The single definition every self-rescheduling
// flappy timer uses - if "settled" ever gains another terminal flag, add it HERE.
const isGameSettled = (game) => games[game.general.uid] !== game || game.general.isRemade || game.gameState.isCompleted;

// shared liveness check for every flappy timer/tick entry point: external transitions
// (mod force-end, remake, full abandonment, table deletion/replacement) must stop the
// engine, not be played through. Freezing is handled separately - it pauses rather
// than kills. Stricter than !isGameSettled: abandonment kills liveness here but does
// NOT settle a game (a decided game still completes while abandoned).
const isFlappyGameLive = (game) => Boolean(!isGameSettled(game) && !game.general.timeAbandoned);

// one place for the display-name mapping so a transposed ternary can't flip a
// win announcement
const teamLabel = (team) => (team === "fascist" ? "Fascists" : "Liberals");

const livingTeamMembers = (game, team) =>
  game.private.seatedPlayers
    .filter(
      (player, i) =>
        player.role &&
        player.role.team === team &&
        !game.publicPlayersState[i].isDead &&
        !game.publicPlayersState[i].leftGame
    )
    .map((player) => player.userName);

const controllerRole = (game, userName) => {
  const player = game.private.seatedPlayers.find((p) => p.userName === userName);

  return player && player.role ? { cardName: player.role.cardName, icon: player.role.icon } : null;
};

// Visibility model: until a bird clears the first gate ("locked in"), pilot identities are
// secret so a cancelled flappy leaks nothing into the resumed game. Controller truth
// therefore lives in game.private.flappyControl (stripped by secureGame); the public
// flappyState only carries names/roles once lockedIn, when flappy is guaranteed to end
// the game and reveal everything anyway.
//
// This public mirror is NOT redundant with buildSnapshot reading private control
// directly: game.flappyState itself is the reconnect seed (it rides on gameUpdate)
// and the persisted record of who piloted post-lock. Deleting the mirror would blank
// pilot names for reconnecting clients until the next flappyUpdate and strip them
// from saved games/replays entirely.
const publishControllers = (game) => {
  const { flappyState } = game;
  const control = game.private.flappyControl;

  if (!flappyState.lockedIn) {
    return;
  }

  ["liberal", "fascist"].forEach((team) => {
    flappyState[team].controllerUserName = control[team].controllerUserName;
    flappyState[team].controllerRole = controllerRole(game, control[team].controllerUserName);
  });
};

const buildSnapshot = (game) => {
  const { flappyState } = game;

  const snapshot = {
    type: "snapshot",
    status: flappyState.status,
    // only meaningful while status === "countdown"; drives the canvas "get ready" overlay
    countdownSeconds: flappyState.countdownSecondsShown,
    winningTeam: flappyState.winningTeam,
    lockedIn: flappyState.lockedIn,
    failedAttempts: flappyState.failedAttempts,
    fieldResets: flappyState.fieldResets,
    passedGapCount: flappyState.passedGapCount,
    liberal: { bird: flappyState.liberal.bird },
    fascist: { bird: flappyState.fascist.bird },
    pylons: flappyState.pylons.map((pylon) => ({
      id: pylon.id,
      x: pylon.x,
      gapTop: pylon.gapTop,
      gapBottom: pylon.gapBottom,
      isRotator: pylon.isRotator,
    })),
    config: flappyState.config,
  };

  if (flappyState.lockedIn) {
    ["liberal", "fascist"].forEach((team) => {
      snapshot[team].controllerUserName = flappyState[team].controllerUserName;
      snapshot[team].controllerRole = flappyState[team].controllerRole;
    });
  }

  return snapshot;
};

// per-socket emission: the base snapshot is anonymous; only the two current controllers
// get a private youControl flag so their client can show "you're in control" and their
// own cardback. Room-wide emits would leak identity on the wire.
//
// NOTE(perf): this JSON-encodes the snapshot once per socket per tick (~20/s x N
// sockets) instead of once per room, and re-derives the <=2 pilot sockets from every
// socket's passport each tick. The known cheaper design: broadcast the anonymous
// snapshot room-wide once, cache pilot socket ids on controller (re)assignment, and
// push youControl privately only when control changes. DEFERRED DELIBERATELY - that
// design needs a pilot-reconnect re-send hook (today every tick carries youControl,
// so a refreshed pilot self-heals within 50ms; with change-driven control messages a
// rejoining pilot gets nothing until the next rotation unless the room-join path
// learns to re-emit) plus a client-side control-state merge, and reconnect edges are
// where this feature's past regressions lived. Revisit only if spectator-heavy
// tables show tick-loop encode cost in profiling.
const broadcastFlappySnapshot = (game) => {
  const room = io.sockets.adapter.rooms[game.general.uid];

  // flappyState may already be discarded (topdeck ending reuses the shared completion
  // helper after the cancel teardown)
  if (!room || !game.flappyState) {
    return;
  }

  const snapshot = buildSnapshot(game);
  const control = game.private.flappyControl;

  Object.keys(room.sockets).forEach((socketId) => {
    const sock = io.sockets.connected[socketId];

    if (!sock) {
      return;
    }

    // fully guarded: this runs 20x/sec, and one session-less socket throwing every tick
    // would burn the tick-error streak and abort a valid flappy
    const session = sock.handshake && sock.handshake.session;
    const passport = session && session.passport;
    const user = passport && Object.keys(passport).length ? passport.user : null;
    const youControl =
      user && control
        ? user === control.liberal.controllerUserName
          ? "liberal"
          : user === control.fascist.controllerUserName
            ? "fascist"
            : null
        : null;

    sock.emit("flappyUpdate", youControl ? Object.assign({}, snapshot, { youControl }) : snapshot);
  });
};

const pushFlappyChat = (game, chatSegments) => {
  game.chats.push({
    gameChat: true,
    timestamp: new Date(),
    chat: chatSegments,
  });
};

const spawnPylon = (game) => {
  const { flappyState } = game;
  const { laneHeight, gapSize, laneWidth } = flappyState.config;
  const margin = 20;

  // pylons pass in spawn order, so this pylon will be gap number
  // (already passed + still in flight + itself) when cleared. Control rotates on every
  // 3rd passed gap - mark those pylons so the client can draw them in a different color.
  const passOrdinal = flappyState.passedGapCount + flappyState.pylons.filter((pylon) => !pylon.counted).length + 1;

  // the very first gate (the qualification gate, including on attempt resets) gets a
  // little extra clearance. passOrdinal === 1 already implies passedGapCount === 0.
  const effectiveGapSize = gapSize + (passOrdinal === 1 ? 10 : 0);
  const gapTop = margin + Math.floor(Math.random() * (laneHeight - effectiveGapSize - margin * 2));

  flappyState.pylons.push({
    id: `pylon-${pylonIdCounter++}`,
    x: laneWidth,
    gapTop,
    gapBottom: gapTop + effectiveGapSize,
    counted: false,
    isRotator: passOrdinal % 3 === 0,
  });
};

// floorLethal is false during the first-gate window: pre-lock the ground is a skim, not a
// crash (see the clamp in advanceFlappy), so a passive pilot rides the bottom instead of
// dying before the first pylon ever arrives. The lower pylon body still kills, so the
// first gate stays a real skill check. Post-lock the floor is lethal (standard rules).
const birdCollides = (bird, pylons, config, floorLethal) => {
  const { birdX, birdWidth, birdHeight, laneHeight, pylonWidth } = config;

  if (floorLethal && bird.y + birdHeight >= laneHeight) {
    return true;
  }

  return pylons.some(
    (pylon) =>
      birdX + birdWidth > pylon.x &&
      birdX < pylon.x + pylonWidth &&
      (bird.y < pylon.gapTop || bird.y + birdHeight > pylon.gapBottom)
  );
};

const isEligibleController = (game, userName) => {
  const player = game.publicPlayersState.find((p) => p.userName === userName);

  return Boolean(player && !player.isDead && !player.leftGame);
};

const announceControllers = (game) => {
  const control = game.private.flappyControl;

  pushFlappyChat(game, [
    { text: "Control rotates: " },
    { text: "Liberals", type: "liberal" },
    { text: " -> " },
    { text: control.liberal.controllerUserName, type: "player" },
    { text: ", " },
    { text: "Fascists", type: "fascist" },
    { text: " -> " },
    { text: control.fascist.controllerUserName, type: "player" },
    { text: "." },
  ]);
};

// advance a team's controller to the next living, still-present player in its fixed
// rotation order. Returns true if the controller changed.
const advanceController = (game, team) => {
  const control = game.private.flappyControl[team];
  const { controllerOrder } = control;

  if (controllerOrder.length < 2) {
    return false;
  }

  for (let step = 1; step <= controllerOrder.length; step++) {
    const candidateIndex = (control.controllerIndex + step) % controllerOrder.length;
    const candidate = controllerOrder[candidateIndex];

    if (isEligibleController(game, candidate)) {
      const changed = candidate !== control.controllerUserName;

      control.controllerIndex = candidateIndex;
      control.controllerUserName = candidate;
      return changed;
    }
  }

  return false;
};

// (re)arm the pylon spawn timer at the current config rate - difficulty bumps shrink
// spawnMs mid-game, and an interval's delay can't be changed in place
const armSpawnTimer = (game) => {
  if (!game.private.flappyTimers) {
    return;
  }

  if (game.private.flappyTimers.spawn) {
    clearInterval(game.private.flappyTimers.spawn);
  }

  game.private.flappyTimers.spawn = setInterval(() => {
    // guarded: an uncaught throw in a timer reaches the process-level handlers, which
    // exit the server and kill every live game
    try {
      // frozen AND abandoned games pause spawning too - the tick pauses physics in both
      // states, so spawning would stack unmoving pipes at the spawn edge
      if (
        game.flappyState &&
        game.flappyState.status === "running" &&
        !game.gameState.isGameFrozen &&
        !game.general.timeAbandoned
      ) {
        spawnPylon(game);
      }
    } catch (e) {
      console.log(e, "error in flappy spawn timer");
    }
  }, game.flappyState.config.spawnMs)[Symbol.toPrimitive]();
};

// each time every liberal has had a turn at the controls, the game gets harder, cycling
// through four escalations: denser pipes (which also shortens each player's turn),
// smaller gaps, bigger birds, stronger gravity. Floors/caps keep it physically clearable.
const increaseDifficulty = (game) => {
  const { flappyState } = game;
  const config = flappyState.config;

  flappyState.difficultyLevel++;

  switch (flappyState.difficultyLevel % 4) {
    case 1:
      config.spawnMs = Math.max(500, Math.round(config.spawnMs * 0.9));
      // ACCEPTED QUIRK: re-arming discards elapsed spawn progress, so the first pipe
      // of the new cadence arrives up to one full (new) spawnMs late - a one-time
      // breather right after the announcement, which in practice gives pilots a beat
      // to adjust before the denser rhythm starts. setInterval can't change its
      // period in place; preserving the fractional phase isn't worth the machinery.
      armSpawnTimer(game);
      pushFlappyChat(game, [{ text: "Pipes now come 10% faster." }]);
      break;
    case 2:
      config.gapSize = Math.max(config.birdHeight + 30, Math.round(config.gapSize * 0.9));
      pushFlappyChat(game, [{ text: "Pipe gaps are now 10% smaller." }]);
      break;
    case 3: {
      // grow both dimensions 10%, capped so the bird always fits the current gap
      const growth = Math.min(1.1, (config.gapSize - 30) / config.birdHeight);
      config.birdWidth = Math.round(config.birdWidth * growth);
      config.birdHeight = Math.round(config.birdHeight * growth);
      // growth extends the bird downward (y is the top edge) - pull a low-flying bird up
      // so a difficulty tick can't kill it through the floor with no pilot input
      [flappyState.liberal.bird, flappyState.fascist.bird].forEach((bird) => {
        bird.y = Math.min(bird.y, config.laneHeight - config.birdHeight - 1);
      });
      pushFlappyChat(game, [{ text: "Birds have grown larger." }]);
      break;
    }
    default:
      config.gravity = Math.min(0.9, Math.round(config.gravity * 1.1 * 100) / 100);
      pushFlappyChat(game, [{ text: "Gravity is stronger." }]);
      break;
  }
};

// every 3 passed gaps, control of both birds moves to the next living teammate.
// Rotations only occur after lock-in (the first rotation is at gap 3), so they are
// always public.
const rotateFlappyControllers = (game) => {
  const { flappyState } = game;
  const liberalChanged = advanceController(game, "liberal");
  const fascistChanged = advanceController(game, "fascist");

  publishControllers(game);

  if (liberalChanged) {
    grantHandoffGrace(flappyState.liberal.bird);
  }
  if (fascistChanged) {
    grantHandoffGrace(flappyState.fascist.bird);
  }

  if (liberalChanged || fascistChanged) {
    announceControllers(game);
  }
  // (the "next draw passes control" warning is already cleared by the gap-progress
  // block in advanceFlappy, this function's only caller - no reset needed here)

  // count every scheduled rotation (not just ones where the liberal pilot actually
  // changed) so a team with a single living player still drives escalation.
  // INTENTIONAL degeneration: with one living liberal, "every liberal has had a turn"
  // is true at every rotation, so difficulty ramps every 3 gaps - the endgame is
  // supposed to close out fast.
  flappyState.liberalRotationCount++;

  // a full liberal run: every liberal has had a turn and control wraps around.
  // INTENTIONAL: controllerOrder is fixed at flappy start and never pruned - a leaver
  // keeps their slot in this cadence math (rotation just skips them) so the escalation
  // rhythm players learned at the start doesn't lurch mid-race. The cost is that a
  // shrunken team ramps slightly slower than "every LIVING liberal has flown", which
  // is the more forgiving direction to err.
  if (flappyState.liberalRotationCount % game.private.flappyControl.liberal.controllerOrder.length === 0) {
    increaseDifficulty(game);
  }
};

// if a controller leaves the table mid-flappy, hand their bird to the next teammate
// immediately rather than letting it fall until the next scheduled rotation. Before
// lock-in this happens silently (identities are secret); after, it is announced.
// Returns true iff it performed a pre-lock full-field reset, signalling the caller
// (advanceFlappy) to abort the rest of the current tick - the birds and pylons that
// tick was mid-processing have just been replaced/cleared.
const ensureControllersValid = (game) => {
  const control = game.private.flappyControl;
  let changed = false;
  let needsPreLockReset = false;

  ["liberal", "fascist"].forEach((team) => {
    if (!isEligibleController(game, control[team].controllerUserName)) {
      if (advanceController(game, team)) {
        // no PER-BIRD grace pre-lock: one bird visibly leveling off on the same tick a
        // player's public leftGame flag flips would correlate the secret pilot to a
        // seat and reveal their TEAM. (Pre-lock live-bird handoffs get a symmetric
        // full-field reset below instead.) ACCEPTED residual leak: if the leaver was
        // actively flapping, their input simply stopping at leave time is observable
        // regardless - that is inherent to any input-driven game and cannot be masked.
        if (game.flappyState.lockedIn) {
          grantHandoffGrace(game.flappyState[team].bird);
        } else if (game.flappyState[team].bird.alive) {
          // only a LIVE inherited bird warrants a reset - if the departing pilot's
          // bird already crashed, the handoff is nominal (the new pilot just waits
          // for the other lane) and resetting would UNDO a legitimate crash, letting
          // a crashed pilot refund their attempt by leaving the game
          needsPreLockReset = true;
        }
        changed = true;
      }
    }
  });

  if (changed) {
    publishControllers(game);

    if (game.flappyState.lockedIn) {
      announceControllers(game);
      sendInProgressGameUpdate(game);
    } else if (needsPreLockReset) {
      // pre-lock: the incoming pilot must not inherit the leaver's mid-fall bird
      // against in-flight pylons - that near-guarantees a crash and burns one of the
      // team's limited first-gate attempts on a run the new pilot never had a fair
      // shot at. Reset the whole field instead (both birds centered with symmetric
      // grace, pipes cleared, spawn re-armed for a full runway - exactly what a
      // failed-attempt reset does). Anonymity: a SYMMETRIC reset carries no
      // team-identifying signal, unlike per-bird grace; it reveals at most "the
      // leaver was one of the two pilots", which names no team - and it masks the
      // derelict-bird-goes-limp tell better than letting the abandoned bird fall.
      // ACCEPTED TRADE: a live pilot facing an imminent crash could leave the game
      // to refund the run - but leaving a (typically rated) game costs vastly more
      // than one first-gate attempt, and the alternative punishes the innocent
      // incoming teammate instead of the leaver.
      resetFlappyField(game);
      // signal advanceFlappy to abandon the rest of this tick: it computed
      // gapsPassedThisTick and captured bird references against the pre-reset field,
      // both now stale (pylons cleared, bird objects replaced). Consuming either would
      // lock in / decide the game off the wiped field and reveal the incoming pilot.
      return true;
    }
  }

  return false;
};

// standard end-of-game sequence shared by a flappy win and a policy-win cancellation:
// reveal roles, play the win cue, then completeGame.
// NOTE(cleanup): this mirrors the reveal+delayed-complete sequences inlined in
// election.js and policy-powers.js. Extracting a shared helper is a deliberate
// non-goal for this change - those are the two most battle-tested files in the
// codebase and flappy needs extra guards (freeze retry, registry-identity liveness)
// their inline versions don't; unifying them is a standalone refactor.
const endFlappyIntoGameCompletion = (game, winningTeam) => {
  // record the authoritative winner on the game summary BEFORE completion: profile
  // win/loss and enhanced summaries derive the winner from the policy logs, and a
  // flappy outcome (race/coin-flip/topdeck) can contradict the last enacted policy.
  // gameSetting is the same object reference across the builder's immutable updates,
  // so mutating it here is visible to the publish() in saveGame.
  if (game.private.summary && game.private.summary.gameSetting) {
    game.private.summary.gameSetting.flappyWinner = winningTeam;
  }

  game.publicPlayersState.forEach((player, i) => {
    player.cardStatus.cardFront = "secretrole";
    player.cardStatus.cardBack = game.private.seatedPlayers[i].role;
    player.cardStatus.cardDisplayed = true;
    player.cardStatus.isFlipped = false;
  });

  // the standard win fanfare plays for EVERY flappy ending, including coin-flip and
  // deck-decides - intentional: it's the same cue every other game ending plays, and
  // a decided game is a decided game regardless of how the winner was picked
  game.gameState.audioCue = winningTeam === "liberal" ? "liberalsWin" : "fascistsWin";

  // arm completion BEFORE the fallible broadcasts below: the flappy timers are already
  // cleared by this point, so if a broadcast threw after arming failed, nothing would
  // ever complete the game
  // drop the live-engine leftovers so the persisted game record doesn't carry the
  // roster or the resume closure - called only on terminal exits, never on a
  // freeze-retry re-arm
  const dropEngineLeftovers = () => {
    if (game.flappyState) {
      game.flappyState.isActive = false;
    }
    game.private.flappyControl = null;
    game.private.preFlappy = null;
  };

  const completeWhenReady = () => {
    // guarded: an uncaught throw in a timer reaches the process-level handlers, which
    // exit the server and kill every live game
    try {
      // the table may have been remade, force-ended, or deleted during the reveal
      // delay - completing it again would re-record/re-rate an already-settled game.
      // Abandonment deliberately does NOT block this: the winner was already decided
      // when finishFlappy ran, and a decided game must be recorded even if everyone
      // walked out during the 2s reveal (matching the normal win paths, which have no
      // abandonment guard at all).
      if (isGameSettled(game)) {
        dropEngineLeftovers();
        return;
      }

      // a moderator freeze pauses completion too, consistent with every other flappy
      // critical section - retry until unfrozen or dead. INTENTIONALLY not registered
      // in flappyTimers: clearFlappyTimers runs on teardown paths and killing this
      // timer would orphan a DECIDED game unrecorded; the registry-identity guard
      // above self-terminates the retry within one 2s cycle of deletion.
      if (game.gameState.isGameFrozen) {
        setTimeout(completeWhenReady, 2000);
        return;
      }

      game.publicPlayersState.forEach((player) => {
        player.cardStatus.isFlipped = true;
      });
      game.gameState.audioCue = "";
      completeGame(game, winningTeam);
      dropEngineLeftovers();
    } catch (e) {
      console.log(e, "error completing flappy game");
      dropEngineLeftovers();
    }
  };

  setTimeout(completeWhenReady, process.env.NODE_ENV === "development" ? 100 : 2000);

  sendInProgressGameUpdate(game);
  broadcastFlappySnapshot(game);
};

// the deck decides: topdeck one policy on the 4-5 board, which ends the game for
// whichever team's policy it is. This is the ending for a match-point flappy whose
// pilots refused/failed the first gate - the alternative (resuming normal play) gave
// the choice-to-crash an asymmetric payoff, since a resumed 4-5 board favors fascists
// (the Hitler-zone chancellor route is live).
const topDeckDecides = (game) => {
  if (game.private.policies.length < 1) {
    shufflePolicies(game);
  }

  // defensive: a pathological hand-crafted custom deck can be fully spent even after
  // the reshuffle above - fall back to a coin flip rather than enacting `undefined`
  // (NaN track count, undefined winner). Unreachable with a standard 17-card deck
  // (8 cards remain in circulation at a 4-5 board).
  const policy = game.private.policies.shift() || (Math.random() < 0.5 ? "liberal" : "fascist");

  if (game.gameState.undrawnPolicyCount > 0) {
    game.gameState.undrawnPolicyCount--;
  }
  game.trackState[`${policy}PolicyCount`]++;
  game.trackState.enactedPolicies.push({
    position: `${policy}${game.trackState[`${policy}PolicyCount`]}`,
    cardBack: policy,
    isFlipped: true,
  });

  pushFlappyChat(game, [
    { text: "The deck decides: a " },
    { text: policy, type: policy },
    { text: " policy is enacted." },
  ]);
  // no "X win the game." push here - completeGame (via endFlappyIntoGameCompletion)
  // pushes the standard winner line itself; a second copy printed every line twice
  game.general.status = `FLAPPY HITLER: ${teamLabel(policy)} win`;

  // cancelFlappy deliberately left flappyState alive on this path - mark it finished
  // with the deck's winner so connected clients get the end overlay and anyone who
  // refreshes post-game gets a terminal render seed instead of a blank canvas
  if (game.flappyState) {
    game.flappyState.status = "finished";
    game.flappyState.winningTeam = policy;
  }

  endFlappyIntoGameCompletion(game, policy);
};

// abort flappy after all first-gate attempts fail. Nothing identifying was ever shown
// or sent, so nothing leaks. A match-point flappy ends immediately by topdeck (the deck
// decides the 4-5 board); a /forceflappy returns to normal play. A genuine match-point
// cancellation (not an abandonment) also burns the automatic trigger.
const cancelFlappy = (game, reasonText) => {
  const pre = game.private.preFlappy;
  const isMatchPointEnding = Boolean(pre && pre.fromMatchPoint && !game.general.timeAbandoned);

  clearFlappyTimers(game);
  // only a genuinely failed MATCH-POINT flappy burns the automatic trigger. Not an
  // abandonment cancel - that table never used its event, and if it's rejoined the
  // flappy should still be available. Not a cancelled admin /forceflappy - that
  // shouldn't disable the event the flappyMode game is built around.
  if (isMatchPointEnding) {
    game.general.flappyCancelled = true;
  }

  game.private.flappyControl = null;

  if (game.flappyState) {
    game.flappyState.isActive = false;
    if (isMatchPointEnding) {
      // topdeck ending: the game ends right now, still in the flappyHitler phase, so
      // flappyState must SURVIVE this cancel - topDeckDecides marks it finished with a
      // winner, which is both the end overlay for connected clients and the render
      // seed for anyone who refreshes after completion (a nulled seed would strand
      // them on the waiting-for-server screen)
    } else {
      // restore paths: broadcast a terminal snapshot so clients stop their render
      // loop, then remove the state entirely - it rides on every gameUpdate via
      // secureGame, and a resumed hidden-role game must carry no flappy leftovers
      game.flappyState.status = "cancelled";
      broadcastFlappySnapshot(game);
      game.flappyState = null;
    }
  }

  pushFlappyChat(game, [
    {
      text:
        reasonText ||
        (isMatchPointEnding
          ? "Flappy Hitler cancelled due to neither pilot clearing the first gate - the top card of the deck decides the game."
          : "Flappy Hitler cancelled due to neither first player clearing the first gate, returning to normal last round play."),
    },
  ]);

  if (pre) {
    game.private.preFlappy = null;

    // continuations (the top-deck hook's delayed playCard, startElection with its
    // timed-mode auto-advance) mutate the game and can even complete it - never run
    // one while the table is abandoned, or an empty table plays itself to a rated
    // result. Restore state immediately so a rejoiner sees a sane board, and fire the
    // continuation only once abandonment clears (rejoin resets timeAbandoned). If
    // nobody returns, the retry self-terminates when the abandonment GC deletes the
    // game (registry-identity check).
    const runWhenUnabandoned = (fn) => {
      const attempt = () => {
        try {
          if (isGameSettled(game)) {
            return;
          }
          if (game.general.timeAbandoned) {
            setTimeout(attempt, 2000);
            return;
          }
          fn();
          sendInProgressGameUpdate(game);
        } catch (e) {
          console.log(e, "error resuming table after flappy cancel");
        }
      };
      setTimeout(attempt, 2000);
    };

    if (pre.fromMatchPoint) {
      if (game.general.timeAbandoned) {
        // an abandoned match-point table must NOT be topdeck-completed (no rating games
        // for empty tables). But it must not resume NORMAL play on rejoin either: the
        // 4-5 trigger already fired and is only checked at enactment time, so resuming
        // would let a mass-disconnect during the secret first-gate window skip the
        // flappyMode endgame entirely - an escape hatch for a team that fears the race.
        // Instead, restore a sane board view now and RE-ENTER flappy on rejoin:
        // scheduleMatchPointFlappy already retries every 2s while abandoned/frozen,
        // self-terminates when the abandonment GC deletes the game, and falls back to
        // the resume continuation if flappy can no longer start (e.g. a whole team
        // left for good). Identities never leaked, so a fresh first gate is clean.
        game.gameState.phase = pre.phase;
        game.gameState.clickActionInfo = pre.clickActionInfo;
        game.general.status = pre.status;

        scheduleMatchPointFlappy(game, typeof pre.resume === "function" ? pre.resume : null);
        sendInProgressGameUpdate(game);
        return;
      }

      // the deck decides - ends the game right here
      topDeckDecides(game);
      return;
    }

    if (game.general.timedMode) {
      // startFlappy destroyed the pending timed-mode timer and the per-phase arming code
      // is inline at each real phase transition, so a plain phase restore would leave a
      // timed game with no auto-advance - start a fresh election with the SAME president
      // (startElection's special-election param), so their turn isn't skipped.
      // startElection does NOT reset nomination/ballot state, so clear the leftovers of
      // any aborted vote first or the next nomination is rejected by selectChancellor's
      // pendingChancellorIndex/lock guard and the table wedges.
      game.gameState.pendingChancellorIndex = null;
      game.private.lock.selectChancellor = false;
      game.private.seatedPlayers.forEach((player) => {
        player.cardFlingerState = [];
      });
      game.publicPlayersState.forEach((player) => {
        if (player.governmentStatus === "isPendingChancellor") {
          player.governmentStatus = "";
        }
      });
      if (game.general.timeAbandoned) {
        // same abandonment rule: startElection re-arms the timed auto-advance chain,
        // which would let an empty timed table auto-play itself - defer until rejoin
        game.gameState.phase = pre.phase;
        game.general.status = pre.status;
        runWhenUnabandoned(() => startElection(game, game.gameState.presidentIndex));
      } else {
        startElection(game, game.gameState.presidentIndex);
      }
      sendInProgressGameUpdate(game);
      return;
    }

    game.gameState.phase = pre.phase;
    game.gameState.clickActionInfo = pre.clickActionInfo;
    game.general.status = pre.status;
    if (pre.governmentStatuses) {
      game.publicPlayersState.forEach((player, i) => {
        player.governmentStatus = pre.governmentStatuses[i] || "";
      });
    }
  }

  sendInProgressGameUpdate(game);
};

// fresh birds (centered by the live, possibly-grown config), clear pipes, and restart
// the spawn phase so the incoming pilots get a full runway before the next gate
const resetFlappyField = (game) => {
  const { flappyState } = game;

  flappyState.liberal.bird = newBird(flappyState.config);
  flappyState.fascist.bird = newBird(flappyState.config);
  flappyState.pylons = [];
  // clients skip interpolation across a reset so fresh birds snap to center instead of
  // visibly gliding up from the crash position
  flappyState.fieldResets++;
  armSpawnTimer(game);
};

// neither bird cleared the first gate: reset the field and hand both birds to the next
// pair of pilots. When all attempts are spent, flappy cancels entirely.
const failFirstGateAttempt = (game) => {
  const { flappyState } = game;

  flappyState.failedAttempts++;

  if (flappyState.failedAttempts >= flappyState.maxAttempts) {
    cancelFlappy(game);
    return;
  }

  advanceController(game, "liberal");
  advanceController(game, "fascist");
  resetFlappyField(game);

  pushFlappyChat(game, [
    {
      text: `Neither bird cleared the first gate and the next pilots take flight. (attempt ${flappyState.failedAttempts + 1})`,
    },
  ]);
  sendInProgressGameUpdate(game);
};

// a bird cleared the first gate: flappy is now guaranteed to decide the game, so
// identities become public and seated chat re-opens
const lockInFlappy = (game) => {
  const { flappyState } = game;
  const control = game.private.flappyControl;

  flappyState.lockedIn = true;
  publishControllers(game);

  pushFlappyChat(game, [{ text: "Pilots are revealed and chat is re-enabled." }]);
  pushFlappyChat(game, [
    { text: "Liberals", type: "liberal" },
    { text: " are flown by " },
    { text: control.liberal.controllerUserName, type: "player" },
    { text: ". " },
    { text: "Fascists", type: "fascist" },
    { text: " are flown by " },
    { text: control.fascist.controllerUserName, type: "player" },
    { text: "." },
  ]);
  // full update (not noChats) so the reveal announcement is delivered immediately
  sendInProgressGameUpdate(game);
};

// nobody is flying at all: after enough consecutive draws to cycle every pilot pair,
// end the game rather than resetting forever - fate picks the winner
const finishByFate = (game) => {
  const winner = Math.random() < 0.5 ? "liberal" : "fascist";

  pushFlappyChat(game, [{ text: "Due to no one flying, winning is determined by a coin flip" }]);
  finishFlappy(game, winner);
};

// both birds die on the same tick after lock-in (e.g. both smack the face of the same
// gate): sudden death reset. The same pilots get one more try - but a second draw by the
// same pair passes control to the next pilots, so two colluding pilots can't stall the
// game with endless draws, and a fully idle table ends by fate instead of looping forever.
const resetRound = (game) => {
  const { flappyState } = game;

  flappyState.postLockDraws++;

  // keyed to the LARGER roster so asymmetric teams (e.g. one living liberal, several
  // fascists) still give every pilot a turn before fate decides. Like the escalation
  // cadence, this deliberately uses the roster fixed at flappy start (leavers keep
  // their slot in the math) - err toward a couple of extra draws, never fewer.
  if (
    flappyState.postLockDraws >=
    2 *
      Math.max(
        game.private.flappyControl.liberal.controllerOrder.length,
        game.private.flappyControl.fascist.controllerOrder.length
      )
  ) {
    finishByFate(game);
    return;
  }

  resetFlappyField(game);

  if (flappyState.drawHandoffArmed) {
    flappyState.drawHandoffArmed = false;
    advanceController(game, "liberal");
    advanceController(game, "fascist");
    publishControllers(game);
    pushFlappyChat(game, [{ text: "Another draw and control passes to the next pilots." }]);
    announceControllers(game);
  } else {
    flappyState.drawHandoffArmed = true;
    pushFlappyChat(game, [
      { text: "Both birds crash at once and sudden death continues. The next draw passes control." },
    ]);
  }

  sendInProgressGameUpdate(game);
};

const finishFlappy = (game, winningTeam) => {
  const { flappyState } = game;

  flappyState.status = "finished";
  flappyState.winningTeam = winningTeam;
  flappyState.lockedIn = true;
  publishControllers(game);
  clearFlappyTimers(game);

  // no "X win the game." push here - completeGame (via endFlappyIntoGameCompletion)
  // pushes the standard winner line itself; a second copy printed every line twice
  game.general.status = `FLAPPY HITLER: ${teamLabel(winningTeam)} win`;

  endFlappyIntoGameCompletion(game, winningTeam);
};

// the pre-race "get ready" countdown, driven off the normal tick so it shares the
// liveness/freeze handling in advanceFlappy. Physics and pipe spawning are held off until
// it reaches zero; the remaining whole seconds are surfaced through general.status (the
// status bar) and the snapshot (the canvas overlay).
const advanceCountdown = (game) => {
  const { flappyState } = game;

  flappyState.countdownTicks--;

  if (flappyState.countdownTicks <= 0) {
    flappyState.status = "running";
    game.general.status = "FLAPPY HITLER: clear the first gate";
    // arm the spawn timer only now, so the first pylon is a full spawnMs after "go" -
    // a clean, predictable opening runway rather than a pipe already in flight
    armSpawnTimer(game);
    sendInProgressGameUpdate(game, true);
    broadcastFlappySnapshot(game);
    return;
  }

  const secondsLeft = Math.ceil((flappyState.countdownTicks * FLAPPY_CONFIG.tickMs) / 1000);

  if (secondsLeft !== flappyState.countdownSecondsShown) {
    flappyState.countdownSecondsShown = secondsLeft;
    game.general.status = `FLAPPY HITLER: get ready... ${secondsLeft}`;
    // noChats status update so the countdown number reaches the status bar each second
    sendInProgressGameUpdate(game, true);
  }

  broadcastFlappySnapshot(game);
};

const advanceFlappy = (game) => {
  const { flappyState } = game;

  // "countdown" runs through this same tick so it inherits the liveness + freeze guards
  // below (an abandoned/force-ended/frozen table must pause or tear down the countdown
  // exactly as it does the running race); only the physics section past them is skipped.
  if (!flappyState || (flappyState.status !== "running" && flappyState.status !== "countdown")) {
    return;
  }

  if (!isFlappyGameLive(game)) {
    // stop the engine rather than mutating and broadcasting a dead game object forever
    // (an abandoned table especially must never run to a coin-flip completeGame that
    // rates ELO for players who all left)
    if (
      game.general.timeAbandoned &&
      !game.gameState.isCompleted &&
      !game.general.isRemade &&
      games[game.general.uid] === game
    ) {
      // abandonment is the one non-live state a table can RETURN from (a rejoin clears
      // timeAbandoned before the GC sweeps), so it must not destroy state a returning
      // table needs:
      // - pre-lock: nothing identifying was shown, so cancel back to normal play (a
      //   resurrected table resumes the hidden-role game cleanly)
      // - post-lock: pilots have been publicly named - cancelling back to hidden-role
      //   play would leak alignments into a resumed game. PAUSE instead (like freeze):
      //   a rejoin resumes the race where it stopped; if nobody returns, the GC sweeps
      //   an uncompleted game with no ELO rated - matching normal abandonment semantics.
      //   CONSCIOUS COST: the tick + spawn intervals keep firing (evaluating this guard
      //   and bailing) until the abandonment GC deletes the table - bounded at ~2min of
      //   trivially-cheap no-op ticks, the price of keeping the race resumable.
      if (!flappyState.lockedIn) {
        cancelFlappy(game, "Flappy Hitler cancelled - the table was abandoned.");
      }
      return;
    }

    cleanupFlappy(game);
    return;
  }

  if (game.gameState.isGameFrozen) {
    // a moderator freeze pauses flappy in place - no physics, no spawns counted, no
    // completion - and it resumes when the mod unfreezes
    return;
  }

  if (flappyState.status === "countdown") {
    advanceCountdown(game);
    return;
  }

  const config = flappyState.config;
  const liberalBird = flappyState.liberal.bird;
  const fascistBird = flappyState.fascist.bird;

  // physics - dead birds are frozen where they crashed (only possible pre-lock-in,
  // while the other bird's first-gate attempt is still being resolved). Birds under
  // handoff grace fly level until it expires or the pilot flaps.
  [liberalBird, fascistBird].forEach((bird) => {
    if (!bird.alive) {
      return;
    }

    let gravity = config.gravity;

    if (bird.graceTicks > 0) {
      bird.graceTicks--;
      gravity *= config.graceGravityMult;
    }

    bird.velocity = Math.min(bird.velocity + gravity, config.maxFallVelocity);
    bird.y += bird.velocity;

    if (bird.y < 0) {
      bird.y = 0;
      bird.velocity = 0;
    }

    // pre-lock the floor is a skim, not a crash (symmetric with the ceiling clamp above):
    // clamp the bird to the ground so a pilot who hasn't started flapping doesn't die
    // before the first pylon arrives. Post-lock this clamp is off and birdCollides kills
    // on floor contact as usual.
    if (!flappyState.lockedIn && bird.y > config.laneHeight - config.birdHeight) {
      bird.y = config.laneHeight - config.birdHeight;
      bird.velocity = 0;
    }
  });

  let gapsPassedThisTick = 0;

  flappyState.pylons.forEach((pylon) => {
    pylon.x -= config.pylonSpeed;

    if (!pylon.counted && pylon.x + config.pylonWidth < config.birdX) {
      pylon.counted = true;
      gapsPassedThisTick++;
    }
  });
  flappyState.pylons = flappyState.pylons.filter((pylon) => pylon.x + config.pylonWidth > -10);

  if (ensureControllersValid(game)) {
    // a pre-lock controller handoff just reset the whole field (both birds re-centered,
    // pylons cleared, spawn re-armed). gapsPassedThisTick was counted against the now-
    // discarded pylons and the local liberalBird/fascistBird refs point at the replaced
    // bird objects - consuming either below would lock in or decide the game off a field
    // that no longer exists, revealing the just-swapped-in replacement pilot. Abandon
    // this tick; the fresh field runs next tick.
    broadcastFlappySnapshot(game);
    return;
  }

  if (liberalBird.alive && birdCollides(liberalBird, flappyState.pylons, config, flappyState.lockedIn)) {
    liberalBird.alive = false;
  }
  if (fascistBird.alive && birdCollides(fascistBird, flappyState.pylons, config, flappyState.lockedIn)) {
    fascistBird.alive = false;
  }

  if (!flappyState.lockedIn) {
    // first-gate qualification: a lone crash waits for the other bird's result
    if (!liberalBird.alive && !fascistBird.alive) {
      failFirstGateAttempt(game);
      return;
    }

    if (gapsPassedThisTick) {
      // the first gate has passed the birds: survivors have cleared it
      flappyState.passedGapCount += gapsPassedThisTick;

      if (liberalBird.alive && fascistBird.alive) {
        lockInFlappy(game);
      } else {
        finishFlappy(game, liberalBird.alive ? "liberal" : "fascist");
        return;
      }
    }

    broadcastFlappySnapshot(game);
    return;
  }

  // locked in: standard instant-death rules
  if (!liberalBird.alive && !fascistBird.alive) {
    // return so a gap crossing on the death tick can't count toward the fresh field
    // or fire a spurious rotation (which would also disarm the draw-handoff warning)
    resetRound(game);
    return;
  }
  if (!liberalBird.alive) {
    finishFlappy(game, "fascist");
    return;
  }
  if (!fascistBird.alive) {
    finishFlappy(game, "liberal");
    return;
  }

  if (gapsPassedThisTick) {
    const previousGapCount = flappyState.passedGapCount;

    flappyState.passedGapCount += gapsPassedThisTick;
    // progress means the table is engaged - only an unbroken run of draws should ever
    // reach the end-by-fate threshold, and "the next draw passes control" only applies
    // to a draw immediately following another draw
    flappyState.postLockDraws = 0;
    flappyState.drawHandoffArmed = false;
    game.general.status = `FLAPPY HITLER: ${flappyState.passedGapCount} gap${flappyState.passedGapCount === 1 ? "" : "s"} passed.`;

    if (Math.floor(flappyState.passedGapCount / 3) > Math.floor(previousGapCount / 3)) {
      rotateFlappyControllers(game);
      // full update so rotation/difficulty announcements are delivered immediately -
      // chats pushed onto game.chats never reach clients on noChats sends
      sendInProgressGameUpdate(game);
    } else {
      // NOTE(perf): this per-gap noChats send exists solely to deliver the updated
      // general.status string (the status bar isn't fed by flappy snapshots). It fires
      // at most ~1/sec even at max difficulty - accepted cost; don't add a dedicated
      // status channel without measuring first.
      sendInProgressGameUpdate(game, true);
    }
  }

  broadcastFlappySnapshot(game);
};

/**
 * @param {object} game - game to act on.
 * @return {boolean} whether flappy can start on this game.
 */
const canStartFlappy = (game) =>
  Boolean(
    game &&
      game.gameState.isStarted &&
      game.gameState.isTracksFlipped &&
      !game.gameState.isCompleted &&
      !(game.flappyState && game.flappyState.isActive) &&
      !game.general.blindMode &&
      !game.general.avalonSH &&
      !game.general.monarchistSH &&
      // deliberately NO isGameFrozen check here: shouldStartMatchPointFlappy calls this
      // at the enactment hook, and a freeze that happens to be active at that instant
      // must not permanently skip the match-point trigger (scheduleMatchPointFlappy
      // already waits out freezes before starting). /forceflappy checks frozen itself.
      game.private &&
      game.private.seatedPlayers &&
      livingTeamMembers(game, "liberal").length &&
      livingTeamMembers(game, "fascist").length
  );

/**
 * @param {object} game - game to act on.
 * @param {boolean} [fromMatchPoint] - true when flappy was auto-triggered by the game
 * reaching the 4-5 double match point (both teams one policy from victory); a cancelled
 * match-point flappy ends the game by topdeck instead of restoring a pending action.
 * @param {Function} [resume] - continuation used only when a match-point flappy is
 * cancelled on an ABANDONED table (which restores instead of topdecking - no rating
 * games for empty tables); defaults to starting the next election.
 */
const startFlappy = (game, fromMatchPoint = false, resume = null) => {
  if (!canStartFlappy(game)) {
    return;
  }

  // stop any pending timed-mode move so the normal game can't advance underneath flappy
  if (game.private.timerId) {
    clearTimeout(game.private.timerId);
    game.private.timerId = null;
    game.gameState.timedModeEnabled = false;
  }

  // random rotation order: with uneven teams, who never gets a first-gate attempt (or
  // controls twice per phase) is randomized rather than seat-ordered
  const liberalOrder = _.shuffle(livingTeamMembers(game, "liberal"));
  const fascistOrder = _.shuffle(livingTeamMembers(game, "fascist"));

  // snapshot the table state so cancelFlappy (three failed first-gate attempts) can
  // put the game back to normal play
  game.private.preFlappy = {
    phase: game.gameState.phase,
    clickActionInfo: game.gameState.clickActionInfo,
    status: game.general.status,
    governmentStatuses: game.publicPlayersState.map((player) => player.governmentStatus),
    fromMatchPoint,
    // function values are skipped by JSON.stringify, so this is safe on the game object
    resume,
  };

  game.gameState.phase = "flappyHitler";
  game.gameState.clickActionInfo = null;
  game.general.status = "FLAPPY HITLER: get ready... 3";

  // no stale president/chancellor tokens under the pilot markers: flappy replaces the
  // election view. Restored on a /forceflappy cancel; a match-point cancel resumes via
  // startElection/top-deck, which manage their own government state.
  game.publicPlayersState.forEach((player) => {
    player.governmentStatus = "";
  });

  // controller truth is private until lock-in - see publishControllers
  game.private.flappyControl = {
    liberal: { controllerOrder: liberalOrder, controllerIndex: 0, controllerUserName: liberalOrder[0] },
    fascist: { controllerOrder: fascistOrder, controllerIndex: 0, controllerUserName: fascistOrder[0] },
  };

  game.flappyState = {
    isActive: true,
    // begin in the "get ready" countdown; advanceCountdown flips this to "running" when it
    // elapses (and only then arms pipe spawning)
    status: "countdown",
    countdownTicks: Math.round(FLAPPY_CONFIG.countdownMs / FLAPPY_CONFIG.tickMs),
    countdownSecondsShown: Math.ceil(FLAPPY_CONFIG.countdownMs / 1000),
    winningTeam: null,
    lockedIn: false,
    failedAttempts: 0,
    drawHandoffArmed: false,
    postLockDraws: 0,
    fieldResets: 0,
    // first-gate attempts scale with table size: floor(living players / 2). This equals
    // liberalCount - 1 for every standard composition (2 in 5p up to 5 in 10p), but is
    // derived ONLY from public information (deaths are public) - deriving it from the
    // hidden liberal count would leak executed players' alignment through the observable
    // cancellation threshold, poisoning a resumed game
    maxAttempts: Math.max(
      1,
      Math.floor(game.publicPlayersState.filter((player) => !player.isDead && !player.leftGame).length / 2)
    ),
    passedGapCount: 0,
    liberalRotationCount: 0,
    difficultyLevel: 0,
    startedAt: Date.now(),
    liberal: { bird: newBird() },
    fascist: { bird: newBird() },
    pylons: [],
    config: Object.assign({}, FLAPPY_CONFIG),
  };

  pushFlappyChat(game, [{ text: "Flappy Hitler begins." }]);
  pushFlappyChat(game, [
    {
      text:
        "Pilots are secret and seated players' chat is disabled until a bird clears the first gate. " +
        `If neither bird clears the gate, the next pilots take flight - when the attempts run out, ${
          fromMatchPoint ? "the top card of the deck decides the game" : "the game returns to normal play"
        }. ` +
        "After the first gate, control rotates every 3 passed gaps.",
    },
  ]);

  // store numeric timer ids, not Timeout objects - those are cyclic and break JSON.stringify(game)
  let tickErrorStreak = 0;

  game.private.flappyTimers = {
    tick: setInterval(() => {
      try {
        advanceFlappy(game);
        tickErrorStreak = 0;
      } catch (e) {
        // a transient throw shouldn't decide a game - skip the tick and only take the
        // recovery path after a full second of consecutive failures
        tickErrorStreak++;
        console.log(e, `error in flappy tick (${tickErrorStreak} consecutive)`);

        if (tickErrorStreak < 20) {
          return;
        }

        // recover the table rather than leaving it wedged in the flappyHitler phase.
        // Post-lock, pilot roles are already public, so resuming a hidden-role game is
        // not an option - end the game by fate instead.
        try {
          if (game.flappyState && game.flappyState.lockedIn) {
            pushFlappyChat(game, [{ text: "Flappy Hitler hit an error - winning is determined by a coin flip" }]);
            finishFlappy(game, Math.random() < 0.5 ? "liberal" : "fascist");
          } else {
            // neutral reason text: what follows depends on how flappy started (a
            // match-point run ends by topdeck, a forced run restores normal play)
            cancelFlappy(game, "Flappy Hitler hit an error and was cancelled.");
          }
        } catch (recoveryError) {
          // last resort: both the game and its recovery threw. Free the table from the
          // flappyHitler phase so clients at least leave the canvas and mods can act.
          console.log(recoveryError, "error recovering flappy after tick error");
          try {
            discardFlappyEngine(game);
            // a fresh election actually prompts a president (bare phase restore left
            // the table idle: startFlappy cleared governmentStatus and nothing would
            // re-arm a pending action) - if even startElection throws, fall through
            // to the wedge-with-mod-alert so clients at least leave the canvas
            try {
              startElection(game);
            } catch (electionError) {
              console.log(electionError, "error starting election in flappy last-resort recovery");
              game.gameState.phase = "selectingChancellor";
              game.general.status = "Flappy Hitler broke down - a moderator may need to end this game.";
            }
            sendInProgressGameUpdate(game);
          } catch (lastResortError) {
            console.log(lastResortError, "error in flappy last-resort recovery");
          }
        }
      }
    }, FLAPPY_CONFIG.tickMs)[Symbol.toPrimitive](),
    spawn: null,
  };
  // NOTE: the spawn timer is intentionally NOT armed here - advanceCountdown arms it when
  // the countdown reaches "go", so no pipes appear (or spawn-tick) during the countdown.

  sendInProgressGameUpdate(game);
  broadcastFlappySnapshot(game);
};

/**
 * @param {object} passport - socket authentication.
 * @param {object} game - game to act on.
 * @param {object} data - client input.
 */
const handleFlappyInput = (passport, game, data) => {
  const { flappyState } = game;
  const control = game.private.flappyControl;

  if (
    !flappyState ||
    !flappyState.isActive ||
    flappyState.status !== "running" ||
    game.gameState.phase !== "flappyHitler" ||
    !control ||
    !data ||
    data.type !== "flap"
  ) {
    return;
  }

  const playerIndex = game.publicPlayersState.findIndex((player) => player.userName === passport.user);

  if (
    playerIndex === -1 ||
    game.publicPlayersState[playerIndex].isDead ||
    game.publicPlayersState[playerIndex].leftGame
  ) {
    return;
  }

  const team = game.private.seatedPlayers[playerIndex].role && game.private.seatedPlayers[playerIndex].role.team;

  if (team !== "liberal" && team !== "fascist") {
    return;
  }

  if (control[team].controllerUserName !== passport.user || !flappyState[team].bird.alive) {
    return;
  }

  if (game.gameState.isGameFrozen) {
    return;
  }

  flappyState[team].bird.graceTicks = 0; // flapping ends handoff grace
  flappyState[team].bird.velocity = flappyState.config.flapVelocity;
};

/**
 * @param {object} game - game to clean up when flappy is stopped EXTERNALLY (mod
 * force-end, remake, abandonment, table deletion) rather than by its own ending.
 *
 * NOTE on the isActive/status pair: isActive answers "may a new flappy start?"
 * (canStartFlappy) and status answers "what is this run doing?" (engine + client).
 * Every terminal path must settle BOTH - finish/cancel do, and this does - or clients
 * spin forever on a status that still says "running".
 */
const cleanupFlappy = (game) => {
  clearFlappyTimers(game);

  if (game.flappyState) {
    game.flappyState.isActive = false;

    if (game.flappyState.status === "running" || game.flappyState.status === "countdown") {
      // terminal-but-not-a-flappy-ending: lets the client render loop stop and shows
      // the frozen field without a misleading win/crash overlay (covers a teardown that
      // lands during the pre-race countdown too)
      game.flappyState.status = "cancelled";
      broadcastFlappySnapshot(game);
    }
  }

  game.private.flappyControl = null;
  game.private.preFlappy = null;
};

/**
 * @param {object} game - game to act on.
 * @return {boolean} whether a policy enactment should divert into flappy: flappyMode on,
 * not previously cancelled, at DOUBLE match point (BOTH teams one policy from victory -
 * a 4-liberal / 5-fascist board), and startable.
 *
 * Why BOTH (owner decision, 2026-07-04 - this was the original 2019 design intent):
 * flappy exists to resolve a genuinely CLOSE game. Firing on either team's match point
 * always robbed the leading team of an earned advantage (and structurally taxed liberal
 * policy wins, which must pass through 4, harder than fascist wins, which have the
 * flappy-free Hitler-chancellor route). At 4-5 the next enactment decides the game for
 * whoever draws it - largely deck luck - so replacing it with a shared-pipe skill race
 * is fairer than the cards. Known tradeoff: flappy fires in fewer games, and at 4-5
 * both teams give up their endgame tools to the race (fascists the Hitler-zone
 * chancellor threat, liberals the veto/shot).
 *
 * INTENTIONAL (per FLAPPY_SPEC.md): only the policy tracks are inspected. Non-policy
 * endings that occur before the 4-5 board (Hitler elected chancellor, Hitler shot) end
 * the game normally - a flappyMode game can legitimately finish without flappy firing.
 *
 * ALSO INTENTIONAL (owner decision, 2026-07-04): there is deliberately no ranked/casual
 * guard here. Rated flappyMode games are allowed - players opted into the mode at game
 * creation and its outcome (including coin-flip stalemate/error endings) may decide ELO.
 *
 * The 4/5 thresholds mirror the win checks hardcoded across election.js/policy-powers.js
 * (5 liberal / 6 fascist policies win, unconditionally - custom games alter starting
 * track positions and deck composition, not the win thresholds), so "one policy from
 * victory" holds for standard and custom games alike.
 */
const shouldStartMatchPointFlappy = (game) =>
  Boolean(
    game.general.flappyMode &&
      !game.general.flappyCancelled &&
      game.trackState.liberalPolicyCount === 4 &&
      game.trackState.fascistPolicyCount === 5 &&
      canStartFlappy(game)
  );

/**
 * Schedule the match-point transition into flappy. This is the only continuation the
 * enactment site arms, so if flappy can no longer start when the delay fires (e.g. a
 * team's last living player left in the meantime), the game resumes via `resume` instead
 * of stranding the table. The same continuation is used if flappy is later cancelled at
 * the first gate.
 *
 * @param {object} game - game to act on.
 * @param {Function} [resume] - how to continue normal play; defaults to the next election.
 */
const scheduleMatchPointFlappy = (game, resume = null) => {
  const resumeOrElection =
    resume ||
    (() => {
      startElection(game);
    });

  const fire = () => {
    // captured before any mutation so the catch can put the table back where it was -
    // the top-deck resume never sets a phase, so recovery can't rely on the resume
    const priorPhase = game.gameState.phase;
    const priorStatus = game.general.status;

    // guarded: an uncaught throw in a timer reaches the process-level handlers, which
    // exit the server and kill every live game
    try {
      // the table may have been deleted, remade, or completed (mod force-end) during
      // the delay - in that case this callback owns nothing: it must neither start
      // flappy nor "resume" play over a settled game
      if (isGameSettled(game)) {
        return;
      }

      // a freeze pauses the transition, and abandonment can be UNDONE by a rejoin
      // before the GC sweeps (bailing outright would leave the resurrected table stuck
      // after the enactment with no continuation) - retry both until resolved or dead.
      // INTENTIONALLY not registered in flappyTimers: clearFlappyTimers runs on
      // in-game teardowns and must never cancel this pending transition/completion
      // work; the registry-identity check above self-terminates the retry within one
      // 2s cycle of the game's deletion, so the retained reference is bounded.
      if (game.gameState.isGameFrozen || game.general.timeAbandoned) {
        setTimeout(fire, 2000);
        return;
      }

      if (canStartFlappy(game)) {
        startFlappy(game, true, resumeOrElection);
      } else {
        resumeOrElection();
        sendInProgressGameUpdate(game);
      }
    } catch (e) {
      console.log(e, "error in match-point flappy transition");
      // if startFlappy died after flipping the phase but before wiring the engine,
      // the table would be stranded in flappyHitler - unwind, restore the pre-attempt
      // phase (the top-deck resume never sets one), and resume normal play
      try {
        if (game.gameState.phase === "flappyHitler" && !game.private.flappyTimers) {
          discardFlappyEngine(game);
          game.gameState.phase = priorPhase;
          game.general.status = priorStatus;
          resumeOrElection();
          sendInProgressGameUpdate(game);
        }
      } catch (recoveryError) {
        console.log(recoveryError, "error recovering from failed flappy transition");
      }
    }
  };

  setTimeout(fire, process.env.NODE_ENV === "development" ? 100 : 2000);
};

/**
 * @param {object} game - game to check.
 * @return {boolean} whether the game is in flappy's secret first-gate window, during
 * which pilot identities must not leak through any channel (chat, claims, markers).
 * Single source of truth for the anonymity predicate - do not inline copies.
 *
 * KNOWN ARCHITECTURE TRADEOFF: anonymity is enforced per-channel at each public-output
 * path rather than at one choke-point (there is no single server-side funnel all
 * public output flows through - chat, claims, and commands each write to game.chats
 * directly). Current guarded channels: chat.js game-chat mute (AFTER slash/@mod
 * routing), chat.js GENERAL-chat mute (site-wide channel is player-attributed too),
 * claim.js (claim drop), commands.js (/ping block). If you add a NEW path that emits
 * player-attributed public output during a game, it MUST check isFlappyPreLock.
 */
const isFlappyPreLock = (game) =>
  Boolean(
    game.gameState.phase === "flappyHitler" &&
      game.flappyState &&
      game.flappyState.isActive &&
      !game.flappyState.lockedIn
  );

module.exports = {
  canStartFlappy,
  shouldStartMatchPointFlappy,
  scheduleMatchPointFlappy,
  startFlappy,
  handleFlappyInput,
  isFlappyPreLock,
};
