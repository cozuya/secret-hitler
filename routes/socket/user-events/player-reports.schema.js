const { z } = require("zod");

// Replaces the inline regex guard in player-reports.js and the comment guard at
// routes.js (`playerReport` listener). `reason` is the canonical lowercase enum
// the handler switches on; `comment`/`reportedPlayer` are required so the handler's
// `.replace`/`.split` calls cannot throw.
const REPORT_REASONS = ["afk/leaving game", "abusive chat", "cheating", "gamethrowing", "stalling", "botting", "other"];

const playerReportSchema = z
  .object({
    reason: z.enum(REPORT_REASONS),
    comment: z.string().min(1).max(140), // matches the old routes.js length guard
    reportedPlayer: z.string().min(1), // guarantees data.reportedPlayer.split(' ') never throws
    uid: z.string().optional(),
    userName: z.string().optional(),
  })
  .passthrough();

module.exports = { playerReportSchema, REPORT_REASONS };
