const { z } = require("zod");
const { voteSchema } = require("./wire-schemas");

// Policy discard/enact picks — the client emits a small integer (0–2 for the president's discard, 1/3
// for the chancellor's enact), and the timer forces an integer too. `.min(0).max(3)` is a defense-in-
// depth boundary (3 is the highest valid value, the chancellor's enact); the per-context validity stays
// in the handler, before the value indexes currentElectionPolicies / currentChancellorOptions.
const policySelectionSchema = z.object({ selection: z.number().int().min(0).max(3) }).passthrough();

module.exports = { voteSchema, policySelectionSchema };
