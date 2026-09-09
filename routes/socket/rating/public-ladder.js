// Season-25 public ladder policy. Hidden skill and XP have their own scales; neither multiplies
// these points. Deploy the S25 runtime only with the corresponding offline cutover.
const STARTING_PUBLIC_RATING = 1500;
const PUBLIC_DELTA_CENTER = 20;
const MAX_MATCHUP_ADJUSTMENT = 4;
const MATCHUP_MODIFIER_SCALE = 16;

const publicRatingDelta = (won, expectedWinProbability) => {
  // A corrupt expectation gets the ordinary result award. Even out-of-range finite input cannot
  // escape the public bound, so one bad hidden estimate cannot create a catastrophic loss.
  const probability = Number.isFinite(expectedWinProbability) ? expectedWinProbability : 0.5;
  const modifier = Math.max(
    -MAX_MATCHUP_ADJUSTMENT,
    Math.min(MAX_MATCHUP_ADJUSTMENT, Math.round((0.5 - probability) * MATCHUP_MODIFIER_SCALE))
  );
  return won ? PUBLIC_DELTA_CENTER + modifier : -(PUBLIC_DELTA_CENTER - modifier);
};

module.exports = {
  STARTING_PUBLIC_RATING,
  PUBLIC_DELTA_CENTER,
  MAX_MATCHUP_ADJUSTMENT,
  MATCHUP_MODIFIER_SCALE,
  publicRatingDelta,
};
