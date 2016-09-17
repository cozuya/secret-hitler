module.exports.secureGame = game => {
	const _game = Object.assign({}, game);

	delete _game.internals;
	return _game;
};