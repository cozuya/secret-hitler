let Account, Game, GameSummary, Profile, models, lobbies, completeGame, updateSeatedUser, handleUpdatedRemakeGame;
let fields, rankedSeasonEligibility, _, summaryBuilder, List;
let storedAccounts, storedProfiles, writes, profileWrites, saves;
const originalIo = global.io;
const OriginalDate = Date;
const now = Date.parse("2026-09-09T04:00:00.000Z");
const day = 86400000;

// Freeze constructor timestamps too: promotion and badge dates must compare exactly across completions.
function FixedDate(...args) {
  return new OriginalDate(...(args.length ? args : [now]));
}
FixedDate.prototype = OriginalDate.prototype;
Object.setPrototypeOf(FixedDate, OriginalDate);
FixedDate.now = () => now;

beforeAll(() => {
  jest.resetModules();
  jest.useFakeTimers();
  // Node uses Timeout's primitive conversion; Jest 24/jsdom supplies numeric IDs instead.
  const scheduleInterval = global.setInterval.getMockImplementation();
  global.setInterval.mockImplementation((...args) => {
    const id = scheduleInterval(...args);
    return { [Symbol.toPrimitive]: () => id };
  });
  _ = require("lodash");
  ({ List } = require("immutable"));
  const redis = require("redis");
  jest.spyOn(redis, "createClient").mockReturnValue({ on: jest.fn(), get: jest.fn(), set: jest.fn() });
  Account = require("../../../../models/account");
  jest.spyOn(Account, "find").mockResolvedValue([]);
  jest.spyOn(Account, "findOne");
  const BannedIP = require("../../../../models/bannedIP");
  jest.spyOn(BannedIP, "deleteMany").mockImplementation((query, callback) => callback(null));
  Game = require("../../../../models/game");
  GameSummary = require("../../../../models/game-summary");
  Profile = require("../../../../models/profile");
  summaryBuilder = require("../../../../models/game-summary/GameSummaryBuilder");
  models = require("../../../../routes/socket/models");
  lobbies = require("../../../../routes/socket/system-lobbies/new-player");
  ({ completeGame } = require("../../../../routes/socket/game/end-game"));
  ({ updateSeatedUser } = require("../../../../routes/socket/user-events/join-game"));
  ({ handleUpdatedRemakeGame } = require("../../../../routes/socket/user-events/remake-game"));
  ({ CURRENT_SEASON_FIELDS: fields } = require("../../../../src/shared/season"));
  ({ rankedSeasonEligibility } = require("../../../../src/shared/ranked-eligibility"));
  // Compile Mongoose's schemas with the native Date type before replacing the runtime clock.
  global.Date = FixedDate;
});

// Apply the actual Mongoose collection update to a separate stored record, never the live document.
// Reject unknown operators so persistence assertions cannot silently omit a new kind of write.
const applyUpdate = (record, update) => {
  for (const [operator, changes] of Object.entries(update)) {
    expect(["$set", "$unset", "$inc", "$push"]).toContain(operator);
    for (const [path, value] of Object.entries(changes)) {
      if (operator === "$set") _.set(record, path, _.cloneDeep(value));
      if (operator === "$unset") _.unset(record, path);
      if (operator === "$inc") _.set(record, path, (_.get(record, path) || 0) + value);
      if (operator === "$push") {
        const array = _.get(record, path, []);
        array.splice(value.$position ?? array.length, 0, ..._.cloneDeep(value.$each || [value]));
        _.set(record, path, value.$slice === undefined ? array : array.slice(0, value.$slice));
      }
    }
  }
};

