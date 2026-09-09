let Account, Game, GameSummary, ModAction, models, lobbies, generateGameObject, urls;
let updateSeatedUser, handleUserLeaveGame, handleModerationAction, handleUpdatedRemakeGame;
let handleAddNewGame, sendGameList;
let nextUid;
const originalIo = global.io;

beforeAll(() => {
  jest.resetModules();
  jest.useFakeTimers();
  // Jest 24/jsdom returns numeric timer IDs; backend code uses Node Timeout's primitive conversion.
  // Keep the fake scheduler intact while exposing the same handle conversion as production.
  const scheduleInterval = global.setInterval.getMockImplementation();
  global.setInterval.mockImplementation((...args) => {
    const id = scheduleInterval(...args);
    return { [Symbol.toPrimitive]: () => id };
  });
  const redis = require("redis");
  jest.spyOn(redis, "createClient").mockReturnValue({ on: jest.fn(), get: jest.fn(), set: jest.fn() });
  Account = require("../../../../models/account");
  jest.spyOn(Account, "find").mockResolvedValue([]);
  const BannedIP = require("../../../../models/bannedIP");
  jest.spyOn(BannedIP, "deleteMany").mockImplementation((query, callback) => callback(null));
  Game = require("../../../../models/game");
  GameSummary = require("../../../../models/game-summary");
  ModAction = require("../../../../models/modAction");
  urls = require("gfycat-style-urls");
  jest.spyOn(urls, "generateCombination");
  models = require("../../../../routes/socket/models");
  lobbies = require("../../../../routes/socket/system-lobbies/new-player");
  ({ generateGameObject } = require("../../../../routes/socket/game/end-game"));
  ({ updateSeatedUser } = require("../../../../routes/socket/user-events/join-game"));
  ({ handleUserLeaveGame } = require("../../../../routes/socket/user-events/leave-game"));
  ({ handleModerationAction } = require("../../../../routes/socket/user-events/moderation"));
  ({ handleUpdatedRemakeGame } = require("../../../../routes/socket/user-events/remake-game"));
  ({ handleAddNewGame } = require("../../../../routes/socket/user-events/create-game"));
  ({ sendGameList } = require("../../../../routes/socket/user-requests"));
});

const settle = async () => {
  for (let step = 0; step < 8; step++) await Promise.resolve();
};

