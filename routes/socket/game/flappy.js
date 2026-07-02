const { sendInProgressGameUpdate } = require("../util");
const { completeGame } = require("./end-game");

const FLAPPY_CONFIG = {
  tickMs: 50,
  spawnMs: 2600,
  gravity: 0.4,
  flapVelocity: -5.5,
  maxFallVelocity: 8,
  laneHeight: 220,
  laneWidth: 750,
  birdX: 60,
  birdWidth: 34,
  birdHeight: 44,
  pylonWidth: 40,
  pylonSpeed: 8,
  gapSize: 140,
};

let pylonIdCounter = 0;

const newBird = () => ({
  y: FLAPPY_CONFIG.laneHeight / 2 - FLAPPY_CONFIG.birdHeight / 2,
  velocity: 0,
  alive: true,
});

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

const buildSnapshot = (game) => {
  const { flappyState } = game;

  return {
    type: "snapshot",
    status: flappyState.status,
    winningTeam: flappyState.winningTeam,
    passedGapCount: flappyState.passedGapCount,
    liberal: {
      controllerUserName: flappyState.liberal.controllerUserName,
      bird: flappyState.liberal.bird,
    },
    fascist: {
      controllerUserName: flappyState.fascist.controllerUserName,
      bird: flappyState.fascist.bird,
    },
    pylons: flappyState.pylons.map((pylon) => ({
      id: pylon.id,
      x: pylon.x,
      gapTop: pylon.gapTop,
      gapBottom: pylon.gapBottom,
    })),
    config: flappyState.config,
  };
};

const broadcastFlappySnapshot = (game) => {
  if (!io.sockets.adapter.rooms[game.general.uid]) {
    return;
  }

  io.sockets.in(game.general.uid).emit("flappyUpdate", buildSnapshot(game));
};

const pushFlappyChat = (game, chatSegments) => {
  game.chats.push({
    gameChat: true,
    timestamp: new Date(),
    chat: chatSegments,
  });
};

const clearFlappyTimers = (game) => {
  if (game.private && game.private.flappyTimers) {
    clearInterval(game.private.flappyTimers.tick);
    clearInterval(game.private.flappyTimers.spawn);
    game.private.flappyTimers = null;
  }
};

const spawnPylon = (game) => {
  const { flappyState } = game;
  const { laneHeight, gapSize, laneWidth } = flappyState.config;
  const margin = 20;
  const gapTop = margin + Math.floor(Math.random() * (laneHeight - gapSize - margin * 2));

  flappyState.pylons.push({
    id: `pylon-${pylonIdCounter++}`,
    x: laneWidth,
    gapTop,
    gapBottom: gapTop + gapSize,
    counted: false,
  });
};

const birdCollides = (bird, pylons, config) => {
  const { birdX, birdWidth, birdHeight, laneHeight, pylonWidth } = config;

  if (bird.y + birdHeight >= laneHeight) {
    return true;
  }

  return pylons.some(
    (pylon) =>
      birdX + birdWidth > pylon.x &&
      birdX < pylon.x + pylonWidth &&
      (bird.y < pylon.gapTop || bird.y + birdHeight > pylon.gapBottom)
  );
};

const resetRound = (game) => {
  const { flappyState } = game;

  flappyState.liberal.bird = newBird();
  flappyState.fascist.bird = newBird();
  flappyState.pylons = [];
  pushFlappyChat(game, [{ text: "Both birds crash at once! The skies reset - sudden death continues." }]);
  sendInProgressGameUpdate(game, true);
};

const finishFlappy = (game, winningTeam) => {
  const { flappyState } = game;
  const losingTeam = winningTeam === "liberal" ? "fascist" : "liberal";

  flappyState.status = "finished";
  flappyState.winningTeam = winningTeam;
  clearFlappyTimers(game);

  pushFlappyChat(game, [
    {
      text: losingTeam === "fascist" ? "Fascists" : "Liberals",
      type: losingTeam,
    },
    { text: " crash! " },
    {
      text: winningTeam === "fascist" ? "Fascists" : "Liberals",
      type: winningTeam,
    },
    { text: " win the game." },
  ]);

  game.general.status = `FLAPPY HITLER: ${winningTeam === "fascist" ? "Fascists" : "Liberals"} win!`;

  game.publicPlayersState.forEach((player, i) => {
    player.cardStatus.cardFront = "secretrole";
    player.cardStatus.cardBack = game.private.seatedPlayers[i].role;
    player.cardStatus.cardDisplayed = true;
    player.cardStatus.isFlipped = false;
  });

  sendInProgressGameUpdate(game);
  broadcastFlappySnapshot(game);

  game.gameState.audioCue = winningTeam === "liberal" ? "liberalsWin" : "fascistsWin";
  setTimeout(
    () => {
      game.publicPlayersState.forEach((player) => {
        player.cardStatus.isFlipped = true;
      });
      game.gameState.audioCue = "";
      completeGame(game, winningTeam);
    },
    process.env.NODE_ENV === "development" ? 100 : 2000
  );
};

