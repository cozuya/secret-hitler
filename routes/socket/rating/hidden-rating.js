const { rating } = require("openskill");

// Use OpenSkill's defaults for every fresh lifetime estimator.
const FRESH = rating();
const DEFAULT_MU = FRESH.mu;
const DEFAULT_SIGMA = FRESH.sigma;

// Fixed historical inverse for R1's legacy bootstrap, not public-ladder tuning knobs.
const LEGACY_SEED_BASE = 1600;
const LEGACY_SEED_SCALE = 24;
const seedMuFromLegacy = (legacyElo) =>
  Number.isFinite(legacyElo) && legacyElo > 0
    ? DEFAULT_MU + (legacyElo - LEGACY_SEED_BASE) / LEGACY_SEED_SCALE
    : DEFAULT_MU;

// Callers receive independent pairs so an update cannot mutate the shared defaults.
const freshRating = () => ({ mu: DEFAULT_MU, sigma: DEFAULT_SIGMA });

module.exports = { DEFAULT_MU, DEFAULT_SIGMA, seedMuFromLegacy, freshRating };
