const mongoose = require("mongoose");

// Single document holding the latest computed win-rate stats. Written daily by the Render Cron Job
// (scripts/retrieveGameData.js) and read by GET /statsData.json, so the memory-constrained web
// service never runs the full `games` collection scan itself. `payload` mirrors the JSON the stats
// charts (public/scripts/charts.js — overall, and charts-season.js — current season) expect: one
// bucket per player count, e.g. { allPlayerGameData, fivePlayerGameData, ... }.
const GameStats = new mongoose.Schema({
  _id: String, // always "current"
  payload: mongoose.Schema.Types.Mixed,
  updatedAt: Date,
});

module.exports = mongoose.model("GameStats", GameStats);

// Single source for the payload shape: the cron builds its working accumulator from this (freshly, so
// each bucket is a distinct object) and the route serves it verbatim as the empty fallback before the
// first cron run. Each bucket carries both overall counts and their `...Season` counterparts — the
// overall charts read the former, the season charts read the latter. Keep this in lockstep with the
// fields the two charts scripts index into.
module.exports.freshStats = () => ({
  allPlayerGameData: {
    fascistWinCount: 0,
    totalGameCount: 0,
    fascistWinCountSeason: 0,
    totalGameCountSeason: 0,
  },
  fivePlayerGameData: {
    fascistWinCount: 0,
    totalGameCount: 0,
    fascistWinCountSeason: 0,
    totalGameCountSeason: 0,
  },
  sixPlayerGameData: {
    fascistWinCount: 0,
    totalGameCount: 0,
    rebalancedFascistWinCount: 0,
    rebalancedTotalGameCount: 0,
    fascistWinCountSeason: 0,
    totalGameCountSeason: 0,
    rebalancedFascistWinCountSeason: 0,
    rebalancedTotalGameCountSeason: 0,
  },
  sevenPlayerGameData: {
    fascistWinCount: 0,
    totalGameCount: 0,
    rebalancedFascistWinCount: 0,
    rebalancedTotalGameCount: 0,
    fascistWinCountSeason: 0,
    totalGameCountSeason: 0,
    rebalancedFascistWinCountSeason: 0,
    rebalancedTotalGameCountSeason: 0,
  },
  eightPlayerGameData: {
    fascistWinCount: 0,
    totalGameCount: 0,
    fascistWinCountSeason: 0,
    totalGameCountSeason: 0,
  },
  ninePlayerGameData: {
    fascistWinCount: 0,
    totalGameCount: 0,
    rebalanced2fFascistWinCount: 0,
    rebalanced2fTotalGameCount: 0,
    fascistWinCountSeason: 0,
    totalGameCountSeason: 0,
    rebalanced2fFascistWinCountSeason: 0,
    rebalanced2fTotalGameCountSeason: 0,
  },
  tenPlayerGameData: {
    fascistWinCount: 0,
    totalGameCount: 0,
    fascistWinCountSeason: 0,
    totalGameCountSeason: 0,
  },
});