beforeEach(() => {
  jest.clearAllMocks();
  storedAccounts = new Map();
  storedProfiles = new Map();
  writes = [];
  profileWrites = [];
  saves = [];
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
  models.gameCreationDisabled.status = false;
  Account.find.mockImplementation((query) =>
    Promise.resolve((query.username?.$in || []).map((name) => Account.hydrate(_.cloneDeep(storedAccounts.get(name)))))
  );
  Account.findOne.mockImplementation((query, ...args) => {
    const record = query.username
      ? storedAccounts.get(query.username)
      : [...storedAccounts.values()].find((account) => String(account._id) === String(query._id));
    const result = Promise.resolve(record ? Account.hydrate(_.cloneDeep(record)) : null);
    result.exec = (callback) => {
      if (callback) result.then((account) => callback(null, account));
      return result;
    };
    result.select = result.lean = result.setOptions = () => result;
    const callback = args.find((arg) => typeof arg === "function");
    if (callback) result.then((account) => callback(null, account));
    return result;
  });
  jest.spyOn(Account.collection, "updateOne").mockImplementation((filter, update, options, callback) => {
    const record = [...storedAccounts.values()].find((account) => String(account._id) === String(filter._id));
    writes.push({ username: record.username, update: _.cloneDeep(update) });
    applyUpdate(record, update);
    callback(null, { n: 1, nModified: 1, ok: 1 });
  });
  const realSave = Account.prototype.save;
  jest.spyOn(Account.prototype, "save").mockImplementation(function (callback) {
    const pending = realSave.call(this);
    saves.push(pending);
    if (callback) pending.then(() => callback(null), callback);
    return pending;
  });
  // Keep profile computation and its account-badge follow-up real; replace only database transport.
  jest.spyOn(Profile, "findByIdAndUpdate").mockImplementation((username, update) => {
    const profile = storedProfiles.get(username);
    profileWrites.push({ username, update: _.cloneDeep(update) });
    applyUpdate(profile, update);
    return { exec: () => Promise.resolve(Profile.hydrate(_.cloneDeep(profile))) };
  });
  jest.spyOn(Game, "findOne").mockResolvedValue(null);
  jest.spyOn(Game.prototype, "save").mockResolvedValue();
  jest.spyOn(GameSummary.prototype, "save").mockResolvedValue();
  jest.spyOn(console, "log").mockImplementation(() => {});
});

const settle = async () => {
  // Profile badges have a separate promise chain that can schedule additional account saves.
  for (let step = 0; step < 12; step++) {
    await Promise.resolve();
    await Promise.all(saves);
  }
};

afterEach(async () => {
  await settle();
  jest.clearAllTimers();
  for (const uid of Object.keys(models.games)) delete models.games[uid];
  models.userList.length = 0;
  global.io = originalIo;
  // Leave the module-setup spies and fake timers installed for the next case.
  for (const target of [
    Account.collection.updateOne,
    Account.prototype.save,
    Profile.findByIdAndUpdate,
    Game.findOne,
    Game.prototype.save,
    GameSummary.prototype.save,
    console.log,
  ]) {
    target.mockRestore();
  }
});

