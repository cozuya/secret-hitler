const { EventEmitter } = require("events");

let mongoose, Account, Game, ModAction, urls, models, lobbies, socketRoutes, handleModerationAction, sendGameList;
const originalIo = global.io;

// Reload the real list emitter under fake timers; setupFilesAfterEnv already loaded models once.
beforeAll(() => {
  jest.resetModules();
  jest.useFakeTimers();
  const redis = require("redis");
  jest.spyOn(redis, "createClient").mockReturnValue({ on: jest.fn(), get: jest.fn(), set: jest.fn() });
  mongoose = require("mongoose");
  Account = require("../../../../models/account");
  jest.spyOn(Account, "find").mockResolvedValue([]);
  const BannedIP = require("../../../../models/bannedIP");
  jest.spyOn(BannedIP, "deleteMany").mockImplementation((query, callback) => callback(null));
  Game = require("../../../../models/game");
  ModAction = require("../../../../models/modAction");
  urls = require("gfycat-style-urls");
  jest.spyOn(urls, "generateCombination");
  models = require("../../../../routes/socket/models");
  lobbies = require("../../../../routes/socket/system-lobbies/new-player");
  ({ socketRoutes } = require("../../../../routes/socket/routes"));
  ({ handleModerationAction } = require("../../../../routes/socket/user-events/moderation"));
  ({ sendGameList } = require("../../../../routes/socket/user-requests"));
});

beforeEach(() => {
  global.io = { on: jest.fn(), sockets: { emit: jest.fn(), sockets: {} } };
  jest.spyOn(Game, "findOne").mockResolvedValue(null);
  jest.spyOn(ModAction.prototype, "save").mockResolvedValue();
  urls.generateCombination.mockReset().mockReturnValue("FreshLobbyUid");
  models.gameCreationDisabled.status = false;
  models.gameListEmitter.send = false;
  models.gameListEmitter.state = 0;
});

afterEach(() => {
  for (const uid of Object.keys(models.games)) delete models.games[uid];
  models.gameCreationDisabled.status = false;
  models.gameListEmitter.send = false;
  Game.findOne.mockClear();
  global.io = originalIo;
});

afterAll(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const deferredLookup = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  Game.findOne.mockReturnValueOnce(promise);
  return { resolve, reject };
};

const enableGameCreation = () =>
  handleModerationAction(
    { emit: jest.fn() },
    { user: "admin" },
    { action: "enableGameCreation" },
    false,
    [],
    ["admin"]
  );

