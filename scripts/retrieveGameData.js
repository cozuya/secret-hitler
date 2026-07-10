const mongoose = require("mongoose");
const Game = require("../models/game");
const moment = require("moment");
const GameStats = require("../models/gameStats");
const { CURRENTSEASONNUMBER } = require("../src/frontend-scripts/node-constants");

// Computes overall + current-season win-rate stats per player count and stores them in a single Mongo
// document (read by GET /statsData.json). Runs as a Render Cron Job — a SEPARATE service from the web
// app — so this full `games` collection scan never competes with the memory-constrained game server
// (mirrors scripts/retrieveLeaderboardData.js). It used to write a data.json file the old VPS's nginx
// served directly; on Render that path doesn't exist, which is why the stats pages went blank.
//
// Usage: MONGO_URL="mongodb+srv://..." node scripts/retrieveGameData.js
const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017/secret-hitler-app";

// Build the accumulator from the model's shape factory (fresh objects) so the served payload and the
// route's empty fallback can never drift apart. These are references into `data`, so incrementing a
// bucket below mutates `data` directly — no reassembly needed before the write.
const data = GameStats.freshStats();
const {
  allPlayerGameData,
  fivePlayerGameData,
  sixPlayerGameData,
  sevenPlayerGameData,
  eightPlayerGameData,
  ninePlayerGameData,
  tenPlayerGameData,
} = data;

mongoose.Promise = global.Promise;
mongoose.connect(MONGO_URL);

Game.find({})
  .cursor()
  .eachAsync((game) => {
    const playerCount = game.losingPlayers.length + game.winningPlayers.length;
    const fascistsWon = game.winningTeam === "fascist";
    const gameDate = moment(new Date(game.date)).format("l");
    const rebalanced =
      (game.rebalance6p && playerCount === 6) ||
      (game.rebalance7p && playerCount === 7) ||
      (game.rebalance9p && playerCount === 9);
    const rebalanced9p2f = game.rebalance9p2f && playerCount === 9;

    if (
      gameDate === "5/13/2017" ||
      gameDate === moment(new Date()).format("l") ||
      (rebalanced &&
        playerCount === 9 &&
        (gameDate === "10/29/2017" ||
          gameDate === "10/30/2017" ||
          gameDate === "10/31/2017" ||
          gameDate === "11/1/2017" ||
          gameDate === "11/2/2017"))
    ) {
      return;
    }

    switch (playerCount) {
      case 5:
        fivePlayerGameData.totalGameCount++;
        if (fascistsWon) {
          fivePlayerGameData.fascistWinCount++;
        }

        if (game.season && game.season === CURRENTSEASONNUMBER) {
          fivePlayerGameData.totalGameCountSeason++;
          if (fascistsWon) {
            fivePlayerGameData.fascistWinCountSeason++;
          }
        }
        break;
      case 6:
        if (rebalanced) {
          if (fascistsWon) {
            sixPlayerGameData.rebalancedFascistWinCount++;
          }
          sixPlayerGameData.rebalancedTotalGameCount++;

          if (game.season && game.season === CURRENTSEASONNUMBER) {
            sixPlayerGameData.rebalancedTotalGameCountSeason++;
            if (fascistsWon) {
              sixPlayerGameData.rebalancedFascistWinCountSeason++;
            }
          }
        } else {
          if (fascistsWon) {
            sixPlayerGameData.fascistWinCount++;
          }
          sixPlayerGameData.totalGameCount++;

          if (game.season && game.season === CURRENTSEASONNUMBER) {
            sixPlayerGameData.totalGameCountSeason++;
            if (fascistsWon) {
              sixPlayerGameData.fascistWinCountSeason++;
            }
          }
        }
        break;
      case 7:
        if (rebalanced) {
          if (fascistsWon) {
            sevenPlayerGameData.rebalancedFascistWinCount++;
          }
          sevenPlayerGameData.rebalancedTotalGameCount++;

          if (game.season && game.season === CURRENTSEASONNUMBER) {
            sevenPlayerGameData.rebalancedTotalGameCountSeason++;
            if (fascistsWon) {
              sevenPlayerGameData.rebalancedFascistWinCountSeason++;
            }
          }
        } else {
          if (fascistsWon) {
            sevenPlayerGameData.fascistWinCount++;
          }
          sevenPlayerGameData.totalGameCount++;

          if (game.season && game.season === CURRENTSEASONNUMBER) {
            sevenPlayerGameData.totalGameCountSeason++;
            if (fascistsWon) {
              sevenPlayerGameData.fascistWinCountSeason++;
            }
          }
        }
        break;
      case 8:
        eightPlayerGameData.totalGameCount++;
        if (fascistsWon) {
          eightPlayerGameData.fascistWinCount++;
        }
        if (game.season && game.season === CURRENTSEASONNUMBER) {
          eightPlayerGameData.totalGameCountSeason++;
          if (fascistsWon) {
            eightPlayerGameData.fascistWinCountSeason++;
          }
        }
        break;
      case 9:
        if (rebalanced) {
          if (fascistsWon) {
            ninePlayerGameData.rebalancedFascistWinCount++;
          }
          ninePlayerGameData.rebalancedTotalGameCount++;
        } else if (rebalanced9p2f) {
          if (fascistsWon) {
            ninePlayerGameData.rebalanced2fFascistWinCount++;
          }
          ninePlayerGameData.rebalanced2fTotalGameCount++;

          if (game.season && game.season === CURRENTSEASONNUMBER) {
            ninePlayerGameData.rebalanced2fTotalGameCountSeason++;
            if (fascistsWon) {
              ninePlayerGameData.rebalanced2fFascistWinCountSeason++;
            }
          }
        } else {
          if (fascistsWon) {
            ninePlayerGameData.fascistWinCount++;
          }
          ninePlayerGameData.totalGameCount++;
          if (game.season && game.season === CURRENTSEASONNUMBER) {
            ninePlayerGameData.totalGameCountSeason++;
            if (fascistsWon) {
              ninePlayerGameData.fascistWinCountSeason++;
            }
          }
        }
        break;
      case 10:
        tenPlayerGameData.totalGameCount++;
        if (fascistsWon) {
          tenPlayerGameData.fascistWinCount++;
        }
        if (game.season && game.season === CURRENTSEASONNUMBER) {
          tenPlayerGameData.totalGameCountSeason++;
          if (fascistsWon) {
            tenPlayerGameData.fascistWinCountSeason++;
          }
        }
        break;
    }
    allPlayerGameData.totalGameCount++;
    if (fascistsWon) {
      allPlayerGameData.fascistWinCount++;
    }
    if (game.season && game.season === CURRENTSEASONNUMBER) {
      allPlayerGameData.totalGameCountSeason++;
      if (fascistsWon) {
        allPlayerGameData.fascistWinCountSeason++;
      }
    }
  })
  .then(async () => {
    // `data` already holds every bucket (they were destructured out of it above), so just persist it.
    await GameStats.findByIdAndUpdate("current", { payload: data, updatedAt: new Date() }, { upsert: true });
    await mongoose.connection.close();
    console.log("[stats] updated", {
      totalGames: allPlayerGameData.totalGameCount,
      seasonGames: allPlayerGameData.totalGameCountSeason,
    });
    process.exit(0);
  })
  .catch((err) => {
    // Non-zero exit so Render flags the cron run as failed rather than silently serving stale stats.
    console.log("[stats] fatal:", err);
    process.exit(1);
  });
