const { flappyEventSchema } = require("./flappy-hitler.schema");
const { handleFlappyInput } = require("../game/flappy");

/**
 * @param {object} passport - socket authentication.
 * @param {object} game - game to act on.
 * @param {object} data - client input, expected shape { uid, type: 'flap' }.
 */
module.exports.handleFlappyEvent = (passport, game, data) => {
  const parsed = flappyEventSchema.safeParse(data);
  if (!parsed.success) return;

  handleFlappyInput(passport, game, parsed.data);
};
