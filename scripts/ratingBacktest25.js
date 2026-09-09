// Read-only S25 experiment runner. All rating/prediction math comes from production modules.
// No Account/Mongoose connection, database mutation, output-file flag or parameter tuning is allowed.
const { createHash } = require("crypto");
const { readFileSync } = require("fs");
const { join } = require("path");
const { MongoClient } = require("mongodb");
const { resolveHiddenRatings, computeRankedUpdates } = require("../routes/socket/rating/ranked");
const { predictTeamWinProbability } = require("../routes/socket/rating/predict");
const {
  STARTING_PUBLIC_RATING,
  PUBLIC_DELTA_CENTER,
  publicRatingDelta,
} = require("../routes/socket/rating/public-ladder");
const { TEAM_SIZES, fascistWinPrior } = require("../routes/socket/rating/bias");
const { DEFAULT_MU, DEFAULT_SIGMA, freshRating } = require("../routes/socket/rating/hidden-rating");
const buildEnhancedGameSummary = require("../models/game-summary/buildEnhancedGameSummary");

const DEFAULTS = { seed: 250925, population: 240, games: 12000, trials: 32, careerGames: 10000, corpusLimit: 5000 };
const CHECKPOINTS = [10, 20, 25, 50, 100, 300, 1000, 3000, 10000];
const CONFIGURATIONS = [
  ...[5, 6, 7, 8, 9, 10].map((count) => ({ name: `${count}p`, count, flags: {} })),
  { name: "6p-rebalanced", count: 6, flags: { rebalance6p: true } },
  { name: "7p-rebalanced", count: 7, flags: { rebalance7p: true } },
  { name: "9p-rebalanced", count: 9, flags: { rebalance9p: true } },
  { name: "9p-rerebalanced", count: 9, flags: { rerebalance9p: true } },
  { name: "9p-2f-deck", count: 9, flags: { rebalance9p2f: true } },
  { name: "9p-2f-deck-rerebalanced", count: 9, flags: { rebalance9p2f: true, rerebalance9p: true } },
];
const FOCUS_CONFIG = CONFIGURATIONS.find((config) => config.name === "7p-rebalanced");

// xorshift32, with a nonzero seed: reproducible scheduling and Bernoulli outcomes.
const random = (seed) => {
  let value = seed >>> 0 || 1;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 4294967296;
  };
};
const shuffled = (values, rng) => {
  const result = values.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);
const distribution = (values) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  const q = (p) => (sorted.length ? sorted[Math.floor((sorted.length - 1) * p)] : null);
  return { n: sorted.length, min: q(0), p10: q(0.1), median: q(0.5), p90: q(0.9), max: q(1), mean: mean(sorted) };
};
const correlation = (pairs) => {
  if (pairs.length < 3) return null;
  const mx = mean(pairs.map(([x]) => x)),
    my = mean(pairs.map(([, y]) => y));
  let xx = 0,
    yy = 0,
    xy = 0;
  for (const [x, y] of pairs) {
    xx += (x - mx) ** 2;
    yy += (y - my) ** 2;
    xy += (x - mx) * (y - my);
  }
  return xx && yy ? xy / Math.sqrt(xx * yy) : null;
};
const createPlayer = (id, truthMu = DEFAULT_MU, mu = DEFAULT_MU, sigma = DEFAULT_SIGMA, weight = 1) => ({
  username: id,
  truthMu,
  weight,
  elo: STARTING_PUBLIC_RATING,
  rating: { overall: { ...freshRating(), mu, sigma } },
  games: 0,
  wins: 0,
  checkpoints: {},
  subsequentWins: 0,
  subsequentGames: 0,
  first2000: null,
});
const snapshot = (player) => ({
  games: player.games,
  wins: player.wins,
  winRate: player.games ? player.wins / player.games : null,
  publicRating: player.elo,
  mu: player.rating.overall.mu,
  sigma: player.rating.overall.sigma,
});
const tracker = () => ({ games: 0, deltas: {}, effects: {}, predictions: [], violations: 0 });
const choose = (pool, count, rng) => {
  const available = pool.slice(),
    result = [];
  while (result.length < count) {
    let pick = rng() * available.reduce((total, player) => total + player.weight, 0);
    let index = 0;
    while (index < available.length - 1 && (pick -= available[index].weight) >= 0) index++;
    result.push(available.splice(index, 1)[0]);
  }
  return result;
};
const lobby = (pool, config, rng, focus) => {
  const selected = focus
    ? [
        focus,
        ...choose(
          pool.filter((player) => player !== focus),
          config.count - 1,
          rng
        ),
      ]
    : choose(pool, config.count, rng);
  const seats = shuffled(selected, rng);
  // start-game changes the deck for rebalance9p2f, not the number of fascist-team seats.
  const fascists = TEAM_SIZES[config.count].fas;
  return {
    players: seats,
    roster: seats.map((player, i) => ({
      userName: player.username,
      role: { team: i < fascists ? "fascist" : "liberal" },
    })),
    game: { general: { playerCount: config.count, ...config.flags }, gameState: {} },
  };
};

