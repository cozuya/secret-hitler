// Vote-spam interval teardown lives in its own dependency-free module (like flappy-timers.js)
// so table deletion (game/end-game.js) can clear these intervals without a require cycle.
//
// Each seated player gets a per-unvote 2s setInterval in election.js whose callback closes over
// the whole `game` object. It is re-armed on each unvote and cleared only on that player's NEXT
// vote toggle — so a game that ends while an unvote timer is still live would otherwise leak its
// entire game object: the interval keeps firing after `delete games[uid]`, pinning `game` (chats,
// logs, all player + private state) against GC. That accumulation is a slow OOM. Clear them all
// on every teardown path (saveAndDeleteGame is the single chokepoint).

/**
 * @param {object} game - game whose vote-spam timers should be cleared.
 */
module.exports.clearVoteSpamTimers = (game) => {
  if (game && game.private && Array.isArray(game.private.voteSpamData)) {
    game.private.voteSpamData.forEach((entry) => {
      // -1 is the "no timer armed" sentinel set at game start; anything else is a live interval id.
      if (entry && entry.unvoteTimer !== -1) {
        clearInterval(entry.unvoteTimer);
        entry.unvoteTimer = -1;
      }
    });
  }
};
