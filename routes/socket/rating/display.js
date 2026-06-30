// Elo-flavored display rescale for the OpenSkill engine.
//
// The engine computes in OpenSkill (mu, sigma) space, but the community has seen ~1500-2500 "Elo"
// numbers for years, so we render mu rescaled into that familiar range. What's computed is decoupled
// from what's shown.
//
// SIGMA-INDEPENDENT ON PURPOSE: the shown rating reflects skill (mu), not games played. An earlier
// mu - 3*sigma ("conservative") design drifted upward as sigma converged with play (~1600 -> ~1850
// over dozens of games at unchanged skill), which silently tripped the fixed-threshold gates that
// read the eloOverall/eloSeason mirrors (eloMinimum lobbies, ELO badges, create-game). Centering on
// mu removes that drift: a player who never improves stays put.
//
// NOTE (tuning knob — pairs with the season-cutover migration): DISPLAY_SCALE and the fresh anchor
// are presentational only; they don't affect rating correctness (mu/sigma updates are independent of
// them). seedMuFromDisplay is the exact inverse, so the migration's mu-seeding uses it and the two
// stay consistent.
// KNOWN/DEFERRED: the current scale is intentionally compressed — an organic settled player lands
// ~1790-1840, so fixed-threshold consumers (ELO_BADGES in routes/socket/badges.js; the eloMinimum
// lobby gate in join-game.js / create-game.js) don't line up with this scale yet, and migrated
// veterans seed in above the high badges. Re-tuning DISPLAY_SCALE and those thresholds together,
// against the real post-seeding distribution, is a planned Season-24 cutover step — not an oversight
// to "fix" piecemeal now.

const { rating } = require("openskill");

// Single source of truth for the fresh-rating assumption: OpenSkill's own defaults (mu 25,
// sigma 8.333...). Everything that needs "a brand-new rating" reads these.
const FRESH = rating();
const DEFAULT_MU = FRESH.mu;
const DEFAULT_SIGMA = FRESH.sigma;

const DISPLAY_SCALE = 24; // Elo points per mu unit
const DISPLAY_BASE = 1600; // display value of a fresh (DEFAULT_MU) rating

// Map a skill estimate (mu) to the Elo-flavored display number. Sigma is deliberately not an input.
const displayRating = (mu) => Math.round(DISPLAY_BASE + DISPLAY_SCALE * (mu - DEFAULT_MU));

// Inverse of displayRating: recover the mu that renders to `display`.
const seedMuFromDisplay = (display) => DEFAULT_MU + (display - DISPLAY_BASE) / DISPLAY_SCALE;

// The mu to seed an account's OVERALL rating from its legacy Elo mirror: invert a real Elo, else
// start fresh. SINGLE source shared by getRating (live safety net) and the season-cutover migration,
// so the seed transform can't drift between them (a drift would break the seed<->display round-trip
// that keeps migrated mirrors equal to their old Elo).
const seedMuFromLegacy = (legacyElo) =>
  Number.isFinite(legacyElo) && legacyElo > 0 ? seedMuFromDisplay(legacyElo) : DEFAULT_MU;

// Single source for "a brand-new rating". Returns a fresh object each call so callers can't share
// (and accidentally mutate) one instance.
const freshRating = () => ({ mu: DEFAULT_MU, sigma: DEFAULT_SIGMA });

module.exports = {
  DEFAULT_MU,
  DEFAULT_SIGMA,
  DISPLAY_SCALE,
  DISPLAY_BASE,
  displayRating,
  seedMuFromDisplay,
  seedMuFromLegacy,
  freshRating,
};