// The generator uses the production predictor with known fixed synthetic skills (sigma=0).
// This is a model-matched synthetic world, not evidence about real players or predictive accuracy.
const play = (match, rng, stats, winner) => {
  const { players, roster, game } = match;
  const before = resolveHiddenRatings(players);
  const prediction = predictTeamWinProbability(game, before, roster);
  const truth = new Map(players.map((player) => [player.username, { mu: player.truthMu, sigma: 0 }]));
  const truthPrediction = winner ? null : predictTeamWinProbability(game, truth, roster);
  game.gameState.isCompleted = winner || (rng() < truthPrediction.fascist ? "fascist" : "liberal");
  const updates = computeRankedUpdates(game, before, roster);
  stats.games++;
  stats.predictions.push({ p: prediction.fascist, won: game.gameState.isCompleted === "fascist" });
  for (const [i, player] of players.entries()) {
    const faction = roster[i].role.team,
      won = game.gameState.isCompleted === faction;
    const update = updates[player.username];
    if (!update) throw new Error("Production engine omitted a resolved synthetic/replay player");
    if (
      update.change !== publicRatingDelta(won, prediction[faction]) ||
      update.change !== update.changeSeason ||
      update.change < (won ? 16 : -24) ||
      update.change > (won ? 24 : -16) ||
      !Number.isFinite(update.overall.mu) ||
      !Number.isFinite(update.overall.sigma) ||
      update.overall.sigma < 0
    ) {
      stats.violations++;
      throw new Error("Production rating invariant failed during replay");
    }
    player.rating.overall = update.overall;
    player.elo += update.change;
    player.games++;
    player.wins += Number(won);
    if (CHECKPOINTS.includes(player.games)) player.checkpoints[player.games] = snapshot(player);
    if (player.games > 25 && player.games <= 50) {
      player.subsequentGames++;
      player.subsequentWins += Number(won);
    }
    if (player.elo >= 2000 && !player.first2000) player.first2000 = { ...snapshot(player) };
    stats.deltas[update.change] = (stats.deltas[update.change] || 0) + 1;
    const key = `${game.general.playerCount}p-${faction}`;
    const effect = stats.effects[key] || (stats.effects[key] = { appearances: 0, wins: 0, deltaSum: 0 });
    effect.appearances++;
    effect.wins += Number(won);
    effect.deltaSum += update.change;
  }
  return updates;
};
const histogramSummary = (histogram) => {
  const values = Object.keys(histogram)
    .map(Number)
    .sort((a, b) => a - b);
  const total = values.reduce((n, value) => n + histogram[value], 0);
  return {
    count: total,
    min: values[0] ?? null,
    max: values[values.length - 1] ?? null,
    mean: total ? values.reduce((sum, value) => sum + value * histogram[value], 0) / total : null,
    histogram,
  };
};
const summarize = (players, stats, synthetic) => {
  const future = players
    .filter((player) => player.checkpoints[25] && player.subsequentGames === 25)
    .sort((a, b) => a.checkpoints[25].publicRating - b.checkpoints[25].publicRating);
  const futureBuckets = Array.from({ length: 5 }, (_, i) => {
    const rows = future.slice(Math.floor((future.length * i) / 5), Math.floor((future.length * (i + 1)) / 5));
    return {
      quintile: i + 1,
      players: rows.length,
      ratingAt25: mean(rows.map((p) => p.checkpoints[25].publicRating)),
      subsequentWinRate26to50: mean(rows.map((p) => p.subsequentWins / 25)),
    };
  });
  const checkpoints = Object.fromEntries(
    CHECKPOINTS.map((n) => {
      const rows = players.map((player) => player.checkpoints[n]).filter(Boolean);
      return [
        n,
        {
          publicRating: distribution(rows.map((row) => row.publicRating)),
          sigma: distribution(rows.map((row) => row.sigma)),
        },
      ];
    })
  );
  const rankedByWinRate = players.filter((p) => p.games >= 100).sort((a, b) => a.wins / a.games - b.wins / b.games);
  const trajectoryGroup = (rows) => ({
    players: rows.length,
    finalWinRate: mean(rows.map((p) => p.wins / p.games)),
    ratings: Object.fromEntries(
      [10, 25, 50, 100].map((n) => [n, distribution(rows.map((p) => p.checkpoints[n]?.publicRating))])
    ),
  });
  const quartile = Math.floor(rankedByWinRate.length / 4);
  const muShift = synthetic ? mean(players.map((p) => p.rating.overall.mu - p.truthMu)) : null;
  return {
    evidence: synthetic ? "SYNTHETIC" : "MEASURED-FROM-CORPUS: counterfactual S25 replay of recorded outcomes",
    games: stats.games,
    players: players.length,
    invariantViolations: stats.violations,
    publicDeltas: histogramSummary(stats.deltas),
    finalPublicRating: distribution(players.map((p) => p.elo)),
    gamesPerPlayer: distribution(players.map((p) => p.games)),
    checkpointRatings: checkpoints,
    subsequentWinRate: {
      observation: "Score after game 25 vs wins in games 26–50; no future outcomes used in the score",
      samples: future.length,
      correlation: correlation(future.map((p) => [p.checkpoints[25].publicRating, p.subsequentWins / 25])),
      quintiles: futureBuckets,
    },
    winRateTrajectories: {
      selection:
        "Retrospective bottom/top final-WR quartile among players reaching 100 games; descriptive, not prospective",
      low: trajectoryGroup(rankedByWinRate.slice(0, quartile)),
      high: trajectoryGroup(quartile ? rankedByWinRate.slice(-quartile) : []),
    },
    factionAndPlayerCount: Object.fromEntries(
      Object.entries(stats.effects).map(([key, value]) => [
        key,
        {
          appearances: value.appearances,
          winRate: value.wins / value.appearances,
          meanDelta: value.deltaSum / value.appearances,
        },
      ])
    ),
    predictionBrierScore: mean(stats.predictions.map(({ p, won }) => (p - Number(won)) ** 2)),
    fixed20ApproximationError: distribution(
      players.map((p) => p.elo - (STARTING_PUBLIC_RATING + PUBLIC_DELTA_CENTER * (2 * p.wins - p.games)))
    ),
    finalSigma: distribution(players.map((p) => p.rating.overall.sigma)),
    hiddenCenteredMae: synthetic ? mean(players.map((p) => Math.abs(p.rating.overall.mu - p.truthMu - muShift))) : null,
    knownSkillRatingCorrelation: synthetic ? correlation(players.map((p) => [p.truthMu, p.elo])) : null,
  };
};

