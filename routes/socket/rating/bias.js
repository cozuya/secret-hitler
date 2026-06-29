// Team-balance bias for the OpenSkill rating engine.
//
// This is the OpenSkill re-expression of the legacy `winnerBiasPoints`. Secret Hitler is
// not balanced 50/50 per role: each player count has a known good-vs-evil skew, and the
// fascist team is always the smaller side (5p=3L/2F ... 10p=6L/4F). OpenSkill scores a team
// by the SUM of its members' skill, so at equal per-player skill it would expect the larger
// (liberal) team to win purely on headcount. We correct BOTH effects at once with a single
// "performance offset": a fixed mu boost added to the fascist team before the update, sized
// so that at neutral ratings the model expects the empirical equal-skill fascist win-rate.
//
// The priors below are calibrated from the production game corpus (1.34M finished vanilla
// games), since-2022 window (current meta), rebalanced setups excluded. This replaces the
// hand-tuned 2018 constants in the old winnerBiasPoints, several of which had drifted from
// reality (notably 6p and 9p). Re-derive each season from the corpus rather than hand-editing.
//
//   count | old table (fas WR) | calibrated (fas WR)
//     5   |   0.54             |   0.518
//     6   |   0.43             |   0.455
//     7   |   0.52             |   0.525
//     8   |   0.46             |   0.478
//     9   |   0.58             |   0.604
//    10   |   0.54             |   0.543

const { predictWin } = require("openskill");
const { DEFAULT_MU, DEFAULT_SIGMA, freshRating } = require("./display.js");

// Equal-skill fascist win probability per player count (base, non-rebalanced setups).
const FASCIST_WIN_PRIOR = {
  5: 0.518,
  6: 0.455,
  7: 0.525,
  8: 0.478,
  9: 0.604,
  10: 0.543,
};

// Liberal/fascist head counts per player count (fascist count includes Hitler).
// Kept as a separate per-count table from FASCIST_WIN_PRIOR (rather than one merged record) for
// readability; player counts are the fixed, closed 5-10 set. A count missing from either table
// falls through to a no-bias default (offset 0 / prior 0.5) rather than erroring — acceptable here.
const TEAM_SIZES = {
  5: { lib: 3, fas: 2 },
  6: { lib: 4, fas: 2 },
  7: { lib: 4, fas: 3 },
  8: { lib: 5, fas: 3 },
  9: { lib: 5, fas: 4 },
  10: { lib: 6, fas: 4 },
};

// The equal-skill fascist win probability we calibrate the offset to, honoring the host's
// rebalance toggles. Rebalance setups are designed to neutralize the skew and are rare in the
// corpus (6p ~3%, 7p ~7%, 9p negligible) with win-rates statistically consistent with ~50%,
// so we target neutral rather than over-fit sparse data. Checked before the playerCount prior
// to mirror the legacy winnerBiasPoints precedence.
const fascistWinPrior = (game) => {
  const g = game.general;
  if (g.rebalance6p) return 0.5;
  if (g.rebalance7p) return 0.5;
  // The 9p rebalances exist specifically to neutralize the strong base-9p fascist skew (0.604), so
  // target ~0.5 like 6p/7p. rerebalance9p is the field actually wired for 9p games (start-game.js);
  // rebalance9p is handled too for completeness. Without this, a rebalanced 9p game would be rated
  // against the un-rebalanced 0.604 prior, systematically over-rewarding fascist wins.
  if (g.rebalance9p || g.rerebalance9p) return 0.5;
  if (g.rebalance9p2f) return 0.55; // 9p-with-2-fascists variant; sparse data, mild fascist edge
  return FASCIST_WIN_PRIOR[g.playerCount] ?? 0.5;
};

// Solve for the total mu offset on the fascist team such that, at neutral ratings and the given
// team sizes, OpenSkill's own predictWin expects the fascist team to win with probability q.
// Calibrated at the default sigma; the offset is constant per game (the legacy bias was likewise
// a fixed quantity independent of the players' actual spread). Accepted trade-off: predictWin is
// steeper at low sigma, so in an all-veteran (settled) lobby the realized win-prior sits slightly
// off the calibrated q. This mirrors the old fixed-bias behavior and the effect is small; revisit
// with a sigma-aware offset only if a post-season audit shows it matters.
const calibrateOffset = (nFas, nLib, q) => {
  let lo = -80;
  let hi = 80;
  for (let i = 0; i < 64; i++) {
    const mid = (lo + hi) / 2;
    const fas = Array.from({ length: nFas }, () => ({ mu: DEFAULT_MU + mid / nFas, sigma: DEFAULT_SIGMA }));
    const lib = Array.from({ length: nLib }, () => freshRating());
    if (predictWin([fas, lib])[0] < q) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
};

const offsetCache = new Map();

// Total mu offset to add to the fascist team for this game (distribute across the present
// fascist players at apply time). Positive => fascists favored.
const biasTeamOffset = (game) => {
  const count = game.general.playerCount;
  const q = fascistWinPrior(game);
  const sizes = TEAM_SIZES[count];
  if (!sizes) return 0; // unknown size (shouldn't happen for vanilla 5-10) -> no bias
  const key = `${sizes.lib}v${sizes.fas}:${q}`;
  if (!offsetCache.has(key)) offsetCache.set(key, calibrateOffset(sizes.fas, sizes.lib, q));
  return offsetCache.get(key);
};

// Per-fascist mu offset = team offset / full fascist count. Divided by the calibrated team size
// (not the number of fascists who happen to have accounts) so the per-player boost is stable even
// when a seated fascist is a guest/leaver/deleted account.
const biasMuPerFascist = (game) => {
  const sizes = TEAM_SIZES[game.general.playerCount];
  if (!sizes) return 0;
  return biasTeamOffset(game) / sizes.fas;
};

module.exports = {
  FASCIST_WIN_PRIOR,
  TEAM_SIZES,
  fascistWinPrior,
  biasTeamOffset,
  biasMuPerFascist,
};
