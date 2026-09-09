// Bump only this value for a new season; schema paths and live counter keys follow it.
const CURRENT_SEASON_NUMBER = 25;
const PROVISIONAL_RANKED_GAMES = 10;
const SEASON_LEADERBOARD_MIN_GAMES = 20;
const SEASON_LEADERBOARD_ACTIVE_DAYS = 14;

// Historical identities, not the current season. Do not bump these with a future season.
const OPENSKILL_MIGRATION_VERSION = 24;
const S25_CUTOVER_VERSION = 25;

const seasonCounterFields = (season) => ({
  wins: `winsSeason${season}`,
  losses: `lossesSeason${season}`,
  rainbowWins: `rainbowWinsSeason${season}`,
  rainbowLosses: `rainbowLossesSeason${season}`,
});

const CURRENT_SEASON_FIELDS = seasonCounterFields(CURRENT_SEASON_NUMBER);

module.exports = {
  CURRENT_SEASON_NUMBER,
  CURRENT_SEASON_FIELDS,
  PROVISIONAL_RANKED_GAMES,
  SEASON_LEADERBOARD_MIN_GAMES,
  SEASON_LEADERBOARD_ACTIVE_DAYS,
  OPENSKILL_MIGRATION_VERSION,
  S25_CUTOVER_VERSION,
  seasonCounterFields,
};
