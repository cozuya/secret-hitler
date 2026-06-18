const { z } = require("zod");

// Per-handler-file schema (mirrors the user-events convention): the vote/seat-index shapes recur
// across the sibling game schemas by design — kept local so each handler file stays self-contained,
// not dead duplication. See docs/zod-hardening-plan.md.

// `playerIndex` is the clicked seat for a presidential power (investigate, execute,
// special election, reverse-investigate); it indexes seatedPlayers/publicPlayersState.
// The client always emits a numeric seat index. Requiring an integer stops a forged
// value from crashing via an undefined-seat deref; the per-power range/validity checks
// stay in the handlers.
const playerIndexSchema = z.object({ playerIndex: z.number().int() }).passthrough();

// President's discard-the-peeked-policy ballot — always a boolean from the client (and
// the timer auto-votes with `Boolean(...)`).
const voteSchema = z.object({ vote: z.boolean() }).passthrough();

module.exports = { playerIndexSchema, voteSchema };
