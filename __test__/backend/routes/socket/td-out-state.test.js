const {
  clearTdOutVotes,
  getTdOutPublicState,
  hasTdOutVote,
  isTdOutAvailable,
  pruneTdOutVotes,
} = require("../../../../routes/socket/game/td-out-state");

const makeGame = ({
  playerCount = 6,
  deadSeats = [],
  electionTrackerCount = 2,
  phase = "selectingChancellor",
  status = phase === "voting" ? "Vote on election #3 now." : "Election #3: president to select chancellor.",
  isTracksFlipped = true,
  isCompleted = false,
  isGameFrozen = false,
  isRemade = false,
} = {}) => ({
  general: {
    isRemade,
    isTourny: false,
    status,
  },
  gameState: {
    phase,
    isTracksFlipped,
    isCompleted,
    isGameFrozen,
  },
  trackState: {
    electionTrackerCount,
  },
  private: {
    seatedPlayers: Array.from({ length: playerCount }, (_value, index) => ({
      userName: `p${index}`,
      isDead: deadSeats.includes(index),
    })),
    tdOutVotes: {},
  },
});

describe("td-out state", () => {
  it("is available after two failed elections with an even number of living players", () => {
    expect(isTdOutAvailable(makeGame())).toBe(true);
    expect(isTdOutAvailable(makeGame({ phase: "voting" }))).toBe(true);
  });

  it("is not available for the wrong tracker count, odd living count, or inactive phase", () => {
    expect(isTdOutAvailable(makeGame({ electionTrackerCount: 1 }))).toBe(false);
    expect(isTdOutAvailable(makeGame({ deadSeats: [0] }))).toBe(false);
    expect(isTdOutAvailable(makeGame({ phase: "presidentSelectingPolicy" }))).toBe(false);
    expect(isTdOutAvailable(makeGame({ phase: "voting", status: "Tallying results of ballots.." }))).toBe(false);
  });

  it("prunes dead-player votes and reports the public vote count", () => {
    const game = makeGame({ deadSeats: [1] });
    game.private.tdOutVotes = {
      p0: true,
      p1: true,
      p2: true,
    };

    pruneTdOutVotes(game);

    expect(game.private.tdOutVotes).toEqual({
      p0: true,
      p2: true,
    });
    expect(getTdOutPublicState(game)).toEqual({
      isAvailable: false,
      voteCount: 2,
      requiredVotes: 5,
    });
  });

  it("tracks and clears an individual player's vote", () => {
    const game = makeGame();
    game.private.tdOutVotes.p0 = true;

    expect(hasTdOutVote(game, "p0")).toBe(true);
    clearTdOutVotes(game);
    expect(hasTdOutVote(game, "p0")).toBe(false);
  });
});
