const {
  CURRENT_SEASON_FIELDS,
  PROVISIONAL_RANKED_GAMES,
  SEASON_LEADERBOARD_MIN_GAMES,
  SEASON_LEADERBOARD_ACTIVE_DAYS,
} = require("./season");

// Missing counters are zero; malformed counters must not manufacture leaderboard qualification.
const rankedProgress = (wins, losses) => {
  const counts = [wins ?? 0, losses ?? 0];
  const sum = counts.every((count) => Number.isSafeInteger(count) && count >= 0) ? counts[0] + counts[1] : 0;
  const rankedGames = Number.isSafeInteger(sum) ? sum : 0;
  return { rankedGames, provisional: rankedGames < PROVISIONAL_RANKED_GAMES };
};

// nowMs is an explicit epoch-millisecond clock so the cron evaluates every row at one instant.
// No score floor or decay: this governs visibility only, not stored public rating.
const rankedSeasonEligibility = (account, nowMs) => {
  const progress = rankedProgress(account?.[CURRENT_SEASON_FIELDS.wins], account?.[CURRENT_SEASON_FIELDS.losses]);
  // R7: only a ranked result restores this window. General/casual activity cannot stand in for it.
  const lastRanked = account?.lastRankedGameAt;
  const lastRankedMs = lastRanked instanceof Date ? lastRanked.getTime() : NaN;
  // The cutoff is captured when the cron starts. A result arriving during its scan is still active.
  const active =
    Number.isFinite(nowMs) &&
    Number.isFinite(lastRankedMs) &&
    lastRankedMs >= nowMs - SEASON_LEADERBOARD_ACTIVE_DAYS * 24 * 60 * 60 * 1000;
  return {
    ...progress,
    active,
    eligible: progress.rankedGames >= SEASON_LEADERBOARD_MIN_GAMES && active && !account?.isBanned,
  };
};

module.exports = { rankedProgress, rankedSeasonEligibility };
