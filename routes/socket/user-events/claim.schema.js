const { z } = require("zod");

// `claim` and `claimState` are switch discriminators in handleAddNewClaim; typing them
// as optional strings guarantees `data` is an object so the switches can't throw.
const claimSchema = z
  .object({
    claim: z.string().optional(),
    claimState: z.string().optional(),
  })
  .passthrough();

module.exports = { claimSchema };
