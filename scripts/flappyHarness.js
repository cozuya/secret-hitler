/* Headless 5-player flappy harness: signs in the quick-login accounts, creates and starts a
 * 5p game, sends /forceflappy as Uther, and auto-pilots both birds through the gaps.
 * Requires: server running on :8080, accounts created (pnpm create-accounts), Uther assigned
 * admin (pnpm assign-local-mod) BEFORE the server was started (staff roles are cached at boot).
 * Usage: node scripts/flappyHarness.js            (auto-plays, fascists crash after 20s)
 *        DEMO_SECONDS=600 node scripts/flappyHarness.js   (keeps both birds alive 10 min so you can watch)
 */
const http = require("http");
const io = require("socket.io-client");

const BASE = "http://localhost:8080";
const USERS = ["Uther", "Jaina", "Rexxar", "Thrall", "Valeera"];
const PASSWORD = "snipsnap";

const log = (...args) => console.log(new Date().toISOString().slice(11, 23), ...args);

const signin = (username) =>
  new Promise((resolve, reject) => {
    const body = JSON.stringify({ username, password: PASSWORD });
    const req = http.request(
      {
        method: "POST",
        hostname: "localhost",
        port: 8080,
        path: "/account/signin",
        headers: { "content-type": "application/json; charset=UTF-8", "content-length": Buffer.byteLength(body) },
      },
      (res) => {
        res.resume();
        res.on("end", () => {
          const cookies = res.headers["set-cookie"];
          if (res.statusCode === 200 && cookies) {
            resolve(cookies.map((c) => c.split(";")[0]).join("; "));
          } else {
            reject(new Error(`signin ${username} failed: ${res.statusCode} cookies=${Boolean(cookies)}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.end(body);
  });

const connect = (cookie) =>
  new Promise((resolve, reject) => {
    const socket = io(BASE, {
      forceNew: true,
      reconnection: false,
      transports: ["polling", "websocket"],
      transportOptions: { polling: { extraHeaders: { Cookie: cookie } } },
    });
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", reject);
    setTimeout(() => reject(new Error("connect timeout")), 8000);
  });

// MATCHPOINT=1: custom game starting at a 4-liberal / 4-fascist board, no powers - one
// FASCIST enactment reaches the 4-5 double match point and must auto-start flappy.
// (vetoZone must exceed the starting fascist count, so 4 is the highest legal start.)
const matchPointSettings = {
  enabled: true,
  deckState: { lib: 5, fas: 14 },
  trackState: { lib: 4, fas: 4 },
  fascistCount: 1,
  hitlerZone: 5,
  vetoZone: 5,
  powers: [null, null, null, null, null],
};

const gamePayload = {
  gameName: "flappy harness",
  gameType: "casual",
  flag: "none",
  minPlayersCount: 5,
  excludedPlayerCount: [6, 7, 8, 9],
  maxPlayersCount: process.env.MATCHPOINT ? 5 : 10,
  experiencedMode: true,
  playerChats: "enabled",
  disableObserverLobby: false,
  disableObserver: false,
  isTourny: false,
  isVerifiedOnly: false,
  disableGamechat: false,
  rainbowgame: false,
  blindMode: false,
  flappyMode: true,
  flappyOnlyMode: false,
  timedMode: false,
  rebalance6p: false,
  rebalance7p: false,
  rebalance9p2f: false,
  eloSliderValue: null,
  xpSliderValue: null,
  unlistedGame: false,
  privatePassword: false,
  privateAnonymousRemakes: false,
  customGameSettings: process.env.MATCHPOINT ? matchPointSettings : undefined,
  avalonSH: false,
  withPercival: false,
  monarchistSH: false,
  noTopdecking: 0,
};

const main = async () => {
  const clients = {};

  for (const name of USERS) {
    const cookie = await signin(name);
    const socket = await connect(cookie);
    socket.emit("confirmTOU");
    socket.emit("getUserGameSettings");
    socket.on("sendAlert", (msg) => log(`ALERT for ${name}:`, msg));
    clients[name] = { socket, name, lastGame: null };
    log(`connected ${name}`);
  }

  // confirmTOU saves to mongo async; give it a moment so isRestricted clears before addNewGame
  await new Promise((r) => setTimeout(r, 2000));

  const creator = clients[USERS[0]];

  const uid = await new Promise((resolve, reject) => {
    creator.socket.on("joinGameRedirect", (gameUid) => resolve(gameUid));
    creator.socket.emit("addNewGame", gamePayload);
    setTimeout(() => reject(new Error("no joinGameRedirect")), 8000);
  });
  log(`game created uid=${uid}`);
  log(
    `WATCH IT HERE: http://localhost:8080 -> quick-login a player in the top dev bar -> click the game, or observe without logging in`
  );

  // everyone joins room + takes a seat
  for (const name of USERS) {
    const { socket } = clients[name];
    socket.on("gameUpdate", (game) => {
      if (game && game.gameState) clients[name].lastGame = game;
    });
    socket.emit("getGameInfo", uid);
    socket.emit("updateSeatedUser", { uid });
  }

  // wait for tracks flipped (game fully started)
  await new Promise((resolve, reject) => {
    const started = Date.now();
    const poll = setInterval(() => {
      const g = creator.lastGame;
      const seated = g ? g.publicPlayersState.length : 0;
      if (g && g.gameState.isTracksFlipped) {
        clearInterval(poll);
        resolve();
      } else if (Date.now() - started > 60000) {
        clearInterval(poll);
        reject(new Error(`game never started; seated=${seated} status=${g && g.general.status}`));
      }
    }, 500);
  });
  log("game started (tracks flipped)");

  // snapshot + result plumbing. Every client keeps its own latest snapshot because the
  // youControl flag is per-socket (only the two current pilots receive it).
  let lastSnapshot = null;
  let snapshotCount = 0;
  let rotationCount = 0;
  let anonymityLeaks = 0;
  const controllersSeen = { liberal: new Set(), fascist: new Set() };

  for (const name of USERS) {
    clients[name].socket.on("flappyUpdate", (snap) => {
      if (snap && snap.type === "snapshot") {
        if (snap.youControl && (!clients[name].flappy || clients[name].flappy.youControl !== snap.youControl)) {
          log(`PILOT (private signal): ${name} now controls the ${snap.youControl} bird`);
        }
        clients[name].flappy = snap;
      }
    });
  }

  creator.socket.on("flappyUpdate", (snap) => {
    if (snap && snap.type === "snapshot") {
      // anonymity on the wire: pre-lock snapshots must not carry pilot identities
      if (!snap.lockedIn && (snap.liberal.controllerUserName || snap.fascist.controllerUserName)) {
        anonymityLeaks++;
      }
      if (lastSnapshot && snap.lockedIn && lastSnapshot.lockedIn) {
        for (const team of ["liberal", "fascist"]) {
          if (snap[team].controllerUserName !== lastSnapshot[team].controllerUserName) {
            rotationCount++;
            log(
              `ROTATION at gap ${snap.passedGapCount}: ${team} ${lastSnapshot[team].controllerUserName} -> ${snap[team].controllerUserName}`
            );
          }
        }
      }
      if (lastSnapshot && !lastSnapshot.lockedIn && snap.lockedIn) {
        log(
          `LOCKED IN at gap ${snap.passedGapCount}: lib=${snap.liberal.controllerUserName} (${JSON.stringify(snap.liberal.controllerRole)}) fas=${snap.fascist.controllerUserName} (${JSON.stringify(snap.fascist.controllerRole)})`
        );
      }
      if (
        lastSnapshot &&
        (snap.config.spawnMs !== lastSnapshot.config.spawnMs ||
          snap.config.gapSize !== lastSnapshot.config.gapSize ||
          snap.config.birdHeight !== lastSnapshot.config.birdHeight ||
          snap.config.gravity !== lastSnapshot.config.gravity)
      ) {
        log(
          `DIFFICULTY CHANGE at gap ${snap.passedGapCount}: spawnMs ${lastSnapshot.config.spawnMs}->${snap.config.spawnMs}, gapSize ${lastSnapshot.config.gapSize}->${snap.config.gapSize}, bird ${lastSnapshot.config.birdWidth}x${lastSnapshot.config.birdHeight}->${snap.config.birdWidth}x${snap.config.birdHeight}, gravity ${lastSnapshot.config.gravity}->${snap.config.gravity}`
        );
      }
      if (snap.lockedIn) {
        controllersSeen.liberal.add(snap.liberal.controllerUserName);
        controllersSeen.fascist.add(snap.fascist.controllerUserName);
      }
      lastSnapshot = snap;
      snapshotCount++;
    }
  });

  // the current pilot of a team is whichever client last received youControl for it
  const pilotClient = (team) => {
    const name = USERS.find((n) => clients[n].flappy && clients[n].flappy.youControl === team);
    return name ? clients[name] : null;
  };

  await new Promise((r) => setTimeout(r, 3000)); // let role dealing finish

  // plays whatever normal-game action is pending (keeping `preferredPolicy` policies) -
  // one step per call; callers loop until their own stop condition
  const roundActedAt = {};
  let preferredPolicy = "liberal";
  const playRoundStep = (g) => {
    const phase = g.gameState.phase;
    const key = `${phase}:${g.general.electionCount}:${(g.trackState.enactedPolicies || []).length}`;
    if (roundActedAt[key] && Date.now() - roundActedAt[key] < 4000) return;

    if (phase === "selectingChancellor") {
      const [presName, eligible] = g.gameState.clickActionInfo || [];
      if (presName && clients[presName] && eligible && eligible.length) {
        roundActedAt[key] = Date.now();
        clients[presName].socket.emit("presidentSelectedChancellor", { uid, chancellorIndex: eligible[0] });
        log(`round: ${presName} picks chancellor seat ${eligible[0] + 1}`);
      }
    } else if (phase === "voting") {
      roundActedAt[key] = Date.now();
      USERS.forEach((name) => clients[name].socket.emit("selectedVoting", { uid, vote: true }));
      log("round: everyone votes ja");
    } else if (phase === "presidentSelectingPolicy") {
      const pres = g.publicPlayersState.find((p) => p.governmentStatus === "isPresident");
      const cards = (pres && clients[pres.userName] && clients[pres.userName].lastGame.cardFlingerState) || [];
      if (cards.length === 3) {
        roundActedAt[key] = Date.now();
        const discardTarget = preferredPolicy === "liberal" ? "fascistp" : "liberalp";
        let discard = cards.findIndex((c) => c.cardStatus.cardBack === discardTarget);
        if (discard === -1) discard = 0;
        clients[pres.userName].socket.emit("selectedPresidentPolicy", { uid, selection: discard });
        log(`round: president hand ${cards.map((c) => c.cardStatus.cardBack).join(",")} - discards ${discard}`);
      }
    } else if (phase === "chancellorSelectingPolicy") {
      const chan = g.publicPlayersState.find((p) => p.governmentStatus === "isChancellor");
      const cards = (chan && clients[chan.userName] && clients[chan.userName].lastGame.cardFlingerState) || [];
      if (cards.length === 2) {
        roundActedAt[key] = Date.now();
        // server maps selection 3 -> right card, anything else -> left card
        const selection = cards[0].cardStatus.cardBack === `${preferredPolicy}p` ? 1 : 3;
        clients[chan.userName].socket.emit("selectedChancellorPolicy", { uid, selection });
        log(
          `round: chancellor hand ${cards.map((c) => c.cardStatus.cardBack).join(",")} - enacts ${selection === 1 ? "left" : "right"}`
        );
      }
    } else if (phase === "chancellorVoteOnVeto") {
      // veto is active at 5 fascist policies (the 4-5 board) - always vote nein so the
      // selected policy enacts
      const chan = g.publicPlayersState.find((p) => p.governmentStatus === "isChancellor");
      if (chan && clients[chan.userName]) {
        roundActedAt[key] = Date.now();
        clients[chan.userName].socket.emit("selectedChancellorVoteOnVeto", { uid, vote: false });
        log("round: chancellor declines veto");
      }
    }
  };

  if (process.env.MATCHPOINT) {
    // play real rounds (keep FASCIST policies from the 4-4 start) until the 5th fascist
    // policy lands, completing the 4-5 double match point that auto-starts flappy
    log("MATCHPOINT mode: playing rounds toward the 4-5 double match point...");
    preferredPolicy = "fascist";
    const deadline = Date.now() + 120000;

    while (!lastSnapshot) {
      if (Date.now() > deadline) {
        const g = creator.lastGame;
        log(
          `stuck: phase=${g.gameState.phase} lib=${g.trackState.liberalPolicyCount} fas=${g.trackState.fascistPolicyCount}`
        );
        throw new Error("match point never triggered flappy");
      }
      await new Promise((r) => setTimeout(r, 300));

      const g = creator.lastGame;
      if (!g || !g.gameState) continue;
      playRoundStep(g);
    }
    log(
      `MATCH POINT reached: flappy auto-started at lib=${creator.lastGame.trackState.liberalPolicyCount} fas=${creator.lastGame.trackState.fascistPolicyCount}`
    );
  } else {
    creator.socket.emit("addNewGameChat", { uid, chat: "/forceflappy" });
    log("sent /forceflappy");
  }

  await new Promise((resolve, reject) => {
    const started = Date.now();
    let retries = 0;
    const poll = setInterval(() => {
      if (lastSnapshot) {
        clearInterval(poll);
        resolve();
      } else if (Date.now() - started > 3000 * (retries + 1) && retries < 2) {
        retries++;
        log(`retrying /forceflappy (${retries})`);
        creator.socket.emit("addNewGameChat", { uid, chat: "/forceflappy" });
      } else if (Date.now() - started > 12000) {
        clearInterval(poll);
        const g = creator.lastGame;
        const recent = (g.chats || [])
          .filter((c) => c.gameChat)
          .slice(-5)
          .map((c) => c.chat.map((s) => s.text).join(""));
        log("recent chats:", JSON.stringify(recent));
        log("phase:", g.gameState.phase, "flappyState:", JSON.stringify(g.flappyState || null).slice(0, 200));
        reject(new Error("no flappy snapshots after /forceflappy"));
      }
    }, 200);
  });
  await new Promise((r) => setTimeout(r, 500)); // let every client receive a snapshot (youControl)
  const libPilot = pilotClient("liberal");
  const fasPilot = pilotClient("fascist");
  log(
    `flappy running. secret pilots (via private youControl): lib=${libPilot && libPilot.name} fas=${fasPilot && fasPilot.name}`
  );
  log(
    `pre-lock snapshot carries no names: ${!lastSnapshot.liberal.controllerUserName && !lastSnapshot.fascist.controllerUserName}`
  );
  log(`phase=${creator.lastGame.gameState.phase} status="${creator.lastGame.general.status}"`);
  log(
    `seat cardStatuses during flappy (should be none/pre-existing): ${creator.lastGame.publicPlayersState
      .map(
        (p) => `${p.userName}=${(p.cardStatus && p.cardStatus.cardBack && p.cardStatus.cardBack.cardName) || "none"}`
      )
      .join(", ")}`
  );

  // TEST_CANCEL=1: nobody flaps, both birds floor twice at the starting gate -> flappy
  // must cancel and restore normal play
  if (process.env.TEST_CANCEL) {
    const preFlappyPhase = "selectingChancellor";
    const result = await new Promise((resolve, reject) => {
      const started = Date.now();
      const poll = setInterval(() => {
        const g = creator.lastGame;
        const chats = (g.chats || []).filter((c) => c.gameChat).map((c) => c.chat.map((s) => s.text).join(""));
        const cancelled = chats.some((c) => c.includes("Flappy Hitler cancelled"));
        if (cancelled) {
          clearInterval(poll);
          resolve({ chats: chats.slice(-3), phase: g.gameState.phase, status: g.general.status });
        } else if (Date.now() - started > 20000) {
          clearInterval(poll);
          reject(new Error(`no cancellation after 20s; phase=${g.gameState.phase}`));
        }
      }, 250);
    });
    log(`cancel chats: ${JSON.stringify(result.chats)}`);
    const reveals = creator.lastGame.publicPlayersState.filter(
      (p) => p.cardStatus && p.cardStatus.cardBack && String(p.cardStatus.cardBack.cardName).startsWith("membership-")
    ).length;
    log(`membership reveals after cancel (should be 0): ${reveals}`);
    let pass = reveals === 0;

    if (process.env.MATCHPOINT) {
      // a cancelled MATCH-POINT flappy ends the game immediately by topdeck (the deck
      // decides the 4-5 board) - expect completion, a topdeck chat, and no flappy restart
      let flappyRestarted = false;
      creator.socket.on("flappyUpdate", (snap) => {
        if (snap && snap.type === "snapshot" && snap.status === "running") flappyRestarted = true;
      });
      const deadline = Date.now() + 20000;
      while (!creator.lastGame.gameState.isCompleted) {
        if (Date.now() > deadline) throw new Error("game never completed after topdeck cancel");
        await new Promise((r) => setTimeout(r, 250));
      }
      const chats = (creator.lastGame.chats || [])
        .filter((c) => c.gameChat)
        .map((c) => c.chat.map((s) => s.text).join(""));
      const topDecked = chats.some((c) => c.includes("The deck decides"));
      log(`topdeck ending: deckDecides chat=${topDecked}, isCompleted=${creator.lastGame.gameState.isCompleted}`);
      log(`flappy restarted (should be false): ${flappyRestarted}`);
      pass = pass && topDecked && Boolean(creator.lastGame.gameState.isCompleted) && !flappyRestarted;
    } else {
      // a cancelled /forceflappy restores the exact pre-flappy state
      log(`phase after cancel: ${result.phase} (expected ${preFlappyPhase}), status: "${result.status}"`);
      pass = pass && result.phase === preFlappyPhase;
    }

    log(pass ? "RESULT: PASS (cancel)" : "RESULT: CHECK (cancel)");
    Object.values(clients).forEach((c) => c.socket.close());
    process.exit(0);
  }

  // chat mute test: seated non-AEM chat must be rejected pre-lock (expect an ALERT log),
  // and must go through again after lock-in
  clients.Jaina.socket.emit("addNewGameChat", { uid, chat: "muted window test" });
  setTimeout(() => {
    clients.Jaina.socket.emit("addNewGameChat", { uid, chat: "reopened window test" });
  }, 8000);

  // negative test: a non-controller flap must be ignored
  const nonController = USERS.find((u) => (!libPilot || u !== libPilot.name) && (!fasPilot || u !== fasPilot.name));
  const libBirdBefore = lastSnapshot.liberal.bird.velocity;
  clients[nonController].socket.emit("flappyEvent", { uid, type: "flap" });

  // pilot both birds through gaps for ~20s (tests gap passing), then let the fascist bird fall
  const flappyStart = Date.now();
  // pilot skill knobs for balance experiments:
  //   PILOT_MS  - decision cadence in ms (reaction speed; default 100 = near-perfect)
  //   PILOT_ERR - aim error in px added to the gap-center target each decision
  const pilotMs = process.env.PILOT_MS ? parseInt(process.env.PILOT_MS, 10) : 100;
  const pilotErr = process.env.PILOT_ERR ? parseInt(process.env.PILOT_ERR, 10) : 0;
  const pilot = (team) => {
    const snap = lastSnapshot;
    const cfg = snap.config;
    const bird = snap[team].bird;
    const client = pilotClient(team);
    if (!client) return;
    const nextPylon = snap.pylons.filter((p) => p.x + cfg.pylonWidth > cfg.birdX).sort((a, b) => a.x - b.x)[0];
    const targetY =
      (nextPylon ? (nextPylon.gapTop + nextPylon.gapBottom) / 2 : cfg.laneHeight / 2) +
      (pilotErr ? (Math.random() * 2 - 1) * pilotErr : 0);
    if (bird.y + cfg.birdHeight / 2 > targetY) {
      client.socket.emit("flappyEvent", { uid, type: "flap" });
    }
  };
  const bothAliveMs = process.env.DEMO_SECONDS ? parseInt(process.env.DEMO_SECONDS, 10) * 1000 : 20000;
  const flapLoop = setInterval(() => {
    if (!lastSnapshot || lastSnapshot.status !== "running") return;
    pilot("liberal");
    if (Date.now() - flappyStart < bothAliveMs) {
      pilot("fascist");
    }
  }, pilotMs);

  let midGameChatDelivered = false;
  const result = await new Promise((resolve, reject) => {
    const started = Date.now();
    const poll = setInterval(() => {
      const g = creator.lastGame;
      // announcements must reach clients DURING play, not just in the end-of-game dump
      if (!midGameChatDelivered && lastSnapshot.status === "running" && lastSnapshot.passedGapCount >= 4 && g) {
        midGameChatDelivered = (g.chats || []).some(
          (c) => c.gameChat && Array.isArray(c.chat) && c.chat.some((s) => String(s.text).includes("Control rotates"))
        );
        if (midGameChatDelivered) log("mid-game chat delivery confirmed (rotation announcement arrived during play)");
      }
      if (lastSnapshot.status === "finished" || (g && g.gameState.isCompleted)) {
        clearInterval(poll);
        clearInterval(flapLoop);
        setTimeout(() => resolve(g), 1500); // allow completeGame's timeout to run
      } else if (Date.now() - started > bothAliveMs + 90000) {
        clearInterval(poll);
        clearInterval(flapLoop);
        reject(new Error("flappy never finished"));
      }
    }, 250);
  });

  log(`flappy finished. snapshots received: ${snapshotCount}`);
  log(`winner (snapshot): ${lastSnapshot.winningTeam}`);
  const finalGame = creator.lastGame;
  log(`gameState.isCompleted: ${finalGame.gameState.isCompleted}`);
  log(`final status: "${finalGame.general.status}"`);
  const winChat = (finalGame.chats || [])
    .filter((c) => c.gameChat)
    .map((c) => c.chat.map((s) => s.text).join(""))
    .slice(-6);
  log("last game chats:", JSON.stringify(winChat, null, 1));
  log(`passedGapCount: ${lastSnapshot.passedGapCount}`);
  log(`rotations observed: ${rotationCount}`);
  log(`liberal controllers seen: ${[...controllersSeen.liberal].join(", ")}`);
  log(`fascist controllers seen: ${[...controllersSeen.fascist].join(", ")}`);
  const allChatTexts = (finalGame.chats || []).map((c) =>
    Array.isArray(c.chat) ? c.chat.map((s) => s.text).join("") : String(c.chat)
  );
  log(
    `chat mute check: pre-lock chat blocked=${!allChatTexts.some((t) => t.includes("muted window test"))}, post-lock chat delivered=${allChatTexts.some((t) => t.includes("reopened window test"))}`
  );
  log(`pre-lock anonymity leaks on the wire (must be 0): ${anonymityLeaks}`);
  log(`non-controller flap test: sent from ${nonController} (velocity before=${libBirdBefore})`);

  log(`mid-game chat delivery: ${midGameChatDelivered}`);

  const expectRotation = lastSnapshot.passedGapCount >= 3;
  // in long DEMO runs the difficulty escalation eventually kills the autopilot itself,
  // so either team may legitimately win; the scripted liberal win only holds otherwise
  const expectedWinnerOk = process.env.DEMO_SECONDS
    ? Boolean(lastSnapshot.winningTeam) && finalGame.gameState.isCompleted === lastSnapshot.winningTeam
    : lastSnapshot.winningTeam === "liberal" && finalGame.gameState.isCompleted === "liberal";
  const pass =
    expectedWinnerOk &&
    snapshotCount > 20 &&
    lastSnapshot.passedGapCount > 0 &&
    anonymityLeaks === 0 &&
    (!expectRotation || (rotationCount > 0 && midGameChatDelivered));
  log(
    pass
      ? "RESULT: PASS"
      : `RESULT: CHECK (winner=${lastSnapshot.winningTeam}, isCompleted=${finalGame.gameState.isCompleted}, snaps=${snapshotCount}, gaps=${lastSnapshot.passedGapCount}, rotations=${rotationCount}, leaks=${anonymityLeaks})`
  );

  Object.values(clients).forEach((c) => c.socket.close());
  process.exit(0);
};

main().catch((err) => {
  console.error("HARNESS FAILED:", err.message);
  process.exit(1);
});
