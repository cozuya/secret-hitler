jest.mock("../../../../routes/socket/util", () => ({ sendInProgressGameUpdate: jest.fn(), LineGuess: jest.fn() }));
jest.mock("../../../../routes/socket/user-requests", () => ({ sendUserList: jest.fn(), sendGameList: jest.fn() }));
jest.mock("../../../../models/profile/utils", () => ({ updateProfiles: jest.fn() }));
jest.mock("../../../../models/game-summary/buildEnhancedGameSummary", () => jest.fn());
jest.mock("../../../../routes/socket/report", () => ({ makeReport: jest.fn() }));

const Account = require("../../../../models/account");
const Game = require("../../../../models/game");
const { games, userList } = require("../../../../routes/socket/models");
const { completeGame, saveAndDeleteGame } = require("../../../../routes/socket/game/end-game");
const { computeRankedUpdates, resolveHiddenRatings } = require("../../../../routes/socket/rating/ranked");
const { CURRENT_SEASON_FIELDS } = require("../../../../src/shared/season");
const { sendUserList } = require("../../../../routes/socket/user-requests");

const oldDate = new Date("2026-08-01T00:00:00.000Z");
const makeGame = (general = {}) => ({
  general: { uid: "ranked-integration", playerCount: 5, playerChats: "enabled", ...general },
  gameState: {},
  customGameSettings: { enabled: false },
  publicPlayersState: Array.from({ length: 5 }, (_, i) => ({ userName: `player${i}` })),
  private: {
    seatedPlayers: ["hitler", "fascist", "liberal", "liberal", "liberal"].map((cardName, i) => ({
      userName: `player${i}`,
      role: { cardName, team: i < 2 ? "fascist" : "liberal" },
      gameChats: [],
    })),
    policies: ["liberal", "fascist"],
    unSeatedGameChats: [],
    replayGameChats: [],
    summary: { publish: () => ({ toObject: () => null }) },
  },
  chats: [],
});

const makeAccounts = () =>
  Array.from({ length: 5 }, (_, i) => {
    const account = new Account({
      username: `player${i}`,
      eloOverall: 1810 + i * 10,
      eloSeason: 1500 + i * 10,
      xpOverall: 8,
      xpSeason: 8,
      rating: {
        overall: { mu: i === 0 ? 43 : 25, sigma: i === 0 ? 2 : 25 / 3 },
      },
      maxElo: 1900,
      pastElo: [{ date: oldDate, value: 1900 }],
      lastRankedGameAt: oldDate,
      lastCompletedGame: oldDate,
      wins: 12,
      losses: 10,
      winsSeason24: 9,
      lossesSeason24: 7,
      [CURRENT_SEASON_FIELDS.wins]: 3,
      [CURRENT_SEASON_FIELDS.losses]: 2,
      gameSettings: { disableSeasonal: i % 2 === 0, disableElo: i === 4 },
    });
    // Model an existing raw Mongo record: strict construction strips these retired fields.
    const raw = account.toObject();
    raw.rating.overall.display = 999;
    raw.rating.season = { mu: 100, sigma: 0.5, display: 3333 };
    return Account.hydrate(raw);
  });

const deltaLines = (chats, label = "Elo") => chats.filter((entry) => entry.chat?.[1]?.text === `'s ${label}: `);
const rankedState = (account) => {
  const object = account.toObject();
  return Object.fromEntries(
    [
      "eloOverall",
      "eloSeason",
      "rating",
      "maxElo",
      "pastElo",
      "lastRankedGameAt",
      "games",
      "wins",
      "losses",
      ...Object.values(CURRENT_SEASON_FIELDS),
    ].map((key) => [key, object[key]])
  );
};