beforeEach(() => {
  jest.clearAllMocks();
  nextUid = 0;
  urls.generateCombination.mockImplementation(() => `NextLobby${++nextUid}`);
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
  jest.spyOn(Account, "findOne").mockImplementation((query, callback) => {
    if (callback) return callback(null, null);
    return Promise.resolve({ username: query.username, isRainbowOverall: false, wins: 0, losses: 0, gameSettings: {} });
  });
  jest.spyOn(Game, "findOne").mockResolvedValue(null);
  jest.spyOn(Game.prototype, "save").mockResolvedValue();
  jest.spyOn(GameSummary.prototype, "save").mockResolvedValue();
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
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const initialLobby = () => {
  const game = lobbies.buildNewPlayerLobby("CohortA");
  models.games[game.general.uid] = game;
  return game;
};

const waitingLobbies = () => Object.values(models.games).filter(lobbies.shouldSurviveEmptyPregame);

const sit = async (game, name) => {
  let socket = global.io.sockets.sockets[name];
  if (!socket) {
    socket = {
      id: name,
      handshake: { session: { passport: { user: name } } },
      emit: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
    };
    global.io.sockets.sockets[name] = socket;
    models.userList.push({ userName: name, status: { type: "none" } });
  }
  updateSeatedUser(socket, socket.handshake.session.passport, { uid: game.general.uid });
  await settle();
  expect(game.publicPlayersState.some((player) => player.userName === name)).toBe(true);
  return socket;
};

const fill = async (game, count) => {
  for (let index = game.publicPlayersState.length; index < count; index++) {
    await sit(game, `${game.general.uid}P${index}`);
  }
};

const leave = (game, name) => {
  const socket = global.io.sockets.sockets[name];
  handleUserLeaveGame(socket, game, { uid: game.general.uid }, socket.handshake.session.passport);
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

const createHumanLobby = async (name, options = {}) => {
  const socket = {
    id: name,
    handshake: { session: { passport: { user: name } } },
    emit: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
  };
  global.io.sockets.sockets[name] = socket;
  models.userList.push({
    userName: name,
    status: { type: "none" },
    timeLastGameCreated: 0,
    isRainbowOverall: false,
    blacklist: [],
  });
  await handleAddNewGame(socket, socket.handshake.session.passport, {
    gameName: name,
    gameType: "ranked",
    minPlayersCount: 5,
    maxPlayersCount: 7,
    excludedPlayerCount: [],
    playerChats: "enabled",
    privatePassword: false,
    unlistedGame: false,
    rainbowgame: false,
    noTopdecking: 0,
    ...options,
  });
  await settle();
  const game = Object.values(models.games).find((game) => game.private.gameCreatorName === name);
  expect(game).toBeDefined();
  return { game, socket };
};

describe("New Player countdown and actual-start replacement", () => {
  it("starts the existing countdown at five players without creating replacement intake", async () => {
    const game = initialLobby();
    for (let count = 1; count <= 4; count++) {
      await fill(game, count);
      expect(game.gameState.isStarted).toBeFalsy();
      expect(waitingLobbies()).toEqual([game]);
    }
    await fill(game, 5);
    expect(game.gameState.isStarted).toBe(true);
    expect(game.gameState.isTracksFlipped).toBeFalsy();
    jest.advanceTimersByTime(1000);
    await settle();
    expect(game.general.status).toBe("Game starts in 20 seconds.");
    expect(waitingLobbies()).toEqual([game]);
    expect(Object.values(models.games)).toEqual([game]);
    expect(Game.findOne).not.toHaveBeenCalled();
  });

  it.each([
    [1, 1000, "Waiting for 1 more player.."],
    [5, 16999, "Waiting for 5 more players.."],
  ])("cancels back to the same waiting lobby after %i players leave at %i ms", async (leavingCount, elapsed, status) => {
    const game = initialLobby();
    const initialTimers = jest.getTimerCount();
    await fill(game, 5);
    jest.advanceTimersByTime(elapsed);
    for (const name of game.publicPlayersState.slice(0, leavingCount).map((player) => player.userName))
      leave(game, name);
    expect(game.gameState.cancellStart).toBe(true);
    expect(waitingLobbies()).toEqual([game]);
    jest.advanceTimersByTime(1000);
    await settle();
    expect(game.gameState.isStarted).toBe(false);
    expect(game.gameState.cancellStart).toBe(false);
    expect(game.gameState.isTracksFlipped).toBeFalsy();
    expect(game.general.status).toBe(status);
    expect(game.publicPlayersState).toHaveLength(5 - leavingCount);
    expect(jest.getTimerCount()).toBe(initialTimers);
    jest.advanceTimersByTime(30000);
    await settle();
    expect(waitingLobbies()).toEqual([game]);
    expect(Object.values(models.games)).toEqual([game]);
    expect(Game.findOne).not.toHaveBeenCalled();
  });

  it.each([5, 6])("starts a %ip cohort at normal expiry and only then creates one empty replacement", async (count) => {
    const game = initialLobby();
    await fill(game, 5);
    jest.advanceTimersByTime(1000);
    if (count === 6) await fill(game, 6);
    // Existing behavior hands off when the 20-second counter reaches 4, on its 17th tick.
    jest.advanceTimersByTime(15999);
    expect(game.gameState.isTracksFlipped).toBeFalsy();
    expect(Object.values(models.games)).toEqual([game]);
    Game.findOne.mockImplementationOnce(() => {
      expect(lobbies.shouldSurviveEmptyPregame(game)).toBe(false);
      expect(game.private.seatedPlayers).toHaveLength(count);
      return Promise.resolve(null);
    });
    jest.advanceTimersByTime(1);
    await settle();
    expect(game.gameState.isTracksFlipped).toBe(true);
    expect(game.general.playerCount).toBe(count);
    expect(models.games.CohortA).toBe(game);
    const [replacement] = waitingLobbies();
    expect(waitingLobbies()).toHaveLength(1);
    expect(replacement).not.toBe(game);
    expect(replacement.publicPlayersState).toEqual([]);
    expect(Object.values(models.games)).toHaveLength(2);
    expect(Game.findOne).toHaveBeenCalledTimes(1);
    await sit(replacement, "NextGrey");
    expect(replacement.publicPlayersState.map((player) => player.userName)).toEqual(["NextGrey"]);
  });

  it("admits players six and seven during countdown, then starts on the next existing tick", async () => {
    const game = initialLobby();
    await fill(game, 5);
    jest.advanceTimersByTime(1000);
    await fill(game, 6);
    expect(game.gameState.isTracksFlipped).toBeFalsy();
    expect(waitingLobbies()).toEqual([game]);
    await fill(game, 7);
    jest.advanceTimersByTime(999);
    expect(game.gameState.isTracksFlipped).toBeFalsy();
    expect(Object.values(models.games)).toEqual([game]);
    jest.advanceTimersByTime(1);
    await settle();
    expect(game.gameState.isTracksFlipped).toBe(true);
    expect(game.general.playerCount).toBe(7);
    expect(waitingLobbies()).toHaveLength(1);
    expect(waitingLobbies()[0].publicPlayersState).toEqual([]);
    expect(Game.findOne).toHaveBeenCalledTimes(1);
  });

  it("maintains one waiting room through three successive cohorts without new-game notifications", async () => {
    let intake = await lobbies.ensureNewPlayerLobby();
    const started = [];
    for (let cohort = 0; cohort < 3; cohort++) {
      await fill(intake, 7);
      expect(waitingLobbies()).toEqual([intake]);
      expect(intake.gameState.isTracksFlipped).toBeFalsy();
      jest.advanceTimersByTime(1000);
      await settle();
      expect(intake.gameState.isTracksFlipped).toBe(true);
      started.push(intake);
      [intake] = waitingLobbies();
      expect(waitingLobbies()).toHaveLength(1);
      expect(started).not.toContain(intake);
      expect(global.io.sockets.emit.mock.calls.filter(([event]) => event === "newGameAdded")).toEqual([]);
    }
    expect(Object.values(models.games)).toHaveLength(4);
    expect(Object.values(models.games).filter((game) => game.publicPlayersState.length === 0)).toEqual([intake]);
    await Promise.all([lobbies.ensureNewPlayerLobby(), lobbies.ensureNewPlayerLobby(), lobbies.ensureNewPlayerLobby()]);
    expect(waitingLobbies()).toEqual([intake]);
    expect(Game.findOne).toHaveBeenCalledTimes(4);
    expect(global.io.sockets.emit.mock.calls.filter(([event]) => event === "newGameAdded")).toEqual([]);
  });

  it("skips replacement when disabled at start and restores exactly one on re-enable", async () => {
    const game = initialLobby();
    await fill(game, 7);
    models.gameCreationDisabled.status = true;
    jest.advanceTimersByTime(1000);
    await settle();
    expect(game.gameState.isTracksFlipped).toBe(true);
    expect(waitingLobbies()).toEqual([]);
    expect(Game.findOne).not.toHaveBeenCalled();
    enableGameCreation();
    enableGameCreation();
    await settle();
    expect(waitingLobbies()).toHaveLength(1);
    expect(waitingLobbies()[0].publicPlayersState).toEqual([]);
    expect(Object.values(models.games)).toHaveLength(2);
    expect(Game.findOne).toHaveBeenCalledTimes(1);
  });

  it("logs a replacement lookup failure while allowing the original cohort to start", async () => {
    const game = initialLobby();
    const error = new Error("next lobby lookup failed");
    const log = jest.spyOn(console, "error").mockImplementation(() => {});
    Game.findOne.mockRejectedValueOnce(error);
    await fill(game, 7);
    jest.advanceTimersByTime(1000);
    await settle();
    expect(game.gameState.isTracksFlipped).toBe(true);
    expect(game.private.seatedPlayers).toHaveLength(7);
    expect(waitingLobbies()).toEqual([]);
    expect(log).toHaveBeenCalledWith("Could not create the next New Player Game after a cohort started:", error);
    log.mockRestore();
  });

  it.each([
    false,
    true,
  ])("does not create system intake when a human game starts (Practice %s)", async (practiceGame) => {
    const game = initialLobby();
    delete game.general.systemLobby;
    game.general.practiceGame = practiceGame;
    game.private.gameCreatorName = "Human";
    await fill(game, 7);
    jest.advanceTimersByTime(1000);
    await settle();
    expect(game.gameState.isTracksFlipped).toBe(true);
    expect(Object.values(models.games)).toEqual([game]);
    expect(Game.findOne).not.toHaveBeenCalled();
  });
});

describe("human lobbies alongside New Player intake", () => {
  it.each([
    [{}, false, false, 1],
    [{ privatePassword: "private-test-password" }, true, false, 1],
    [{ unlistedGame: true }, false, true, 0],
  ])("keeps creator seating and notification behavior for human options %j", async (options, privateGame, unlisted, notices) => {
    await lobbies.ensureNewPlayerLobby();
    const { game, socket } = await createHumanLobby("HumanCreator", options);
    expect(game.publicPlayersState.map((player) => player.userName)).toEqual(["HumanCreator"]);
    expect(game.publicPlayersState[0].connected).toBe(true);
    expect(game.general).not.toHaveProperty("systemLobby");
    expect(game.general.private).toBe(privateGame);
    expect(game.general.unlistedGame).toBe(unlisted);
    expect(socket.join).toHaveBeenCalledWith(game.general.uid);
    expect(socket.emit).toHaveBeenCalledWith("updateSeatForUser");
    expect(socket.emit).toHaveBeenCalledWith("joinGameRedirect", game.general.uid);
    const notifications = global.io.sockets.emit.mock.calls.filter(([event]) => event === "newGameAdded");
    expect(notifications).toHaveLength(notices);
    if (notices)
      expect(notifications[0]).toEqual([
        "newGameAdded",
        {
          priv: privateGame,
          pub: !privateGame,
          timedMode: false,
          rainbow: false,
          standard: true,
          customgame: false,
          casualgame: false,
          creator: "HumanCreator",
        },
      ]);
    if (privateGame) {
      const guest = { emit: jest.fn() };
      updateSeatedUser(guest, { user: "PrivateGuest" }, { uid: game.general.uid, password: "wrong" });
      await settle();
      expect(game.publicPlayersState.map((player) => player.userName)).toEqual(["HumanCreator"]);
      expect(guest.emit).not.toHaveBeenCalled();
      updateSeatedUser(
        guest,
        { user: "PrivateGuest" },
        {
          uid: game.general.uid,
          password: "private-test-password",
        }
      );
      await settle();
      expect(game.publicPlayersState.map((player) => player.userName)).toEqual(["PrivateGuest", "HumanCreator"]);
      expect(guest.emit).toHaveBeenCalledWith("updateSeatForUser", true);
      expect(game.general.private).toBe(true);
    }
    expect(waitingLobbies()).toHaveLength(1);
  });

  it("preserves public, private, unlisted, ranked and custom rooms across a full cohort and replacement", async () => {
    const intake = await lobbies.ensureNewPlayerLobby();
    const customSettings = {
      enabled: true,
      deckState: { lib: 6, fas: 11 },
      trackState: { lib: 1, fas: 2 },
      fascistCount: 1,
      hitlerZone: 3,
      vetoZone: 5,
      powers: [null, "investigate", "election", "bullet", "bullet"],
    };
    const humans = [];
    for (const [name, options] of [
      ["PublicPractice", { gameType: "practice" }],
      ["Private", { privatePassword: "private-test-password" }],
      ["Unlisted", { unlistedGame: true }],
      ["Ranked", {}],
      ["Custom", { gameType: "custom", customGameSettings: customSettings }],
    ]) {
      const { game } = await createHumanLobby(name, options);
      humans.push(game);
    }
    const [practice, privateGame, unlisted, ranked, custom] = humans;
    expect(practice.general).toMatchObject({ practiceGame: true, casualGame: false, private: false });
    expect(privateGame.general.private).toBe(true);
    expect(privateGame.private.privatePassword).toBe("private-test-password");
    expect(unlisted.general).toMatchObject({ unlistedGame: true, private: false });
    expect(ranked.general).toMatchObject({ practiceGame: false, casualGame: false, private: false });
    expect(ranked.customGameSettings).toEqual({ enabled: false });
    expect(custom.customGameSettings).toEqual(customSettings);
    expect(custom.general).toMatchObject({ minPlayersCount: 5, maxPlayersCount: 5, practiceGame: false });
    const before = humans.map((game) => JSON.stringify(game));
    const notices = global.io.sockets.emit.mock.calls.filter(([event]) => event === "newGameAdded");
    expect(notices).toHaveLength(4);

    const assertEnvironment = (waiting) => {
      expect(waitingLobbies()).toEqual([waiting]);
      humans.forEach((game, index) => {
        expect(models.games[game.general.uid]).toBe(game);
        expect(JSON.stringify(game)).toBe(before[index]);
      });
      const rows = models.formattedGameList();
      expect(rows.map((row) => row.uid).sort()).toEqual(Object.keys(models.games).sort());
      expect(new Set(rows.map((row) => row.uid)).size).toBe(rows.length);
      expect(rows.find((row) => row.uid === waiting.general.uid)).toMatchObject({
        systemLobby: "new-player",
        gameStatus: "notStarted",
        seatedCount: waiting.publicPlayersState.length,
      });
      const publicSocket = { emit: jest.fn() };
      sendGameList(publicSocket, false);
      const publicRows = publicSocket.emit.mock.calls[0][1];
      expect(publicRows.map((row) => row.uid).sort()).toEqual(
        Object.keys(models.games)
          .filter((uid) => uid !== unlisted.general.uid)
          .sort()
      );
      expect(publicRows.find((row) => row.uid === privateGame.general.uid)).toMatchObject({
        private: true,
        seatedCount: 1,
      });
      expect(publicRows.find((row) => row.uid === privateGame.general.uid)).not.toHaveProperty("privatePassword");
      expect(publicRows.find((row) => row.uid === custom.general.uid)).toMatchObject({
        isCustomGame: true,
        seatedCount: 1,
      });
      const staffSocket = { emit: jest.fn() };
      sendGameList(staffSocket, true);
      expect(staffSocket.emit).toHaveBeenCalledWith("gameList", rows);
      expect(global.io.sockets.emit.mock.calls.filter(([event]) => event === "newGameAdded")).toEqual(notices);
    };

    assertEnvironment(intake);
    await fill(intake, 4);
    assertEnvironment(intake);
    await fill(intake, 5);
    expect(intake.gameState.isStarted).toBe(true);
    expect(intake.gameState.isTracksFlipped).toBeFalsy();
    assertEnvironment(intake);
    await fill(intake, 7);
    assertEnvironment(intake);
    jest.advanceTimersByTime(1000);
    await settle();
    expect(intake.gameState.isTracksFlipped).toBe(true);
    const [replacement] = waitingLobbies();
    expect(replacement).not.toBe(intake);
    expect(replacement.publicPlayersState).toEqual([]);
    assertEnvironment(replacement);
    jest.advanceTimersByTime(6000);
    await settle();
    expect(intake.private.seatedPlayers).toHaveLength(7);
    expect(intake.private.summary).toBeDefined();
    assertEnvironment(replacement);
  });
});

describe("started New Player cohort metadata", () => {
  it("remakes into an ordinary cohort room while leaving the single waiting intake unchanged", async () => {
    const game = initialLobby();
    await fill(game, 5);
    jest.advanceTimersByTime(17000);
    await settle();
    const [waiting] = waitingLobbies();
    // Run the real role-dealing prelude to initialize policies, roles, and the summary used by remake.
    jest.advanceTimersByTime(6000);
    await settle();
    expect(game.private.summary).toBeDefined();
    for (const player of game.publicPlayersState) {
      const socket = global.io.sockets.sockets[player.userName];
      handleUpdatedRemakeGame(socket.handshake.session.passport, game, { remakeStatus: true }, socket);
    }
    expect(game.general.isRemaking).toBe(true);
    jest.advanceTimersByTime(9000);
    await settle();
    const remake = models.games.CohortARemake1;
    expect(remake).toBeDefined();
    expect(remake.general).not.toHaveProperty("systemLobby");
    expect(lobbies.isNewPlayerLobby(remake)).toBe(false);
    expect(lobbies.shouldSurviveEmptyPregame(remake)).toBe(false);
    expect(remake.publicPlayersState).toHaveLength(5);
    expect(remake.general.practiceGame).toBe(true);
    expect(game.general.systemLobby).toBe("new-player");
    expect(waitingLobbies()).toEqual([waiting]);
    expect(Object.values(models.games)).toHaveLength(2);
    for (const name of remake.publicPlayersState.map((player) => player.userName)) leave(remake, name);
    await settle();
    expect(models.games.CohortARemake1).toBeUndefined();
    expect(waitingLobbies()).toEqual([waiting]);
  });

  it("keeps the marker live while archives and summaries retain ordinary Practice metadata only", async () => {
    const game = initialLobby();
    await fill(game, 7);
    jest.advanceTimersByTime(1000);
    await settle();
    jest.advanceTimersByTime(6000);
    await settle();
    expect(game.private.seatedPlayers).toHaveLength(7);
    expect(game.private.seatedPlayers.filter((player) => player.role.cardName === "hitler")).toHaveLength(1);
    expect(game.private.seatedPlayers.filter((player) => player.role.cardName === "fascist")).toHaveLength(2);
    expect(game.private.seatedPlayers.filter((player) => player.role.cardName === "liberal")).toHaveLength(4);
    const summary = game.private.summary.publish().toObject();
    expect(summary.gameSetting).toMatchObject({ practiceGame: true, casualGame: false });
    expect(summary.gameSetting).not.toHaveProperty("systemLobby");
    expect(summary).not.toHaveProperty("systemLobby");
    for (const isCompleted of [false, "liberal"]) {
      game.gameState.isCompleted = isCompleted;
      const archive = generateGameObject(game);
      expect(archive).toMatchObject({ practiceGame: true, casualGame: false, playerCount: 7 });
      expect(archive).not.toHaveProperty("systemLobby");
      expect(archive).not.toHaveProperty("general");
      const document = new Game(archive).toObject();
      expect(document.practiceGame).toBe(true);
      expect(document).not.toHaveProperty("systemLobby");
    }
    game.gameState.isCompleted = false;
    expect(lobbies.isNewPlayerLobby(game)).toBe(true);
    expect(models.formattedGameList().find((row) => row.uid === game.general.uid)).toMatchObject({
      gameStatus: "isStarted",
      practiceGame: true,
      seatedCount: 7,
    });
  });
});