describe("New Player Game construction and ensure", () => {
  it("creates an empty, public vanilla Practice lobby with no creator", async () => {
    const game = await lobbies.ensureNewPlayerLobby();
    expect(Object.values(models.games)).toEqual([game]);
    expect(game.general).toMatchObject({
      systemLobby: "new-player",
      uid: "FreshLobbyUid",
      name: "New Player Game",
      status: "Waiting for 5 more players..",
      minPlayersCount: 5,
      maxPlayersCount: 7,
      excludedPlayerCount: [],
      whitelistedPlayers: [],
      practiceGame: true,
      casualGame: false,
      private: false,
      unlistedGame: false,
      privateOnly: false,
      isTourny: false,
      rainbowgame: false,
      eloMinimum: 0,
      xpMinimum: 0,
      playerChats: "enabled",
      disableGamechat: false,
      disableObserver: false,
      disableObserverLobby: false,
      experiencedMode: false,
      isVerifiedOnly: false,
      avalonSH: null,
      monarchistSH: false,
      blindMode: false,
      noVoteReveal: false,
      timedMode: false,
      flappyMode: false,
      flappyOnlyMode: false,
      neighborChat: false,
      noTopdecking: 0,
      rebalance6p: false,
      rebalance7p: false,
      rebalance9p2f: false,
      timeCreated: expect.any(Date),
    });
    expect(game.customGameSettings).toEqual({ enabled: false });
    expect(game.publicPlayersState).toEqual([]);
    expect(game.playersState).toEqual([]);
    expect(game.cardFlingerState).toEqual([]);
    expect(game.chats).toEqual([]);
    expect(game.guesses).toEqual({});
    expect(game.merlinGuesses).toEqual({});
    expect(game.gameState).toEqual({
      previousElectedGovernment: [],
      undrawnPolicyCount: 17,
      discardedPolicyCount: 0,
      presidentIndex: -1,
    });
    expect(game.trackState).toEqual({
      liberalPolicyCount: 0,
      fascistPolicyCount: 0,
      electionTrackerCount: 0,
      enactedPolicies: [],
      consecutiveTopdecks: 0,
    });
    expect(game.private).toEqual({
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
    });
    expect(models.gameListEmitter.send).toBe(true);
    expect(global.io.sockets.emit).not.toHaveBeenCalled();
  });

  it("identifies the server marker without relying on the room name or creator", () => {
    expect(lobbies.isNewPlayerLobby(lobbies.buildNewPlayerLobby("system"))).toBe(true);
    expect(lobbies.isNewPlayerLobby({ general: { name: "New Player Game" } })).toBe(false);
    expect(lobbies.isNewPlayerLobby(null)).toBe(false);
    expect(lobbies.isNewPlayerLobby({})).toBe(false);
  });

  it("is idempotent across repeated and overlapping Mongo lookups", async () => {
    const lookup = deferredLookup();
    const calls = [lobbies.ensureNewPlayerLobby(), lobbies.ensureNewPlayerLobby(), lobbies.ensureNewPlayerLobby()];
    expect(Game.findOne).toHaveBeenCalledTimes(1);
    expect(Object.keys(models.games)).toHaveLength(0);
    lookup.resolve(null);
    const [game, second, third] = await Promise.all(calls);
    expect(second).toBe(game);
    expect(third).toBe(game);
    expect(await lobbies.ensureNewPlayerLobby()).toBe(game);
    expect(await lobbies.ensureNewPlayerLobby()).toBe(game);
    expect(Object.values(models.games)).toEqual([game]);
    expect(Game.findOne).toHaveBeenCalledTimes(1);
  });

  it.each([5, 7])("keeps the %i-seat countdown cohort until gameplay actually starts", async (count) => {
    const game = await lobbies.ensureNewPlayerLobby();
    game.gameState.isStarted = true;
    game.publicPlayersState = Array.from({ length: count }, (_, index) => ({ userName: `Player${index}` }));
    expect(await lobbies.ensureNewPlayerLobby()).toBe(game);
    expect(Object.values(models.games)).toEqual([game]);
    expect(Game.findOne).toHaveBeenCalledTimes(1);
  });

  it.each(["isTracksFlipped", "isCompleted"])("does not treat %s games as waiting intake", async (state) => {
    const game = lobbies.buildNewPlayerLobby("old-cohort");
    game.gameState[state] = true;
    models.games[game.general.uid] = game;
    const waiting = await lobbies.ensureNewPlayerLobby();
    expect(waiting).not.toBe(game);
    expect(Object.values(models.games)).toEqual([game, waiting]);
  });

  it("respects disabled creation without deleting an existing waiting room", async () => {
    models.gameCreationDisabled.status = true;
    await lobbies.ensureNewPlayerLobby();
    expect(Object.keys(models.games)).toHaveLength(0);
    expect(Game.findOne).not.toHaveBeenCalled();
    models.gameCreationDisabled.status = false;
    const game = await lobbies.ensureNewPlayerLobby();
    models.gameCreationDisabled.status = true;
    await lobbies.ensureNewPlayerLobby();
    expect(Object.values(models.games)).toEqual([game]);
  });

  it("rechecks creation being disabled during the UID lookup", async () => {
    const lookup = deferredLookup();
    const pending = lobbies.ensureNewPlayerLobby();
    models.gameCreationDisabled.status = true;
    lookup.resolve(null);
    await pending;
    expect(Object.keys(models.games)).toHaveLength(0);
    expect(models.gameListEmitter.send).toBe(false);
  });

  it("avoids both historical and live UID collisions, including a live collision during the lookup", async () => {
    const existing = lobbies.buildNewPlayerLobby("live");
    delete existing.general.systemLobby;
    models.games.live = existing;
    urls.generateCombination.mockReturnValueOnce("live").mockReturnValueOnce("saved").mockReturnValueOnce("race");
    Game.findOne.mockResolvedValueOnce({ uid: "saved" }).mockImplementationOnce(() => {
      models.games.race = existing;
      return Promise.resolve(null);
    });
    const game = await lobbies.ensureNewPlayerLobby();
    expect(game.general.uid).toBe("FreshLobbyUid");
    expect(models.games.live).toBe(existing);
    expect(models.games.race).toBe(existing);
    expect(Game.findOne.mock.calls).toEqual([[{ uid: "saved" }], [{ uid: "race" }], [{ uid: "FreshLobbyUid" }]]);
  });

  it("clears an unsuccessful in-flight ensure so a later call can recover", async () => {
    const error = new Error("UID lookup failed");
    Game.findOne.mockRejectedValueOnce(error);
    await expect(lobbies.ensureNewPlayerLobby()).rejects.toBe(error);
    expect(Object.keys(models.games)).toHaveLength(0);
    const game = await lobbies.ensureNewPlayerLobby();
    expect(Object.values(models.games)).toEqual([game]);
  });
});

