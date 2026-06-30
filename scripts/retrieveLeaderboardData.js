const mongoose = require("mongoose");
const Account = require("../models/account");
const Leaderboard = require("../models/leaderboard");

// Computes the daily / seasonal / rainbow leaderboards and stores them in a single Mongo document
// (read by GET /leaderboardData.json). Runs as a Render Cron Job — a SEPARATE service from the web
// app — so this heavy account scan never competes with the memory-constrained game server, and it
// doesn't need the web service's Persistent Disk (a Render disk attaches to one service only). It
// also rolls the daily baselines (previousDayElo / previousDayXP) forward for the next run.
//
// Usage: MONGO_URL="mongodb+srv://..." node scripts/retrieveLeaderboardData.js

const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017/secret-hitler-app";

const main = async () => {
  mongoose.Promise = global.Promise;
  await mongoose.connect(MONGO_URL);

  const data = Leaderboard.freshBoard();

  // Daily movement: accounts active in the last 24h, vs their stored baseline. Roll the baseline
  // forward HERE — for the active set whose deltas we actually report — so 1-2 game accounts (which
  // the >= 3-game seasonal scan below would never roll) don't re-report the same non-advancing delta
  // every day. Exclude banned from the board like the other leaderboards (the roll still applies to
  // them, harmlessly). Awaited — the old script fire-and-forgot these baseline writes.
  await Account.find({ lastCompletedGame: { $gte: new Date(Date.now() - 86400000) } })
    .cursor()
    .eachAsync(async (account) => {
      if (!account.isBanned) {
        data.dailyLeaderboardElo.push({
          userName: account.username,
          dailyEloDifference: account.eloSeason - (account.previousDayElo || 1600),
        });
        data.dailyLeaderboardXP.push({
          userName: account.username,
          // XP baseline is 0 — the 1600 used for ELO above is an ELO rating baseline, not XP.
          dailyXPDifference: account.xpSeason - (account.previousDayXP || 0),
        });
      }
      account.previousDayElo = account.eloSeason;
      account.previousDayXP = account.xpSeason;
      try {
        await account.save();
      } catch (err) {
        // One bad doc (e.g. a validation failure) must not abort the whole run — that would reject
        // main(), skip the Mongo upsert, and leave the served leaderboard stale site-wide. Log + skip.
        console.log(err, `[leaderboard] failed to roll daily baseline for ${account.username}`);
      }
    });

  // Seasonal + rainbow boards over accounts with >= 3 games (read-only — baselines are rolled above).
  // TODO: the 1600 baseline (daily scan) and 1620 seasonal floor below are the legacy DISPLAY_BASE and
  // its +20 floor; import DISPLAY_BASE from routes/socket/rating/display.js so a DISPLAY_SCALE/anchor
  // re-tune doesn't leave these stale and mis-report daily deltas / the seasonal cutoff.
  await Account.find({ "games.2": { $exists: true } })
    .cursor()
    .eachAsync((account) => {
      if (account.eloSeason > 1620 && !account.isBanned) {
        data.seasonalLeaderboardElo.push({ userName: account.username, elo: account.eloSeason });
      }
      if (account.xpSeason > 10 && !account.isBanned) {
        data.seasonalLeaderboardXP.push({ userName: account.username, xp: account.xpSeason });
      }
      if (account.isRainbowOverall && !account.isBanned) {
        data.rainbowLeaderboard.push({ userName: account.username, date: account.dateRainbowOverall || new Date(0) });
      }
    });

  data.dailyLeaderboardElo = data.dailyLeaderboardElo
    .sort((a, b) => b.dailyEloDifference - a.dailyEloDifference)
    .slice(0, 20);
  data.dailyLeaderboardXP = data.dailyLeaderboardXP
    .sort((a, b) => b.dailyXPDifference - a.dailyXPDifference)
    .slice(0, 20);
  data.seasonalLeaderboardElo = data.seasonalLeaderboardElo.sort((a, b) => b.elo - a.elo).slice(0, 20);
  data.seasonalLeaderboardXP = data.seasonalLeaderboardXP.sort((a, b) => b.xp - a.xp).slice(0, 20);
  data.rainbowLeaderboard = data.rainbowLeaderboard.sort((a, b) => b.date - a.date).slice(0, 20);

  await Leaderboard.findByIdAndUpdate("current", { payload: data, updatedAt: new Date() }, { upsert: true });

  await mongoose.connection.close();
  console.log("[leaderboard] updated", {
    seasonalElo: data.seasonalLeaderboardElo.length,
    seasonalXP: data.seasonalLeaderboardXP.length,
    dailyElo: data.dailyLeaderboardElo.length,
    rainbow: data.rainbowLeaderboard.length,
  });
  process.exit(0);
};

main().catch((err) => {
  console.log("[leaderboard] fatal:", err);
  process.exit(1);
});
