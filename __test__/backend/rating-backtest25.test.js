jest.mock("mongodb", () => ({
  MongoClient: jest.fn(() => {
    throw new Error("No database connection permitted in unit tests");
  }),
}));
jest.mock("../../routes/socket/rating/ranked", () => {
  const actual = jest.requireActual("../../routes/socket/rating/ranked");
  return { ...actual, computeRankedUpdates: jest.fn(actual.computeRankedUpdates) };
});
const { MongoClient } = require("mongodb");
const { computeRankedUpdates } = require("../../routes/socket/rating/ranked");
const { fascistWinPrior } = require("../../routes/socket/rating/bias");
const GameSummary = require("../../models/game-summary");
const {
  DEFAULTS,
  CONFIGURATIONS,
  random,
  createPlayer,
  tracker,
  lobby,
  play,
  focusTrial,
  populationExperiment,
  decodeSummary,
  replayCorpus,
  parseArgs,
  run,
} = require("../../scripts/ratingBacktest25");
const original = require("../mocks/mockGameSummary");
const clone = require("lodash/cloneDeep");

afterEach(() => jest.clearAllMocks());

it("drives production updates and persists exactly their public/hidden outputs in memory", () => {
  const players = Array.from({ length: 7 }, (_, i) => createPlayer(`player${i}`));
  const stats = tracker(),
    rng = random(123);
  const match = lobby(
    players,
    CONFIGURATIONS.find((config) => config.name === "7p"),
    rng
  );
  const updates = play(match, rng, stats, "fascist");
  expect(computeRankedUpdates).toHaveBeenCalledTimes(1);
  expect(computeRankedUpdates.mock.results[0].value).toBe(updates);
  for (const player of players) {
    expect(player.elo).toBe(1500 + updates[player.username].change);
    expect(player.rating.overall).toEqual(updates[player.username].overall);
    expect(player.games).toBe(1);
  }
  expect(stats.games).toBe(1);
  expect(stats.violations).toBe(0);
});

it("preserves nine-player team sizes for the 2f deck variant", () => {
  const players = Array.from({ length: 9 }, (_, i) => createPlayer(`player${i}`));
  const config = CONFIGURATIONS.find((row) => row.flags.rebalance9p2f);
  const match = lobby(players, config, random(123));
  expect(match.roster.filter((p) => p.role.team === "fascist")).toHaveLength(4);
  expect(match.roster.filter((p) => p.role.team === "liberal")).toHaveLength(5);
});

it("repeats a seeded population exactly and reports future outcomes separately from checkpoint scores", () => {
  const options = { ...DEFAULTS, population: 24, games: 200 };
  const first = populationExperiment(options);
  expect(populationExperiment(options)).toEqual(first);
  expect(populationExperiment({ ...options, seed: options.seed + 1 })).not.toEqual(first);
  expect(first.games).toBe(200);
  expect(first.players).toBe(24);
  expect(first.publicDeltas.min).toBeGreaterThanOrEqual(-24);
  expect(first.publicDeltas.max).toBeLessThanOrEqual(24);
  expect(first.subsequentWinRate.samples).toBeGreaterThan(0);
  expect(first.checkpointRatings[100].publicRating.n).toBeLessThan(24);
  expect(first.subsequentWinRate.observation).toContain("no future outcomes");
});

it("rotates a focal player through a population and records actual career/adaptation checkpoints", () => {
  const result = focusTrial({ seed: 99, population: 24, games: 40, trueMu: 25, changeAt: 20, changedTrueMu: 45 });
  expect(result.distinctOpponents).toBe(23);
  expect(result.milestones[20].games).toBe(20);
  expect(result.adaptation[10].games).toBe(30);
  expect(result.adaptation[20].games).toBe(40);
  expect(result.final.sigma).toBeLessThan(25 / 3);
  expect(result.opponentLosses.min).toBeGreaterThanOrEqual(-24);
});

it("keeps a balanced elite lobby's public movement equal to an ordinary lobby at the same seed", () => {
  const options = { seed: 99, population: 24, games: 100, initialSigma: 2.5 };
  const ordinary = focusTrial({ ...options, trueMu: 25, initialMu: 25 });
  const elite = focusTrial({ ...options, trueMu: 45, initialMu: 45, peerMu: 45, initialPublic: 2200 });
  expect(elite.focusDeltas).toEqual(ordinary.focusDeltas);
  expect(elite.final.publicRating - ordinary.final.publicRating).toBe(700);
  expect(elite.final.wins).toBe(ordinary.final.wins);
  expect(elite.focusDeltas.count).toBe(100);
});

