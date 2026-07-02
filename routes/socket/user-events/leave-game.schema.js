const { z } = require("zod");

// Only `data.isRemake` is read (a truthy check). The schema just guarantees `data` is an
// object so that access can't throw; `isRemake` is intentionally left unconstrained so a
// forged value can never block a legitimate leave.
const leaveGameSchema = z.object({}).passthrough();

module.exports = { leaveGameSchema };
