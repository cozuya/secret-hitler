import buildReplay from "../../../src/frontend-scripts/replay/buildReplay";
import buildEnhancedGameSummary from "../../../models/game-summary/buildEnhancedGameSummary";
import toDescription from "../../../src/frontend-scripts/replay/toDescription";
import toGameInfo from "../../../src/frontend-scripts/replay/toGameInfo";
import mockGame from "../../mocks/mockGameSummary";

describe("Flappy-decided replays", () => {
  it.each(["liberal", "fascist"])("replays all policy turns and finishes at match point with a %s winner", (winner) => {
    // Keep the fixture's earlier executive powers, prepend four blue governments, and
    // stop before its sixth red. The fifth red triggers Flappy and grants no execution.
    const blue = {
      presidentId: 0,
      chancellorId: 1,
      votes: Array(7).fill(true),
      presidentHand: { reds: 1, blues: 2 },
      chancellorHand: { reds: 1, blues: 1 },
      enactedPolicy: "liberal",
    };
    const logs = [...Array(4).fill(blue), ...mockGame.logs.slice(0, 7).map((log) => ({ ...log }))];
    delete logs[logs.length - 1].execution;
    const game = buildEnhancedGameSummary({
      ...mockGame,
      gameSetting: { ...mockGame.gameSetting, flappyWinner: winner },
      logs,
    });
    const replay = buildReplay(game);
    const final = replay.last();
    expect(game.winningTeam).toBe(winner);
    expect(final.turnNum).toBe(logs.length - 1);
    expect(final.track).toEqual({ reds: 5, blues: 4 });
    expect(final.gameOver).toBe(true);
    expect(replay.some((frame) => frame.phase === "investigation")).toBe(true);
    expect(toDescription(final, game, {}, false)).toEqual(
      expect.arrayContaining([expect.objectContaining({ text: "Flappy Hitler ends." })])
    );
    expect(toGameInfo(final).publicPlayersState).toHaveLength(7);
  });
});
