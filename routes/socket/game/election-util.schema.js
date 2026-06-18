const { z } = require("zod");

// Per-handler-file schema (mirrors the user-events convention): the seat-index shape recurs across
// the sibling game schemas by design — kept local so each handler file stays self-contained, not
// dead duplication. See docs/zod-hardening-plan.md.

// `chancellorIndex` is the nominated seat. The handler's bounds check
// (chancellorIndex >= playerCount || chancellorIndex < 0) only holds for numbers, so a
// forged non-integer (e.g. a string) would slip past it and reach
// publicPlayersState[chancellorIndex].isDead — an undefined deref that crashes the
// process. Require an integer here; the range check stays in the handler.
const selectChancellorSchema = z.object({ chancellorIndex: z.number().int() }).passthrough();

module.exports = { selectChancellorSchema };
