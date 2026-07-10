const mongoose = require("mongoose");

// Single document holding the latest computed leaderboards. Written daily by the Render Cron Job
// (scripts/retrieveLeaderboardData.js) and read by GET /leaderboardData.json, so the
// memory-constrained web service never runs the heavy account scan itself. `payload` mirrors the JSON
// the frontend (Leaderboards.jsx) expects: { seasonalLeaderboardElo, seasonalLeaderboardXP,
// dailyLeaderboardElo, dailyLeaderboardXP, rainbowLeaderboard }.
const Leaderboard = new mongoose.Schema({
  _id: String, // always "current"
  payload: mongoose.Schema.Types.Mixed,
  updatedAt: Date,
});

module.exports = mongoose.model("Leaderboard", Leaderboard);

// Single source for the payload shape: the cron's working object and the route's empty fallback. A
// factory (fresh arrays each call) so the cron can push into it and the route can't mutate a shared one.
module.exports.freshBoard = () => ({
  seasonalLeaderboardElo: [],
  seasonalLeaderboardXP: [],
  dailyLeaderboardElo: [],
  dailyLeaderboardXP: [],
  rainbowLeaderboard: [],
});
