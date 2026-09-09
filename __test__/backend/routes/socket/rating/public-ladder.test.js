import {
  STARTING_PUBLIC_RATING,
  PUBLIC_DELTA_CENTER,
  MAX_MATCHUP_ADJUSTMENT,
  MATCHUP_MODIFIER_SCALE,
  publicRatingDelta,
} from "../../../../../routes/socket/rating/public-ladder";

describe("rating/public-ladder", () => {
  it("centralizes the approved S25 starting score and movement policy", () => {
    expect(STARTING_PUBLIC_RATING).toBe(1500);
    expect(PUBLIC_DELTA_CENTER).toBe(20);
    expect(MAX_MATCHUP_ADJUSTMENT).toBe(4);
    expect(MATCHUP_MODIFIER_SCALE).toBe(16);
  });

  it("bounds every rounding interval and both endpoints across the full expectation range", () => {
    const probabilities = Array.from({ length: 1001 }, (_, i) => i / 1000);
    // A dense sweep alone can miss a rounding discontinuity. Visit both sides and the exact tie
    // for every modifier boundary as well; the transform is constant between these boundaries.
    for (let modifier = -8; modifier < 8; modifier++) {
      const boundary = 0.5 - (modifier + 0.5) / 16;
      probabilities.push(boundary - Number.EPSILON, boundary, boundary + Number.EPSILON);
    }
    const wins = new Set(probabilities.map((p) => publicRatingDelta(true, p)));
    const losses = new Set(probabilities.map((p) => publicRatingDelta(false, p)));
    expect([...wins].sort((a, b) => a - b)).toEqual([16, 17, 18, 19, 20, 21, 22, 23, 24]);
    expect([...losses].sort((a, b) => a - b)).toEqual([-24, -23, -22, -21, -20, -19, -18, -17, -16]);
    for (const forbidden of [2, -50, -100, -150]) {
      expect(wins.has(forbidden)).toBe(false);
      expect(losses.has(forbidden)).toBe(false);
    }
  });

  it.each([
    [0, 24, -16],
    [0.25, 24, -16],
    [0.46875, 21, -19],
    [0.5, 20, -20],
    [0.53125, 20, -20],
    [0.75, 16, -24],
    [1, 16, -24],
  ])("applies the exact signed transform at probability %f", (probability, win, loss) => {
    expect(publicRatingDelta(true, probability)).toBe(win);
    expect(publicRatingDelta(false, probability)).toBe(loss);
  });

  it("rewards underdog wins more and penalizes favored losses more", () => {
    for (const won of [false, true]) {
      const favored = publicRatingDelta(won, 0.7);
      const neutral = publicRatingDelta(won, 0.5);
      const underdog = publicRatingDelta(won, 0.3);
      expect(favored).toBeLessThan(neutral);
      expect(neutral).toBeLessThan(underdog);
      for (let i = 0; i < 100; i++) {
        expect(publicRatingDelta(won, i / 100)).toBeGreaterThanOrEqual(publicRatingDelta(won, (i + 1) / 100));
      }
    }
  });

  it.each([
    undefined,
    null,
    NaN,
    Infinity,
    -Infinity,
    "0.9",
    {},
  ])("uses ordinary movement for a corrupt expectation (%p)", (probability) => {
    expect(publicRatingDelta(true, probability)).toBe(20);
    expect(publicRatingDelta(false, probability)).toBe(-20);
  });

  it.each([-Number.MAX_VALUE, -1, 2, Number.MAX_VALUE])("bounds out-of-range finite input (%p)", (probability) => {
    expect(publicRatingDelta(true, probability)).toBe(probability < 0 ? 24 : 16);
    expect(publicRatingDelta(false, probability)).toBe(probability < 0 ? -16 : -24);
  });
});
