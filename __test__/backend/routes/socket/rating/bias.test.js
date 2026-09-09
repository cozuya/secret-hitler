const { biasTeamOffset, fascistWinPrior, TEAM_SIZES } = require("../../../../../routes/socket/rating/bias");
const { DEFAULT_MU, DEFAULT_SIGMA } = require("../../../../../routes/socket/rating/hidden-rating");
const { predictWin } = require("openskill");
const gameFor = (count, fascistWon, opts = {}) => ({
  general: { playerCount: count, ...opts.flags },
  gameState: { isCompleted: fascistWon ? "fascist" : "liberal" },
});

describe("rating/bias", () => {
  it("honors rebalance toggles before the per-count prior", () => {
    expect(fascistWinPrior(gameFor(6, true))).toBeCloseTo(0.455, 3);
    expect(fascistWinPrior(gameFor(6, true, { flags: { rebalance6p: true } }))).toBe(0.5);
    // 9p base is strongly fascist-favored; both 9p rebalance flags neutralize it to ~0.5.
    expect(fascistWinPrior(gameFor(9, true))).toBeCloseTo(0.604, 3);
    expect(fascistWinPrior(gameFor(9, true, { flags: { rebalance9p: true } }))).toBe(0.5);
    expect(fascistWinPrior(gameFor(9, true, { flags: { rerebalance9p: true } }))).toBe(0.5);
    // The 2-fascist deck keeps 0.55 even when also rerebalanced (must not be shadowed to 0.5).
    expect(fascistWinPrior(gameFor(9, true, { flags: { rebalance9p2f: true } }))).toBe(0.55);
    expect(fascistWinPrior(gameFor(9, true, { flags: { rebalance9p2f: true, rerebalance9p: true } }))).toBe(0.55);
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
