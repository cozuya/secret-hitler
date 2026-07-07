const { gameCreationDisabled, limitNewPlayers, userList, games } = require("../models");
const { generateCombination } = require("gfycat-style-urls");
const { chatReplacements } = require("../chatReplacements");
const Account = require("../../../models/account");
const Game = require("../../../models/game");
const { updateUserStatus, sendGameList } = require("../user-requests");
const { secureGame } = require("../util.js");
const { createGameSchema, customGameSettingsSchema, updateWhitelistSchema } = require("./create-game.schema");

/**
 * @param {object} socket - user socket reference.
 * @param {object} passport - socket authentication.
 * @param {object} data - from socket emit.
 */
module.exports.handleAddNewGame = async (socket, passport, data) => {
  // Authentication Assured in routes.js
  const parsed = createGameSchema.safeParse(data);
  if (!parsed.success) return;
  data = parsed.data; // counts coerced to int|null, gameName/sliders/arrays type-checked

  if (gameCreationDisabled.status || (!data.privatePassword && limitNewPlayers.status)) {
    return;
  }

  const user = userList.find((obj) => obj.userName === passport.user);
  const currentTime = new Date();

  if (!user || currentTime - user.timeLastGameCreated < 8000 || user.status.type !== "none") {
    // Check if !user here in case of bug where user doesn't appear on userList
    return;
  }

  // Clamp player counts to sane bounds (schema guaranteed integer | null | undefined).
  data.minPlayersCount = Math.max(5, Math.min(10, data.minPlayersCount ?? 5));
  data.maxPlayersCount = Math.max(5, Math.min(10, data.maxPlayersCount ?? 10));
  if (data.minPlayersCount > data.maxPlayersCount) return;

  let a;
  let playerCounts = [];

  for (a = Math.max(data.minPlayersCount, 5); a <= Math.min(10, data.maxPlayersCount); a++) {
    // client sends excludedPlayerCount (singular) — see Creategame.jsx / App.jsx
    if (Array.isArray(data.excludedPlayerCount)) {
      if (!data.excludedPlayerCount.includes(a)) playerCounts.push(a);
    } else {
      playerCounts.push(a);
    }
  }

  if (playerCounts.length === 0) {
    // Someone is messing with the data, ignore it
    return;
  }

  const excludes = [];
  for (a = playerCounts[0]; a <= playerCounts[playerCounts.length - 1]; a++) {
    if (!playerCounts.includes(a)) excludes.push(a);
  }

  // gameName validated by createGameSchema (presence, length <= 20, legal characters).

  if (data.eloSliderValue) {
    if (user?.eloSeason < data.eloSliderValue || user?.eloOverall < data.eloSliderValue) {
      return;
    }

    data.eloSliderValue = parseInt(data.eloSliderValue);
    if (isNaN(data.eloSliderValue)) {
      return;
    }
  }

  if (data.xpSliderValue) {
    // xpSliderValue is a string (typed box) or number (slider); null when the XP limit is off
    if (user.xpOverall < data.xpSliderValue) {
      return;
    }

    data.xpSliderValue = parseInt(data.xpSliderValue);
    if (isNaN(data.xpSliderValue)) {
      return;
    }
  }

  if (data.customGameSettings && data.customGameSettings.enabled) {
    // Shape, numeric coercion and per-field ranges (incl. fax->fas fallback, powers
    // enum, vetoZone>trackState.fas, >=13 card deck) are all validated by the schema.
    const parsedSettings = customGameSettingsSchema.safeParse(data.customGameSettings);
    if (!parsedSettings.success) return;
    data.customGameSettings = parsedSettings.data;

    // Ensure there is never a fascist majority at the start. This depends on the
    // locked player count, so it stays here rather than in the schema.
    if (data.customGameSettings.fascistCount + 1 > playerCounts[0] / 2) return;

    data.casualGame = true; // Force this on if everything looks ok.
    playerCounts = [playerCounts[0]]; // Lock the game to a specific player count. Eventually there should be one set of settings per size.
  } else {
    data.customGameSettings = {
      enabled: false,
    };
  }

  let uid = generateCombination(3, "", true);
  while (true) {
    const foundGame = await Game.findOne({ uid });
    if (foundGame) uid = generateCombination(3, "", true);
    else break;
  }

  const customGame = data.customGameSettings?.enabled; // ranked in order of precedent, higher up is the game mode if two are (somehow) selected
  const casualGame =
    (data.casualGame || (typeof data.timedMode === "number" && data.timedMode < 30)
      ? true
      : data.gameType === "casual" ||
        data.avalonSH ||
        data.withPercival ||
        data.monarchistSH ||
        // NOTE: flappyMode deliberately does NOT force casual - rated flappyMode games
        // are an explicit product decision (owner call, 2026-07-04): players opt into
        // the mode at creation, and its match-point minigame may decide ELO.
        // ALSO INTENTIONAL (owner call, 2026-07-05): the create UI DEFAULT-CHECKS
        // flappyMode, so ordinary ranked games divert to flappy at the 4-5 board
        // unless the creator opts out. Signed off with data: 4-5 occurs in ~23% of
        // 7p games, and its historical 44% blue winrate is FARTHER from fair than
        // the ~50% race that replaces it. Do not re-flag default-on-ranked as a
        // defect - it is the ship decision.
        data.noTopdecking > 0) && !customGame;
  // Silent (playerChats === "disabled") games are no longer forced to practice; they follow the
  // chosen gameType so a silent game can be ranked (and thus compute Elo) like any other.
  const practiceGame =
    !(typeof data.timedMode === "number" && data.timedMode < 30) &&
    data.gameType === "practice" &&
    !casualGame &&
    !customGame;

  const newGame = {
    gameState: {
      previousElectedGovernment: [],
      undrawnPolicyCount: 17,
      discardedPolicyCount: 0,
      presidentIndex: -1,
    },
    chats: [],
    general: {
      whitelistedPlayers: [],
      uid: data.isTourny ? `${generateCombination(3, "", true)}Tournament` : uid,
      name: user.isPrivate ? "Private Game" : data.gameName ? data.gameName : "New Game",
      flag: data.flag || "none", // TODO: verify that the flag exists, or that an invalid flag does not cause issues
      minPlayersCount: playerCounts[0],
      excludedPlayerCount: excludes,
      maxPlayersCount: playerCounts[playerCounts.length - 1],
      status: `Waiting for ${playerCounts[0] - 1} more players..`,
      experiencedMode: data.experiencedMode,
      playerChats:
        data.playerChats === "emotes" && ["casual", "practice"].includes(data.gameType)
          ? "emotes"
          : data.playerChats === "emotes"
            ? "enabled"
            : data.playerChats,
      isVerifiedOnly: data.isVerifiedOnly,
      disableObserverLobby: data.disableObserverLobby,
      disableObserver: data.disableObserverLobby || (data.disableObserver && !data.isTourny),
      isTourny: false,
      lastModPing: 0,
      chatReplTime: Array(chatReplacements.length + 1).fill(0),
      disableGamechat: data.disableGamechat,
      rainbowgame: user.isRainbowOverall ? data.rainbowgame : false,
      blindMode: data.blindMode,
      // Hides individual ballots in flipBallotCards (only the Ja/Nein tally is shown). Like silent
      // games, it's intentionally not in the casualGame expression above, so it can be ranked.
      noVoteReveal: Boolean(data.noVoteReveal),
      timedMode:
        typeof data.timedMode === "number" && data.timedMode >= 2 && data.timedMode <= 6000 ? data.timedMode : false,
      // modes canStartFlappy() refuses must not STORE flappyMode either, or the
      // lobby/track UI advertises a plane that can never take off (the client also
      // clears the toggle for these modes, but this is the authoritative gate)
      flappyMode: Boolean(data.flappyMode) && !data.blindMode && !data.avalonSH && !data.monarchistSH,
      flappyOnlyMode: Boolean(
        data.flappyMode && !data.blindMode && !data.avalonSH && !data.monarchistSH && data.flappyOnlyMode
      ),
      casualGame,
      practiceGame,
      rebalance6p: data.rebalance6p,
      rebalance7p: data.rebalance7p,
      rebalance9p2f: data.rebalance9p2f,
      unlistedGame: data.unlistedGame && !data.privatePassword,
      private: user.isPrivate
        ? data.privatePassword
          ? data.privatePassword
          : "private"
        : !data.unlistedGame && data.privatePassword,
      privateAnonymousRemakes: data.privateAnonymousRemakes,
      privateOnly: user.isPrivate,
      electionCount: 0,
      isRemade: false,
      eloMinimum: data.eloSliderValue,
      xpMinimum: data.xpSliderValue,
      avalonSH: data.avalonSH ? { withPercival: Boolean(data.withPercival) } : null,
      monarchistSH: Boolean(data.monarchistSH),
      noTopdecking: data.noTopdecking,
    },
    customGameSettings: data.customGameSettings,
    publicPlayersState: [],
    playersState: [],
    cardFlingerState: [],
    trackState: {
      liberalPolicyCount: 0,
      fascistPolicyCount: 0,
      electionTrackerCount: 0,
      enactedPolicies: [],
      consecutiveTopdecks: 0,
    },
    guesses: {},
    merlinGuesses: {},
  };

  // oops its a hack
  if (newGame.general.practiceGame && newGame.general.casualGame) {
    newGame.general.practiceGame = false;
  }

  if (newGame.customGameSettings.enabled) {
    let chat = {
      timestamp: new Date(),
      gameChat: true,
      chat: [
        {
          text: "There will be ",
        },
        {
          text: `${newGame.customGameSettings.deckState.lib - newGame.customGameSettings.trackState.lib} liberal`,
          type: "liberal",
        },
        {
          text: " and ",
        },
        {
          text: `${newGame.customGameSettings.deckState.fas - newGame.customGameSettings.trackState.fas} fascist`,
          type: "fascist",
        },
        {
          text: " policies in the deck.",
        },
      ],
    };
    const t = chat.timestamp.getMilliseconds();
    newGame.chats.push(chat);
    chat = {
      timestamp: new Date(),
      gameChat: true,
      chat: [
        {
          text: "The game will start with ",
        },
        {
          text: `${newGame.customGameSettings.trackState.lib} liberal`,
          type: "liberal",
        },
        {
          text: " and ",
        },
        {
          text: `${newGame.customGameSettings.trackState.fas} fascist`,
          type: "fascist",
        },
        {
          text: " policies.",
        },
      ],
    };
    chat.timestamp.setMilliseconds(t + 1);
    newGame.chats.push(chat);
  }

  if (data.isTourny) {
    newGame.general.tournyInfo = {
      round: 0,
      queuedPlayers: [
        {
          userName: user.userName,
          customCardback: user.customCardback,
          customCardbackUid: user.customCardbackUid,
          tournyWins: user.tournyWins,
          connected: true,
          cardStatus: {
            cardDisplayed: false,
            isFlipped: false,
            cardFront: "secretrole",
            cardBack: {},
          },
        },
      ],
    };
  } else {
    newGame.publicPlayersState = [
      {
        userName: user.userName,
        customCardback: user.customCardback,
        customCardbackUid: user.customCardbackUid,
        previousSeasonAward: user.previousSeasonAward,
        specialTournamentStatus: user.specialTournamentStatus,
        tournyWins: user.tournyWins,
        connected: true,
        isPrivate: user.isPrivate,
        cardStatus: {
          cardDisplayed: false,
          isFlipped: false,
          cardFront: "secretrole",
          cardBack: {},
        },
      },
    ];
  }

  if (data.isTourny) {
    const { minPlayersCount } = newGame.general;

    newGame.general.minPlayersCount = newGame.general.maxPlayersCount =
      minPlayersCount === 1 ? 14 : minPlayersCount === 2 ? 16 : 18;
    newGame.general.status = `Waiting for ${newGame.general.minPlayersCount - 1} more players..`;
    newGame.chats.push({
      timestamp: new Date(),
      gameChat: true,
      chat: [
        {
          text: `${user.userName}`,
          type: "player",
        },
        {
          text: ` (${newGame.general.tournyInfo.queuedPlayers.length}/${newGame.general.maxPlayersCount}) has entered the tournament queue.`,
        },
      ],
    });
  }

  user.timeLastGameCreated = currentTime;
  Account.findOne({ username: user.userName }).then((account) => {
    newGame.private = {
      reports: {},
      unSeatedGameChats: [],
      commandChats: {},
      replayGameChats: [],
      lock: {},
      votesPeeked: false,
      remakeVotesPeeked: false,
      invIndex: -1,
      hiddenInfoChat: [],
      hiddenInfoSubscriptions: [],
      hiddenInfoShouldNotify: true,
      gameCreatorName: user.userName,
      gameCreatorBlacklist: user.blacklist,
    };

    if (newGame.general.private) {
      newGame.private.privatePassword = newGame.general.private;
      newGame.general.private = true;
    }

    newGame.general.timeCreated = currentTime;
    updateUserStatus(passport, newGame);
    games[newGame.general.uid] = newGame;
    sendGameList();
    if (!newGame.general.unlistedGame) {
      io.sockets.emit("newGameAdded", {
        priv: newGame.general.private,
        pub: !newGame.general.private,
        timedMode: newGame.general.timedMode,
        rainbow: newGame.general.rainbowgame,
        standard: !newGame.general.rainbowgame,
        customgame: newGame.customGameSettings.enabled,
        casualgame: newGame.general.casualGame,
        creator: account.username,
      });
    }
    socket.join(newGame.general.uid);
    socket.emit("updateSeatForUser");
    const cloneNewGame = Object.assign({}, newGame);
    delete cloneNewGame.private;
    socket.emit("gameUpdate", cloneNewGame);
    socket.emit("joinGameRedirect", newGame.general.uid);
  });
};

/**
 * @param {object} passport - socket authentication.
 * @param {object} game - target game.
 * @param {object} data - from socket emit.
 */
module.exports.handleUpdateWhitelist = (passport, game, data) => {
  const parsed = updateWhitelistSchema.safeParse(data);
  if (!parsed.success) return; // whitelistPlayers must be a string[] — prevents a delayed crash on the next joiner
  data = parsed.data;

  const isPrivateSafe =
    !game.general.private ||
    (game.general.private &&
      (data.password === game.private.privatePassword || game.general.whitelistedPlayers.includes(passport.user)));

  // Only update the whitelist if whitelistsed, has password, or is the creator
  if (isPrivateSafe || game.private.gameCreatorName === passport.user) {
    game.general.whitelistedPlayers = data.whitelistPlayers;
    io.in(data.uid).emit("gameUpdate", secureGame(game));
  }
};
