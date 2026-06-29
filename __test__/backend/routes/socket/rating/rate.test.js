import { computeRatingUpdates, RAINBOW_MU_MULT } from "../../../../../routes/socket/rating/rate";
import { biasTeamOffset, fascistWinPrior, TEAM_SIZES } from "../../../../../routes/socket/rating/bias";
import { displayRating, DEFAULT_MU, DEFAULT_SIGMA } from "../../../../../routes/socket/rating/display";
import { predictWin } from "openskill";

const acc = (username, mu = DEFAULT_MU, sigma = DEFAULT_SIGMA) => ({
  username,
  rating: { overall: { mu, sigma }, season: { mu, sigma } },
});

// 5 lib + 5 fascist names so we can slice per player count.
const libNames = ["L1", "L2", "L3", "L4", "L5", "L6"];
const fasNames = ["F1", "F2", "F3", "F4"];
const teamFor = (count, mu, sigma) => {
  const { lib, fas } = TEAM_SIZES[count];
  return {
    libs: libNames.slice(0, lib).map((n) => acc(n, mu, sigma)),
    fascists: fasNames.slice(0, fas).map((n) => acc(n, mu, sigma)),
  };
};
const gameFor = (count, fascistWon, opts = {}) => ({
  general: { playerCount: count, rainbowgame: Boolean(opts.rainbow), ...opts.flags },
  gameState: { isCompleted: fascistWon ? "fascist" : "liberal" },
});
const run = (count, fascistWon, mu = DEFAULT_MU, sigma = DEFAULT_SIGMA, opts = {}) => {
  const { libs, fascists } = teamFor(count, mu, sigma);
  const winners = fascistWon ? fascists.map((a) => a.username) : libs.map((a) => a.username);
  return {
    updates: computeRatingUpdates(gameFor(count, fascistWon, opts), [...libs, ...fascists], winners),
    libs,
    fascists,
  };
};

describe("rating/display", () => {
  it("renders a fresh rating at the historical ~1600 anchor", () => {
    expect(displayRating(DEFAULT_MU)).toBe(1600);
  });

  it("tracks skill (mu) and is sigma-independent (no games-played drift)", () => {
    expect(displayRating(DEFAULT_MU + 5)).toBeGreaterThan(displayRating(DEFAULT_MU));
    expect(displayRating(DEFAULT_MU - 5)).toBeLessThan(displayRating(DEFAULT_MU));
    // displayRating takes only mu — a player who never improves keeps the same number however
    // settled they become, so fixed-threshold gates/badges can't be tripped by sigma converging.
    expect(displayRating).toHaveLength(1);
  });
});

describe("rating/bias", () => {
  it("honors rebalance toggles before the per-count prior", () => {
    expect(fascistWinPrior(gameFor(6, true))).toBeCloseTo(0.455, 3);
    expect(fascistWinPrior(gameFor(6, true, { flags: { rebalance6p: true } }))).toBe(0.5);
    // 9p base is strongly fascist-favored; both 9p rebalance flags neutralize it to ~0.5.
    expect(fascistWinPrior(gameFor(9, true))).toBeCloseTo(0.604, 3);
    expect(fascistWinPrior(gameFor(9, true, { flags: { rebalance9p: true } }))).toBe(0.5);
    expect(fascistWinPrior(gameFor(9, true, { flags: { rerebalance9p: true } }))).toBe(0.5);
  });

  it.each([5, 6, 7, 8, 9, 10])("offset reproduces the calibrated prior at neutral ratings (%ip)", (count) => {
    const q = fascistWinPrior(gameFor(count, true));
    const offset = biasTeamOffset(gameFor(count, true));
    const { lib, fas } = TEAM_SIZES[count];
    const fasTeam = Array.from({ length: fas }, () => ({ mu: DEFAULT_MU + offset / fas, sigma: DEFAULT_SIGMA }));
    const libTeam = Array.from({ length: lib }, () => ({ mu: DEFAULT_MU, sigma: DEFAULT_SIGMA }));
    expect(predictWin([fasTeam, libTeam])[0]).toBeCloseTo(q, 2);
  });
});

