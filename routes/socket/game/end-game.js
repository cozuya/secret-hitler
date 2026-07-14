const { sendInProgressGameUpdate } = require("../util.js");
const { computeRatingUpdates, xpAward, SEASON_MIGRATED_VERSION } = require("../rating/rate.js");
const { DISPLAY_BASE } = require("../rating/display.js");
const { userList, games } = require("../models.js");
const { clearFlappyTimers } = require("./flappy-timers");
const { clearVoteSpamTimers } = require("./vote-timers");
const { sendUserList, sendGameList } = require("../user-requests.js");
const Account = require("../../../models/account.js");
const Game = require("../../../models/game");
const buildEnhancedGameSummary = require("../../../models/game-summary/buildEnhancedGameSummary");
const { updateProfiles } = require("../../../models/profile/utils");
const debug = require("debug")("game:summary");
const animals = require("../../../utils/animals");
const adjectives = require("../../../utils/adjectives");
const _ = require("lodash");
const { makeReport } = require("../report.js");
const { CURRENTSEASONNUMBER } = require("../../../src/frontend-scripts/node-constants.js");
const { LineGuess } = require("../util");
const { checkBadgesELO, checkBadgesXP } = require("../badges");

// XP award + rainbow promotion, shared by the ranked and silent/practice end-game paths so the
// amount and the >=10 rainbow threshold can't drift apart between them again. The amount comes from
// rate.js's xpAward (rainbow scales the win to preserve the ~2.25x pacing); the silent/practice path
// leaves isRainbow false to keep its historical flat +2/+1.
// This deliberately unifies the casual/practice rainbow threshold down from a stale 50 to the ranked
// value of 10 — for BOTH tracks: isRainbowOverall (xpOverall>=10) and isRainbowSeason (xpSeason>=10).
// Season track: xpSeason is zeroed at the cutover, so nothing flips at launch; afterwards a
// casual/practice player reaches season rainbow in ~5-10 games (was ~25-50) — intended.
// Overall track (cumulative, never reset): a never-ranked account sitting at 10-49 overall XP (and
// not already rainbow) earns overall rainbow on its next silent/practice game — intended; the set is
// small since the ranked path already grants overall rainbow at 10.
const applyXpAndRainbow = (player, won, isRainbow = false) => {
  const gain = xpAward(won, isRainbow);
  player.xpOverall = (player.xpOverall || 0) + gain;
  player.xpSeason = (player.xpSeason || 0) + gain;
  if (player.xpOverall >= 10.0) {
    // Stamp the date the first time it's missing (the transition into rainbow, or a one-time backfill
    // for a legacy rainbow account that never had a date), then never re-stamp. Keeps the rainbow
    // leaderboard (sorted by dateRainbowOverall desc) ordered by when rainbow was earned rather than
    // who played most recently, without leaving date-less legacy accounts stuck at epoch 0.
    if (!player.dateRainbowOverall) player.dateRainbowOverall = new Date();
    player.isRainbowOverall = true;
  }
  if (player.xpSeason >= 10.0) {
    player.isRainbowSeason = true;
  }
};