const populationExperiment = (options) => {
  const rng = random(options.seed),
    stats = tracker();
  const players = Array.from({ length: options.population }, (_, i) =>
    createPlayer(`p${i}`, [10, 20, 30, 40][i % 4], DEFAULT_MU, DEFAULT_SIGMA, [1, 2, 4][Math.floor(i / 4) % 3])
  );
  for (let i = 0; i < options.games; i++) {
    const config = CONFIGURATIONS[Math.floor(rng() * CONFIGURATIONS.length)];
    const match = lobby(players, config, rng);
    match.game.general.rainbowgame = rng() < 0.5;
    play(match, rng, stats);
  }
  const bySkillAndActivity = [];
  for (const skill of [10, 20, 30, 40])
    for (const weight of [1, 2, 4]) {
      const rows = players.filter((p) => p.truthMu === skill && p.weight === weight);
      bySkillAndActivity.push({
        trueMu: skill,
        schedulingWeight: weight,
        players: rows.length,
        meanGames: mean(rows.map((p) => p.games)),
        meanWinRate: mean(rows.filter((p) => p.games).map((p) => p.wins / p.games)),
        meanPublicRating: mean(rows.map((p) => p.elo)),
      });
    }
  let comparisons = 0,
    reversals = 0;
  for (const low of players)
    for (const high of players) {
      if (low.truthMu < high.truthMu && low.games > high.games) {
        comparisons++;
        reversals += Number(low.elo > high.elo);
      }
    }
  return {
    ...summarize(players, stats, true),
    assumptions:
      "Fixed true mu 10/20/30/40 crossed with scheduling weights 1/2/4; everyone starts hidden fresh and public 1500",
    bySkillAndActivity,
    lowerSkillHigherVolumeReversals: { comparisons, reversals, rate: comparisons ? reversals / comparisons : null },
  };
};

