const { EventEmitter } = require("events");

let mongoose, realConnection, Account, Game, ModAction, models, lobbies, endGame, socketRoutes;
let updateSeatedUser, handleUserLeaveGame, handleSocketDisconnect, handleModerationAction, handleUpdatedRemakeGame;
let handleAddNewGameChat, sendCommandChatsUpdate, sendInProgressGameUpdate;
const originalIo = global.io;

// Reload the real handlers/emitter under fake timers; persistence and transport are the only substitutes.
beforeAll(() => {
  jest.resetModules();
  jest.useFakeTimers();
  const redis = require("redis");
  jest.spyOn(redis, "createClient").mockReturnValue({
    on: jest.fn(),
    get: jest.fn((key, callback) => callback(null, "null")),
    set: jest.fn(),
  });
  mongoose = require("mongoose");
  realConnection = mongoose.connection;
  Account = require("../../../../models/account");
  jest.spyOn(Account, "find").mockResolvedValue([]);
  const BannedIP = require("../../../../models/bannedIP");
  jest.spyOn(BannedIP, "deleteMany").mockImplementation((query, callback) => callback(null));
  Game = require("../../../../models/game");
  ModAction = require("../../../../models/modAction");
  const urls = require("gfycat-style-urls");
  jest.spyOn(urls, "generateCombination").mockReturnValue("ReplacementLobby");
  models = require("../../../../routes/socket/models");
  lobbies = require("../../../../routes/socket/system-lobbies/new-player");
  endGame = require("../../../../routes/socket/game/end-game");
  jest.spyOn(endGame, "saveAndDeleteGame");
  ({ socketRoutes } = require("../../../../routes/socket/routes"));
  ({ updateSeatedUser } = require("../../../../routes/socket/user-events/join-game"));
  ({ handleUserLeaveGame, handleSocketDisconnect } = require("../../../../routes/socket/user-events/leave-game"));
  ({ handleModerationAction } = require("../../../../routes/socket/user-events/moderation"));
  ({ handleUpdatedRemakeGame } = require("../../../../routes/socket/user-events/remake-game"));
  ({ handleAddNewGameChat } = require("../../../../routes/socket/user-events/chat"));
  ({ sendCommandChatsUpdate, sendInProgressGameUpdate } = require("../../../../routes/socket/util"));
});

// Teardown and restoration each cross promise boundaries; drain them without real-time sleeps.
const settle = async () => {
  for (let step = 0; step < 8; step++) await Promise.resolve();
};

beforeEach(() => {
  jest.clearAllMocks();
  const sockets = {};
  global.io = {
    on: jest.fn(),
    sockets: {
      sockets,
      connected: sockets,
      adapter: { rooms: {} },
      emit: jest.fn(),
      in: jest.fn().mockReturnValue({ emit: jest.fn() }),
    },
  };
  // GC registration is independent of boot's Mongo-open event.
  const connection = new EventEmitter();
  connection.readyState = 0;
  jest.spyOn(mongoose, "connection", "get").mockReturnValue(connection);
  jest.spyOn(Account, "findOne").mockImplementation((query, callback) => {
    if (callback) return callback(null, null);
    return Promise.resolve({ username: query.username, isRainbowOverall: false, wins: 0, losses: 0, gameSettings: {} });
  });
  jest.spyOn(Game, "findOne").mockResolvedValue(null);
  jest.spyOn(Game.prototype, "save").mockResolvedValue();
  jest.spyOn(ModAction.prototype, "save").mockResolvedValue();
  models.gameCreationDisabled.status = false;
  models.limitNewPlayers.status = false;
  models.gameListEmitter.send = false;
  models.gameListEmitter.state = 0;
});

afterEach(async () => {
  await settle();
  jest.clearAllTimers();
  for (const uid of Object.keys(models.games)) delete models.games[uid];
  models.userList.length = 0;
  global.io = originalIo;
});