const generateGameObject = (game) => {
  const casualBool = Boolean(game?.general?.casualGame); // Because Mongo is explicitly typed and integers are not truthy according to it
  const practiceBool = Boolean(game?.general?.practiceGame);
  const unlistedBool = Boolean(game?.general?.unlistedGame);
  const objMap = (obj, f) => new Map(Object.entries(obj || {})?.map(([k, v]) => [k, f(k, v)]));

  if (game?.gameState && game?.gameState?.isCompleted) {
    return {
      uid: game?.general?.uid,
      name: game?.general?.name,
      date: new Date(),
      guesses: objMap(game?.guesses, (_, g) => g?.toString()),
      merlinGuesses: objMap(game?.merlinGuesses, (_, g) => g),
      playerChats: game?.general?.playerChats,
      chats: game?.chats?.concat(game?.private?.unSeatedGameChats)?.concat(game?.private?.replayGameChats),
      hiddenInfoChat: game?.private?.hiddenInfoChat,
      isVerifiedOnly: game?.general?.isVerifiedOnly,
      season: CURRENTSEASONNUMBER,
      winningPlayers: game?.private?.seatedPlayers
        ?.filter((player) => player?.wonGame)
        ?.map((player) => ({
          userName: player?.userName,
          team: player?.role?.team,
          role: player?.role?.cardName,
        })),
      losingPlayers: game?.private?.seatedPlayers
        ?.filter((player) => !player?.wonGame)
        ?.map((player) => ({
          userName: player?.userName,
          team: player?.role?.team,
          role: player?.role?.cardName,
        })),
      winningTeam: game?.gameState?.isCompleted,
      playerCount: game?.general?.playerCount,
      rebalance6p: game?.general?.rebalance6p,
      rebalance7p: game?.general?.rebalance7p,
      rebalance9p2f: game?.general?.rebalance9p2f,
      casualGame: casualBool,
      practiceGame: practiceBool,
      customGame: game?.customGameSettings?.enabled,
      unlistedGame: unlistedBool,
      isRainbow: game?.general?.rainbowgame,
      isTournyFirstRound: game?.general?.isTourny && game?.general?.tournyInfo?.round === 1,
      isTournySecondRound: game?.general?.isTourny && game?.general?.tournyInfo?.round === 2,
      timedMode: game?.general?.timedMode,
      blindMode: game?.general?.blindMode,
      eloMinimum: game?.general?.eloMinimum,
      xpMinimum: game?.general?.xpMinimum,
      avalonSH: game?.general?.avalonSH,
      monarchistSH: game?.general?.monarchistSH,
      noTopdecking: game?.general?.noTopdecking,
      completed: true,
    };
  }

  /**
   * @param {object} - object describing game model.
   */

  return {
    uid: game?.general?.uid,
    name: game?.general?.name,
    date: new Date(),
    guesses: objMap(game?.guesses, (_, g) => g?.toString()),
    merlinGuesses: objMap(game?.merlinGuesses, (_, g) => g),
    playerChats: game?.general?.playerChats,
    chats: game?.chats?.concat(game?.private?.unSeatedGameChats)?.concat(game?.private?.replayGameChats),
    isVerifiedOnly: game?.general?.isVerifiedOnly,
    season: CURRENTSEASONNUMBER,
    losingPlayers: game?.publicPlayersState?.map((player) => ({
      userName: player?.userName,
      team: player?.role && player?.role?.team,
      role: player?.role && player?.role?.cardName,
    })),
    playerCount: game?.general?.playerCount,
    rebalance6p: game?.general?.rebalance6p,
    rebalance7p: game?.general?.rebalance7p,
    rebalance9p2f: game?.general?.rebalance9p2f,
    casualGame: casualBool,
    practiceGame: practiceBool,
    customGame: game?.customGameSettings?.enabled,
    unlistedGame: unlistedBool,
    isRainbow: game?.general?.rainbowgame,
    isTournyFirstRound: game?.general?.isTourny && game?.general?.tournyInfo?.round === 1,
    isTournySecondRound: game?.general?.isTourny && game?.general?.tournyInfo?.round === 2,
    timedMode: game?.general?.timedMode,
    blindMode: game?.general?.blindMode,
    eloMinimum: game?.general?.eloMinimum,
    xpMinimum: game?.general?.xpMinimum,
    avalonSH: game?.general?.avalonSH,
    monarchistSH: game?.general?.monarchistSH,
    noTopdecking: game.general?.noTopdecking,
    completed: false,
  };
};

const formatSignedDelta = (value) => {
  const safeValue = Number(value) || 0;
  return `${safeValue >= 0 ? "+" : "-"}${Math.abs(safeValue).toFixed(1)}`;
};

// One end-of-game delta chat line ("<name>'s Elo: +X (Y)" / "<name>'s XP: ..."). Shared by the
// public replay log and the per-viewer seated chats, which build the byte-identical shape.
const buildDeltaChat = (eachPlayer, label, active, secondary, i) => ({
  gameChat: true,
  timestamp: new Date(Date.now() + i),
  chat: [
    { text: eachPlayer.userName, type: eachPlayer.role.cardName },
    { text: `'s ${label}: ` },
    { text: ` ${formatSignedDelta(active)}`, type: "player" },
    { text: ` (${formatSignedDelta(secondary)})` },
  ],
});

/**
 * @param {object} game - game to act on.
 */
const saveGame = (game) => {
  const summary = game.gameState.isCompleted && game.private.summary && game.private.summary.publish();

  /**
   * @param {object} - object describing game model.
   */
  const gameToSave = new Game(generateGameObject(game));

  let enhanced;

  try {
    if (summary && summary.toObject() && game.general.uid !== "devgame" && !game.general.private) {
      enhanced = buildEnhancedGameSummary(summary.toObject());
      updateProfiles(game, enhanced);
      if (!game.summarySaved) {
        // A rejected save() is NOT caught by this try/catch (it's async) — and an unhandled
        // rejection is fatal: bin/dev.js logs and exits, ending every live game. The game is over
        // by the time we're here, so a failed persist must be logged, not escalated.
        summary.save().catch((error) => console.log(error, "err saving summary in saveGame"));
        game.summarySaved = true;
      }
    } else {
      // console.log(summary, 'problem with summary');
    }
  } catch (error) {
    console.log(error, "error in enhanced/end-game");
  }

  debug("Saving game: %O", summary);
  gameToSave.save().catch((error) => console.log(error, "err saving game in saveGame"));
};

