const { generateCombination } = require("gfycat-style-urls");
const Game = require("../../../models/game");
const { games, gameCreationDisabled } = require("../models");
const { chatReplacements } = require("../chatReplacements");
const { sendGameList } = require("../user-requests");
const { isNewPlayerLobby, shouldSurviveEmptyPregame } = require("./new-player-state");

// Keep the human lobby's scaffold without inventing a creator, account, or socket.
const buildNewPlayerLobby = (uid, timeCreated = new Date()) => ({
  gameState: {
    previousElectedGovernment: [],
    undrawnPolicyCount: 17,
    discardedPolicyCount: 0,
    presidentIndex: -1,
  },
  chats: [],
  general: {
    systemLobby: "new-player",
    whitelistedPlayers: [],
    uid,
    name: "New Player Game",
    flag: "none",
    minPlayersCount: 5,
    excludedPlayerCount: [],
    maxPlayersCount: 7,
    status: "Waiting for 5 more players..",
    experiencedMode: false,
    playerChats: "enabled",
    isVerifiedOnly: false,
    disableObserverLobby: false,
    disableObserver: false,
    isTourny: false,
    lastModPing: 0,
    chatReplTime: Array(chatReplacements.length + 1).fill(0),
    disableGamechat: false,
    rainbowgame: false,
    blindMode: false,
    noVoteReveal: false,
    timedMode: false,
    flappyMode: false,
    flappyOnlyMode: false,
    casualGame: false,
    practiceGame: true,
    rebalance6p: false,
    rebalance7p: false,
    rebalance9p2f: false,
    unlistedGame: false,
    private: false,
    privateAnonymousRemakes: false,
    privateOnly: false,
    electionCount: 0,
    isRemade: false,
    eloMinimum: 0,
    xpMinimum: 0,
    avalonSH: null,
    monarchistSH: false,
    noTopdecking: 0,
    timeCreated,
  },
  customGameSettings: { enabled: false },
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
  private: {
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
    gameCreatorName: null,
    gameCreatorBlacklist: [],
  },
});

// Even a full cohort reserves intake until tracks flip.
const findWaitingLobby = () => Object.values(games).find(shouldSurviveEmptyPregame);

let pendingEnsure;

const ensureNewPlayerLobby = async () => {
  // Share UID lookups, then recheck: re-enable may race a disabled result settling.
  while (pendingEnsure) await pendingEnsure;
  if (gameCreationDisabled.status) return;
  const existing = findWaitingLobby();
  if (existing) return existing;

  pendingEnsure = (async () => {
    while (true) {
      const uid = generateCombination(3, "", true);
      if (Object.prototype.hasOwnProperty.call(games, uid)) continue;
      const savedGame = await Game.findOne({ uid });

      // The switch and live registry can change while Mongo checks historical UIDs.
      if (gameCreationDisabled.status) return;
      const waiting = findWaitingLobby();
      if (waiting) return waiting;
      if (savedGame || Object.prototype.hasOwnProperty.call(games, uid)) continue;

      const game = buildNewPlayerLobby(uid);
      games[uid] = game;
      sendGameList();
      return game;
    }
  })().finally(() => {
    pendingEnsure = null;
  });

  return pendingEnsure;
};

module.exports = { isNewPlayerLobby, shouldSurviveEmptyPregame, buildNewPlayerLobby, ensureNewPlayerLobby };
