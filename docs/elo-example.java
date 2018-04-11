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