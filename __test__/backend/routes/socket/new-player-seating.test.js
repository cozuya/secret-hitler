let Account, models, lobbies, updateSeatedUser, sendGameInfo;
const originalIo = global.io;

beforeAll(() => {
  jest.resetModules();
  jest.useFakeTimers();
  // Match Node's timer-handle conversion while retaining Jest 24/jsdom's fake scheduler.
  const scheduleInterval = global.setInterval.getMockImplementation();
  global.setInterval.mockImplementation((...args) => {
    const id = scheduleInterval(...args);
    return { [Symbol.toPrimitive]: () => id };
  });
  const redis = require("redis");
  jest.spyOn(redis, "createClient").mockReturnValue({ on: jest.fn(), get: jest.fn(), set: jest.fn() });
  Account = require("../../../../models/account");
  jest.spyOn(Account, "find").mockResolvedValue([]);
  jest.spyOn(Account, "findOne");
  const BannedIP = require("../../../../models/bannedIP");
  jest.spyOn(BannedIP, "deleteMany").mockImplementation((query, callback) => callback(null));
  models = require("../../../../routes/socket/models");
  lobbies = require("../../../../routes/socket/system-lobbies/new-player");
  ({ updateSeatedUser } = require("../../../../routes/socket/user-events/join-game"));
  ({ sendGameInfo } = require("../../../../routes/socket/user-requests"));
});

const settle = async () => {
  for (let step = 0; step < 8; step++) await Promise.resolve();
};

beforeEach(() => {
  jest.clearAllMocks();
  const sockets = {};
  global.io = {
    sockets: {
      sockets,
      connected: sockets,
      adapter: { rooms: {} },
      emit: jest.fn(),
      in: jest.fn().mockReturnValue({ emit: jest.fn() }),
    },
  };
  models.limitNewPlayers.status = false;
  models.gameListEmitter.send = false;
  models.userListEmitter.send = false;
});

afterEach(async () => {
  await settle();
  jest.clearAllTimers();
  for (const uid of Object.keys(models.games)) delete models.games[uid];
  models.userList.length = 0;
  models.newStaff.editorUserNames.length = 0;
  models.newStaff.modUserNames.length = 0;
  global.io = originalIo;
});