// Save a game and then potentially perform another action (usually deleting the game)
const saveOrUpdateGame = (gameID, callback) => {
  const gameInMemory = games[gameID];

  Game.findOne({ uid: gameID })
    .then((game) => {
      if (game) {
        const newObject = generateGameObject(gameInMemory); // in theory this should only be chats (as the only time a game is saved and *not* deleted is on game end) but for forwards compatibility all keys are checked

        for (const key in newObject) {
          if (newObject.hasOwnProperty(key) && game[key] !== newObject[key]) {
            // check in order to prevent unnecessarily marking fields as modified in mongoose
            game[key] = newObject[key];
          }
        }

        // Backstop for the teardown guard in saveAndDeleteGame: if two writers ever do reach the
        // same doc, `chats` is an Array, and a wholesale $set on an array makes mongoose put __v in
        // the where-clause and $inc it — so the loser rejects with a VersionError. Unhandled, that
        // rejection is fatal (bin/dev.js exits), which is how a save conflict on an already-finished
        // game ended every live game in production. Both writers persist the same in-memory game, so
        // the loser's write is redundant: log it and move on.
        game.save().catch((err) => console.log(err, "err saving game in saveOrUpdateGame"));
      } else {
        saveGame(gameInMemory);
      }

      if (callback) callback();
    })
    .catch((err) => {
      console.log(err, "err in saveOrUpdateGame");
      // The callback (which deletes the game from memory) never ran, so release the teardown guard:
      // otherwise a transient DB error strands the game in `games` forever. The 30s garbage
      // collector still sees it as completed/abandoned and will re-attempt the teardown.
      if (gameInMemory) gameInMemory.isBeingTornDown = false;
    });
};

const saveAndDeleteGame = (gameID) => {
  const game = games[gameID];

  // Teardown must run at most once per game. saveOrUpdateGame does a DB round-trip before its
  // callback deletes games[gameID], so the game stays in `games` for the whole find — and every
  // trigger below can fire inside that window and start a *second* teardown of the same game: the
  // 30s garbage collector (routes.js), the last player leaving (leave-game.js, whose empty-table
  // branch is re-entrant), a passed remake vote, and a mod deleting the game. Two teardowns race to
  // save the same doc and the loser throws a fatal VersionError (see saveOrUpdateGame).
  // Bailing on a missing game also stops a worse outcome: generateGameObject(undefined) yields an
  // all-undefined object, which would overwrite the stored game record with empty fields.
  if (!game || game.isBeingTornDown) {
    return;
  }
  game.isBeingTornDown = true;

  clearFlappyTimers(game);
  // clear per-player unvote intervals too — otherwise they keep firing after the game is
  // deleted and their closures pin the whole game object in memory (slow OOM leak).
  clearVoteSpamTimers(game);

  saveOrUpdateGame(gameID, () => {
    delete games[gameID];
    sendGameList();
  });
};

module.exports.saveOrUpdateGame = saveOrUpdateGame;
module.exports.saveAndDeleteGame = saveAndDeleteGame;
module.exports.generateGameObject = generateGameObject;
module.exports.saveGame = saveGame;

/**
 * @param {object} game - game to act on.
 * @param {string} winningTeamName - name of the team that won this game.
 */
