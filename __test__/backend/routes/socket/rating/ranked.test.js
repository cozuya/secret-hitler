jest.mock("openskill", () => {
  const actual = jest.requireActual("openskill");
  return { ...actual, rate: jest.fn(actual.rate) };
});

const { rate, predictWin } = require("openskill");
const { thurstoneMostellerFull } = require("openskill/models");
const {
  resolveHiddenRating,
  resolveHiddenRatings,
  computeRankedUpdates,
} = require("../../../../../routes/socket/rating/ranked");
const { predictTeamWinProbability } = require("../../../../../routes/socket/rating/predict");
const { publicRatingDelta } = require("../../../../../routes/socket/rating/public-ladder");
const { TEAM_SIZES, fascistWinPrior } = require("../../../../../routes/socket/rating/bias");
const { freshRating, DEFAULT_SIGMA, seedMuFromLegacy } = require("../../../../../routes/socket/rating/hidden-rating");

const counts = [5, 6, 7, 8, 9, 10];
const variants = [
  {},
  { rebalance6p: true },
  { rebalance7p: true },
  { rebalance9p: true },
  { rerebalance9p: true },
  { rebalance9p2f: true },
  { rebalance9p2f: true, rerebalance9p: true },
];
const lobby = (count = 7, flags = {}, mu = 25, sigma = DEFAULT_SIGMA) => {
  const { fas, lib } = TEAM_SIZES[count];
  const roster = [
    ...Array.from({ length: fas }, (_, i) => ({ userName: `F${i}`, role: { team: "fascist" } })),
    ...Array.from({ length: lib }, (_, i) => ({ userName: `L${i}`, role: { team: "liberal" } })),
  ];
  return {
    game: { general: { playerCount: count, ...flags }, gameState: { isCompleted: "fascist" } },
    roster,
    ratings: new Map(roster.map(({ userName }) => [userName, { mu, sigma }])),
  };
};
const run = ({ game, ratings, roster }) => computeRankedUpdates(game, ratings, roster);
const predict = ({ game, ratings, roster }) => predictTeamWinProbability(game, ratings, roster);

describe("R1 lifetime hidden bootstrap", () => {
  it("preserves a valid lifetime pair, including zero sigma, without reading season or public Elo", () => {
    for (const sigma of [0, 3]) {
      const account = {
        rating: {
          overall: { mu: -10, sigma },
          get season() {
            throw new Error("season read");
          },
        },
        get eloOverall() {
          throw new Error("public read");
        },
      };
      expect(resolveHiddenRating(account)).toEqual({ mu: -10, sigma });
      expect(resolveHiddenRating(account)).not.toBe(account.rating.overall);
    }
  });

  it.each([
    undefined,
    null,
    {},
    { mu: NaN, sigma: 3 },
    { mu: Infinity, sigma: 3 },
    { mu: 25, sigma: -1 },
    { mu: 25, sigma: Infinity },
    { mu: 25, sigma: NaN },
    { mu: "25", sigma: 3 },
  ])("soft-seeds an unusable lifetime pair from positive finite overall (%p)", (overall) => {
    expect(resolveHiddenRating({ rating: { overall, season: { mu: 999, sigma: 1 } }, eloOverall: 2100 })).toEqual({
      mu: seedMuFromLegacy(2100),
      sigma: DEFAULT_SIGMA,
    });
  });

  it.each([
    undefined,
    null,
    0,
    -1,
    NaN,
    Infinity,
    -Infinity,
    "2100",
  ])("uses fresh hidden state when no valid lifetime pair or positive finite public seed exists (%p)", (eloOverall) => {
    expect(resolveHiddenRating({ eloOverall, rating: { season: { mu: 999, sigma: 1 } } })).toEqual(freshRating());
  });

  it("resolves each named account once and never invents a missing account", () => {
    const read = jest.fn(() => ({ overall: { mu: 30, sigma: 4 } }));
    const account = {
      username: "player",
      get rating() {
        return read();
      },
    };
    expect([...resolveHiddenRatings([account, account, null, {}])]).toEqual([["player", { mu: 30, sigma: 4 }]]);
    expect(read).toHaveBeenCalledTimes(1);
    expect(resolveHiddenRatings(null).size).toBe(0);
  });
});

