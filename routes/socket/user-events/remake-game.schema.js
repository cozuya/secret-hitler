const { z } = require("zod");

// `remakeStatus` is the vote toggle (true = vote to remake, false = rescind). Kept
// optional/permissive beyond requiring an object so a malformed value can't block a
// legitimate vote — it simply falls through the existing truthy/falsy branches.
const remakeSchema = z.object({ remakeStatus: z.boolean().optional() }).passthrough();

module.exports = { remakeSchema };