describe("New Player Game boot", () => {
  let realConnection;

  beforeEach(() => {
    // Exercise socketRoutes with an event-driven connection without opening Mongo or client sockets.
    realConnection = mongoose.connection;
    mongoose.connection = new EventEmitter();
    mongoose.connection.readyState = 0;
  });

  afterEach(() => {
    mongoose.connection = realConnection;
  });

  it("waits for Mongo after registering sockets, then creates without a client connecting", async () => {
    socketRoutes();
    expect(global.io.on).toHaveBeenCalledWith("connection", expect.any(Function));
    expect(Game.findOne).not.toHaveBeenCalled();
    expect(Object.keys(models.games)).toHaveLength(0);
    mongoose.connection.readyState = 1;
    mongoose.connection.emit("open");
    expect(Game.findOne).toHaveBeenCalledTimes(1);
    const game = await lobbies.ensureNewPlayerLobby();
    expect(Object.values(models.games)).toEqual([game]);
    expect(game.publicPlayersState).toEqual([]);
    expect(game.general.status).toBe("Waiting for 5 more players..");
    expect(Game.findOne).toHaveBeenCalledTimes(1);
    expect(mongoose.connection.listenerCount("open")).toBe(0);
  });

  it("also creates if Mongo is already open when sockets initialize", async () => {
    mongoose.connection.readyState = 1;
    socketRoutes();
    expect(Game.findOne).toHaveBeenCalledTimes(1);
    await lobbies.ensureNewPlayerLobby();
    expect(Object.keys(models.games)).toHaveLength(1);
  });

  it.each([0, 1])("creates nothing when disabled at boot (Mongo readyState %i)", async (readyState) => {
    models.gameCreationDisabled.status = true;
    mongoose.connection.readyState = readyState;
    socketRoutes();
    mongoose.connection.emit("open");
    await lobbies.ensureNewPlayerLobby();
    expect(Game.findOne).not.toHaveBeenCalled();
    expect(Object.keys(models.games)).toHaveLength(0);
  });

  it("logs a failed boot lookup without leaving an unhandled rejection", async () => {
    const error = new Error("Mongo lookup unavailable");
    const log = jest.spyOn(console, "error").mockImplementation(() => {});
    mongoose.connection.readyState = 1;
    Game.findOne.mockRejectedValueOnce(error);
    socketRoutes();
    const pending = lobbies.ensureNewPlayerLobby();
    await expect(pending).rejects.toBe(error);
    expect(log).toHaveBeenCalledWith("Could not create the New Player Game at startup:", error);
    expect(Object.keys(models.games)).toHaveLength(0);
    log.mockRestore();
  });
});

