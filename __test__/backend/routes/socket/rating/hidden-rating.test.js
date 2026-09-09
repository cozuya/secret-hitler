const {
  DEFAULT_MU,
  DEFAULT_SIGMA,
  freshRating,
  seedMuFromLegacy,
} = require("../../../../../routes/socket/rating/hidden-rating");

it("uses independent fresh OpenSkill pairs", () => {
  expect(DEFAULT_MU).toBe(25);
  expect(DEFAULT_SIGMA).toBeCloseTo(25 / 3, 12);
  const first = freshRating();
  first.mu = 100;
  expect(freshRating()).toEqual({ mu: 25, sigma: DEFAULT_SIGMA });
});

it.each([
  [1600, 25],
  [1840, 35],
  [1360, 15],
  [2400, 25 + 800 / 24],
  [0, 25],
  [-1, 25],
  [undefined, 25],
  [null, 25],
  [NaN, 25],
  [Infinity, 25],
  ["2400", 25],
])("preserves the historical R1 inverse for %p", (legacy, mu) => {
  expect(seedMuFromLegacy(legacy)).toBe(mu);
});