const advanceFlappy = (game) => {
  const { flappyState } = game;

  if (!flappyState || flappyState.status !== "running") {
    return;
  }

  if (game.gameState.isCompleted) {
    cleanupFlappy(game);
    return;
  }

  const config = flappyState.config;
  let gapsPassedThisTick = 0;

  ["liberal", "fascist"].forEach((team) => {
    const bird = flappyState[team].bird;

    bird.velocity = Math.min(bird.velocity + config.gravity, config.maxFallVelocity);
    bird.y += bird.velocity;

    if (bird.y < 0) {
      bird.y = 0;
      bird.velocity = 0;
    }
  });

  flappyState.pylons.forEach((pylon) => {
    pylon.x -= config.pylonSpeed;

    if (!pylon.counted && pylon.x + config.pylonWidth < config.birdX) {
      pylon.counted = true;
      gapsPassedThisTick++;
    }
  });
  flappyState.pylons = flappyState.pylons.filter((pylon) => pylon.x + config.pylonWidth > -10);

  if (gapsPassedThisTick) {
    flappyState.passedGapCount += gapsPassedThisTick;
    game.general.status = `FLAPPY HITLER: ${flappyState.passedGapCount} gap${flappyState.passedGapCount === 1 ? "" : "s"} passed.`;
    sendInProgressGameUpdate(game, true);
  }

  const liberalDead = birdCollides(flappyState.liberal.bird, flappyState.pylons, config);
  const fascistDead = birdCollides(flappyState.fascist.bird, flappyState.pylons, config);

  if (liberalDead && fascistDead) {
    resetRound(game);
  } else if (liberalDead) {
    flappyState.liberal.bird.alive = false;
    finishFlappy(game, "fascist");
    return;
  } else if (fascistDead) {
    flappyState.fascist.bird.alive = false;
    finishFlappy(game, "liberal");
    return;
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
      !game.general.isMonarchist &&
      game.private &&
      game.private.seatedPlayers &&
      livingTeamMembers(game, "liberal").length &&
      livingTeamMembers(game, "fascist").length
  );

/**
 * @param {object} game - game to act on.
 */
const startFlappy = (game) => {
  if (!canStartFlappy(game)) {
    return;
  }

  // stop any pending timed-mode move so the normal game can't advance underneath flappy
  if (game.private.timerId) {
    clearTimeout(game.private.timerId);
    game.private.timerId = null;
    game.gameState.timedModeEnabled = false;
  }

  const liberalOrder = livingTeamMembers(game, "liberal");
  const fascistOrder = livingTeamMembers(game, "fascist");

  game.gameState.phase = "flappyHitler";
  game.gameState.clickActionInfo = null;
  game.general.status = "FLAPPY HITLER: 0 gaps passed.";

  game.flappyState = {
    isActive: true,
    status: "running",
    winningTeam: null,
    passedGapCount: 0,
    startedAt: Date.now(),
    liberal: {
      controllerOrder: liberalOrder,
      controllerIndex: 0,
      controllerUserName: liberalOrder[0],
      bird: newBird(),
    },
    fascist: {
      controllerOrder: fascistOrder,
      controllerIndex: 0,
      controllerUserName: fascistOrder[0],
      bird: newBird(),
    },
    pylons: [],
    config: Object.assign({}, FLAPPY_CONFIG),
  };

  pushFlappyChat(game, [{ text: "Flappy Hitler begins. Policy victory is suspended." }]);
  pushFlappyChat(game, [
    { text: "Liberals", type: "liberal" },
    { text: " are controlled by " },
    { text: liberalOrder[0], type: "player" },
    { text: ". " },
    { text: "Fascists", type: "fascist" },
    { text: " are controlled by " },
    { text: fascistOrder[0], type: "player" },
    { text: "." },
  ]);

  // store numeric timer ids, not Timeout objects - those are cyclic and break JSON.stringify(game)
  game.private.flappyTimers = {
    tick: setInterval(() => {
      try {
        advanceFlappy(game);
      } catch (e) {
        console.log(e, "error in flappy tick");
        clearFlappyTimers(game);
      }
    }, FLAPPY_CONFIG.tickMs)[Symbol.toPrimitive](),
    spawn: setInterval(() => {
      if (game.flappyState && game.flappyState.status === "running") {
        spawnPylon(game);
      }
    }, FLAPPY_CONFIG.spawnMs)[Symbol.toPrimitive](),
  };

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

  if (
    !flappyState ||
    !flappyState.isActive ||
    flappyState.status !== "running" ||
    game.gameState.phase !== "flappyHitler" ||
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

  if (flappyState[team].controllerUserName !== passport.user) {
    return;
  }

  flappyState[team].bird.velocity = flappyState.config.flapVelocity;
};

/**
 * @param {object} game - game to clean up (on finish or table destruction).
 */
const cleanupFlappy = (game) => {
  clearFlappyTimers(game);

  if (game.flappyState) {
    game.flappyState.isActive = false;
  }
};

module.exports = {
  canStartFlappy,
  startFlappy,
  handleFlappyInput,
  cleanupFlappy,
  FLAPPY_CONFIG,
};
