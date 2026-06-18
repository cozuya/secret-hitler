const { z } = require("zod");

// Per-handler-file schema (mirrors the user-events convention): the vote/seat-index shapes recur
// across the sibling game schemas by design — kept local so each handler file stays self-contained,
// not dead duplication. See docs/zod-hardening-plan.md.

// Ja/Nein ballots — the client always emits a boolean (`index === 1`), and the timer
// auto-votes with `Boolean(...)`. Requiring a boolean object keeps a forged/empty
// payload from reaching the vote branches as some other type (or as a null deref).
const voteSchema = z.object({ vote: z.boolean() }).passthrough();

// Policy discard/enact picks — the client emits a small integer (0–2 for the president's
// discard, 1/3 for the chancellor's enact), and the timer forces an integer too.
// Requiring an integer stops type-confusion before the value indexes
// currentElectionPolicies / currentChancellorOptions / cardFlingerState.
const policySelectionSchema = z.object({ selection: z.number().int() }).passthrough();

module.exports = { voteSchema, policySelectionSchema };
