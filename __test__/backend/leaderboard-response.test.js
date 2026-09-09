const Leaderboard = require("../../models/leaderboard");

it("identifies missing cron output without inventing a successful refresh time", () => {
  expect(Leaderboard.toResponse(null)).toEqual({ ...Leaderboard.freshBoard(), status: "pending", updatedAt: null });
});

it("preserves a successfully published empty board and its refresh timestamp", () => {
  const updatedAt = new Date("2026-09-09T09:00:00Z");
  const doc = { payload: Leaderboard.freshBoard(), updatedAt };
  expect(Leaderboard.toResponse(doc)).toEqual({ ...doc.payload, status: "ready", updatedAt });
});

it("keeps populated and legacy board payloads compatible", () => {
  const payload = { ...Leaderboard.freshBoard(), seasonalLeaderboardElo: [{ userName: "Player1", elo: 1600 }] };
  expect(Leaderboard.toResponse({ payload })).toEqual({ ...payload, status: "ready", updatedAt: null });
});
