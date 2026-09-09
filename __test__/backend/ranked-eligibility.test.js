const { rankedProgress, rankedSeasonEligibility } = require("../../src/shared/ranked-eligibility");
const season = require("../../src/shared/season");
const nowMs = Date.parse("2026-09-08T12:00:00Z");
const day = 24 * 60 * 60 * 1000;
const account = (games, overrides = {}) => ({
  [season.CURRENT_SEASON_FIELDS.wins]: Math.floor(games / 2),
  [season.CURRENT_SEASON_FIELDS.losses]: Math.ceil(games / 2),
  lastRankedGameAt: new Date(nowMs),
  ...overrides,
});

it("centralizes the approved provisional, game-count and activity constants", () => {
  expect(season.PROVISIONAL_RANKED_GAMES).toBe(10);
  expect(season.SEASON_LEADERBOARD_MIN_GAMES).toBe(20);
  expect(season.SEASON_LEADERBOARD_ACTIVE_DAYS).toBe(14);
});

it.each([
  [0, true, false],
  [9, true, false],
  [10, false, false],
  [19, false, false],
  [20, false, true],
  [100, false, true],
])("classifies %i completed ranked games", (games, provisional, eligible) => {
  expect(rankedSeasonEligibility(account(games), nowMs)).toEqual({
    rankedGames: games,
    provisional,
    active: true,
    eligible,
  });
});

it.each([
  [new Date(nowMs - 14 * day), true],
  [new Date(nowMs - 14 * day - 1), false],
  [new Date(nowMs), true],
  [new Date(nowMs + 1), true],
  [new Date(NaN), false],
  [undefined, false],
  [null, false],
  ["2026-09-08T12:00:00Z", false],
])("uses an inclusive cutoff, admits results during the scan and rejects missing/corrupt activity (%p)", (date, eligible) => {
  expect(rankedSeasonEligibility(account(20, { lastRankedGameAt: date }), nowMs).eligible).toBe(eligible);
});

it("restores eligibility on a ranked result, never on casual/practice completion alone", () => {
  const player = account(20, { lastRankedGameAt: new Date(nowMs - 15 * day) });
  expect(rankedSeasonEligibility(player, nowMs).eligible).toBe(false);
  player.lastCompletedGame = new Date(nowMs);
  player.xpSeason = 100;
  player.isRainbowSeason = true;
  expect(rankedSeasonEligibility(player, nowMs).eligible).toBe(false);
  player[season.CURRENT_SEASON_FIELDS.wins]++;
  player.lastRankedGameAt = new Date(nowMs);
  expect(rankedSeasonEligibility(player, nowMs).eligible).toBe(true);
});

it("counts only current-season wins/losses, without double-counting Rainbow or lifetime history", () => {
  const player = account(19, {
    games: Array(1000).fill("old"),
    [season.seasonCounterFields(season.CURRENT_SEASON_NUMBER - 1).wins]: 1000,
    [season.CURRENT_SEASON_FIELDS.rainbowWins]: 10,
    [season.CURRENT_SEASON_FIELDS.rainbowLosses]: 9,
  });
  expect(rankedSeasonEligibility(player, nowMs).rankedGames).toBe(19);
  expect(rankedSeasonEligibility(player, nowMs).eligible).toBe(false);
  player[season.CURRENT_SEASON_FIELDS.losses]++;
  player.games = [];
  expect(rankedSeasonEligibility(player, nowMs).eligible).toBe(true);
});

it.each([true, "banned"])("excludes a truthy ban (%p)", (isBanned) => {
  expect(rankedSeasonEligibility(account(100, { isBanned }), nowMs).eligible).toBe(false);
});

it("does not read or decay public scores, including values below the old floor", () => {
  const player = Object.freeze({
    ...account(20),
    get eloSeason() {
      throw new Error("eligibility must not depend on score");
    },
    get eloOverall() {
      throw new Error("eligibility must not depend on score");
    },
    get lastCompletedGame() {
      throw new Error("general activity is not ranked activity");
    },
  });
  expect(rankedSeasonEligibility(player, nowMs).eligible).toBe(true);
});

it.each([
  -1,
  1.5,
  NaN,
  Infinity,
  "20",
  {},
  Number.MAX_SAFE_INTEGER,
])("rejects malformed/overflowed counters (%p)", (wins) => {
  expect(rankedProgress(wins, 20)).toEqual({ rankedGames: 0, provisional: true });
});

it("treats absent counters as zero and fails closed without an account or valid clock", () => {
  expect(rankedProgress(undefined, null)).toEqual({ rankedGames: 0, provisional: true });
  expect(rankedProgress(20, undefined)).toEqual({ rankedGames: 20, provisional: false });
  expect(rankedSeasonEligibility(null, nowMs).eligible).toBe(false);
  expect(rankedSeasonEligibility(account(20), NaN).eligible).toBe(false);
});

it("follows a future shared season bump instead of retaining the S25 field names", () => {
  const fields = season.seasonCounterFields(season.CURRENT_SEASON_NUMBER + 1);
  jest.resetModules();
  jest.doMock("../../src/shared/season", () => ({ ...season, CURRENT_SEASON_FIELDS: fields }));
  try {
    jest.isolateModules(() => {
      const eligibility = require("../../src/shared/ranked-eligibility").rankedSeasonEligibility;
      expect(eligibility(account(100), nowMs).eligible).toBe(false);
      expect(eligibility({ [fields.wins]: 20, lastRankedGameAt: new Date(nowMs) }, nowMs).eligible).toBe(true);
    });
  } finally {
    jest.dontMock("../../src/shared/season");
    jest.resetModules();
  }
});
