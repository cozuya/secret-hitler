const { z } = require("zod");

// `flappyEvent` — the only client input during flappy is a flap intent. The acting user
// comes from the socket session (passport), never from the payload; the engine validates
// phase, seat, aliveness, and controller status on top of this shape check.
const flappyEventSchema = z.object({ uid: z.string(), type: z.literal("flap") }).passthrough();

module.exports = { flappyEventSchema };
