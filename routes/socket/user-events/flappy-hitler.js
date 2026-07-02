const { handleFlappyInput } = require('../game/flappy');

/**
 * @param {object} passport - socket authentication.
 * @param {object} game - game to act on.
 * @param {object} data - client input, expected shape { uid, type: 'flap' }.
 */
module.exports.handleFlappyEvent = (passport, game, data) => {
	handleFlappyInput(passport, game, data);
};