describe("rating/rate computeRatingUpdates", () => {
  it("moves winners up and losers down", () => {
    const { updates, libs, fascists } = run(7, true);
    for (const f of fascists) expect(updates[f.username].change).toBeGreaterThan(0);
    for (const l of libs) expect(updates[l.username].change).toBeLessThan(0);
  });

  it("shrinks sigma after a game", () => {
    const { updates } = run(7, true);
    expect(updates.F1.overall.sigma).toBeLessThan(DEFAULT_SIGMA);
    expect(updates.F1.season.sigma).toBeLessThan(DEFAULT_SIGMA);
  });

  it("moves an uncertain (fresh) player more than a settled one", () => {
    const fresh = run(7, true, DEFAULT_MU, DEFAULT_SIGMA).updates.F1.change;
    const settled = run(7, true, DEFAULT_MU, 2.5).updates.F1.change;
    expect(Math.abs(fresh)).toBeGreaterThan(Math.abs(settled));
  });

  it("self-tunes via sigma, not games-played counters", () => {
    const { updates } = run(7, true, DEFAULT_MU, 2.5);
    // settled players barely move
    expect(Math.abs(updates.F1.change)).toBeLessThan(Math.abs(run(7, true).updates.F1.change));
  });

  it("rewards an underdog win more than a favored win (bias direction)", () => {
    // 9p: fascists are favored (~0.60). Fascists winning is less surprising than liberals winning.
    const fascistsWin = run(9, true, DEFAULT_MU, 2.5).updates.F1.change;
    const liberalsWin = run(9, false, DEFAULT_MU, 2.5).updates.L1.change;
    expect(liberalsWin).toBeGreaterThan(fascistsWin);
  });

  it("applies the rainbow multiplier to the mu delta", () => {
    // Compare mu movement (display includes a rounding step, so assert on mu).
    const base = run(7, true, DEFAULT_MU, 2.5);
    const rainbow = run(7, true, DEFAULT_MU, 2.5, { rainbow: true });
    const baseMu = base.updates.F1.overall.mu - DEFAULT_MU;
    const rainbowMu = rainbow.updates.F1.overall.mu - DEFAULT_MU;
    expect(rainbowMu / baseMu).toBeCloseTo(RAINBOW_MU_MULT, 5);
  });

  it("scales rainbow win XP (rounded to an integer) and leaves losses flat", () => {
    const { libs, fascists } = teamFor(7, DEFAULT_MU, DEFAULT_SIGMA);
    const accounts = [...libs, ...fascists];
    const roster = accounts.map((a) => a.username);
    const winners = fascists.map((a) => a.username);
    const normal = computeRatingUpdates(gameFor(7, true), accounts, winners, roster);
    const rainbow = computeRatingUpdates(gameFor(7, true, { rainbow: true }), accounts, winners, roster);
    expect(normal.F1.xpChange).toBe(2); // flat win
    expect(rainbow.F1.xpChange).toBe(5); // 2 * 2.25 = 4.5 -> 5, kept integer
    expect(Number.isInteger(rainbow.F1.xpChange)).toBe(true);
    expect(rainbow.L1.xpChange).toBe(normal.L1.xpChange); // loser unchanged (flat 1)
  });

  it("does not throw when an account has no rating yet (defaults applied)", () => {
    const libs = [{ username: "L1" }, { username: "L2" }, { username: "L3" }, { username: "L4" }];
    const fascists = [{ username: "F1" }, { username: "F2" }, { username: "F3" }];
    const game = gameFor(7, true);
    const updates = computeRatingUpdates(game, [...libs, ...fascists], ["F1", "F2", "F3"]);
    expect(updates.F1.overall.mu).toBeGreaterThan(DEFAULT_MU);
    expect(updates.L1.overall.display).toBeLessThan(1600);
  });

  it("ignores a non-finite stored rating instead of poisoning the whole game", () => {
    const { libs, fascists } = teamFor(7, DEFAULT_MU, DEFAULT_SIGMA);
    // F1's stored rating is corrupt (NaN). OpenSkill sums team mu, so without a guard this NaN
    // would propagate to every player and Mongoose would then reject the whole save.
    fascists[0].rating = { overall: { mu: NaN, sigma: NaN }, season: { mu: Number.NaN, sigma: 1 } };
    const accounts = [...libs, ...fascists];
    const roster = accounts.map((a) => a.username);
    const updates = computeRatingUpdates(gameFor(7, true), accounts, ["F1", "F2", "F3"], roster);
    for (const a of accounts) {
      expect(Number.isFinite(updates[a.username].overall.mu)).toBe(true);
      expect(Number.isFinite(updates[a.username].overall.display)).toBe(true);
      expect(Number.isFinite(updates[a.username].season.mu)).toBe(true);
    }
  });

  it("keeps correct team sizes when an account is missing (placeholder for the absent player)", () => {
    const { libs, fascists } = teamFor(7, DEFAULT_MU, DEFAULT_SIGMA);
    const allAccounts = [...libs, ...fascists];
    const seated = allAccounts.map((a) => a.username);
    const winners = fascists.map((a) => a.username);
    const game = gameFor(7, true);

    const full = computeRatingUpdates(game, allAccounts, winners, seated);
    // F3's account didn't resolve (deleted/renamed) but they're still on the seated roster.
    const missingF3 = allAccounts.filter((a) => a.username !== "F3");
    const withRoster = computeRatingUpdates(game, missingF3, winners, seated);

    // A placeholder fills F3's slot, so the team stays 3F v 4L and F1's delta is unchanged...
    expect(withRoster.F1.change).toBeCloseTo(full.F1.change, 5);
    // ...and no update is emitted for the absent account.
    expect(withRoster.F3).toBeUndefined();
  });

  it("seeds overall from legacy Elo but starts the season track cold", () => {
    // F1 is a 2400 veteran with no new rating field yet (pre-migration); everyone else is fresh.
    const vet = { username: "F1", eloOverall: 2400, eloSeason: 2400 };
    const others = ["F2", "F3", "L1", "L2", "L3", "L4"].map((n) => ({ username: n }));
    const updates = computeRatingUpdates(gameFor(7, true), [vet, ...others], ["F1", "F2", "F3"]);
    // Overall is seeded near 2400 (a win nudges it up), NOT collapsed to the ~1600 fresh anchor.
    expect(updates.F1.overall.display).toBeGreaterThan(2200);
    expect(Math.abs(updates.F1.change)).toBeLessThan(200); // small overall delta, not a ~+800 jump
    // Season must NOT inherit the stale Season-23 eloSeason (2400) — it starts cold near 1600.
    expect(updates.F1.season.display).toBeLessThan(1800);
  });
});