it("makes an absent corpus explicit and never instantiates the database driver", async () => {
  const options = { ...DEFAULTS, population: 12, games: 5, trials: 1, careerGames: 300 };
  const report = await run(options, undefined);
  expect(report.evidence).toMatch(/^SYNTHETIC ONLY/);
  expect(report.corpus.status).toBe("unavailable");
  expect(MongoClient).not.toHaveBeenCalled();
  expect(report.synthetic.prescribed60Percent.final.wins).toBe(180);
  expect(report.synthetic.prescribed60Percent.final.games).toBe(300);
  expect(report.synthetic.activityVsSkill.rows.map((row) => row.volumeRatio)).toEqual([1, 1.25, 1.5, 2, 3, 5]);
});

it("does not relabel a failed requested corpus as a successful measurement", async () => {
  const report = await run({ ...DEFAULTS, population: 12, games: 1, trials: 1, careerGames: 300 }, "test-uri");
  expect(report.corpus.status).toBe("failed");
  expect(report.corpus.evidence).toContain("not successfully measured");
  expect(JSON.stringify(report)).not.toContain("test-uri");
});

const summary = (overrides = {}) => ({ ...clone(original), date: new Date("2025-01-01T00:00:00Z"), ...overrides });

const ninePlayerSummary = (deckState, rerebalance9p = false) => {
  const row = new GameSummary(
    summary({
      gameSetting: { rerebalance9p },
      customGameSettings: { enabled: false, deckState },
      players: Array.from({ length: 9 }, (_, i) => ({
        username: `player${i}`,
        role: i === 0 ? "hitler" : i < 4 ? "fascist" : "liberal",
      })),
      logs: Array.from({ length: 4 }, (_, i) => ({
        presidentId: 4,
        chancellorId: 5,
        votes: Array(9).fill(true),
        enactedPolicy: "fascist",
        ...(i === 3 ? { execution: 0 } : {}),
      })),
    })
  );
  expect(row.validateSync()).toBeUndefined();
  // Exercise the strict stored shape, which has the deck but no rebalance9p2f setting.
  return row.toObject();
};

it.each([
  [10, false, 0.55, -21],
  [10, true, 0.55, -21],
  [11, false, 0.604, -22],
  [11, true, 0.5, -20],
])("recovers the nine-player prior from the persisted deck (%i fascist cards, rerebalanced=%p)", (fas, flag, prior, delta) => {
  const row = ninePlayerSummary({ lib: 6, fas }, flag);
  const before = clone(row);
  expect(row.gameSetting).not.toHaveProperty("rebalance9p2f");
  const match = decodeSummary(row);
  expect(match.excluded).toBeUndefined();
  expect(match.game.general.rebalance9p2f).toBe(fas === 10);
  expect(fascistWinPrior(match.game)).toBe(prior);
  expect(match.roster.filter((p) => p.role.team === "fascist")).toHaveLength(4);
  expect(match.game.gameState.isCompleted).toBe("liberal");
  expect(row).toEqual(before);

  match.players = match.roster.map((seat) => createPlayer(seat.userName));
  const stats = tracker();
  const updates = play(match, null, stats, "liberal");
  expect(stats.predictions[0].p).toBeCloseTo(prior, 5);
  expect(updates[match.roster[0].userName].change).toBe(delta);
});

it.each([
  undefined,
  {},
  { lib: 6 },
  { fas: 10 },
  { lib: 5, fas: 10 },
  { lib: 6, fas: 9 },
])("excludes a nine-player summary whose deck variant cannot be established (%p)", (deck) => {
  expect(decodeSummary(ninePlayerSummary(deck)).excluded).toBe("unknown nine-player deck configuration");
});

it("decodes real summary structure and respects authoritative Flappy outcomes", () => {
  const row = summary();
  const before = clone(row);
  const result = decodeSummary(row);
  expect(result.excluded).toBeUndefined();
  expect(result.roster).toHaveLength(7);
  expect(result.game.gameState.isCompleted).toBe("fascist");
  const flappy = decodeSummary({ ...row, gameSetting: { ...row.gameSetting, flappyWinner: "liberal" } });
  expect(flappy.game.gameState.isCompleted).toBe("liberal");
  expect(row).toEqual(before);
});