describe("S25 completeGame integration", () => {
  const originalIo = global.io;
  let accountSaves;
  let accountWrites;
  let gameSaves;
  let storedGame;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Date, "now").mockReturnValue(new Date("2026-09-08T22:00:00.000Z").getTime());
    accountSaves = [];
    accountWrites = [];
    gameSaves = [];
    storedGame = undefined;
    global.io = { sockets: { sockets: {} } };
    userList.length = 0;
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(Account, "find").mockResolvedValue([]);
    jest.spyOn(Account.collection, "updateOne").mockImplementation((filter, update, options, callback) => {
      accountWrites.push({ filter, update });
      callback(null, { n: 1, nModified: 1, ok: 1 });
    });
    const realSave = Account.prototype.save;
    jest.spyOn(Account.prototype, "save").mockImplementation(function (callback) {
      const pending = realSave.call(this);
      accountSaves.push(pending);
      pending.then(() => callback(null), callback);
      return pending;
    });
    jest.spyOn(Game.collection, "insertOne").mockImplementation((document, options, callback) => {
      storedGame = document;
      callback(null, { insertedId: document._id });
    });
    jest.spyOn(Game.collection, "updateOne").mockImplementation((filter, update, options, callback) => {
      Object.assign(storedGame, update.$set);
      callback(null, { n: 1, nModified: 1, ok: 1 });
    });
    const realGameSave = Game.prototype.save;
    jest.spyOn(Game.prototype, "save").mockImplementation(function () {
      const pending = realGameSave.call(this);
      gameSaves.push(pending);
      return pending;
    });
    jest.spyOn(Game, "findOne").mockImplementation(() => Promise.resolve(storedGame && Game.hydrate(storedGame)));
  });

  afterEach(() => {
    delete games["ranked-integration"];
    userList.length = 0;
    global.io = originalIo;
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  const finish = async (game, accounts, winner = "liberal") => {
    games[game.general.uid] = game;
    Account.find.mockResolvedValue(accounts);
    completeGame(game, winner);
    await Promise.resolve();
    await Promise.all(accountSaves);
    await Promise.all(gameSaves);
    await Promise.resolve();
  };

  it.each([
    false,
    true,
  ])("adds bounded deltas, persists only lifetime skill and saves once (Rainbow=%s)", async (rainbowgame) => {
    const game = makeGame({ rainbowgame });
    const accounts = makeAccounts();
    const before = accounts.map((account) => account.toObject());
    userList.push(...accounts.map((account) => ({ userName: account.username })));
    const expected = computeRankedUpdates(
      { ...game, gameState: { isCompleted: "liberal" } },
      resolveHiddenRatings(accounts),
      game.private.seatedPlayers
    );
    await finish(game, accounts);

    expect(game.gameState.isCompleted).toBe("liberal");
    expect(Account.find).toHaveBeenCalledWith({ username: { $in: accounts.map((account) => account.username) } });
    expect(Account.prototype.save).toHaveBeenCalledTimes(5);
    expect(accountWrites).toHaveLength(5);
    expect(sendUserList).toHaveBeenCalledTimes(1);
    accounts.forEach((account, i) => {
      const won = i >= 2;
      const change = account.eloOverall - before[i].eloOverall;
      expect(change).toBe(expected[account.username].change);
      expect(account.eloSeason - before[i].eloSeason).toBe(change);
      expect(Math.abs(change)).toBeGreaterThanOrEqual(16);
      expect(Math.abs(change)).toBeLessThanOrEqual(24);
      expect(change > 0).toBe(won);
      expect(account.rating.overall.mu).toBeCloseTo(expected[account.username].overall.mu, 10);
      expect(account.rating.overall.sigma).toBeCloseTo(expected[account.username].overall.sigma, 10);
      expect(account.get("rating.overall.display")).toBe(999);
      expect(account.get("rating.season")).toEqual(before[i].rating.season);
      expect(account.lastRankedGameAt.getTime()).toBeGreaterThan(oldDate.getTime());
      expect(account.lastCompletedGame.getTime()).toBeGreaterThan(oldDate.getTime());
      expect(account.pastElo[1].value).toBe(account.eloOverall);
      expect(account.pastElo[1].date).toEqual(account.lastRankedGameAt);
      expect(account.pastElo[0].value).toBe(1900);
      expect(account.maxElo).toBe(1900);
      expect(account.xpOverall).toBe(8 + (won ? (rainbowgame ? 5 : 2) : 1));
      expect(account.xpSeason).toBe(account.xpOverall);
      expect(account.isRainbowOverall).toBe(won ? true : undefined);
      expect(account.isRainbowSeason).toBe(won ? true : undefined);
      expect(account[CURRENT_SEASON_FIELDS.wins]).toBe(won ? 4 : 3);
      expect(account[CURRENT_SEASON_FIELDS.losses]).toBe(won ? 2 : 3);
      expect(account.winsSeason24).toBe(9);
      expect(account.lossesSeason24).toBe(7);
      expect(account.games).toContain(game.general.uid);
      expect(userList[i].eloOverall).toBe(account.eloOverall);
      expect(userList[i][CURRENT_SEASON_FIELDS.wins]).toBe(account[CURRENT_SEASON_FIELDS.wins]);
      if (rainbowgame) {
        expect(account[CURRENT_SEASON_FIELDS.rainbowWins]).toBe(won ? 1 : 0);
        expect(account[CURRENT_SEASON_FIELDS.rainbowLosses]).toBe(won ? 0 : 1);
      }
      const write = accountWrites.find(({ filter }) => String(filter._id) === String(account._id)).update;
      expect(write.$set["rating.overall.mu"]).toBe(account.rating.overall.mu);
      expect(write.$set["rating.overall.sigma"]).toBe(account.rating.overall.sigma);
      expect(write.$set.lastRankedGameAt).toEqual(account.lastRankedGameAt);
      expect(Object.keys(write.$set).filter((key) => key.startsWith("rating"))).toEqual([
        "rating.overall.mu",
        "rating.overall.sigma",
      ]);
      expect(write.$unset).toBeUndefined();
    });

    const replayLines = deltaLines(game.private.replayGameChats);
    expect(replayLines).toHaveLength(5);
    replayLines.forEach((line) => {
      const change = expected[line.chat[0].text].change;
      expect(line.chat[2].text).toBe(` ${change > 0 ? "+" : ""}${change.toFixed(1)}`);
      expect(line.chat[3].text).toBe(` (${change > 0 ? "+" : ""}${change.toFixed(1)})`);
    });
    const replayXpLines = deltaLines(game.private.replayGameChats, "XP");
    expect(replayXpLines).toHaveLength(5);
    replayXpLines.forEach((line) => {
      const won = ["player2", "player3", "player4"].includes(line.chat[0].text);
      const gain = won ? (rainbowgame ? 5 : 2) : 1;
      expect(line.chat[2].text).toBe(` +${gain.toFixed(1)}`);
      expect(line.chat[3].text).toBe(` (+${gain.toFixed(1)})`);
    });
    expect(deltaLines(game.private.seatedPlayers[0].gameChats)).toEqual(replayLines);
    expect(deltaLines(game.private.seatedPlayers[3].gameChats)).toEqual(replayLines);
    expect(deltaLines(game.private.seatedPlayers[4].gameChats)).toHaveLength(0);
    expect(deltaLines(game.private.seatedPlayers[0].gameChats, "XP")).toEqual(replayXpLines);
    expect(deltaLines(game.private.seatedPlayers[3].gameChats, "XP")).toEqual(replayXpLines);
    expect(deltaLines(game.private.seatedPlayers[4].gameChats, "XP")).toHaveLength(0);
    // The initial save predates the account query. Exercise the real second save at teardown and
    // rehydrate its document, rather than assuming an in-memory replay append reached persistence.
    expect(deltaLines(storedGame.chats)).toHaveLength(0);
    saveAndDeleteGame(game.general.uid);
    await Promise.resolve();
    await Promise.all(gameSaves);
    const reloaded = Game.hydrate(storedGame);
    expect(deltaLines(reloaded.toObject().chats)).toEqual(replayLines);
    expect(deltaLines(reloaded.toObject().chats, "XP")).toEqual(replayXpLines);
    expect(Game.collection.insertOne).toHaveBeenCalledTimes(1);
    expect(Game.collection.updateOne).toHaveBeenCalledTimes(1);
    expect(deltaLines(Game.collection.updateOne.mock.calls[0][1].$set.chats)).toEqual(replayLines);
    expect(games[game.general.uid]).toBeUndefined();
    expect(console.log).not.toHaveBeenCalled();
  });

  it.each([
    [{ practiceGame: true }, false, true],
    [{ casualGame: true, playerChats: "disabled", rainbowgame: true }, false, true],
    [{ casualGame: true }, false, false],
    [{ private: true }, false, false],
    [{ unlistedGame: true }, false, false],
    [{}, true, false],
  ])("preserves ranked state in a nonrated mode %j (custom=%s, XP=%s)", async (general, custom, getsXp) => {
    const game = makeGame(general);
    game.customGameSettings.enabled = custom;
    const accounts = makeAccounts();
    const before = accounts.map(rankedState);
    userList.push(...accounts.map((account) => ({ userName: account.username })));
    await finish(game, accounts);
    accounts.forEach((account, i) => {
      expect(rankedState(account)).toEqual(before[i]);
      expect(account.xpOverall).toBe(8 + (getsXp ? (i >= 2 ? 2 : 1) : 0));
      expect(account.xpSeason).toBe(account.xpOverall);
      if (getsXp) {
        expect(account.lastCompletedGame.getTime()).toBeGreaterThan(oldDate.getTime());
        expect(userList[i]).toMatchObject({
          xpOverall: account.xpOverall,
          xpSeason: account.xpSeason,
          isRainbowOverall: account.isRainbowOverall,
          isRainbowSeason: account.isRainbowSeason,
        });
        expect(userList[i]).not.toHaveProperty("eloOverall");
        expect(userList[i]).not.toHaveProperty("eloSeason");
      } else {
        expect(account.lastCompletedGame).toEqual(oldDate);
        expect(userList[i]).toEqual({ userName: account.username });
      }
    });
    expect(sendUserList).toHaveBeenCalledTimes(getsXp ? 1 : 0);
    expect(Account.prototype.save).toHaveBeenCalledTimes(getsXp ? 5 : 0);
    expect(deltaLines(game.private.replayGameChats)).toHaveLength(0);
    expect(console.log).not.toHaveBeenCalled();
  });

  it("keeps an otherwise ranked silent game ranked", async () => {
    const accounts = makeAccounts();
    await finish(makeGame({ playerChats: "disabled" }), accounts);
    expect(accounts[0].lastRankedGameAt.getTime()).toBeGreaterThan(oldDate.getTime());
    expect(Account.prototype.save).toHaveBeenCalledTimes(5);
  });

  it("retains full team shape when one account cannot be resolved", async () => {
    const accounts = makeAccounts();
    const game = makeGame();
    const expected = computeRankedUpdates(
      { ...game, gameState: { isCompleted: "liberal" } },
      resolveHiddenRatings(accounts),
      game.private.seatedPlayers
    );
    await finish(game, accounts.slice(0, 4));
    accounts.slice(0, 4).forEach((account, i) => {
      expect(account.eloOverall).toBe(1810 + i * 10 + expected[account.username].change);
      expect(account.rating.overall.mu).toBeCloseTo(expected[account.username].overall.mu, 10);
      expect(account.rating.overall.sigma).toBeCloseTo(expected[account.username].overall.sigma, 10);
    });
    expect(Account.prototype.save).toHaveBeenCalledTimes(4);
    expect(deltaLines(game.private.replayGameChats)).toHaveLength(4);
    expect(deltaLines(game.private.replayGameChats).some((line) => line.chat[0].text === "player4")).toBe(false);
  });

  it("starts absent public scores at 1500 while preserving finite zero/negative totals", async () => {
    const accounts = makeAccounts();
    accounts[0].eloOverall = undefined;
    accounts[0].eloSeason = undefined;
    accounts[0].rating = undefined;
    accounts[1].eloOverall = 0;
    accounts[1].eloSeason = -100;
    accounts[2].maxElo = 1830;
    await finish(makeGame(), accounts);
    expect(accounts[0].eloOverall).toBeGreaterThanOrEqual(1476);
    expect(accounts[0].eloOverall).toBeLessThanOrEqual(1484);
    expect(accounts[0].eloSeason).toBe(accounts[0].eloOverall);
    expect(Number.isFinite(accounts[0].rating.overall.mu)).toBe(true);
    expect(Number.isFinite(accounts[0].rating.overall.sigma)).toBe(true);
    expect(accounts[0].get("rating.season")).toBeUndefined();
    expect(accounts[0].rating.overall.display).toBeUndefined();
    expect(accounts[1].eloOverall).toBeGreaterThanOrEqual(-24);
    expect(accounts[1].eloOverall).toBeLessThanOrEqual(-16);
    expect(accounts[1].eloSeason).toBe(accounts[1].eloOverall - 100);
    expect(accounts[2].maxElo).toBe(accounts[2].eloOverall);
  });

  it("does not stamp ranked activity when the engine cannot partition the roster, but still awards XP", async () => {
    const game = makeGame();
    game.private.seatedPlayers[0].role.team = "unknown";
    const accounts = makeAccounts();
    const before = accounts.map((account) => account.toObject());
    await finish(game, accounts);
    accounts.forEach((account, i) => {
      expect(account.eloOverall).toBe(before[i].eloOverall);
      expect(account.eloSeason).toBe(before[i].eloSeason);
      expect(account.toObject().rating).toEqual(before[i].rating);
      expect(account.lastRankedGameAt).toEqual(oldDate);
      // This timestamp historically belongs to the ranked branch, even when the rating is skipped.
      expect(account.lastCompletedGame.getTime()).toBeGreaterThan(oldDate.getTime());
      expect(account.xpOverall).toBe(i >= 2 ? 10 : 9);
    });
    expect(Account.prototype.save).toHaveBeenCalledTimes(5);
    expect(deltaLines(game.private.replayGameChats)).toHaveLength(0);
  });

  it("ends an invalid-winner game without account updates", async () => {
    const accounts = makeAccounts();
    const before = accounts.map(rankedState);
    await finish(makeGame(), accounts, "neither");
    expect(Account.find).not.toHaveBeenCalled();
    expect(accounts.map(rankedState)).toEqual(before);
    expect(storedGame.completed).toBe(true);
  });

  it.each([
    "general",
    "roster",
  ])("ends and releases a table with malformed %s without rating or XP", async (container) => {
    const game = makeGame();
    const uid = game.general.uid;
    games[uid] = game;
    if (container === "general") delete game.general;
    else game.private.seatedPlayers = {};
    const socket = { rooms: { [uid]: true }, emit: jest.fn(), leave: jest.fn(), handshake: {} };
    global.io.sockets.sockets.connected = socket;
    await completeGame(game, "liberal");
    expect(game.gameState.isCompleted).toBe("liberal");
    expect(game.gameState.timeCompleted).toEqual(expect.any(Number));
    expect(Account.find).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith("toLobby", uid);
    expect(socket.leave).toHaveBeenCalledWith(uid);
    expect(storedGame.uid).toBe(uid);
    expect(storedGame.completed).toBe(true);
    expect(games[uid]).toBeUndefined();
  });

  it("preserves an existing replay's metadata when containers are later lost, without duplicate saves", async () => {
    const game = makeGame({ name: "Known table" });
    await finish(game, makeAccounts());
    const uid = game.general.uid;
    delete game.general;
    game.private.seatedPlayers = {};
    const originalPlayers = storedGame.winningPlayers;
    await completeGame(game, "liberal");
    await completeGame(game, "liberal");
    expect(storedGame.name).toBe("Known table");
    expect(storedGame.winningPlayers).toEqual(originalPlayers);
    expect(Game.collection.insertOne).toHaveBeenCalledTimes(1);
    expect(Game.collection.updateOne).toHaveBeenCalledTimes(1);
    expect(games[uid]).toBeUndefined();
  });

  it("still releases a malformed table if replay persistence fails", async () => {
    const game = makeGame();
    const uid = game.general.uid;
    games[uid] = game;
    delete game.general;
    Game.findOne.mockRejectedValue(new Error("offline"));
    const socket = { rooms: { [uid]: true }, emit: jest.fn(), leave: jest.fn(), handshake: {} };
    global.io.sockets.sockets.connected = socket;
    await completeGame(game, "liberal");
    expect(games[uid]).toBeUndefined();
    expect(socket.emit).toHaveBeenCalledWith("toLobby", uid);
    expect(socket.leave).toHaveBeenCalledWith(uid);
    expect(Account.prototype.save).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(expect.any(Error), "error saving malformed completed game");
  });

  it("catches a ranked account lookup failure after the game has ended", async () => {
    const game = makeGame();
    Account.find.mockRejectedValue(new Error("offline"));
    completeGame(game, "liberal");
    await Promise.resolve();
    await Promise.resolve();
    await Promise.all(gameSaves);
    expect(game.gameState.isCompleted).toBe("liberal");
    expect(Account.prototype.save).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(expect.any(Error), "error in updating accounts at end of game");
  });
});
