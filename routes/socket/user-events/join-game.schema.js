const { z } = require("zod");

// Payload for the `updateSeatedUser` socket event (a user taking a seat in a game).
// `uid` identifies the game; `password` is only sent for private games and is compared
// with `===`, so it just needs to be a string when present.
const updateSeatedUserSchema = z
  .object({
    uid: z.string(),
    password: z.string().optional(),
  })
  .passthrough();

module.exports = { updateSeatedUserSchema };