it.each([
  [
    "casual",
    (row) => {
      row.gameSetting.casualGame = true;
    },
  ],
  [
    "practice",
    (row) => {
      row.gameSetting.practiceGame = true;
    },
  ],
  [
    "custom",
    (row) => {
      row.customGameSettings = { enabled: true };
    },
  ],
  [
    "incomplete",
    (row) => {
      row.logs = row.logs.slice(0, 1);
    },
  ],
  [
    "bad logs",
    (row) => {
      row.logs = [{}];
    },
  ],
  [
    "null player",
    (row) => {
      row.players[0] = null;
    },
  ],
  [
    "unknown role",
    (row) => {
      row.players[0].role = "merlin";
    },
  ],
  [
    "duplicate",
    (row) => {
      row.players[0].username = row.players[1].username;
    },
  ],
  [
    "bad date",
    (row) => {
      row.date = new Date(NaN);
    },
  ],
])("excludes %s summaries without pretending they were rated", (name, mutate) => {
  const row = summary();
  mutate(row);
  expect(decodeSummary(row).excluded).toEqual(expect.any(String));
});

const collectionFixture = (rows) => {
  let i = 0;
  const cursor = {
    sort: jest.fn(() => cursor),
    limit: jest.fn(() => cursor),
    maxTimeMS: jest.fn(() => cursor),
    next: jest.fn(async () => rows[i++] || null),
    close: jest.fn(async () => {}),
  };
  // There is intentionally no write API at this boundary.
  return { collection: { find: jest.fn(() => cursor) }, cursor };
};

it("replays ordered corpus reads without writes or exported identities and reports exclusions", async () => {
  const rows = [
    summary(),
    summary({ date: new Date("2025-01-02T00:00:00Z") }),
    summary({ gameSetting: { casualGame: true } }),
  ];
  const { collection, cursor } = collectionFixture(rows);
  const report = await replayCorpus(collection, { ...DEFAULTS, from: "2025-01-01", to: "2026-01-01" });
  expect(collection.find.mock.calls[0][0]).toEqual({
    date: { $type: "date", $gte: new Date("2025-01-01"), $lt: new Date("2026-01-01") },
  });
  expect(cursor.sort).toHaveBeenCalledWith({ date: 1, _id: 1 });
  expect(cursor.limit).toHaveBeenCalledWith(DEFAULTS.corpusLimit);
  expect(cursor.close).toHaveBeenCalledTimes(1);
  expect(report).toMatchObject({ scanned: 3, games: 2, players: 7, status: "measured" });
  expect(report.excluded["nonranked/custom mode"]).toBe(1);
  expect(report.subsequentWinRate.samples).toBe(0);
  expect(report.subsequentWinRate.correlation).toBeNull();
  expect(report.hiddenCenteredMae).toBeNull();
  expect(JSON.stringify(report)).not.toMatch(/Jaina|Thrall|Rexxar/);
});

it("counts unknown nine-player configurations as exclusions without updating their ratings", async () => {
  const { collection } = collectionFixture([ninePlayerSummary({ lib: 6, fas: 10 }), ninePlayerSummary()]);
  const report = await replayCorpus(collection, DEFAULTS);
  expect(report).toMatchObject({
    scanned: 2,
    games: 1,
    players: 9,
    excluded: { "unknown nine-player deck configuration": 1 },
  });
  expect(computeRankedUpdates).toHaveBeenCalledTimes(1);
  expect(report.gamesPerPlayer.min).toBe(1);
  expect(report.gamesPerPlayer.max).toBe(1);
});

it("closes the read cursor when a read fails", async () => {
  const { collection, cursor } = collectionFixture([]);
  cursor.next.mockRejectedValue(new Error("read failed"));
  await expect(replayCorpus(collection, DEFAULTS)).rejects.toThrow("read failed");
  expect(cursor.close).toHaveBeenCalledTimes(1);
});

it.each([
  ["--apply"],
  ["--write"],
  ["--seed", "0"],
  ["--population", "5"],
  ["--games", "1.5"],
  ["--games"],
  ["--from", "2025-02-31"],
  ["--from", "2026-01-01", "--to", "2025-01-01"],
])("rejects unsupported writes or invalid options before connection (%j)", (args) => {
  expect(() => parseArgs(args)).toThrow();
  expect(MongoClient).not.toHaveBeenCalled();
});

it("parses bounded sizing/date options without accepting credentials as an option", () => {
  expect(
    parseArgs([
      "--seed",
      "3",
      "--population",
      "48",
      "--games",
      "100",
      "--trials",
      "2",
      "--career-games",
      "500",
      "--corpus-limit",
      "20",
      "--from",
      "2025-01-01",
      "--to",
      "2026-01-01",
    ])
  ).toMatchObject({
    seed: 3,
    population: 48,
    games: 100,
    trials: 2,
    careerGames: 500,
    corpusLimit: 20,
    from: "2025-01-01",
    to: "2026-01-01",
  });
});
