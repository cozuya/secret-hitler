module.exports.secureGame = game => {
	const _game = Object.assign({}, game);

	delete _game.private;
	return _game;
};