module.exports.completeGame = (game, winningTeamName) => {
  // Defense-in-depth at the sink: winner/loser partitioning and the rating engine assume a real team.
  // A bad value (omitted/typo'd/computed by any caller, or a future no-winner path) would rate the
  // whole table as losing fascists. Rather than abort completeGame entirely (which would skip the
  // teardown below and hang the game), gate only the rating/XP step on a valid winner — the game
  // still ends (reports flushed, saved, players released), just as a no-op rating-wise. The
  // moderation handler validates its wire input separately; today's other callers pass literals.
  const winnerValid = winningTeamName === "liberal" || winningTeamName === "fascist";
  if (!winnerValid) {
    console.log(winningTeamName, "invalid winningTeamName in completeGame; ending game without rating it");
  }

  if (game && game.unsentReports) {
    game.unsentReports.forEach((report) => {
      makeReport({ ...report }, game, report.type === "modchat" ? "modchatdelayed" : "reportdelayed");
    });
    game.unsentReports = [];
  }

  for (let affectedPlayerNumber = 0; affectedPlayerNumber < game.publicPlayersState.length; affectedPlayerNumber++) {
    const affectedSocketId = Object.keys(io.sockets.sockets).find(
      (socketId) =>
        io.sockets.sockets[socketId].handshake.session.passport &&
        io.sockets.sockets[socketId].handshake.session.passport.user ===
          game.publicPlayersState[affectedPlayerNumber].userName
    );
    if (!io.sockets.sockets[affectedSocketId]) {
      continue;
    }
    io.sockets.sockets[affectedSocketId].emit("removeClaim");
  }

  if (game && game.general && game.general.timedMode && game.private.timerId) {
    clearTimeout(game.private.timerId);
    game.private.timerId = null;
    game.gameState.timedModeEnabled = false;
  }

  if (game && game.general.isRecorded) {
    console.log("A game attempted to be re-recorded!", game.general.uid);
    return;
  }

  const winningPrivatePlayers = game.private.seatedPlayers.filter((player) => player.role.team === winningTeamName);
  const winningPlayerNames = winningPrivatePlayers.map((player) => player.userName);
  let { seatedPlayers } = game.private;
  const { publicPlayersState } = game;
  const chat = {
    gameChat: true,
    timestamp: new Date(),
    chat: [
      {
        text: winningTeamName === "fascist" ? "Fascists" : "Liberals",
        type: winningTeamName === "fascist" ? "fascist" : "liberal",
      },
      { text: " win the game." },
    ],
  };
  const remainingPoliciesChat = {
    isRemainingPolicies: true,
    timestamp: new Date(),
    chat: [
      {
        text: "The remaining policies are ",
      },
      {
        policies: game.private.policies.map((policyName) => (policyName === "liberal" ? "b" : "r")),
      },
      {
        text: ".",
      },
    ],
  };

  if (!(game.general.isTourny && game.general.tournyInfo.round === 1)) {
    winningPrivatePlayers.forEach((player, index) => {
      publicPlayersState.find((play) => play.userName === player.userName).notificationStatus = "success";
      publicPlayersState.find((play) => play.userName === player.userName).isConfetti = true;
      player.wonGame = true;
    });

    setTimeout(() => {
      winningPrivatePlayers.forEach((player, index) => {
        publicPlayersState.find((play) => play.userName === player.userName).isConfetti = false;
      });
      sendInProgressGameUpdate(game, true);
    }, 15000);
  }

  game.general.status = winningTeamName === "fascist" ? "Fascists win the game." : "Liberals win the game.";
  game.gameState.isCompleted = winningTeamName;
  game.gameState.timeCompleted = Date.now();
  sendGameList();

  publicPlayersState.forEach((publicPlayer, index) => {
    publicPlayer.nameStatus = seatedPlayers[index].role.cardName;
  });

  seatedPlayers.forEach((player) => {
    player.gameChats.push(chat, remainingPoliciesChat);
  });

  game.private.unSeatedGameChats.push(chat, remainingPoliciesChat);

  game.summary = game.private.summary;
  debug("Final game summary: %O", game.summary.publish().toObject());

  sendInProgressGameUpdate(game);

  saveGame(game);

  game.general.isRecorded = true;

  // Built once and reused for both Account.find $in queries and the rating call (which needs the
  // full roster), so the seated->username mapping can't drift across those call sites. Order is
  // irrelevant (used only as a membership/$in set), so the later seatedPlayers re-sort doesn't matter.
  const seatedUserNames = seatedPlayers.map((player) => player.userName);

  // Don't compute Elo for private, casual, custom, practice, or unlisted games.
  // Silent (playerChats === "disabled") games are eligible when otherwise ranked (i.e. none of
  // the flags below are set); only casual/practice silent games fall through to the XP-only path.
  // NOTE: this ranked / xp-only / none taxonomy is also expressed at the silent-path `else if` below
  // and in generateGameObject. A single shared gameRatingMode(game) was considered but deferred —
  // rewiring the live end-game gate has no gameplay test coverage. If you add a new mode flag, thread
  // it through all three sites or they silently desync.
  if (
    winnerValid &&
    !game.general.private &&
    !game.general.casualGame &&
    !(game.customGameSettings && game.customGameSettings.enabled) &&
    !game.general.practiceGame &&
    !game.general.unlistedGame
  ) {
    Account.find({
      username: { $in: seatedUserNames },
    })
      .then((results) => {
        const isRainbow = game.general.rainbowgame;
        const isTournamentFinalGame = game.general.isTourny && game.general.tournyInfo.round === 2;
        // Pure computation only — no DB writes here. Deltas are applied + persisted once below,
        // in the results.forEach that already saves each account (no more mid-loop double-save).
        // Pass the full seated roster so a player whose account didn't resolve (deleted/renamed mid
        // game) doesn't shrink the OpenSkill teams and skew everyone else's deltas.
        const eloAdjustments = computeRatingUpdates(game, results, winningPlayerNames, seatedUserNames);
        const ratingDate = new Date(); // one timestamp for every player's pastElo entry this game

        const byUsername = (a, b) => {
          if (a.userName === b.userName)
            // this should never happen, but eh
            return 0;
          if (a.userName > b.userName) return 1;
          return -1;
        };

        seatedPlayers = [
          ...seatedPlayers.filter((e) => e.role.cardName === "hitler"),
          ...seatedPlayers.filter((e) => e.role.cardName === "morgana"),
          ...seatedPlayers.filter((e) => e.role.cardName === "monarchist"),
          ...seatedPlayers.filter((e) => e.role.cardName === "fascist").sort(byUsername),
          ...seatedPlayers.filter((e) => e.role.cardName === "merlin"),
          ...seatedPlayers.filter((e) => e.role.cardName === "percival"),
          ...seatedPlayers.filter((e) => e.role.cardName === "liberal").sort(byUsername),
        ];

        seatedPlayers.forEach((eachPlayer, i) => {
          const playerChange = eloAdjustments[eachPlayer.userName];
          const activeChange = playerChange?.change;
          const secondaryChange = playerChange?.changeSeason;
          const activeChangeXP = playerChange?.xpChange;
          const secondaryChangeXP = playerChange?.xpChangeSeason;

          game.private.replayGameChats.push(buildDeltaChat(eachPlayer, "Elo", activeChange, secondaryChange, i));
          game.private.replayGameChats.push(buildDeltaChat(eachPlayer, "XP", activeChangeXP, secondaryChangeXP, i));
        });

        results.forEach((player) => {
          const won = winningPlayerNames.includes(player.username);
          // Apply the computed rating update to this account. computeRatingUpdates is pure, so the
          // mutation/persistence that the old rateEloGame did mid-loop happens here instead, landing
          // in the single player.save() further down. computeRatingUpdates returns an entry for every
          // resolved seated account (it partitions the full roster), so this guard is effectively
          // roster membership — it never skips XP/rating for a player who still gets a win/loss below.
          const ratingUpdate = eloAdjustments[player.username];
          if (ratingUpdate) {
            player.rating = player.rating || {};
            player.rating.overall = ratingUpdate.overall;
            player.rating.season = ratingUpdate.season;
            player.markModified("rating");
            // Cutover safety net (transient — inert once every account has ratingVersion >= the cutover
            // version): if this account hasn't been migrated yet, snapshot its legacy season/overall Elo
            // BEFORE the mirrors are overwritten with the new display scale. scripts/seasonCutover24.js
            // reads legacyEloSeasonS23 to award the S23 medal; a game completing in the deploy window
            // would otherwise clobber the only copy. Guarded on legacyEloSeasonS23 == null so only the
            // first such game records the true pre-game legacy value.
            if (!(player.ratingVersion >= SEASON_MIGRATED_VERSION) && player.legacyEloSeasonS23 == null) {
              player.legacyEloOverallS23 = player.eloOverall;
              player.legacyEloSeasonS23 = player.eloSeason;
            }
            // Deprecated mirrors: keep eloOverall/eloSeason (+ maxElo/pastElo) as the Elo-flavored
            // display value so every existing reader keeps working through the cutover. This same
            // mirror set is re-derived independently in scripts/seasonCutover24.js (kept inline in both
            // rather than a shared helper — only two sites); if the mirror set changes, update both.
            player.eloOverall = ratingUpdate.overall.display;
            player.eloSeason = ratingUpdate.season.display;
            player.maxElo = Math.max(player.maxElo || DISPLAY_BASE, ratingUpdate.overall.display);
            player.pastElo.push({ date: ratingDate, value: ratingUpdate.overall.display });
            applyXpAndRainbow(player, won, isRainbow);
          }

          const listUser = userList.find((user) => user.userName === player.username);
          if (listUser) {
            listUser.eloOverall = player.eloOverall;
            listUser.eloSeason = player.eloSeason;
            listUser.xpOverall = player.xpOverall;
            listUser.xpSeason = player.xpSeason;
            listUser.isRainbowOverall = player.isRainbowOverall;
            listUser.isRainbowSeason = player.isRainbowSeason;
          }

          const seatedPlayer = seatedPlayers.find((p) => p.userName === player.username);
          seatedPlayers.forEach((eachPlayer, i) => {
            const playerChange = eloAdjustments[eachPlayer.userName];
            const showingOverall = Boolean(player.gameSettings.disableSeasonal);
            const activeChange = showingOverall ? playerChange?.change : playerChange?.changeSeason;
            const secondaryChange = showingOverall ? playerChange?.changeSeason : playerChange?.change;
            const activeChangeXP = showingOverall ? playerChange?.xpChange : playerChange?.xpChangeSeason;
            const secondaryChangeXP = showingOverall ? playerChange?.xpChangeSeason : playerChange?.xpChange;
            // seatedPlayer can be undefined if this account's role.cardName fell outside the re-sort
            // set above; guard so pushing chats can't throw and abort persistence for the whole roster
            // (rating/wins/XP for every player are saved later in this same loop).
            if (seatedPlayer && !player.gameSettings.disableElo) {
              seatedPlayer.gameChats.push(buildDeltaChat(eachPlayer, "Elo", activeChange, secondaryChange, i));
              seatedPlayer.gameChats.push(buildDeltaChat(eachPlayer, "XP", activeChangeXP, secondaryChangeXP, i));
            }
          });

          if (won) {
            if (isRainbow) {
              player.rainbowWins = player.rainbowWins ? player.rainbowWins + 1 : 1;
              player[`rainbowWinsSeason${CURRENTSEASONNUMBER}`] = player[`rainbowWinsSeason${CURRENTSEASONNUMBER}`]
                ? player[`rainbowWinsSeason${CURRENTSEASONNUMBER}`] + 1
                : 1;
              player[`rainbowLossesSeason${CURRENTSEASONNUMBER}`] = player[`rainbowLossesSeason${CURRENTSEASONNUMBER}`]
                ? player[`rainbowLossesSeason${CURRENTSEASONNUMBER}`]
                : 0;
            }

            player[`winsSeason${CURRENTSEASONNUMBER}`] = player[`winsSeason${CURRENTSEASONNUMBER}`]
              ? player[`winsSeason${CURRENTSEASONNUMBER}`] + 1
              : 1;
            player.wins = player.wins ? player.wins + 1 : 1;
            player[`lossesSeason${CURRENTSEASONNUMBER}`] = player[`lossesSeason${CURRENTSEASONNUMBER}`]
              ? player[`lossesSeason${CURRENTSEASONNUMBER}`]
              : 0;

            if (isTournamentFinalGame && !game.general.casualGame) {
              player.gameSettings.tournyWins.push(Date.now());
              const playerSocketId = Object.keys(io.sockets.sockets).find(
                (socketId) =>
                  io.sockets.sockets[socketId].handshake.session.passport &&
                  io.sockets.sockets[socketId].handshake.session.passport.user === player.username
              );

              // A winner can disconnect before the final resolves; .find then returns undefined and
              // io.sockets.sockets[undefined].emit would throw inside this synchronous loop, aborting
              // persistence for every remaining player. Skip the emit if they're no longer connected.
              if (playerSocketId) {
                io.sockets.sockets[playerSocketId].emit("gameSettings", player.gameSettings);
              }
            }
          } else {
            if (isRainbow) {
              player.rainbowLosses = player.rainbowLosses ? player.rainbowLosses + 1 : 1;
              player[`rainbowLossesSeason${CURRENTSEASONNUMBER}`] = player[`rainbowLossesSeason${CURRENTSEASONNUMBER}`]
                ? player[`rainbowLossesSeason${CURRENTSEASONNUMBER}`] + 1
                : 1;
              player[`rainbowWinsSeason${CURRENTSEASONNUMBER}`] = player[`rainbowWinsSeason${CURRENTSEASONNUMBER}`]
                ? player[`rainbowWinsSeason${CURRENTSEASONNUMBER}`]
                : 0;
            }

            // Null-safe like the winner path: losses has no schema default, so ++ on a never-rated
            // account would write NaN and corrupt the W/L record permanently.
            player.losses = player.losses ? player.losses + 1 : 1;
            player[`lossesSeason${CURRENTSEASONNUMBER}`] = player[`lossesSeason${CURRENTSEASONNUMBER}`]
              ? player[`lossesSeason${CURRENTSEASONNUMBER}`] + 1
              : 1;
            player[`winsSeason${CURRENTSEASONNUMBER}`] = player[`winsSeason${CURRENTSEASONNUMBER}`]
              ? player[`winsSeason${CURRENTSEASONNUMBER}`]
              : 0;
          }

          player.games.push(game.general.uid);
          player.lastCompletedGame = new Date();
          checkBadgesELO(player, game.general.uid);
          checkBadgesXP(player, game.general.uid);
          // Sync the broadcast user-list off the just-mutated player doc. W/L counters were set in the
          // win/loss block above; elo/xp/rainbow were already mirrored in the pre-save block. Done
          // synchronously (not in the save callback) so the single sendUserList() after the loop
          // reflects every player — ONE broadcast per game end instead of N (one per save callback),
          // which matters on the memory-tight web instance.
          if (listUser) {
            listUser.wins = player.wins;
            listUser.losses = player.losses;
            listUser.rainbowWins = player.rainbowWins;
            listUser.rainbowLosses = player.rainbowLosses;
            listUser[`winsSeason${CURRENTSEASONNUMBER}`] = player[`winsSeason${CURRENTSEASONNUMBER}`];
            listUser[`lossesSeason${CURRENTSEASONNUMBER}`] = player[`lossesSeason${CURRENTSEASONNUMBER}`];
            listUser[`rainbowWinsSeason${CURRENTSEASONNUMBER}`] = player[`rainbowWinsSeason${CURRENTSEASONNUMBER}`];
            listUser[`rainbowLossesSeason${CURRENTSEASONNUMBER}`] = player[`rainbowLossesSeason${CURRENTSEASONNUMBER}`];

            if (won && isTournamentFinalGame && !game.general.casualGame) {
              listUser.tournyWins.push(Date.now());
            }
          }
          player.save((err) => {
            if (err) console.log(err, "error saving account at end of game");
          });
        });
        sendUserList(); // one broadcast after all in-memory listUser updates (was N — one per save)
        sendInProgressGameUpdate(game);
      })
      .catch((err) => {
        console.log(err, "error in updating accounts at end of game");
      });
  } else if (winnerValid && (game.general.playerChats === "disabled" || game.general.practiceGame)) {
    // 2 XP for win, 1 for loss
    Account.find({
      username: { $in: seatedUserNames },
    })
      .then((results) => {
        for (const player of results) {
          // isRainbow omitted on purpose: casual/practice keeps its historical flat +2/+1 (no rainbow
          // XP scaling on this path).
          applyXpAndRainbow(player, winningPlayerNames.includes(player.username));
          checkBadgesXP(player, game.general.uid);
          // Callback form (not a bare promise) so a transient save rejection can't become an
          // unhandled rejection — the process-level handler turns those into an exit, dropping every
          // live game.
          player.save((err) => {
            if (err) console.log(err, "error saving account in silent/practice XP path");
          });
        }
      })
      // Mirror the ranked branch: a rejected find or a throw in the loop must not crash the process.
      .catch((err) => {
        console.log(err, "error in silent/practice XP update at end of game");
      });
  }

  // NOTE: this whole tournament block is currently DEAD CODE — game.general.isTourny is hardcoded
  // false at creation (create-game.js) and nothing sets it true. Kept in case tournaments are
  // re-enabled; the `games` accesses use bracket form because `games` is a plain object keyed by uid
  // (models.js), NOT an array — `games.find`/`games.push` would throw a TypeError if ever reached.
  if (game.general.isTourny) {
    if (game.general.tournyInfo.round === 1) {
      const { uid } = game.general;
      const tableUidLastLetter = uid.charAt(uid.length - 1);
      const otherUid =
        tableUidLastLetter === "A" ? `${uid.substr(0, uid.length - 1)}B` : `${uid.substr(0, uid.length - 1)}A`;
      const otherGame = games[otherUid];

      if (!otherGame || otherGame.gameState.isCompleted) {
        const finalGame = _.cloneDeep(game);
        let gamePause = 10;

        finalGame.general.uid = `${uid.substr(0, uid.length - 1)}Final`;
        finalGame.general.timeCreated = new Date();
        finalGame.gameState = {
          previousElectedGovernment: [],
          undrawnPolicyCount: 17,
          discardedPolicyCount: 0,
          presidentIndex: -1,
          isStarted: true,
        };
        finalGame.trackState = {
          liberalPolicyCount: 0,
          fascistPolicyCount: 0,
          electionTrackerCount: 0,
          enactedPolicies: [],
        };

        const countDown = setInterval(() => {
          if (gamePause) {
            game.general.status = `Final game starts in ${gamePause} ${gamePause === 1 ? "second" : "seconds"}.`;
            if (otherGame) {
              otherGame.general.status = `Final game starts in ${gamePause} ${gamePause === 1 ? "second" : "seconds"}.`;
              sendInProgressGameUpdate(otherGame);
            }
            sendInProgressGameUpdate(game);
            gamePause--;
          } else {
            clearInterval(countDown);
            game.general.status = "Final game has begun.";
            if (otherGame) {
              otherGame.general.status = "Final game has begun.";
              sendInProgressGameUpdate(otherGame);
            }
            game.general.tournyInfo.isRound1TableThatFinished2nd = true;
            sendInProgressGameUpdate(game);
            const winningPlayerSocketIds = Object.keys(io.sockets.sockets).filter(
              (socketId) =>
                io.sockets.sockets[socketId].handshake.session.passport &&
                winningPrivatePlayers
                  .map((player) => player.userName)
                  .includes(io.sockets.sockets[socketId].handshake.session.passport.user)
            );

            // crash here line 302 map of undefined.  Not sure how this didn't exist at this time.  Race condition in settimeout/interval?  Both games completed at almost the same time?  Dunno.
            const otherGameWinningPlayerSocketIds = Object.keys(io.sockets.sockets).filter(
              (socketId) =>
                io.sockets.sockets[socketId].handshake.session.passport &&
                game.general.tournyInfo.winningPlayersFirstCompletedGame
                  .map((player) => player.userName)
                  .includes(io.sockets.sockets[socketId].handshake.session.passport.user)
            );

            const socketIds = winningPlayerSocketIds.concat(otherGameWinningPlayerSocketIds);

            socketIds.forEach((id) => {
              const socket = io.sockets.sockets[id];

              Object.keys(socket.rooms).forEach((roomUid) => {
                socket.leave(roomUid);
              });
              socket.join(finalGame.general.uid);
              socket.emit("joinGameRedirect", finalGame.general.uid);
            });

            finalGame.general.tournyInfo.round = 2;
            finalGame.general.electionCount = 0;
            finalGame.publicPlayersState = game.general.tournyInfo.winningPlayersFirstCompletedGame
              .concat(game.private.seatedPlayers.filter((player) => player.role.team === winningTeamName))
              .map((player) => {
                player.cardStatus = {
                  cardDisplayed: false,
                  isFlipped: false,
                  cardFront: "secretrole",
                  cardBack: {},
                };

                player.isDead = false;

                return player;
              });

            if (finalGame.general.blindMode) {
              const _shuffledAdjectives = _.shuffle(adjectives);

              finalGame.general.replacementNames = _.shuffle(animals)
                .slice(0, finalGame.publicPlayersState.length)
                .map(
                  (animal, index) =>
                    `${_shuffledAdjectives[index].charAt(0).toUpperCase()}${_shuffledAdjectives[index].slice(1)} ${animal}`
                );
            }

            finalGame.private.lock = {};
            finalGame.general.name = `${game.general.name.slice(0, game.general.name.length - 7)}-tableFINAL`;
            games[finalGame.general.uid] = finalGame;
            require("./start-game.js")(finalGame); // circular dep.
            sendGameList();
          }
        }, 1000)[Symbol.toPrimitive]();
      } else {
        game.general.tournyInfo.showOtherTournyTable = true;
        game.chats.push({
          gameChat: true,
          timestamp: new Date(),
          chat: [
            {
              text: "This tournament game has finished first.  Winning players will be pulled into the final round when it starts.",
            },
          ],
        });
        otherGame.general.tournyInfo.winningPlayersFirstCompletedGame = _.cloneDeep(game.private.seatedPlayers).filter(
          (player) => player.role.team === winningTeamName
        );
        sendInProgressGameUpdate(game);
      }
    } else {
      if (!game.general.casualGame) {
        game.publicPlayersState.forEach((player) => {
          if (winningPlayerNames.includes(player.userName)) {
            player.tournyWins.push(new Date().getTime());
          }
        });
      }
      game.chats.push({
        gameChat: true,
        timestamp: new Date(),
        chat: [
          {
            text: "The tournament has ended.",
          },
        ],
      });
      game.general.status = "The tournament has ended.";
      sendInProgressGameUpdate(game);
    }
  }

  const { guesses, merlinGuesses } = game;
  let guessOrder = 2;
  const now = Date.now();

  if (!_.isEmpty(guesses) || !_.isEmpty(merlinGuesses)) {
    game.chats.push({
      gameChat: true,
      timestamp: now,
      chat: [
        {
          text: "Line Guesses",
          type: "player",
        },
      ],
    });
  }

  if (!_.isEmpty(guesses)) {
    const hittySeat = game.private.seatedPlayers.findIndex((p) => p.role.cardName === "hitler") + 1;
    const fasSeats = game.private.seatedPlayers
      .map((p, i) => [p, i])
      .filter(([p, _]) => p.role.team === "fascist")
      .map(([_, i]) => i + 1);

    const numFas = fasSeats.length;
    const lines = new LineGuess({ regs: fasSeats, hit: hittySeat });

    const groupedGuesses = Array.from({ length: 5 }, () => []);
    const perfectGuesses = [];
    const hittyGuesses = [];

    for (const [user, guess] of Object.entries(guesses)) {
      const [fasCorrect, hitCorrect] = guess.difference(lines);
      if (fasCorrect === numFas && hitCorrect) {
        perfectGuesses.push([user, guess]);
      } else {
        groupedGuesses[fasCorrect].push([user, guess]);

        if (hitCorrect) {
          hittyGuesses.push([user, guess]);
        }
      }
    }

    const guessesToChat = (prefix, guesses) => ({
      gameChat: true,
      timestamp: now + guessOrder++,
      chat: [
        {
          text: prefix + guesses.map(([user, guess]) => `${user} (${guess.toString()})`).join(", "),
        },
      ],
    });

    if (perfectGuesses.length) {
      game.chats.push(guessesToChat("All fascists AND hitler correct - ", perfectGuesses));
    }

    for (let i = numFas; i >= 0; i--) {
      const prefix =
        i === numFas
          ? "All fascists correct - "
          : i === 3
            ? "Three fascists correct - "
            : i === 2
              ? "Two fascists correct - "
              : i === 1
                ? "One fascist correct - "
                : "No fascists correct :( -";

      if (groupedGuesses[i].length) {
        game.chats.push(guessesToChat(prefix, groupedGuesses[i]));
      }
    }

    if (hittyGuesses.length) {
      game.chats.push(guessesToChat("Hitler correct - ", hittyGuesses));
    }
  }

  if (!_.isEmpty(merlinGuesses)) {
    const merlinSeat = game.private.seatedPlayers.findIndex((p) => p.role.cardName === "merlin") + 1;
    const groupedGuesses = _.groupBy(Object.entries(merlinGuesses), ([_, g]) => g);

    if (groupedGuesses[merlinSeat]) {
      game.chats.push({
        gameChat: true,
        timestamp: now + guessOrder++,
        chat: [
          {
            text: "Merlin correct - " + groupedGuesses[merlinSeat].map(([user, _]) => user).join(", "),
          },
        ],
      });
    }

    const wrongGuesses = _.range(1, 11).filter((g) => g !== merlinSeat && Boolean(groupedGuesses[g]));

    if (wrongGuesses.length) {
      game.chats.push({
        gameChat: true,
        timestamp: now + guessOrder++,
        chat: [
          {
            text:
              "Merlin incorrect - " +
              wrongGuesses.map((g) => groupedGuesses[g].map(([user, _]) => user).join(", ") + ` (${g})`).join(", "),
          },
        ],
      });
    }
  }

  sendInProgressGameUpdate(game);
};
