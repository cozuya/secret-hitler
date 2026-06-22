const { z } = require("zod");

// Schemas for the two chat socket events. These handlers are `async`, so a non-string
// `data.chat` reaching `.trim()`/`.toLowerCase()`/`.split()` becomes an unhandled
// rejection and crashes the whole process. The schema guarantees `chat` is a string at
// entry; the handlers keep their own length/empty/anti-spam-regex content rules (those
// operate on trimmed values and differ between the two handlers, so they don't belong
// in a shared type schema).

// `addNewGeneralChat` — only `chat` comes off the wire; everything else is set server-side.
const generalChatSchema = z.object({ chat: z.string() }).passthrough();

// `addNewGameChat` — `chat` plus `uid` (used to build claim data; the game itself is
// already resolved from `uid` in routes.js before the handler runs).
const gameChatSchema = z.object({ chat: z.string(), uid: z.string().optional() }).passthrough();

module.exports = { generalChatSchema, gameChatSchema };
