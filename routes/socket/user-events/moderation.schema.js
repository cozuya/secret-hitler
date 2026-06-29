const { z } = require("zod");

/**
 * Schema for the `updateModAction` socket payload consumed by
 * `handleModerationAction` in moderation.js.
 *
 * Goal: stop malformed/malicious payloads from throwing a synchronous TypeError
 * inside the socket.io listener (which is not try/catch-wrapped and would take
 * down the whole process). `userName`, `ip`, and `comment` are coerced to safe
 * string defaults because the handler calls `.substr` / `.startsWith` / `.trim`
 * / `.length` on them without checking — see moderation.js:1015, 333, 461.
 *
 * `.passthrough()` is intentional for the initial rollout: validate types but
 * keep unknown keys so we never silently reject a legitimate mod-tool payload
 * we didn't enumerate. Tighten to `.strict()` once this has run in production.
 */

// `data.action` is `string | { type, isNonSeason? }` — see moderation.js:152, 1034, 1062.
const actionSchema = z.union([
  z.string(),
  z.object({ type: z.string(), isNonSeason: z.boolean().optional() }).passthrough(),
]);

const moderationActionSchema = z
  .object({
    userName: z.string().default(""), // guarantees .substr/.startsWith/.trim never throw
    username: z.string().optional(), // legacy lowercase, used only at moderation.js:458
    ip: z.string().default(""),
    comment: z.string().default(""), // guarantees .length/.trim never throw
    action: actionSchema.optional(),
    isReportResolveChange: z.boolean().optional(),
    _id: z.string().optional(),
    uid: z.string().optional(),
    modName: z.string().optional(),
    // Only the end-game action sends this; constrain it to a real team so a forged/garbage value
    // can't reach completeGame and rate every seated player as a losing fascist. Stays optional
    // because the other moderation actions sharing this schema don't send it.
    winningTeamName: z.enum(["liberal", "fascist"]).optional(),
    frontEndTime: z.number().optional(),
    isSticky: z.boolean().optional(),
  })
  .passthrough()
  // Every real client payload carries a string `action` except the report-resolve path
  // (which sends isReportResolveChange + _id). Rejecting an actionless non-report payload
  // here stops a forged one from reaching `data.action.type` in the handler.
  .refine((data) => Boolean(data.isReportResolveChange) || data.action !== undefined, {
    message: "action is required unless isReportResolveChange is set",
  });

module.exports = { moderationActionSchema };
