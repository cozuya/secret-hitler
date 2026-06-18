const { z } = require("zod");

// Opening a mod DM: `aemMember` is the AEM opening it (compared against passport.user),
// `userName` is the target player. Both are used in lookups and must be strings.
const openChatSchema = z
  .object({
    aemMember: z.string(),
    userName: z.string(),
  })
  .passthrough();

// A new mod-DM message — only `chat` comes off the wire.
const modDMChatSchema = z.object({ chat: z.string() }).passthrough();

module.exports = { openChatSchema, modDMChatSchema };