const focusTrial = ({
  seed,
  population,
  games,
  trueMu,
  initialMu = DEFAULT_MU,
  initialSigma = DEFAULT_SIGMA,
  initialPublic = STARTING_PUBLIC_RATING,
  peerMu = DEFAULT_MU,
  checkpoints = CHECKPOINTS,
  prescribedWins,
  changeAt,
  changedTrueMu,
}) => {
  const rng = random(seed),
    stats = tracker();
  const focus = createPlayer("focus", trueMu, initialMu, initialSigma);
  focus.elo = initialPublic;
  const players = [
    focus,
    ...Array.from({ length: population - 1 }, (_, i) => createPlayer(`peer${i}`, peerMu, peerMu, 2.5)),
  ];
  const milestones = {},
    adaptation = {},
    opponents = new Set(),
    opponentLosses = {},
    focusDeltas = {};
  let firstSigmaBelowOne = null;
  for (let i = 1; i <= games; i++) {
    if (changeAt && i === changeAt + 1) focus.truthMu = changedTrueMu;
    const match = lobby(players, FOCUS_CONFIG, rng, focus);
    const faction = match.roster.find((seat) => seat.userName === "focus").role.team;
    const winner = prescribedWins
      ? prescribedWins[i - 1]
        ? faction
        : faction === "fascist"
          ? "liberal"
          : "fascist"
      : null;
    const updates = play(match, rng, stats, winner);
    const focusDelta = updates.focus.change;
    focusDeltas[focusDelta] = (focusDeltas[focusDelta] || 0) + 1;
    for (const [index, peer] of match.players.entries()) {
      if (match.roster[index].role.team !== faction) {
        opponents.add(peer.username);
        const delta = updates[peer.username].change;
        if (delta < 0) opponentLosses[delta] = (opponentLosses[delta] || 0) + 1;
      }
    }
    const peerShift = mean(players.slice(1).map((p) => p.rating.overall.mu - p.truthMu));
    const row = {
      ...snapshot(focus),
      alignedMu: focus.rating.overall.mu - peerShift,
      absoluteSkillError: Math.abs(focus.rating.overall.mu - peerShift - focus.truthMu),
    };
    if (checkpoints.includes(i)) milestones[i] = row;
    if (changeAt && CHECKPOINTS.includes(i - changeAt)) adaptation[i - changeAt] = row;
    if (!firstSigmaBelowOne && focus.rating.overall.sigma < 1) firstSigmaBelowOne = i;
  }
  return {
    final: snapshot(focus),
    milestones,
    adaptation,
    firstSigmaBelowOne,
    distinctOpponents: opponents.size,
    firstPublic2000: focus.first2000,
    opponentLosses: histogramSummary(opponentLosses),
    focusDeltas: histogramSummary(focusDeltas),
    allDeltas: histogramSummary(stats.deltas),
  };
};
const combineTrials = (trials) => {
  const keys = [...new Set(trials.flatMap((trial) => Object.keys(trial.milestones)))];
  return {
    trials: trials.length,
    finalPublic: distribution(trials.map((t) => t.final.publicRating)),
    winRate: distribution(trials.map((t) => t.final.winRate)),
    checkpoints: Object.fromEntries(
      keys.map((key) => [
        key,
        Object.fromEntries(
          ["publicRating", "mu", "sigma", "alignedMu", "absoluteSkillError", "wins"].map((field) => [
            field,
            distribution(trials.map((trial) => trial.milestones[key]?.[field])),
          ])
        ),
      ])
    ),
    distinctOpponents: distribution(trials.map((t) => t.distinctOpponents)),
    earliestPublic2000: distribution(trials.map((t) => t.firstPublic2000?.games)),
    winsAtFirstPublic2000: distribution(trials.map((t) => t.firstPublic2000?.wins)),
    reached2000: trials.filter((t) => t.firstPublic2000).length,
    worstOpponentLoss: Math.min(...trials.map((t) => t.opponentLosses.min)),
    publicWinMin: Math.min(
      ...trials.flatMap((t) =>
        Object.keys(t.focusDeltas.histogram)
          .map(Number)
          .filter((n) => n > 0)
      )
    ),
    publicWinMax: Math.max(
      ...trials.flatMap((t) =>
        Object.keys(t.focusDeltas.histogram)
          .map(Number)
          .filter((n) => n > 0)
      )
    ),
    publicLossMin: Math.min(...trials.map((t) => t.focusDeltas.min)),
    publicLossMax: Math.max(
      ...trials.flatMap((t) =>
        Object.keys(t.focusDeltas.histogram)
          .map(Number)
          .filter((n) => n < 0)
      )
    ),
  };
};
const activityExperiment = (options) => {
  const ratios = [1, 1.25, 1.5, 2, 3, 5],
    highGames = 100;
  const lowCounts = ratios.map((ratio) => ratio * highGames),
    trials = [];
  for (let i = 0; i < options.trials; i++) {
    const high = focusTrial({
      ...options,
      seed: options.seed + 10000 + i * 2,
      games: highGames,
      trueMu: 35,
      initialMu: 35,
      initialSigma: 2.5,
      checkpoints: [highGames],
    });
    const low = focusTrial({
      ...options,
      seed: options.seed + 10001 + i * 2,
      games: 500,
      trueMu: 30,
      initialMu: 30,
      initialSigma: 2.5,
      checkpoints: lowCounts,
    });
    trials.push({ high, low });
  }
  const rows = ratios.map((ratio, index) => {
    const lowGames = lowCounts[index];
    const reversed = trials.filter(
      ({ high, low }) => low.milestones[lowGames].publicRating > high.final.publicRating
    ).length;
    return {
      volumeRatio: ratio,
      lowGames,
      highGames,
      comparisons: trials.length,
      reversals: reversed,
      reversalRate: reversed / trials.length,
      lowerSkillMeanRating: mean(trials.map(({ low }) => low.milestones[lowGames].publicRating)),
      higherSkillMeanRating: mean(trials.map(({ high }) => high.final.publicRating)),
      lowerSkillMeanWinRate: mean(trials.map(({ low }) => low.milestones[lowGames].winRate)),
      higherSkillMeanWinRate: mean(trials.map(({ high }) => high.final.winRate)),
    };
  });
  return {
    evidence: "SYNTHETIC",
    design:
      "Independent trials: true mu 30 vs 35, hidden initially calibrated at sigma 2.5; public 1500; rotating mu-25 peer populations",
    rows,
    firstTestedRatioWithMajorityReversal: rows.find((row) => row.reversalRate > 0.5)?.volumeRatio ?? null,
  };
};
const syntheticExperiments = (options) => {
  const modes = {};
  for (const [name, params] of Object.entries({
    freshEliteAlt: { trueMu: 45 },
    settledHighRanked: { trueMu: 45, initialMu: 45, initialSigma: 2.5, initialPublic: 2200 },
    settledHighBalanced: { trueMu: 45, initialMu: 45, initialSigma: 2.5, initialPublic: 2200, peerMu: 45 },
    ordinaryBalanced: { trueMu: 25, initialMu: 25, initialSigma: 2.5 },
  })) {
    modes[name] = {
      evidence: "SYNTHETIC",
      setup: {
        ...params,
        gamesPerTrial: 100,
        configuration: FOCUS_CONFIG.name,
        peerPopulation: options.population - 1,
      },
      ...combineTrials(
        Array.from({ length: options.trials }, (_, i) =>
          focusTrial({ ...options, seed: options.seed + 20000 + i, games: 100, ...params })
        )
      ),
    };
  }
  const prescribed = shuffled([...Array(180).fill(true), ...Array(120).fill(false)], random(options.seed + 30000));
  const reference = focusTrial({
    ...options,
    seed: options.seed + 30001,
    games: 300,
    trueMu: 25,
    prescribedWins: prescribed,
  });
  const adaptationGames = 1000;
  const career = focusTrial({
    ...options,
    seed: options.seed + 40000,
    games: options.careerGames + adaptationGames,
    trueMu: 25,
    changeAt: options.careerGames,
    changedTrueMu: 45,
    checkpoints: [...CHECKPOINTS.filter((n) => n <= options.careerGames), options.careerGames],
  });
  const freshAfterChange = focusTrial({ ...options, seed: options.seed + 40001, games: adaptationGames, trueMu: 45 });
  const configurations = CONFIGURATIONS.map((config) => {
    const players = Array.from({ length: config.count }, (_, i) => createPlayer(`calibration${i}`));
    const match = lobby(players, config, random(options.seed));
    const p = predictTeamWinProbability(match.game, resolveHiddenRatings(players), match.roster).fascist;
    return {
      configuration: config.name,
      prior: fascistWinPrior(match.game),
      equalSkillFascistPrediction: p,
      fascistWinDelta: publicRatingDelta(true, p),
      fascistLossDelta: publicRatingDelta(false, p),
      liberalWinDelta: publicRatingDelta(true, 1 - p),
      liberalLossDelta: publicRatingDelta(false, 1 - p),
    };
  });
  return {
    assumptions:
      "SYNTHETIC throughout: fixed latent skills generate Bernoulli outcomes via the production predictor at sigma=0; rating updates are the unmodified production engine. This favors the estimator by matching its assumed model.",
    population: populationExperiment(options),
    activityVsSkill: activityExperiment(options),
    failureModes: modes,
    configurationProbes: configurations,
    prescribed60Percent: {
      evidence: "SYNTHETIC: prescribed exactly 180 wins / 120 losses, shuffled order; not a latent-skill sample",
      ...reference,
      fixed20NetWinsReference: STARTING_PUBLIC_RATING + PUBLIC_DELTA_CENTER * 60,
      actualMinusReference: reference.final.publicRating - (STARTING_PUBLIC_RATING + PUBLIC_DELTA_CENTER * 60),
    },
    sigmaCareer: {
      evidence: "SYNTHETIC",
      stableGames: options.careerGames,
      trueMuBefore: 25,
      trueMuAfter: 45,
      adaptationGames,
      uncertaintyModel:
        "Production tau=0, unmodified. Focus rotates through a settled peer population; every participant is updated.",
      careerCheckpoints: career.milestones,
      firstSigmaBelowOne: career.firstSigmaBelowOne,
      agedAdaptation: career.adaptation,
      freshComparison: freshAfterChange.milestones,
      comparisonLimit:
        "Fresh comparator is a separate seeded population, not a paired causal estimate of a proposed parameter change. Means are aligned to peer drift because only relative skill is identifiable.",
    },
  };
};

