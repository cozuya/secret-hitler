// S25 ranked engine: lifetime hidden estimation and independent public progression.
const { rate } = require("openskill");
const { thurstoneMostellerFull } = require("openskill/models");
const { DEFAULT_SIGMA, freshRating, seedMuFromLegacy } = require("./hidden-rating");
const { buildTeamComparison, PREDICTION_BETA } = require("./predict");
const { publicRatingDelta } = require("./public-ladder");
const { xpAward } = require("./xp");

const resolveHiddenRating = (account) => {
  const stored = account?.rating?.overall;
  if (stored && Number.isFinite(stored.mu) && Number.isFinite(stored.sigma) && stored.sigma >= 0) {
    return { mu: stored.mu, sigma: stored.sigma };
  }
  const overall = account?.eloOverall;
  return Number.isFinite(overall) && overall > 0
    ? { mu: seedMuFromLegacy(overall), sigma: DEFAULT_SIGMA }
    : freshRating();
};

// Resolve each account once before prediction/update. Absent accounts never enter this Map;
// the comparison retains their seats as fresh placeholders but emits no persistence work for them.
const resolveHiddenRatings = (accounts) => {
  const ratings = new Map();
  if (!Array.isArray(accounts)) return ratings;
  for (const account of accounts) {
    if (typeof account?.username === "string" && account.username && !ratings.has(account.username)) {
      ratings.set(account.username, resolveHiddenRating(account));
    }
  }
  return ratings;
};

// With w_i=1/n_team, C^2=2*beta^2+sum(w_i^2*sigma_i^2), the shared comparison is
// z=(meanF-meanL)/C+Phi^-1(prior). Feed OpenSkill X_i=w_i*S_i/C plus constant offsets:
// team means sum to z and 0, standard deviations are w_i*sigma_i/C, and beta'=beta/C.
// Thus its performance difference has variance 1 and win probability Phi(z), exactly the predictor.
// Recentring individual means is harmless: inference depends on team sums, not within-team order.
// Thurstone-Mosteller uses that Gaussian likelihood (the default Plackett-Luce uses a logistic one).
// epsilon=0 excludes draws; tau=0 avoids adding uncertainty absent from the pre-game predictor;
// gamma=1 gives the Gaussian moment update: dmu_i=sign*w_i*sigma_i^2/C*v(sign*z),
// sigma_i'^2=sigma_i^2*(1-(w_i*sigma_i/C)^2*w(sign*z)), subject to OpenSkill's numerical floor.
// Undo the coordinate change for each player; never multiply by Rainbow or convert to public Elo.
const updateHidden = (comparison, fascistWon) => {
  const factions = [comparison.teams.fascist, comparison.teams.liberal];
  const inputs = factions.map((team, index) =>
    team.map(({ rating }) => ({
      mu: index === 0 ? comparison.z / team.length : 0,
      sigma: rating.sigma / team.length / comparison.scale,
    }))
  );
  const outputs = rate(inputs, {
    model: thurstoneMostellerFull,
    rank: fascistWon ? [1, 2] : [2, 1],
    beta: PREDICTION_BETA / comparison.scale,
    tau: 0,
    epsilon: 0,
    gamma: () => 1,
  });
  const hidden = new Map();
  factions.forEach((team, index) => {
    team.forEach(({ userName, rating }, i) => {
      const input = inputs[index][i];
      const output = outputs[index][i];
      // Scale in this order to avoid forming n*C, which can overflow for finite extreme sigmas.
      const mu = rating.mu + (output.mu - input.mu) * team.length * comparison.scale;
      const sigma = rating.sigma * Math.min(1, output.sigma / input.sigma);
      // Zero uncertainty is fixed. If arithmetic saturates at an extreme finite rating, retain
      // that player's pre-game pair; never persist NaN/Infinity or poison another player's result.
      hidden.set(userName, Number.isFinite(mu) && Number.isFinite(sigma) && sigma >= 0 ? { mu, sigma } : { ...rating });
    });
  });
  return hidden;
};

// ratings is the PRE-GAME Map from resolveHiddenRatings; roster is the full seatedPlayers array.
// Returns username -> { overall: {mu,sigma}, change, changeSeason, xpChange, xpChangeSeason }.
// Totals, schema writes, mode eligibility and persistence belong to the caller, not this pure engine.
const computeRankedUpdates = (game, ratings, roster) => {
  const winner = game?.gameState?.isCompleted;
  const updates = Object.create(null);
  if (winner !== "fascist" && winner !== "liberal") return updates;
  const comparison = buildTeamComparison(game, ratings, roster);
  if (!comparison.teams) return updates;

  // The comparison is shared with predictTeamWinProbability; its pre-game probabilities are
  // captured before rate() runs and reused once per faction, not recomputed per player.
  const factionAwards = {};
  for (const faction of ["fascist", "liberal"]) {
    const won = faction === winner;
    factionAwards[faction] = {
      change: publicRatingDelta(won, comparison.prediction[faction]),
      xp: xpAward(won, Boolean(game.general?.rainbowgame)),
    };
  }
  const hidden = updateHidden(comparison, winner === "fascist");
  for (const faction of ["fascist", "liberal"]) {
    const { change, xp } = factionAwards[faction];
    for (const { userName, resolved } of comparison.teams[faction]) {
      if (!resolved) continue;
      updates[userName] = {
        overall: hidden.get(userName),
        change,
        changeSeason: change,
        xpChange: xp,
        xpChangeSeason: xp,
      };
    }
  }
  return updates;
};

module.exports = { resolveHiddenRating, resolveHiddenRatings, computeRankedUpdates };
