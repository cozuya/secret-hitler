// Pre-game team expectation for the S25 public ladder; no hidden updates or account I/O here.
const { predictWin } = require("openskill");
const { fascistWinPrior } = require("./bias.js");
const { DEFAULT_SIGMA, freshRating } = require("./hidden-rating.js");

// OpenSkill v5 uses this performance noise per team, separately from uncertainty in hidden skill.
const PREDICTION_BETA = DEFAULT_SIGMA / 2;

// OpenSkill does not export its normal CDF. A unit-variance difference with beta=0 evaluates it
// through the public API, avoiding an undeclared dependency on its internal statistics package.
const normalCdf = (value) => predictWin([[{ mu: value, sigma: 1 }], [{ mu: 0, sigma: 0 }]], { beta: 0 })[0];

const priorQuantiles = new Map();
const priorZScore = (prior) => {
  if (priorQuantiles.has(prior)) return priorQuantiles.get(prior);
  if (prior === 0.5) return 0;
  let lo = -8;
  let hi = 8;
  // All configured priors are well inside these normal tails. Bisection uses the same CDF as the
  // final prediction, so calibration does not depend on a second approximation's numerical error.
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    if (normalCdf(mid) < prior) lo = mid;
    else hi = mid;
  }
  const quantile = (lo + hi) / 2;
  priorQuantiles.set(prior, quantile);
  return quantile;
};

const safeRating = (rating) => {
  if (rating && Number.isFinite(rating.mu) && Number.isFinite(rating.sigma) && rating.sigma >= 0) {
    return { mu: rating.mu, sigma: rating.sigma };
  }
  // Keep the seat even when its account is missing/corrupt. Reading public Elo to repair hidden
  // skill would couple the two scales again; account migration/seeding belongs to the caller.
  return freshRating();
};

const normalizedTeam = (team) => {
  const magnitude = Math.max(...team.map(({ rating }) => Math.abs(rating.mu)));
  // Scale before summation so even a team at Number.MAX_VALUE has a representable mean.
  const mean = magnitude ? team.reduce((sum, { rating }) => sum + rating.mu / magnitude, 0) / team.length : 0;
  return {
    mu: Math.max(-1, Math.min(1, mean)) * magnitude,
    // For independent skills with weights 1/n, Var(mean) = sum(sigma_i^2 / n^2). Hypot avoids
    // overflowing intermediate squares when a stored sigma is finite but extremely large.
    sigma: Math.hypot(...team.map(({ rating }) => rating.sigma / team.length)),
  };
};

// ratings: Map<username, { mu, sigma }> containing PRE-GAME lifetime hidden skill.
// roster: full private seatedPlayers array ({ userName, role: { team } }), including missing accounts.
// Returns the normalized geometry and probabilities; no outcome, role card, XP or public Elo is read.
const buildTeamComparison = (game, ratings, roster) => {
  const prior = fascistWinPrior({ general: game?.general || {} });
  const priorPrediction = { fascist: prior, liberal: 1 - prior };
  const invalid = { prediction: priorPrediction, teams: null };
  if (!Array.isArray(roster) || !(ratings instanceof Map)) return invalid;
  const teams = { fascist: [], liberal: [] };
  const seen = new Set();
  for (const player of roster) {
    const team = player?.role?.team;
    // Do not guess a malformed seat's faction or silently count a duplicated seat twice. Without
    // a complete partition, the configuration prior is safer than a distorted skill comparison.
    if (
      (team !== "fascist" && team !== "liberal") ||
      typeof player.userName !== "string" ||
      !player.userName ||
      seen.has(player.userName)
    ) {
      return invalid;
    }
    seen.add(player.userName);
    teams[team].push({
      userName: player.userName,
      rating: safeRating(ratings.get(player.userName)),
      resolved: ratings.has(player.userName),
    });
  }
  if (!teams.fascist.length || !teams.liberal.length) return invalid;

  const fas = normalizedTeam(teams.fascist);
  const lib = normalizedTeam(teams.liberal);
  const scale = Math.hypot(Math.SQRT2 * PREDICTION_BETA, fas.sigma, lib.sigma);
  if (!Number.isFinite(fas.mu) || !Number.isFinite(lib.mu) || !Number.isFinite(scale)) return invalid;

  // OpenSkill v5 predictWin sums member mu/variance and ignores its `weight` option. Instead,
  // treat each faction's weighted average as one Gaussian: mean=sum(mu_i/n), variance=sum(sigma_i^2/n^2).
  // Keeping OpenSkill's per-team beta gives C^2 = 2*beta^2 + Var(F) + Var(L).
  // Then P(F) = Phi((meanF - meanL + offset)/C). Solve at equal means for the prior q:
  // offset = C * Phi^-1(q), hence P(F) = Phi((meanF - meanL)/C + Phi^-1(q)).
  // This sigma-aware offset preserves q even in settled lobbies. biasMuPerFascist's raw-sum offset
  // also compensates for headcount and must NOT be reused here. Higher uncertainty attenuates
  // skill differences toward q; the configuration prior itself remains intact.
  // Divide before subtracting to keep opposite, extremely large finite mu values from overflowing.
  const z = fas.mu / scale - lib.mu / scale + priorZScore(prior);
  const fascist = normalCdf(z);
  if (!Number.isFinite(fascist) || !Number.isFinite(z)) return invalid;
  return { teams, scale, z, prediction: { fascist, liberal: 1 - fascist } };
};

// The engine consumes this same comparison once, including its pre-game prediction.
const predictTeamWinProbability = (game, ratings, roster) => buildTeamComparison(game, ratings, roster).prediction;

module.exports = { predictTeamWinProbability, buildTeamComparison, PREDICTION_BETA };
