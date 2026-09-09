// Progression is independent of public-rating deltas and hidden skill updates.
const RAINBOW_WIN_XP_MULTIPLIER = 9 / 4;
const WIN_XP = 2;
const LOSS_XP = 1;
const xpAward = (won, rainbow) => (won ? Math.round(WIN_XP * (rainbow ? RAINBOW_WIN_XP_MULTIPLIER : 1)) : LOSS_XP);

module.exports = { xpAward };
