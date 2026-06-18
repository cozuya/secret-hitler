const { z } = require("zod");

// Per-handler-file schema (mirrors the user-events convention): the seat-index shape recurs across
// the sibling game schemas by design — kept local so each handler file stays self-contained, not
// dead duplication. See docs/zod-hardening-plan.md.

// `playerIndex` is the seat Hitler clicked to assassinate; it indexes
// game.private.seatedPlayers and game.publicPlayersState. The client always emits a
// numeric seat index. Requiring an integer stops a forged non-numeric/missing value
// from reaching `seatedPlayers[playerIndex].role` — an undefined deref that throws
// synchronously and crashes the whole process. Range/validity stays in the handler.
const assassinateSchema = z.object({ playerIndex: z.number().int() }).passthrough();

module.exports = { assassinateSchema };
