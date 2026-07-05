// Flappy interval teardown lives in its own dependency-free module so both the engine
// (game/flappy.js) and table deletion (game/end-game.js) share one implementation
// without creating a require cycle (flappy requires end-game for completeGame).

/**
 * @param {object} game - game whose flappy timers should be cleared.
 */
module.exports.clearFlappyTimers = (game) => {
  if (game && game.private && game.private.flappyTimers) {
    clearInterval(game.private.flappyTimers.tick);
    clearInterval(game.private.flappyTimers.spawn);
    game.private.flappyTimers = null;
  }
};
