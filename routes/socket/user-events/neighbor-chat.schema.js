const { z } = require("zod");

const muteNeighborChatSchema = z
  .object({
    gameUid: z.string().min(1).max(200),
    muted: z.boolean(),
  })
  .passthrough();
const reportNeighborChatSchema = z
  .object({
    gameUid: z.string().min(1).max(200),
    messageId: z.uuid(),
    comment: z.string().trim().min(1).max(140),
  })
  .passthrough();

module.exports = { muteNeighborChatSchema, reportNeighborChatSchema };