describe("S25 normalized ranked engine", () => {
  beforeEach(() => rate.mockClear());

  it.each(counts)("keeps equal-skill %ip hidden deltas invariant under a common rating shift", (count) => {
    for (const winner of ["fascist", "liberal"]) {
      const input = lobby(count, {}, 25, 2.5);
      input.game.gameState.isCompleted = winner;
      const baseline = run(input);
      for (const mu of [5, 25 + 800 / 24]) {
        const shifted = run({
          ...input,
          ratings: new Map(input.roster.map(({ userName }) => [userName, { mu, sigma: 2.5 }])),
        });
        for (const { userName } of input.roster) {
          expect(shifted[userName].overall.mu - mu).toBeCloseTo(baseline[userName].overall.mu - 25, 10);
          expect(shifted[userName].overall.sigma).toBeCloseTo(baseline[userName].overall.sigma, 10);
          expect(shifted[userName].change).toBe(baseline[userName].change);
        }
      }
    }
  });

  it.each(counts)("the actual OpenSkill update inputs imply exactly the public prediction at %ip", (count) => {
    for (const flags of variants.flatMap((variant) => [
      { ...variant, rainbowgame: false },
      { ...variant, rainbowgame: true },
    ])) {
      for (const winner of ["fascist", "liberal"]) {
        const input = lobby(count, flags);
        input.game.gameState.isCompleted = winner;
        input.ratings.set("F0", { mu: 45, sigma: 1.2 });
        input.ratings.set("L0", { mu: 31, sigma: 11 });
        run(input);
        const [teams, options] = rate.mock.calls[rate.mock.calls.length - 1];
        expect(options.model).toBe(thurstoneMostellerFull);
        expect(options.tau).toBe(0);
        expect(options.epsilon).toBe(0);
        expect(options.gamma()).toBe(1);
        // This checks the inputs actually sent to the updater through the library's own predictor,
        // not a probability echoed from our shared comparison helper.
        const implied = predictWin(teams, options);
        const expected = predict(input);
        expect(implied[0]).toBeCloseTo(expected.fascist, 12);
        expect(implied[1]).toBeCloseTo(expected.liberal, 12);
      }
    }
  });

  it("matches independent Gaussian posterior moments under a neutral prior", () => {
    const input = lobby(5, { rebalance7p: true });
    const updates = run(input);
    const variance = DEFAULT_SIGMA ** 2;
    const cSquared = 2 * (DEFAULT_SIGMA / 2) ** 2 + variance / 2 + variance / 3;
    // At z=0, v=phi(0)/Phi(0)=sqrt(2/pi), w=v^2=2/pi.
    for (const player of input.roster) {
      const fascist = player.role.team === "fascist";
      const size = fascist ? 2 : 3;
      const expectedMu = 25 + (((fascist ? 1 : -1) * variance) / size / Math.sqrt(cSquared)) * Math.sqrt(2 / Math.PI);
      const expectedSigma = DEFAULT_SIGMA * Math.sqrt(1 - ((variance / size ** 2 / cSquared) * 2) / Math.PI);
      expect(updates[player.userName].overall.mu).toBeCloseTo(expectedMu, 12);
      expect(updates[player.userName].overall.sigma).toBeCloseTo(expectedSigma, 12);
    }
  });

  it.each(counts)("has no headcount-driven faction drift under a neutral prior at %ip", (count) => {
    const input = lobby(count, { rebalance7p: true }, 70, 4);
    const fascistWin = run(input);
    input.game.gameState.isCompleted = "liberal";
    const liberalWin = run(input);
    let totalMovement = 0;
    for (const player of input.roster) {
      const name = player.userName;
      const winDelta = fascistWin[name].overall.mu - 70;
      const lossDelta = liberalWin[name].overall.mu - 70;
      expect((winDelta + lossDelta) / 2).toBeCloseTo(0, 12);
      totalMovement += winDelta;
    }
    // Each faction has equal total influence. A smaller faction's individual member carries
    // more weight, but the signed faction sums cancel at equal individual uncertainty.
    expect(totalMovement).toBeCloseTo(0, 12);
  });

  it("gives identical faction-mean updates when means and their variances match across headcounts", () => {
    const outcomes = counts.map((count) => {
      const input = lobby(count, { rebalance7p: true });
      for (const player of input.roster) {
        const fas = player.role.team === "fascist";
        const size = fas ? TEAM_SIZES[count].fas : TEAM_SIZES[count].lib;
        input.ratings.set(player.userName, { mu: fas ? 30 : 25, sigma: 3 * Math.sqrt(size) });
      }
      return run(input);
    });
    for (const outcome of outcomes) {
      expect(outcome.F0.overall.mu).toBeCloseTo(outcomes[0].F0.overall.mu, 12);
      expect(outcome.L0.overall.mu).toBeCloseTo(outcomes[0].L0.overall.mu, 12);
    }
  });

  it.each(counts)("bounds public deltas and finite hidden output in every configuration at %ip", (count) => {
    for (const flags of variants.flatMap((variant) => [variant, { ...variant, rainbowgame: true }])) {
      for (const [mu, sigma] of [
        [25, 0],
        [25, DEFAULT_SIGMA],
        [1e200, 1e200],
        [Number.MAX_VALUE, 0],
        [Number.MAX_VALUE, Number.MAX_VALUE],
        [-Number.MAX_VALUE, 2],
        [NaN, Infinity],
      ]) {
        for (const winner of ["fascist", "liberal"]) {
          const input = lobby(count, flags, mu, sigma);
          input.game.gameState.isCompleted = winner;
          input.ratings.get("L0").mu = -mu;
          const updates = run(input);
          expect(Object.keys(updates)).toHaveLength(count);
          for (const player of input.roster) {
            const update = updates[player.userName];
            const won = player.role.team === winner;
            expect(update.change).toBeGreaterThanOrEqual(won ? 16 : -24);
            expect(update.change).toBeLessThanOrEqual(won ? 24 : -16);
            expect(update.changeSeason).toBe(update.change);
            expect(Number.isFinite(update.overall.mu)).toBe(true);
            expect(Number.isFinite(update.overall.sigma)).toBe(true);
            expect(update.overall.sigma).toBeGreaterThanOrEqual(0);
          }
        }
      }
    }
  });

  it("reuses pre-game faction deltas while hidden learning and Rainbow XP remain separate", () => {
    const input = lobby(7, { rebalance7p: true });
    const pregame = predict(input);
    const standard = run(input);
    input.game.general.rainbowgame = true;
    const rainbow = run(input);
    const postgame = predict({ ...input, ratings: new Map(Object.entries(standard).map(([n, u]) => [n, u.overall])) });
    expect(publicRatingDelta(true, postgame.fascist)).not.toBe(publicRatingDelta(true, pregame.fascist));
    for (const player of input.roster) {
      const won = player.role.team === "fascist";
      const normal = standard[player.userName];
      const colored = rainbow[player.userName];
      expect(colored.overall).toEqual(normal.overall);
      expect(normal.change).toBe(publicRatingDelta(won, pregame[player.role.team]));
      expect(colored.change).toBe(normal.change);
      expect(colored.changeSeason).toBe(normal.changeSeason);
      expect(normal.xpChange).toBe(won ? 2 : 1);
      expect(colored.xpChange).toBe(won ? 5 : 1);
      expect(colored.xpChangeSeason).toBe(colored.xpChange);
      expect(normal.xpChangeSeason).toBe(normal.xpChange);
    }
  });

  it("moves winners up, losers down, and learns more from an uncertain member", () => {
    const input = lobby();
    input.ratings.set("F0", { mu: 25, sigma: 2 });
    input.ratings.set("F1", { mu: 25, sigma: 8 });
    const updates = run(input);
    for (const { userName, role } of input.roster) {
      const before = input.ratings.get(userName);
      const after = updates[userName].overall;
      expect(after.sigma).toBeLessThan(before.sigma);
      if (role.team === "fascist") expect(after.mu).toBeGreaterThan(before.mu);
      else expect(after.mu).toBeLessThan(before.mu);
    }
    expect(updates.F1.overall.mu - 25).toBeGreaterThan(updates.F0.overall.mu - 25);
    expect(updates.F1.overall.sigma / 8).toBeLessThan(updates.F0.overall.sigma / 2);
  });

  it("keeps a zero-uncertainty faction fixed without preventing the other faction from learning", () => {
    const input = lobby();
    for (const player of input.roster) {
      if (player.role.team === "fascist") input.ratings.get(player.userName).sigma = 0;
    }
    const updates = run(input);
    expect(updates.F0.overall).toEqual({ mu: 25, sigma: 0 });
    expect(updates.L0.overall.mu).toBeLessThan(25);
    expect(updates.L0.overall.sigma).toBeLessThan(DEFAULT_SIGMA);
  });

  it("keeps hidden movement invariant under a common shift in the skill scale", () => {
    const input = lobby();
    input.ratings.set("F0", { mu: 40, sigma: 2 });
    const baseline = run(input);
    for (const rating of input.ratings.values()) rating.mu += 100;
    const shifted = run(input);
    for (const name of Object.keys(baseline)) {
      expect(shifted[name].overall.mu - 100).toBeCloseTo(baseline[name].overall.mu, 12);
      expect(shifted[name].overall.sigma).toBeCloseTo(baseline[name].overall.sigma, 12);
      expect(shifted[name].change).toBe(baseline[name].change);
    }
  });

  it("retains missing seats, emits only resolved seats, and isolates corrupt ratings", () => {
    const input = lobby();
    input.ratings.get("F1").mu = 45;
    const complete = run(input);
    input.ratings.delete("F0");
    input.ratings.set("spectator", { mu: 999, sigma: 1 });
    const missing = run(input);
    expect(missing.F0).toBeUndefined();
    expect(missing.spectator).toBeUndefined();
    expect(missing.F1).toEqual(complete.F1);
    for (const corrupt of [undefined, null, {}, { mu: NaN, sigma: 3 }, { mu: 25, sigma: -1 }]) {
      input.ratings.set("F0", corrupt);
      const repaired = run(input);
      expect(repaired.F0).toEqual(complete.F0);
      expect(repaired.F1).toEqual(complete.F1);
      expect(repaired.L0).toEqual(complete.L0);
    }
  });

  it("ignores role cards and individual contributions, is faction-uniform, and does not mutate input", () => {
    const input = lobby();
    input.ratings.set("F0", { mu: 50, sigma: 1 });
    const baseline = run(input);
    for (const rating of input.ratings.values()) Object.freeze(rating);
    const before = [...input.ratings];
    const roster = Object.freeze(
      input.roster.map((p, i) =>
        Object.freeze({
          ...p,
          role: Object.freeze({ ...p.role, cardName: i % 2 ? "hitler" : "fascist" }),
          confirmedLiberal: true,
          wonGame: false,
          guns: 100,
          chats: Object.freeze([]),
        })
      )
    );
    const game = Object.freeze({
      general: Object.freeze(input.game.general),
      gameState: Object.freeze(input.game.gameState),
    });
    expect(computeRankedUpdates(game, input.ratings, roster)).toEqual(baseline);
    expect([...input.ratings]).toEqual(before);
    expect(baseline.F0.change).toBe(baseline.F1.change);
    expect(baseline.L0.change).toBe(baseline.L1.change);
    const reordered = run({ ...input, roster: [...roster].reverse() });
    for (const name of Object.keys(baseline)) {
      expect(reordered[name].change).toBe(baseline[name].change);
      expect(reordered[name].overall.mu).toBeCloseTo(baseline[name].overall.mu, 12);
    }
  });

  it("returns no work for an invalid outcome or unpartitionable roster", () => {
    const input = lobby();
    for (const roster of [null, [], [...input.roster, input.roster[0]], [...input.roster, null]]) {
      expect(Object.keys(run({ ...input, roster }))).toHaveLength(0);
    }
    expect(Object.keys(run({ ...input, ratings: null }))).toHaveLength(0);
    expect(Object.keys(run({ ...input, game: null }))).toHaveLength(0);
    input.game.gameState.isCompleted = false;
    expect(Object.keys(run(input))).toHaveLength(0);
  });
});