afterAll(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const initialLobby = () => {
  const game = lobbies.buildNewPlayerLobby("NewPlayerSeats");
  models.games[game.general.uid] = game;
  return game;
};

const connect = (overrides = {}) => {
  const account = {
    username: "Applicant",
    isRainbowOverall: false,
    wins: 0,
    losses: 0,
    gameSettings: {},
    ...overrides,
  };
  Account.findOne.mockResolvedValue(account);
  const socket = {
    id: account.username,
    handshake: { session: { passport: { user: account.username } } },
    emit: jest.fn(),
    join: jest.fn(),
  };
  const user = { userName: account.username, staffRole: account.staffRole, status: { type: "none" } };
  models.userList.push(user);
  global.io.sockets.connected[socket.id] = socket;
  return { socket, user };
};

const attemptSeat = async (game, socket, extraData = {}) => {
  updateSeatedUser(socket, socket.handshake.session.passport, { uid: game.general.uid, ...extraData });
  await settle();
};

const fill = async (game, count) => {
  for (let index = 0; index < count; index++) {
    const { socket } = connect({ username: `Grey${index}` });
    await attemptSeat(game, socket);
  }
};

it("seats a non-Rainbow account using the flag alone and runs the normal status/countdown path", async () => {
  const game = initialLobby();
  await fill(game, 4);
  expect(game.general.status).toBe("Waiting for 1 more player..");
  expect(game.gameState.isStarted).toBeFalsy();
  const { socket, user } = connect({
    isRainbowOverall: false,
    isRainbowSeason: true,
    xpOverall: 100,
    eloOverall: 2400,
    eloSeason: 2400,
    wins: 100,
    losses: 100,
  });
  await attemptSeat(game, socket);
  expect(game.publicPlayersState).toHaveLength(5);
  expect(game.publicPlayersState[0].userName).toBe("Applicant");
  expect(socket.emit).toHaveBeenCalledWith("updateSeatForUser", true);
  expect(user.status).toEqual({ type: "playing", gameId: game.general.uid });
  expect(models.gameListEmitter.send).toBe(true);
  expect(game.gameState.isStarted).toBe(true);
  jest.advanceTimersByTime(1000);
  expect(game.general.status).toBe("Game starts in 20 seconds.");
});

it.each([0, 4, 5])("rejects a Rainbow account without changing a %i-seat game or its timers/lists", async (count) => {
  const game = initialLobby();
  await fill(game, count);
  const { socket, user } = connect({ isRainbowOverall: true, xpOverall: 0, wins: 0, losses: 0 });
  models.gameListEmitter.send = false;
  models.userListEmitter.send = false;
  const before = JSON.stringify(game);
  const players = game.publicPlayersState;
  const timerCount = jest.getTimerCount();
  // Wire fields cannot override the account lookup, even though the schema allows unknown fields.
  await attemptSeat(game, socket, { isRainbowOverall: false, xpOverall: 0, systemLobby: false });
  expect(Account.findOne).toHaveBeenLastCalledWith({ username: "Applicant" });
  expect(JSON.stringify(game)).toBe(before);
  expect(game.publicPlayersState).toBe(players);
  expect(jest.getTimerCount()).toBe(timerCount);
  expect(user.status).toEqual({ type: "none" });
  expect(models.gameListEmitter.send).toBe(false);
  expect(models.userListEmitter.send).toBe(false);
  expect(socket.emit.mock.calls).toEqual([["gameJoinStatusUpdate", { status: "newPlayerOnly" }]]);
});

it.each([
  "admin",
  "editor",
  "moderator",
  "trialmod",
  "veteran",
  "altmod",
])("does not allow a Rainbow %s or creator to bypass the gate", async (staffRole) => {
  const game = initialLobby();
  const { socket } = connect({ isRainbowOverall: true, staffRole });
  // Exercise both the account role and the legacy privilege lists; creator identity is no exception either.
  models.newStaff.editorUserNames.push("Applicant");
  models.newStaff.modUserNames.push("Applicant");
  game.private.gameCreatorName = "Applicant";
  const before = JSON.stringify(game);
  await attemptSeat(game, socket);
  expect(JSON.stringify(game)).toBe(before);
  expect(socket.emit.mock.calls).toEqual([["gameJoinStatusUpdate", { status: "newPlayerOnly" }]]);
});

it.each([false, true])("still seats Rainbow accounts in human rooms (Rainbow-only %s)", async (rainbowgame) => {
  const game = initialLobby();
  delete game.general.systemLobby;
  game.general.rainbowgame = rainbowgame;
  game.private.gameCreatorName = "Human";
  const { socket, user } = connect({ isRainbowOverall: true });
  await attemptSeat(game, socket);
  expect(game.publicPlayersState.map((player) => player.userName)).toEqual(["Applicant"]);
  expect(user.status.type).toBe(rainbowgame ? "rainbow" : "playing");
  expect(socket.emit).toHaveBeenCalledWith("updateSeatForUser", true);
  expect(socket.emit).not.toHaveBeenCalledWith("gameJoinStatusUpdate", expect.anything());
});

it("keeps the existing silent refusal of non-Rainbow accounts in actual Rainbow rooms", async () => {
  const game = initialLobby();
  delete game.general.systemLobby;
  game.general.rainbowgame = true;
  game.private.gameCreatorName = "Human";
  const { socket } = connect();
  const before = JSON.stringify(game);
  await attemptSeat(game, socket);
  expect(JSON.stringify(game)).toBe(before);
  expect(socket.emit).not.toHaveBeenCalled();
});

it("still applies the public-room new-account lockdown below three games", async () => {
  const game = initialLobby();
  models.limitNewPlayers.status = true;
  const { socket } = connect({ wins: 1, losses: 1 });
  const before = JSON.stringify(game);
  await attemptSeat(game, socket);
  expect(JSON.stringify(game)).toBe(before);
  expect(socket.emit).not.toHaveBeenCalled();
  const { socket: established } = connect({ username: "ThreeGames", wins: 2, losses: 1 });
  await attemptSeat(game, established);
  expect(game.publicPlayersState.map((player) => player.userName)).toEqual(["ThreeGames"]);
});

it.each([
  undefined,
  "admin",
])("lets a Rainbow observer watch and stay observing after refusal (role %s)", async (staffRole) => {
  const game = initialLobby();
  const { socket, user } = connect({ isRainbowOverall: true, staffRole });
  global.io.sockets.adapter.rooms[game.general.uid] = { sockets: { [socket.id]: true } };
  const before = JSON.stringify(game);
  sendGameInfo(socket, game.general.uid);
  expect(socket.join).toHaveBeenCalledWith(game.general.uid);
  expect(socket.emit).toHaveBeenCalledWith("joinGameRedirect", game.general.uid);
  const update = socket.emit.mock.calls.find(([event]) => event === "gameUpdate")[1];
  expect(update.general.uid).toBe(game.general.uid);
  expect(update).not.toHaveProperty("private");
  expect(Account.findOne).not.toHaveBeenCalled();
  expect(user.status).toEqual({ type: "observing", gameId: game.general.uid });
  socket.emit.mockClear();
  await attemptSeat(game, socket);
  expect(JSON.stringify(game)).toBe(before);
  expect(user.status).toEqual({ type: "observing", gameId: game.general.uid });
  expect(socket.emit.mock.calls).toEqual([["gameJoinStatusUpdate", { status: "newPlayerOnly" }]]);
});
