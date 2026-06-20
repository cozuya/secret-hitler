const { z } = require("zod");

// Shared wire-input shapes for the in-game socket handlers. These were previously copy-pasted across
// the sibling game schema files (assassination / election / election-util / policy-powers); centralising
// them means a change to how a ballot or a seat index is validated happens in one place. The per-handler
// files keep their field-specific rationale. See docs/zod-hardening-plan.md.

// A seat index into game.private.seatedPlayers / game.publicPlayersState. Always a non-negative integer
// from the client. `.nonnegative()` is a defense-in-depth boundary guard — negative seats are already
// rejected in the handlers, and the dynamic `>= playerCount` bound necessarily stays there.
const seatIndex = z.number().int().nonnegative();

// `{ [field]: seatIndex }` for the single-seat-click handlers (assassinate, nominate chancellor, the
// presidential powers). `.passthrough()` matches the prior per-file schemas (unknown keys flow through).
const indexSchema = (field) => z.object({ [field]: seatIndex }).passthrough();

// Ja/Nein (and discard-the-peek) ballots — the client always emits a boolean (`index === 1`) and the
// timer auto-votes with `Boolean(...)`. Requiring a boolean keeps a forged/empty payload from reaching
// the vote branches as some other type.
const voteSchema = z.object({ vote: z.boolean() }).passthrough();

module.exports = { seatIndex, indexSchema, voteSchema };