describe("New Player Game moderation re-enable", () => {
  it("restores after a disabled ensure was called in the same turn", async () => {
    models.gameCreationDisabled.status = true;
    const disabled = lobbies.ensureNewPlayerLobby();
    enableGameCreation();
    expect(Game.findOne).toHaveBeenCalledTimes(1);
    await disabled;
    await lobbies.ensureNewPlayerLobby();
    expect(Object.keys(models.games)).toHaveLength(1);
  });

  it("flips the flag synchronously and restores exactly one room", async () => {
    models.gameCreationDisabled.status = true;
    enableGameCreation();
    expect(models.gameCreationDisabled.status).toBe(false);
    expect(Game.findOne).toHaveBeenCalledTimes(1);
    enableGameCreation();
    const game = await lobbies.ensureNewPlayerLobby();
    enableGameCreation();
    await lobbies.ensureNewPlayerLobby();
    expect(Object.values(models.games)).toEqual([game]);
    expect(Game.findOne).toHaveBeenCalledTimes(1);
  });

  it("shares an in-flight ensure across disable and re-enable", async () => {
    const lookup = deferredLookup();
    const pending = lobbies.ensureNewPlayerLobby();
    models.gameCreationDisabled.status = true;
    enableGameCreation();
    enableGameCreation();
    expect(Game.findOne).toHaveBeenCalledTimes(1);
    lookup.resolve(null);
    const game = await pending;
    expect(Object.values(models.games)).toEqual([game]);
  });

  it("retries when re-enable arrives after a lookup observes disabled creation but before it settles", async () => {
    const lookup = deferredLookup();
    const pending = lobbies.ensureNewPlayerLobby();
    models.gameCreationDisabled.status = true;
    lookup.resolve(null);
    await Promise.resolve();
    enableGameCreation();
    await pending;
    expect(Game.findOne).toHaveBeenCalledTimes(2);
    await lobbies.ensureNewPlayerLobby();
    expect(Object.keys(models.games)).toHaveLength(1);
  });

  it("handles a failed re-enable lookup and allows a later trigger to recover", async () => {
    const error = new Error("Mongo lookup unavailable");
    const log = jest.spyOn(console, "error").mockImplementation(() => {});
    Game.findOne.mockRejectedValueOnce(error);
    enableGameCreation();
    await expect(lobbies.ensureNewPlayerLobby()).rejects.toBe(error);
    expect(log).toHaveBeenCalledWith("Could not restore the New Player Game after enabling game creation:", error);
    enableGameCreation();
    await lobbies.ensureNewPlayerLobby();
    expect(Object.keys(models.games)).toHaveLength(1);
    log.mockRestore();
  });
});

describe("empty New Player Game listing", () => {
  it("serializes, sends directly, and broadcasts the zero-seat lobby without a human-room notification", async () => {
    await lobbies.ensureNewPlayerLobby();
    const list = models.formattedGameList();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      name: "New Player Game",
      gameCreatorName: null,
      systemLobby: "new-player",
      gameStatus: "notStarted",
      seatedCount: 0,
      minPlayersCount: 5,
      maxPlayersCount: 7,
      userNames: [],
      customCardback: [],
      customCardbackUid: [],
      practiceGame: true,
      isCustomGame: false,
      enactedLiberalPolicyCount: 0,
      enactedFascistPolicyCount: 0,
      electionCount: 0,
    });
    const serialized = JSON.parse(JSON.stringify(list));
    expect(serialized[0].gameCreatorName).toBe(null);
    expect(serialized[0].systemLobby).toBe("new-player");
    expect(serialized[0].seatedCount).toBe(0);
    expect(serialized[0].maxPlayersCount).toBe(7);
    const socket = { emit: jest.fn() };
    sendGameList(socket, false);
    expect(socket.emit).toHaveBeenCalledWith("gameList", list);
    jest.advanceTimersByTime(100);
    expect(global.io.sockets.emit.mock.calls).toEqual([["gameList", list]]);
    expect(models.gameListEmitter.send).toBe(false);
  });

  it("omits the optional marker from ordinary game-list rows on the wire", () => {
    const game = lobbies.buildNewPlayerLobby("HumanLobby");
    delete game.general.systemLobby;
    game.private.gameCreatorName = "Human";
    models.games[game.general.uid] = game;
    const [row] = models.formattedGameList();
    expect(row.systemLobby).toBeUndefined();
    expect(JSON.parse(JSON.stringify(row))).not.toHaveProperty("systemLobby");
    expect(row.gameCreatorName).toBe("Human");
  });
});
