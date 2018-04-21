static void rateGame(Game game) {
  double avgRatingWinners = getAverageRating(game.getWinningPlayers());
  double avgRatingLosers = getAverageRating(game.getLosingPlayers());
  boolean liberalsWon = "liberal".equals(game.getWinningTeam());

  // Add rating offset to the Liberal team, depending on player count
  // libTeamAdjustment stores one global rating-offset for the lib team for each player count
  if (liberalsWon)
    avgRatingWinners += libTeamAdjustment[game.getPlayerCount()];
  else
    avgRatingLosers += libTeamAdjustment[game.getPlayerCount()];

  // p is the expected winning % by ratings prior to the match
  // for the team that ended up losing
  double p = 1.0 / (1.0 + Math.pow(10.0, (avgRatingWinners - avgRatingLosers) / 400.0));

  // ELO's K, this affects how fast ratings change.
  // Below is K=32 for 5 players, scaled down to K=16 for 10 players.
  double k = 160.0 / game.getPlayerCount();

  // Update player ratings
  updateRatings(game.getWinningPlayers(), k * p);
  updateRatings(game.getLosingPlayers(), -k * p);

  // We use K=1 to update libTeamAdjustment
  // These ratings should remain fairly stable unless you re-balance the game
  libTeamAdjustment[game.getPlayerCount()] += p * (liberalsWon ? 1 : -1);
}

// Hey, actually realized that the last version i sent may suffer from some long-term rating inflation/deflation. It's not a big deal if you are done implementing already, but you may want to fix the part below:

// ELO's K, this affects how fast ratings change.
// Total K for the team, this is divided by teamsize below
double k = 64;

// Update player ratings
updateRatings(game.getWinningPlayers(), k * p / game.getWinningPlayers().size());
updateRatings(game.getLosingPlayers(), -k * p / game.getLosingPlayers().size());

// This change makes sure that the average of all ratings remains at constant 1600, I overlooked that in the initial version - usually teams are the same size 

// Some notes on the choice of K: Highest accuracy seems to be around k=40, but players usually prefer ratings to be a bit more dynamic. I'd rather go with something higher even if accuracy is slightly worse (e.g. k=64).