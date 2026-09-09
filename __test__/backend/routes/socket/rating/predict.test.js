import { predictTeamWinProbability } from "../../../../../routes/socket/rating/predict";
import { publicRatingDelta } from "../../../../../routes/socket/rating/public-ladder";
import { fascistWinPrior, TEAM_SIZES } from "../../../../../routes/socket/rating/bias";
import { DEFAULT_MU, DEFAULT_SIGMA } from "../../../../../routes/socket/rating/hidden-rating";

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
const lobby = (count, flags = {}, mu = DEFAULT_MU, sigma = DEFAULT_SIGMA) => {
  const { lib, fas } = TEAM_SIZES[count];
  const roster = [
    ...Array.from({ length: fas }, (_, i) => ({ userName: `F${i}`, role: { team: "fascist" } })),
    ...Array.from({ length: lib }, (_, i) => ({ userName: `L${i}`, role: { team: "liberal" } })),
  ];
  return {
    game: { general: { playerCount: count, ...flags } },
    ratings: new Map(roster.map(({ userName }) => [userName, { mu, sigma }])),
    roster,
  };
};
const predict = ({ game, ratings, roster }) => predictTeamWinProbability(game, ratings, roster);

describe("rating/predictTeamWinProbability", () => {
  it.each(counts)("reproduces the prior for every rebalance variant at %ip, fresh or settled", (count) => {
    // Include all flags for every count to pin bias.js precedence as well as real supported setups.
    for (const flags of variants) {
      for (const sigma of [0, 2.5, DEFAULT_SIGMA, 30]) {
        for (const mu of [DEFAULT_MU - 20, DEFAULT_MU, DEFAULT_MU + 40]) {
          const input = lobby(count, flags, mu, sigma);
          const probability = predict(input);
          const prior = fascistWinPrior(input.game);
          expect(probability.fascist).toBeCloseTo(prior, 12);
          expect(probability.liberal).toBeCloseTo(1 - prior, 12);
        }
      }
    }
  });

  it.each(counts)("gives unequal faction headcounts no skill advantage at equal skill (%ip)", (count) => {
    // Neutralize the configuration prior to isolate headcount from game balance. With raw sums,
    // the larger liberal faction would win this comparison even though every player is identical.
    const input = lobby(count, { rebalance7p: true }, 70, 2.5);
    expect(predict(input)).toEqual({ fascist: 0.5, liberal: 0.5 });
    for (const rating of input.ratings.values()) rating.mu = -70;
    expect(predict(input)).toEqual({ fascist: 0.5, liberal: 0.5 });
  });

  it.each(counts)("preserves predictions under uniform shifts of unequal hidden skill (%ip)", (count) => {
    for (const flags of variants) {
      const input = lobby(count, flags);
      input.ratings.set("F0", { mu: 42, sigma: 2.5 });
      input.ratings.set("L0", { mu: 32, sigma: 6 });
      const baseline = predict(input);
      for (const shift of [-100, 50, 1000]) {
        const shifted = new Map(
          [...input.ratings].map(([name, rating]) => [name, { mu: rating.mu + shift, sigma: rating.sigma }])
        );
        expect(predict({ ...input, ratings: shifted }).fascist).toBeCloseTo(baseline.fascist, 12);
      }
    }
  });

  it("preserves the prior with mixed uncertainty when every player's mean skill is equal", () => {
    const input = lobby(9);
    input.roster.forEach(({ userName }, i) => {
      input.ratings.set(userName, { mu: 40, sigma: i * 3 });
    });
    expect(predict(input).fascist).toBeCloseTo(0.604, 12);
  });

  it("responds to individual skill on either faction with equal weights within a faction", () => {
    const input = lobby(7);
    const neutral = predict(input).fascist;
    input.ratings.get("F0").mu += 6;
    const strongerFascist = predict(input).fascist;
    expect(strongerFascist).toBeGreaterThan(neutral);
    input.ratings.get("F0").mu -= 6;
    input.ratings.get("F1").mu += 6;
    expect(predict(input).fascist).toBeCloseTo(strongerFascist, 12);
    input.ratings.get("F1").mu -= 6;
    input.ratings.get("L0").mu += 6;
    expect(predict(input).fascist).toBeLessThan(neutral);
  });

  it("cancels equal changes in faction means despite different numbers of players", () => {
    const input = lobby(7);
    const baseline = predict(input);
    // F has 3 seats, L has 4: these each raise their team's mean by 2, although raw sums differ.
    input.ratings.get("F0").mu += 6;
    input.ratings.get("L0").mu += 8;
    expect(predict(input).fascist).toBeCloseTo(baseline.fascist, 12);
  });

  it("compares the same team means and standard errors identically across faction sizes", () => {
    const probabilities = counts.map((count) => {
      const input = lobby(count, { rebalance7p: true });
      for (const player of input.roster) {
        const fascist = player.role.team === "fascist";
        const size = fascist ? TEAM_SIZES[count].fas : TEAM_SIZES[count].lib;
        // Increasing each independent player's sigma by sqrt(n) holds the mean's standard error
        // constant. This distinguishes squared weights from averaging sigmas or summing variances.
        input.ratings.set(player.userName, {
          mu: fascist ? 35 : 25,
          sigma: (fascist ? 3 : 5) * Math.sqrt(size),
        });
      }
      return predict(input).fascist;
    });
    expect(probabilities[0]).toBeGreaterThan(0.5);
    for (const probability of probabilities) expect(probability).toBeCloseTo(probabilities[0], 12);
  });

  it("attenuates skill differences toward the prior as uncertainty increases", () => {
    const input = lobby(7, { rebalance7p: true }, DEFAULT_MU, 1);
    input.ratings.get("F0").mu += 20;
    const settled = predict(input).fascist;
    input.ratings.get("F0").sigma = 100;
    const uncertain = predict(input).fascist;
    expect(uncertain).toBeGreaterThan(0.5);
    expect(uncertain).toBeLessThan(settled);
    expect(publicRatingDelta(true, uncertain)).toBeGreaterThanOrEqual(publicRatingDelta(true, settled));
  });

  it("keeps public movement independent of sigma except through the bounded expectation", () => {
    for (const sigma of [0, 1, DEFAULT_SIGMA, 100, 1e200]) {
      const input = lobby(7, { rebalance7p: true }, DEFAULT_MU, sigma);
      for (const muDifference of [0, 20, 200, -200]) {
        input.ratings.get("F0").mu = DEFAULT_MU + muDifference;
        const probability = predict(input);
        for (const expected of Object.values(probability)) {
          expect(Number.isFinite(expected)).toBe(true);
          expect(expected).toBeGreaterThanOrEqual(0);
          expect(expected).toBeLessThanOrEqual(1);
          expect(publicRatingDelta(true, expected)).toBeGreaterThanOrEqual(16);
          expect(publicRatingDelta(true, expected)).toBeLessThanOrEqual(24);
          expect(publicRatingDelta(false, expected)).toBeGreaterThanOrEqual(-24);
          expect(publicRatingDelta(false, expected)).toBeLessThanOrEqual(-16);
          if (muDifference === 0) {
            expect(publicRatingDelta(true, expected)).toBe(20);
            expect(publicRatingDelta(false, expected)).toBe(-20);
          }
        }
      }
    }
    expect(publicRatingDelta).toHaveLength(2);
  });

  it.each([
    undefined,
    null,
    {},
    { mu: NaN, sigma: DEFAULT_SIGMA },
    { mu: Infinity, sigma: DEFAULT_SIGMA },
    { mu: -Infinity, sigma: DEFAULT_SIGMA },
    { mu: "25", sigma: DEFAULT_SIGMA },
    { mu: DEFAULT_MU, sigma: NaN },
    { mu: DEFAULT_MU, sigma: Infinity },
    { mu: DEFAULT_MU, sigma: -Infinity },
    { mu: DEFAULT_MU, sigma: -1 },
    { mu: DEFAULT_MU, sigma: "8" },
  ])("replaces corrupt stored hidden skill with a fresh placeholder (%p)", (corrupt) => {
    const input = lobby(7);
    input.ratings.get("L0").mu += 10;
    const baseline = predict(input);
    input.ratings.set("F0", corrupt);
    expect(predict(input)).toEqual(baseline);
  });

  it("retains a missing account's seat and ignores accounts outside the seated roster", () => {
    const input = lobby(9);
    input.ratings.get("F1").mu += 20;
    const baseline = predict(input);
    input.ratings.delete("F0");
    input.ratings.set("spectator", { mu: 10000, sigma: 0 });
    expect(predict(input)).toEqual(baseline);
    expect(predict({ ...input, roster: input.roster.filter((p) => p.userName !== "F0") }).fascist).not.toBeCloseTo(
      baseline.fascist,
      4
    );
  });

  it("handles extreme finite stored values without numerical overflow poisoning prediction", () => {
    const input = lobby(10);
    for (const sigma of [0, Number.MAX_VALUE]) {
      for (const player of input.roster) {
        input.ratings.set(player.userName, {
          mu: player.role.team === "fascist" ? Number.MAX_VALUE : -Number.MAX_VALUE,
          sigma,
        });
      }
      const probability = predict(input);
      expect(Number.isFinite(probability.fascist)).toBe(true);
      expect(probability.fascist).toBeGreaterThanOrEqual(0);
      expect(probability.fascist).toBeLessThanOrEqual(1);
      expect(probability.fascist + probability.liberal).toBe(1);
    }
  });

  it("falls back to the configuration prior when a roster cannot be partitioned safely", () => {
    const input = lobby(9);
    input.ratings.get("F0").mu += 100;
    for (const roster of [
      [],
      input.roster.filter((p) => p.role.team === "fascist"),
      [...input.roster, input.roster[0]],
      [...input.roster, { userName: "unknown", role: { team: "unknown" } }],
      [...input.roster, null],
      [...input.roster, { role: { team: "liberal" } }],
    ]) {
      expect(predict({ ...input, roster }).fascist).toBe(0.604);
    }
  });

  it("uses pre-game hidden state without mutating inputs or reading results and individual contributions", () => {
    const input = lobby(7);
    input.ratings.get("F0").mu += 10;
    const baseline = predict(input);
    for (const rating of input.ratings.values()) Object.freeze(rating);
    const before = [...input.ratings];
    for (const isCompleted of [false, "fascist", "liberal"]) {
      const game = Object.freeze({
        general: Object.freeze({ ...input.game.general, rainbowgame: true }),
        gameState: Object.freeze({ isCompleted }),
      });
      const roster = Object.freeze(
        input.roster.map((p) =>
          Object.freeze({
            ...p,
            role: Object.freeze({ ...p.role, cardName: "hitler" }),
            wonGame: true,
            confirmedLiberal: true,
            gameChats: Object.freeze([]),
          })
        )
      );
      expect(predictTeamWinProbability(game, input.ratings, roster)).toEqual(baseline);
    }
    expect([...input.ratings]).toEqual(before);
    expect(predict({ ...input, roster: [...input.roster].reverse() }).fascist).toBeCloseTo(baseline.fascist, 12);
  });
});
