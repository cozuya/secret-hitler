// A public-ladder import would fail this suite, guarding progression's separate dependency graph.
jest.mock("../../../../../routes/socket/rating/public-ladder", () => {
  throw new Error("XP must not depend on public-rating tuning");
});
const { xpAward } = require("../../../../../routes/socket/rating/xp");

it.each([
  [true, false, 2],
  [true, true, 5],
  [false, false, 1],
  [false, true, 1],
])("preserves XP for won=%s rainbow=%s", (won, rainbow, expected) => {
  expect(xpAward(won, rainbow)).toBe(expected);
  expect(Number.isInteger(xpAward(won, rainbow))).toBe(true);
});
