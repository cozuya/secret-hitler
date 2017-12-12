const getPrivatePlayerInGameByUserName = (game, userName) => game.private.seatedPlayers.find(player => player.userName === userName);
const secureGame = game => {
	const _game = Object.assign({}, game);

	delete _game.private;
	return _game;
};

module.exports.sendInProgressGameUpdate = game => {
	// todo-release make this accept a socket argument and emit only to it if it exists
	const seatedPlayerNames = game.publicPlayersState.map(player => player.userName);
	const combineInProgressChats = (game, userName) => {
		let player;

		if (userName && game.gameState.isTracksFlipped) {
			player = getPrivatePlayerInGameByUserName(game, userName);
		}

		return player ? player.gameChats.concat(game.chats) : game.private.unSeatedGameChats.concat(game.chats);
	};

	let roomSockets;
	let playerSockets;
	let observerSockets;

	if (io.sockets.adapter.rooms[game.general.uid]) {
		roomSockets = Object.keys(io.sockets.adapter.rooms[game.general.uid].sockets).map(sockedId => io.sockets.connected[sockedId]);

		playerSockets = roomSockets.filter(
			socket =>
				socket &&
				socket.handshake.session.passport &&
				Object.keys(socket.handshake.session.passport).length &&
				seatedPlayerNames.includes(socket.handshake.session.passport.user)
		);

		observerSockets = roomSockets.filter(
			socket => (socket && !socket.handshake.session.passport) || (socket && !seatedPlayerNames.includes(socket.handshake.session.passport.user))
		);
	}

	if (playerSockets) {
		playerSockets.forEach(sock => {
			const _game = Object.assign({}, game);
			const { user } = sock.handshake.session.passport;

			if (!game.gameState.isCompleted && game.gameState.isTracksFlipped) {
				const privatePlayer = _game.private.seatedPlayers.find(player => user === player.userName);

				_game.playersState = privatePlayer.playersState;
				_game.cardFlingerState = privatePlayer.cardFlingerState || [];
			}

			_game.chats = combineInProgressChats(_game, user);
			sock.emit('gameUpdate', secureGame(_game));
		});
	}

	if (observerSockets) {
		observerSockets.forEach(sock => {
			const _game = Object.assign({}, game);

			_game.chats = combineInProgressChats(_game);
			sock.emit('gameUpdate', secureGame(_game));
		});
	}
};

module.exports.getPrivatePlayerInGameByUserName = getPrivatePlayerInGameByUserName;
module.exports.secureGame = secureGame;