// Replay only supported, demonstrably completed vanilla summaries. Reuse the existing winner
// decoder, including flappyWinner; never treat the last arbitrary policy of an incomplete game as a win.
const decodeSummary = (summary) => {
  const settings = summary?.gameSetting;
  if (!settings || !Array.isArray(summary.players) || summary.players.length < 5 || summary.players.length > 10)
    return { excluded: "missing/unsupported roster or settings" };
  if (
    settings.casualGame ||
    settings.practiceGame ||
    settings.unlistedGame ||
    settings.monarchistSH ||
    settings.avalonSH ||
    summary.customGameSettings?.enabled
  )
    return { excluded: "nonranked/custom mode" };
  if (!(summary.date instanceof Date) || !Number.isFinite(summary.date.getTime()))
    return { excluded: "missing/invalid date" };
  const roster = summary.players.map((p) => ({
    userName:
      typeof p?.hashUid === "string" && p.hashUid
        ? `hash:${p.hashUid}`
        : typeof p?.username === "string" && p.username
          ? `name:${p.username}`
          : "",
    role: { team: p?.role === "liberal" ? "liberal" : ["fascist", "hitler"].includes(p?.role) ? "fascist" : null },
  }));
  if (roster.some((p) => !p.userName || !p.role.team) || new Set(roster.map((p) => p.userName)).size !== roster.length)
    return { excluded: "unknown/duplicate identity or role" };
  if (!Array.isArray(summary.logs) || !summary.logs.length) return { excluded: "missing outcome logs" };
  try {
    const enhanced = buildEnhancedGameSummary(summary),
      last = enhanced.turns.last();
    const complete =
      ["fascist", "liberal"].includes(settings.flappyWinner) ||
      last?.isHitlerElected ||
      last?.isHitlerKilled ||
      last?.isGameEndingPolicyEnacted ||
      (settings.noTopdecking > 0 && last?.isElectionTrackerMaxed);
    if (!complete || !["fascist", "liberal"].includes(enhanced.winningTeam))
      return { excluded: "no confirmed terminal outcome" };
    const fas = roster.filter((p) => p.role.team === "fascist").length;
    if (!fas || fas === roster.length) return { excluded: "empty faction" };
    return {
      date: summary.date,
      roster,
      game: { general: { ...settings, playerCount: roster.length }, gameState: { isCompleted: enhanced.winningTeam } },
    };
  } catch {
    return { excluded: "malformed/unreadable logs" };
  }
};
const replayCorpus = async (collection, options) => {
  const filter = { date: { $type: "date" } };
  if (options.from) filter.date.$gte = new Date(options.from);
  if (options.to) filter.date.$lt = new Date(options.to);
  const projection = { date: 1, gameSetting: 1, customGameSettings: 1, players: 1, logs: 1 };
  const cursor = collection
    .find(filter, { projection })
    .sort({ date: 1, _id: 1 })
    .limit(options.corpusLimit)
    .maxTimeMS(60000);
  const players = new Map(),
    stats = tracker(),
    excluded = {};
  let scanned = 0,
    firstDate = null,
    lastDate = null;
  try {
    for (let row = await cursor.next(); row; row = await cursor.next()) {
      scanned++;
      const match = decodeSummary(row);
      if (match.excluded) {
        excluded[match.excluded] = (excluded[match.excluded] || 0) + 1;
        continue;
      }
      match.players = match.roster.map((seat) => {
        if (!players.has(seat.userName)) players.set(seat.userName, createPlayer(seat.userName));
        return players.get(seat.userName);
      });
      play(match, null, stats, match.game.gameState.isCompleted);
      if (!firstDate) firstDate = match.date;
      lastDate = match.date;
    }
  } finally {
    await cursor.close();
  }
  return {
    status: "measured",
    ...summarize([...players.values()], stats, false),
    scanned,
    excluded,
    observedDates: { first: firstDate, last: lastDate },
    requestedWindow: { fromInclusive: options.from || null, toExclusive: options.to || null },
    limit: options.corpusLimit,
    source: "gamesummaries ordered by date then _id; only confirmed completed supported ranked games",
    limitations:
      "Counterfactual cold start for every identity: public 1500, hidden fresh. Not historical live ratings or an inference about S24 deployment. hashUid preferred, username fallback; missing hashes/renames may split identities. Known true skill and activity-vs-skill reversal rates are unavailable from outcomes alone. Report includes no account names or raw records.",
  };
};
const readCorpus = async (uri, options) => {
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 15000,
  });
  try {
    await client.connect();
    return await replayCorpus(client.db().collection("gamesummaries"), options);
  } finally {
    await client.close();
  }
};
const parseArgs = (args) => {
  const options = { ...DEFAULTS };
  const numbers = {
    "--seed": ["seed", 1, 4294967295],
    "--population": ["population", 12, 2000],
    "--games": ["games", 1, 200000],
    "--trials": ["trials", 1, 200],
    "--career-games": ["careerGames", 300, 100000],
    "--corpus-limit": ["corpusLimit", 1, 100000],
  };
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (key === "--help") {
      options.help = true;
      continue;
    }
    if (numbers[key]) {
      const [name, min, max] = numbers[key],
        raw = args[++i],
        value = Number(raw);
      if (!/^\d+$/.test(raw || "") || !Number.isSafeInteger(value) || value < min || value > max)
        throw new Error(`Invalid ${key}; expected integer ${min}..${max}`);
      options[name] = value;
    } else if (key === "--from" || key === "--to") {
      const value = args[++i];
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(value || "") ||
        !Number.isFinite(Date.parse(value)) ||
        new Date(value).toISOString().slice(0, 10) !== value
      )
        throw new Error(`Invalid ${key}; expected YYYY-MM-DD`);
      options[key.slice(2)] = value;
    } else throw new Error(`Unknown option: ${key}`);
  }
  if (options.from && options.to && options.from >= options.to) throw new Error("--from must precede --to");
  return options;
};
const engineFingerprint = () => {
  const files = ["ranked.js", "predict.js", "public-ladder.js", "bias.js", "hidden-rating.js", "xp.js"];
  return Object.fromEntries(
    files.map((file) => [
      file,
      createHash("sha256")
        .update(readFileSync(join(__dirname, "../routes/socket/rating", file)))
        .digest("hex"),
    ])
  );
};
const run = async (options, uri) => {
  let corpus = { status: "unavailable", evidence: "MONGO_URL absent; no corpus connection/read attempted" };
  if (uri) {
    try {
      corpus = await readCorpus(uri, options);
    } catch (error) {
      corpus = {
        status: "failed",
        evidence: "Corpus requested but not successfully measured; synthetic results are separate",
        errorType: error.name,
        errorCode: typeof error.code === "number" ? error.code : null,
      };
    }
  }
  return {
    evidence: uri
      ? "CORPUS REQUESTED; inspect corpus.status. All generated-population results are SYNTHETIC."
      : "SYNTHETIC ONLY: MONGO_URL absent. No empirical/corpus result was measured.",
    seed: options.seed,
    configuration: options,
    engineSha256: engineFingerprint(),
    corpus,
    synthetic: syntheticExperiments(options),
  };
};
if (require.main === module) {
  (async () => {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      console.log(
        "Read-only: node scripts/ratingBacktest25.js [--seed N] [--population N] [--games N] [--trials N] [--career-games N] [--corpus-limit N] [--from YYYY-MM-DD] [--to YYYY-MM-DD]"
      );
      console.log(
        "No write mode. MONGO_URL present: replay GameSummary corpus; absent: explicitly synthetic only. Results print as JSON; defaults:",
        JSON.stringify(DEFAULTS)
      );
      return;
    }
    const result = await run(options, process.env.MONGO_URL);
    console.log(JSON.stringify(result, null, 2));
    if (result.corpus.status === "failed") process.exitCode = 1;
  })().catch((error) => {
    console.error(`Backtest failed: ${error.message}`);
    process.exitCode = 1;
  });
}
module.exports = {
  DEFAULTS,
  CONFIGURATIONS,
  random,
  distribution,
  createPlayer,
  tracker,
  lobby,
  play,
  focusTrial,
  populationExperiment,
  syntheticExperiments,
  decodeSummary,
  replayCorpus,
  parseArgs,
  run,
};
