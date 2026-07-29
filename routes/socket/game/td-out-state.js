const TD_OUT_PHASES = new Set(["selectingChancellor", "voting"]);

const getLivingPlayers = (game) => {
  if (!game || !game.private || !Array.isArray(game.private.seatedPlayers)) {
    return [];
  }

  return game.private.seatedPlayers.filter((player) => player && !player.isDead);
};

const getLivingPlayerNames = (game) => getLivingPlayers(game).map((player) => player.userName);

const ensureTdOutVotes = (game) => {
  if (!game || !game.private) {
    return {};
  }

  if (!game.private.tdOutVotes || Array.isArray(game.private.tdOutVotes)) {
    game.private.tdOutVotes = {};
  }

  return game.private.tdOutVotes;
};

const pruneTdOutVotes = (game) => {
  const votes = ensureTdOutVotes(game);
  const livingPlayerNames = new Set(getLivingPlayerNames(game));

  Object.keys(votes).forEach((userName) => {
    if (!livingPlayerNames.has(userName)) {
      delete votes[userName];
    }
  });

  return votes;
};

const isTdOutAvailable = (game) => {
  const livingPlayerCount = getLivingPlayers(game).length;
  const isActiveElection =
    game &&
    game.gameState &&
    (game.gameState.phase === "selectingChancellor" ||
      (game.gameState.phase === "voting" &&
        game.general &&
        typeof game.general.status === "string" &&
        game.general.status.startsWith("Vote")));

  return Boolean(
    game &&
      game.general &&
      game.gameState &&
      game.trackState &&
      game.private &&
      game.trackState.electionTrackerCount === 2 &&
      livingPlayerCount > 0 &&
      livingPlayerCount % 2 === 0 &&
      TD_OUT_PHASES.has(game.gameState.phase) &&
      isActiveElection &&
      game.gameState.isTracksFlipped &&
      !game.gameState.isCompleted &&
      !game.gameState.isGameFrozen &&
      !game.general.isRemade &&
      !(game.general.isTourny && game.general.tournyInfo && game.general.tournyInfo.isCancelled)
  );
};

const getTdOutVoteCount = (game) => {
  const votes = pruneTdOutVotes(game);

  return getLivingPlayerNames(game).filter((userName) => votes[userName]).length;
};

const getTdOutPublicState = (game) => {
  const livingPlayers = getLivingPlayers(game);

  return {
    isAvailable: isTdOutAvailable(game),
    voteCount: getTdOutVoteCount(game),
    requiredVotes: livingPlayers.length,
  };
};

const hasTdOutVote = (game, userName) => {
  if (!userName) {
    return false;
  }

  const votes = pruneTdOutVotes(game);

  return Boolean(votes[userName]);
};

const clearTdOutVotes = (game) => {
  if (game && game.private) {
    game.private.tdOutVotes = {};
  }
};

module.exports = {
  clearTdOutVotes,
  ensureTdOutVotes,
  getLivingPlayerNames,
  getTdOutPublicState,
  getTdOutVoteCount,
  hasTdOutVote,
  isTdOutAvailable,
  pruneTdOutVotes,
};