afterAll(() => {
  mongoose.connection = realConnection;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const waitingGame = () => {
  const game = lobbies.buildNewPlayerLobby("WaitingLobby");
  models.games[game.general.uid] = game;
  return game;
};

const makeSocket = (game, name = "Grey", joinRoom = true) => {
  const socket = {
    id: name,
    handshake: { session: { passport: { user: name } } },
    emit: jest.fn(),
    leave: jest.fn(),
  };
  global.io.sockets.sockets[name] = socket;
  models.userList.push({ userName: name, status: { type: "none" } });
  if (joinRoom) {
    const rooms = global.io.sockets.adapter.rooms;
    rooms[game.general.uid] = rooms[game.general.uid] || { sockets: {} };
    rooms[game.general.uid].sockets[name] = true;
  }
  return socket;
};

const joinGrey = async (game) => {
  const socket = makeSocket(game);
  updateSeatedUser(socket, socket.handshake.session.passport, { uid: game.general.uid });
  await settle();
  expect(game.publicPlayersState.map((player) => player.userName)).toEqual(["Grey"]);
  expect(socket.emit).toHaveBeenCalledWith("updateSeatForUser", true);
  return socket;
};

const leave = (socket, game) =>
  handleUserLeaveGame(socket, game, { uid: game.general.uid }, socket.handshake.session.passport);

const moderatorDelete = (game) =>
  handleModerationAction(
    { emit: jest.fn() },
    { user: "admin" },
    { action: "deleteGame", userName: `DELGAME${game.general.uid}`, ip: "127.0.0.1" },
    false,
    [],
    ["admin"]
  );

const expectRetainedEmptyLobby = (game) => {
  expect(models.games[game.general.uid]).toBe(game);
  expect(Object.values(models.games)).toEqual([game]);
  expect(game.publicPlayersState).toEqual([]);
  expect(game.general.status).toBe("Waiting for 5 more players..");
  expect(game.general.private).toBe(false);
  expect(game.general.unlistedGame).toBe(false);
  expect(game.general.timeAbandoned).toBeUndefined();
  expect(game.gameState.timeCompleted).toBeUndefined();
  expect(game.gameState.isStarted).toBeFalsy();
  expect(game.gameState.cancellStart).toBeFalsy();
  expect(endGame.saveAndDeleteGame).not.toHaveBeenCalled();
  expect(Game.findOne).not.toHaveBeenCalled();
  expect(Game.prototype.save).not.toHaveBeenCalled();
  expect(models.gameListEmitter.send).toBe(true);
  expect(models.formattedGameList()[0]).toMatchObject({
    uid: game.general.uid,
    seatedCount: 0,
    gameStatus: "notStarted",
  });
};

describe("waiting New Player Game retention", () => {
  it.each([
    false,
    true,
  ])("keeps the same room when the last player leaves (creation disabled: %s)", async (disabled) => {
    const game = waitingGame();
    const observer = makeSocket(game, "Observer");
    const timersBefore = jest.getTimerCount();
    const socket = await joinGrey(game);
    models.gameCreationDisabled.status = disabled;
    models.gameListEmitter.send = false;
    leave(socket, game);
    await settle();
    expectRetainedEmptyLobby(game);
    expect(jest.getTimerCount()).toBe(timersBefore);
    expect(socket.emit).toHaveBeenLastCalledWith("gameUpdate", {});
    expect(models.userList.find((user) => user.userName === "Grey").status).toEqual({ type: "none", gameId: false });
    expect(observer.emit).toHaveBeenCalledWith("gameUpdate", expect.objectContaining({ publicPlayersState: [] }));
    expect(global.io.sockets.in).not.toHaveBeenCalled();
  });

  it.each([false, true])("keeps the same room on last-player disconnect (creation disabled: %s)", async (disabled) => {
    const game = waitingGame();
    const observer = makeSocket(game, "Observer");
    const timersBefore = jest.getTimerCount();
    const socket = await joinGrey(game);
    models.gameCreationDisabled.status = disabled;
    models.gameListEmitter.send = false;
    handleSocketDisconnect(socket);
    await settle();
    expectRetainedEmptyLobby(game);
    expect(jest.getTimerCount()).toBe(timersBefore);
    expect(models.userList.some((user) => user.userName === "Grey")).toBe(false);
    expect(observer.emit).toHaveBeenCalledWith("gameUpdate", expect.objectContaining({ publicPlayersState: [] }));
  });

  it("survives the real garbage-collector timer while empty", async () => {
    const game = waitingGame();
    socketRoutes();
    jest.advanceTimersByTime(30000);
    await settle();
    expect(models.games[game.general.uid]).toBe(game);
    expect(game.general.timeAbandoned).toBeUndefined();
    expect(game.gameState.timeCompleted).toBeUndefined();
    expect(endGame.saveAndDeleteGame).not.toHaveBeenCalled();
  });

  it("ignores stale abandonment metadata only for waiting system intake", async () => {
    const game = waitingGame();
    game.general.timeAbandoned = new Date(Date.now() - 300000);
    socketRoutes();
    jest.advanceTimersByTime(30000);
    await settle();
    expect(models.games[game.general.uid]).toBe(game);
    expect(endGame.saveAndDeleteGame).not.toHaveBeenCalled();
  });

  it("does not let a pregame remake request reach teardown", async () => {
    const game = waitingGame();
    const socket = await joinGrey(game);
    handleUpdatedRemakeGame(socket.handshake.session.passport, game, { remakeStatus: true }, socket);
    await settle();
    expect(models.games[game.general.uid]).toBe(game);
    expect(game.general.isRemaking).toBeUndefined();
    expect(game.general.isRemade).toBe(false);
    expect(endGame.saveAndDeleteGame).not.toHaveBeenCalled();
  });
});

describe("moderation deletion of waiting intake", () => {
  it("restores exactly once after asynchronous deletion, including repeated delete requests", async () => {
    const game = waitingGame();
    let finishLookup;
    Game.findOne.mockReturnValueOnce(new Promise((resolve) => (finishLookup = resolve)));
    moderatorDelete(game);
    moderatorDelete(game);
    expect(game.isBeingTornDown).toBe(true);
    expect(models.games[game.general.uid]).toBe(game);
    expect(Game.findOne).toHaveBeenCalledTimes(1);
    finishLookup(null);
    await settle();
    const rooms = Object.values(models.games);
    expect(rooms).toHaveLength(1);
    expect(rooms[0]).not.toBe(game);
    expect(rooms[0].general.uid).toBe("ReplacementLobby");
    expect(rooms[0].publicPlayersState).toEqual([]);
    expect(lobbies.shouldSurviveEmptyPregame(rooms[0])).toBe(true);
    expect(Game.findOne.mock.calls).toEqual([[{ uid: "WaitingLobby" }], [{ uid: "ReplacementLobby" }]]);
    expect(Game.prototype.save).toHaveBeenCalledTimes(1);
    expect(models.gameListEmitter.send).toBe(true);
  });

  it("honors disabled creation after deletion, then recovers on moderation re-enable", async () => {
    const game = waitingGame();
    models.gameCreationDisabled.status = true;
    moderatorDelete(game);
    await settle();
    expect(Object.values(models.games)).toEqual([]);
    expect(Game.findOne.mock.calls).toEqual([[{ uid: "WaitingLobby" }]]);
    handleModerationAction(
      { emit: jest.fn() },
      { user: "admin" },
      { action: "enableGameCreation" },
      false,
      [],
      ["admin"]
    );
    await settle();
    expect(Object.values(models.games)).toHaveLength(1);
    expect(models.games.ReplacementLobby.publicPlayersState).toEqual([]);
  });

  it("logs failed replacement creation without an unhandled rejection", async () => {
    const game = waitingGame();
    const error = new Error("replacement lookup failed");
    const log = jest.spyOn(console, "error").mockImplementation(() => {});
    Game.findOne.mockResolvedValueOnce(null).mockRejectedValueOnce(error);
    moderatorDelete(game);
    await settle();
    expect(Object.values(models.games)).toEqual([]);
    expect(log).toHaveBeenCalledWith("Could not restore the New Player Game after deletion:", error);
    log.mockRestore();
  });
});

const startedGame = (completed = false) => {
  const game = waitingGame();
  game.gameState.isStarted = true;
  game.gameState.isTracksFlipped = true;
  game.gameState.isCompleted = completed && "liberal";
  game.general.playerCount = 5;
  game.summarySaved = true;
  game.publicPlayersState = Array.from({ length: 5 }, (_, index) => ({
    userName: index === 4 ? "Grey" : `Gone${index}`,
    connected: index === 4,
    leftGame: index !== 4,
  }));
  game.private.seatedPlayers = game.publicPlayersState.map((player) => ({
    ...player,
    role: { team: "liberal", cardName: "liberal" },
    gameChats: [],
  }));
  return game;
};

describe("ordinary teardown remains available", () => {
  it.each(["leave", "disconnect"])("deletes an ordinary human lobby on last-player %s", async (action) => {
    const game = waitingGame();
    delete game.general.systemLobby;
    game.private.gameCreatorName = "Grey";
    const socket = await joinGrey(game);
    if (action === "leave") leave(socket, game);
    else handleSocketDisconnect(socket);
    await settle();
    expect(models.games[game.general.uid]).toBeUndefined();
    expect(Object.keys(models.games)).toHaveLength(0);
    expect(endGame.saveAndDeleteGame).toHaveBeenCalledWith(game.general.uid);
    expect(Game.findOne).toHaveBeenCalledTimes(1);
    expect(Game.prototype.save).toHaveBeenCalledTimes(1);
  });

  it("deletes a completed New Player game on last-player disconnect", async () => {
    const game = startedGame(true);
    const socket = makeSocket(game, "Grey", false);
    expect(lobbies.shouldSurviveEmptyPregame(game)).toBe(false);
    handleSocketDisconnect(socket);
    await settle();
    expect(Object.keys(models.games)).toHaveLength(0);
    expect(endGame.saveAndDeleteGame).toHaveBeenCalledWith(game.general.uid);
    expect(Game.findOne).toHaveBeenCalledTimes(1);
  });

  it.each([
    "leave",
    "disconnect",
  ])("abandons and collects a started New Player game after last-player %s", async (action) => {
    const game = startedGame();
    const socket = makeSocket(game, "Grey", false);
    if (action === "leave") leave(socket, game);
    else handleSocketDisconnect(socket);
    expect(game.general.timeAbandoned).toBeInstanceOf(Date);
    expect(models.games[game.general.uid]).toBe(game);
    game.general.timeAbandoned = new Date(Date.now() - 300000);
    socketRoutes();
    jest.advanceTimersByTime(30000);
    await settle();
    expect(Object.keys(models.games)).toHaveLength(0);
    expect(endGame.saveAndDeleteGame).toHaveBeenCalledWith(game.general.uid);
    expect(Game.findOne).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["New Player", false],
    ["Practice", false],
    ["ranked", false],
    ["casual", false],
    ["ranked", true],
  ])("collects a completed %s game without redirecting (abandoned: %s)", async (type, abandoned) => {
    const game = startedGame(true);
    if (type !== "New Player") {
      delete game.general.systemLobby;
      game.general.practiceGame = type === "Practice";
      game.general.casualGame = type === "casual";
    }
    const socket = makeSocket(game, "Grey", false);
    game.gameState.timeCompleted = Date.now() - 300000;
    // Completed results stay visible even if the game also has an expired abandonment timestamp.
    if (abandoned) game.general.timeAbandoned = new Date(Date.now() - 300000);
    socketRoutes();
    jest.advanceTimersByTime(30000);
    await settle();
    expect(Object.keys(models.games)).toHaveLength(0);
    expect(endGame.saveAndDeleteGame).toHaveBeenCalledWith(game.general.uid);
    expect(Game.findOne).toHaveBeenCalledTimes(1);
    expect(socket.emit).not.toHaveBeenCalledWith("toLobby", expect.anything());
    expect(socket.emit).not.toHaveBeenCalledWith("gameUpdate", {});
    expect(socket.leave).toHaveBeenCalledWith(game.general.uid);
  });

  it.each(["New Player", "human"])("still redirects from an abandoned, unfinished %s game", async (type) => {
    const game = startedGame();
    if (type === "human") delete game.general.systemLobby;
    const socket = makeSocket(game, "Grey", false);
    game.general.timeAbandoned = new Date(Date.now() - 300000);
    socketRoutes();
    jest.advanceTimersByTime(30000);
    await settle();
    expect(models.games[game.general.uid]).toBeUndefined();
    expect(socket.emit).toHaveBeenCalledWith("toLobby", game.general.uid);
    expect(socket.leave).toHaveBeenCalledWith(game.general.uid);
  });

  it("deletes a started New Player game through moderation without the waiting-room recovery hook", async () => {
    const game = startedGame();
    moderatorDelete(game);
    await settle();
    expect(Object.keys(models.games)).toHaveLength(0);
    expect(Game.findOne).toHaveBeenCalledTimes(1);
  });
});

describe("waiting New Player chat retention", () => {
  const seedChats = (game, count) => {
    game.chats = Array.from({ length: count }, (_, index) => ({ chat: `Earlier message ${index}` }));
  };

  const chat = (game, socket, message, admins = []) =>
    handleAddNewGameChat(
      socket,
      socket.handshake.session.passport,
      { uid: game.general.uid, chat: message },
      game,
      [],
      [],
      admins,
      jest.fn(),
      false
    );

  it.each([0, 1, 5, 6])("retains and broadcasts the newest 100 chats with %s players seated", async (seats) => {
    const game = waitingGame();
    const sender = makeSocket(game);
    const observer = makeSocket(game, "Observer");
    // An empty lobby can still receive ordinary Rainbow observer chat.
    models.userList[0].xpOverall = seats ? 0 : 10;
    models.userList[0].isRainbowOverall = seats === 0;
    game.publicPlayersState = Array.from({ length: seats }, (_, index) => ({
      userName: index ? `Player${index}` : "Grey",
    }));
    game.gameState.isStarted = seats >= 5; // Countdown sets this before tracks flip.
    seedChats(game, 98);

    for (let index = 0; index < 4; index++) {
      models.userList[0].lastMessage = { timestamp: Date.now() - 1000 };
      await chat(game, sender, `New message ${index}`);
      expect(game.chats).toHaveLength(Math.min(99 + index, 100));
      expect(game.chats[game.chats.length - 1].chat).toBe(`New message ${index}`);
      for (const socket of [sender, observer]) {
        expect(socket.emit).toHaveBeenLastCalledWith("gameUpdate", expect.objectContaining({ chats: game.chats }));
      }
    }
    expect(game.chats[0].chat).toBe("Earlier message 2");
  });

  it("also caps public command output during the countdown", async () => {
    const game = waitingGame();
    game.gameState.isStarted = true;
    const moderator = makeSocket(game, "Moderator");
    seedChats(game, 100);
    await chat(game, moderator, "/forcerigdeck B", ["Moderator"]);
    expect(game.chats).toHaveLength(100);
    expect(game.chats[0].chat).toBe("Earlier message 1");
    expect(game.chats[99]).toMatchObject({
      gameChat: true,
      chat: [{ text: "A staff member has changed the deck to " }, { text: "B", type: "liberal" }, { text: "." }],
    });
    expect(moderator.emit).toHaveBeenLastCalledWith("gameUpdate", expect.objectContaining({ chats: game.chats }));
  });

  it.each(["command", "full"])("bounds stored history even without room sockets (%s update)", (type) => {
    const game = waitingGame();
    seedChats(game, 200);
    const update = type === "command" ? sendCommandChatsUpdate : sendInProgressGameUpdate;
    update(game);
    expect(game.chats).toHaveLength(100);
    expect(game.chats[0].chat).toBe("Earlier message 100");
  });

  it("caps a full update sent to a newly joined observer", () => {
    const game = waitingGame();
    const observer = makeSocket(game, "Observer");
    seedChats(game, 200);
    sendInProgressGameUpdate(game);
    expect(game.chats).toHaveLength(100);
    expect(observer.emit).toHaveBeenCalledWith("gameUpdate", expect.objectContaining({ chats: game.chats }));
  });

  it.each(["started", "completed", "human public", "human private"])("preserves %s chat retention", async (type) => {
    const game = type === "started" || type === "completed" ? startedGame(type === "completed") : waitingGame();
    if (type.startsWith("human")) {
      delete game.general.systemLobby;
      game.general.private = type === "human private";
      game.publicPlayersState.push({ userName: "Grey" });
    }
    const sender = makeSocket(game);
    seedChats(game, 150);
    await chat(game, sender, "Latest message");
    expect(game.chats).toHaveLength(type === "human private" ? 31 : 151);
    expect(game.chats[game.chats.length - 1].chat).toBe("Latest message");
    // Later full broadcasts must also keep the started game's history intact.
    sendInProgressGameUpdate(game);
    expect(game.chats).toHaveLength(type === "human private" ? 31 : 151);
  });
});

describe("periodic New Player intake recovery", () => {
  it("retries a failed lookup on the next collector tick without duplicating an in-flight retry", async () => {
    const cohort = startedGame();
    const error = new Error("Mongo temporarily unavailable");
    const log = jest.spyOn(console, "error").mockImplementation(() => {});
    Game.findOne.mockRejectedValueOnce(error);
    socketRoutes();
    mongoose.connection.readyState = 1;
    jest.advanceTimersByTime(30000);
    await settle();
    expect(Object.values(models.games)).toEqual([cohort]);
    expect(Game.findOne).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith("Could not restore the New Player Game during collection:", error);

    let resolveLookup;
    Game.findOne.mockReturnValueOnce(new Promise((resolve) => (resolveLookup = resolve)));
    jest.advanceTimersByTime(30000);
    await settle();
    expect(Game.findOne).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(60000);
    await settle();
    expect(Game.findOne).toHaveBeenCalledTimes(2);
    resolveLookup(null);
    await settle();
    const intake = models.games.ReplacementLobby;
    expect(intake.publicPlayersState).toEqual([]);
    expect(Object.values(models.games)).toEqual([cohort, intake]);
    jest.advanceTimersByTime(30000);
    await settle();
    expect(Object.values(models.games).filter(lobbies.shouldSurviveEmptyPregame)).toEqual([intake]);
    expect(Game.findOne).toHaveBeenCalledTimes(2);
    log.mockRestore();
  });

  it("waits for a connected database and respects disabled creation on later ticks", async () => {
    socketRoutes();
    jest.advanceTimersByTime(30000);
    await settle();
    expect(Game.findOne).not.toHaveBeenCalled();
    mongoose.connection.readyState = 1;
    models.gameCreationDisabled.status = true;
    jest.advanceTimersByTime(30000);
    await settle();
    expect(Game.findOne).not.toHaveBeenCalled();
    models.gameCreationDisabled.status = false;
    jest.advanceTimersByTime(30000);
    await settle();
    expect(Object.values(models.games).filter(lobbies.shouldSurviveEmptyPregame)).toHaveLength(1);
    expect(Game.findOne).toHaveBeenCalledTimes(1);
  });
});