afterAll(() => {
  global.Date = OriginalDate;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const seeds = () =>
  Array.from({ length: 5 }, (_, index) =>
    new Account({
      username: `Player${index}`,
      isRainbowOverall: false,
      isRainbowSeason: false,
      xpOverall: [7, 8, 9, 0, 9][index],
      xpSeason: [9, 0, 9, 8, 7][index],
      eloOverall: 1800 + index * 10,
      eloSeason: 1600 + index * 10,
      rating: { overall: { mu: 35 + index, sigma: 2 + index / 10 } },
      lastRankedGameAt: new Date(now - (index === 2 ? 15 : 1) * day),
      lastCompletedGame: new Date(now - 20 * day),
      wins: 40,
      losses: 30,
      [fields.wins]: 10,
      [fields.losses]: index === 0 ? 9 : 10,
      [fields.rainbowWins]: 3,
      [fields.rainbowLosses]: 2,
      gameSettings: {},
      created: new Date(now - 100 * day),
    }).toObject()
  );

const seedStore = (accounts) => {
  storedAccounts = new Map(accounts.map((account) => [account.username, _.cloneDeep(account)]));
  storedProfiles = new Map(
    accounts.map((account) => [
      account.username,
      new Profile({
        _id: account.username,
        created: account.created,
        // Exercise the existing games-played badge follow-up as well as XP badges.
        "stats.matches.practiceMatches.liberal.events": 99,
      }).toObject(),
    ])
  );
};

const lobby = (system = true) => {
  const game = lobbies.buildNewPlayerLobby("ProgressionComparison");
  if (!system) delete game.general.systemLobby;
  models.games[game.general.uid] = game;
  return game;
};

const completeSummary = (game, winner) => {
  const liberal = game.private.seatedPlayers.findIndex((player) => player.role.cardName === "liberal");
  // Supply completion logs for the real summary/profile path; this harness invokes completion directly.
  const logs = List(
    Array.from({ length: winner === "liberal" ? 5 : 6 }, () => ({
      presidentId: (liberal + 1) % 5,
      chancellorId: liberal,
      enactedPolicy: winner,
      presidentHand: { reds: winner === "fascist" ? 3 : 0, blues: winner === "liberal" ? 3 : 0 },
      chancellorHand: { reds: winner === "fascist" ? 2 : 0, blues: winner === "liberal" ? 2 : 0 },
      votes: [true, true, true, true, true],
    }))
  );
  game.private.summary = new summaryBuilder(
    game.general.uid,
    new Date(),
    { practiceGame: true },
    game.customGameSettings,
    game.private.seatedPlayers.map((player) => ({
      username: player.userName,
      role: player.role.cardName,
    })),
    {},
    {},
    logs
  );
};

const completionFixture = (system, winner) => {
  const game = lobby(system);
  game.general.playerCount = 5;
  game.gameState.isTracksFlipped = true;
  game.publicPlayersState = Array.from({ length: 5 }, (_, index) => ({ userName: `Player${index}`, cardStatus: {} }));
  game.private.seatedPlayers = ["hitler", "fascist", "liberal", "liberal", "liberal"].map((cardName, index) => ({
    userName: `Player${index}`,
    role: { cardName, team: index < 2 ? "fascist" : "liberal" },
    gameChats: [],
  }));
  game.private.policies = [];
  completeSummary(game, winner);
  return game;
};

const finish = async (game, winner) => {
  completeGame(game, winner);
  await settle();
  expect(console.log).not.toHaveBeenCalled();
};

// New badge subdocuments receive random storage IDs; compare every other value, including badge dates/text.
const comparable = (value) =>
  JSON.parse(
    JSON.stringify(value, (key, item) => {
      if (item && item.id && item.dateAwarded && item._id) return { ...item, _id: "generated-badge-id" };
      return item;
    })
  );

it.each([
  "liberal",
  "fascist",
])("persists identical complete account/profile mutations for either Practice lobby (%s win)", async (winner) => {
  const initial = seeds();
  const results = [];
  for (const system of [false, true]) {
    seedStore(initial);
    writes = [];
    profileWrites = [];
    await finish(completionFixture(system, winner), winner);
    expect(writes.length).toBeGreaterThanOrEqual(5);
    expect(profileWrites).toHaveLength(5);
    results.push(
      comparable({
        accounts: [...storedAccounts.values()],
        writes,
        profileWrites,
        profiles: [...storedProfiles.values()],
      })
    );
  }
  expect(results[1]).toEqual(results[0]);
});

it.each([
  "liberal",
  "fascist",
])("persists +2/+1 XP and the independent Rainbow thresholds and badges (%s win)", async (winner) => {
  const initial = seeds();
  seedStore(initial);
  await finish(completionFixture(true, winner), winner);
  for (const [index, before] of initial.entries()) {
    const after = Account.hydrate(_.cloneDeep(storedAccounts.get(before.username)));
    const won = (index >= 2 ? "liberal" : "fascist") === winner;
    const gain = won ? 2 : 1;
    expect(after.xpOverall).toBe(before.xpOverall + gain);
    expect(after.xpSeason).toBe(before.xpSeason + gain);
    expect(after.isRainbowOverall).toBe(after.xpOverall >= 10);
    expect(after.isRainbowSeason).toBe(after.xpSeason >= 10);
    expect(after.badges.some((badge) => badge.id === "xp10")).toBe(after.xpOverall >= 10);
    expect(after.badges.some((badge) => badge.id === "games100")).toBe(true);
    if (after.isRainbowOverall) expect(after.dateRainbowOverall).toEqual(new Date(now));
    else expect(storedAccounts.get(before.username)).not.toHaveProperty("dateRainbowOverall");
  }
});

it.each([
  false,
  true,
])("leaves ranked fields and leaderboard eligibility unwritten (fields initially absent %s)", async (absent) => {
  const initial = seeds();
  const protectedPaths = [
    "eloSeason",
    "eloOverall",
    "rating.overall.mu",
    "rating.overall.sigma",
    "lastRankedGameAt",
    ...Object.values(fields),
  ];
  if (absent) for (const account of initial) for (const path of protectedPaths) _.unset(account, path);
  seedStore(initial);
  const eligibility = initial.map((account) => rankedSeasonEligibility(account, now));
  if (!absent) expect(eligibility.map((state) => state.eligible)).toEqual([false, true, false, true, true]);
  await finish(completionFixture(true, "liberal"), "liberal");
  for (const [index, before] of initial.entries()) {
    const after = storedAccounts.get(before.username);
    for (const path of protectedPaths) {
      expect(_.has(before, path)).toBe(!absent);
      expect(_.has(after, path)).toBe(!absent);
      if (!absent) expect(_.get(after, path)).toEqual(_.get(before, path));
    }
    expect(rankedSeasonEligibility(Account.hydrate(_.cloneDeep(after)), now)).toEqual(eligibility[index]);
  }
  expect(writes.length).toBeGreaterThanOrEqual(5);
  for (const { update } of writes) {
    for (const changes of Object.values(update)) {
      for (const path of Object.keys(changes)) {
        expect(
          protectedPaths.some(
            (protectedPath) =>
              path === protectedPath || path.startsWith(`${protectedPath}.`) || protectedPath.startsWith(`${path}.`)
          )
        ).toBe(false);
      }
    }
  }
});

const connect = (username) => {
  const socket = {
    id: username,
    handshake: { session: { passport: { user: username } } },
    emit: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
  };
  global.io.sockets.sockets[username] = socket;
  models.userList.push({ userName: username, status: { type: "none" } });
  return socket;
};

const sit = async (game, socket) => {
  updateSeatedUser(socket, socket.handshake.session.passport, { uid: game.general.uid });
  await settle();
};

it("promotes only at completion, rejects the next intake seat, and keeps the graduate in the real cohort remake", async () => {
  const initial = seeds();
  seedStore(initial);
  const game = lobby();
  const sockets = initial.map((account) => connect(account.username));
  for (const socket of sockets) await sit(game, socket);
  jest.advanceTimersByTime(17000);
  await settle();
  expect(game.gameState.isTracksFlipped).toBe(true);
  const next = Object.values(models.games).find(lobbies.shouldSurviveEmptyPregame);
  expect(next).toBeDefined();
  jest.advanceTimersByTime(15000);
  await settle();
  expect(game.gameState.phase).toBe("selectingChancellor");
  expect(game.gameState.isCompleted).toBeFalsy();
  expect(writes).toEqual([]);
  expect([...storedAccounts.values()]).toEqual(initial);
  const graduateSocket = sockets[2];
  const graduateSeat = game.publicPlayersState.find((player) => player.userName === "Player2");
  const roster = game.publicPlayersState.map((player) => player.userName);
  expect(graduateSeat.connected).toBe(true);
  expect(graduateSeat.leftGame).toBeFalsy();
  expect(graduateSeat.isDead).toBe(false);
  const winningTeam = game.private.seatedPlayers.find((player) => player.userName === "Player2").role.team;
  completeSummary(game, winningTeam);
  await finish(game, winningTeam);
  expect(game.publicPlayersState.map((player) => player.userName)).toEqual(roster);
  expect(game.publicPlayersState.find((player) => player.userName === "Player2")).toBe(graduateSeat);
  expect(graduateSeat.leftGame).toBeFalsy();
  expect(storedAccounts.get("Player2")).toMatchObject({
    xpOverall: 11,
    xpSeason: 11,
    isRainbowOverall: true,
    isRainbowSeason: true,
  });
  graduateSocket.emit.mockClear();
  const nextBefore = JSON.stringify(next);
  await sit(next, graduateSocket);
  expect(JSON.stringify(next)).toBe(nextBefore);
  expect(graduateSocket.emit.mock.calls).toEqual([["gameJoinStatusUpdate", { status: "newPlayerOnly" }]]);
  graduateSocket.emit.mockClear();
  for (const socket of sockets) {
    handleUpdatedRemakeGame(socket.handshake.session.passport, game, { remakeStatus: true }, socket);
  }
  jest.advanceTimersByTime(9000);
  await settle();
  const remake = models.games[`${game.general.uid}Remake1`];
  expect(remake).toBeDefined();
  expect(remake.general).not.toHaveProperty("systemLobby");
  expect(lobbies.isNewPlayerLobby(remake)).toBe(false);
  expect(remake.general.practiceGame).toBe(true);
  expect(remake.publicPlayersState.map((player) => player.userName).sort()).toEqual([...roster].sort());
  expect(graduateSocket.emit).toHaveBeenCalledWith("updateSeatForUser", true);
  expect(graduateSocket.emit).not.toHaveBeenCalledWith("gameJoinStatusUpdate", expect.anything());
  expect(Object.values(models.games).filter(lobbies.shouldSurviveEmptyPregame)).toEqual([next]);
  expect(remake.gameState.isStarted).toBe(true);
});
