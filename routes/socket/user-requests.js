const Account = require('../../models/account'),
	{games, userList, generalChats} = require('./models'),
	{secureGame} = require('./util');

module.exports.sendUserGameSettings = (socket, username) => {
	Account.findOne({username})
		.then(account => {
			socket.emit('gameSettings', account.gameSettings);
			userList.push({
				userName: username,
				wins: account.wins,
				losses: account.losses
			});

			io.sockets.emit('userList', {
				list: userList,
				totalSockets: Object.keys(io.sockets.sockets).length
			});
		})
		.catch(err => {
			console.log(err);
		});
};

module.exports.sendGameList = socket => {
	const formattedGames = games.map(game => ({
		name: game.general.name,
		gameStatus: game.gameState.isCompleted ? game.gameState.isCompleted : game.gameState.isTracksFlipped ? 'isStarted' : 'notStarted',
		seatedCount: game.publicPlayersState.length,
		minPlayersCount: game.general.minPlayersCount,
		maxPlayersCount: game.general.maxPlayersCount,
		experiencedMode: game.general.experiencedMode,
		enactedLiberalPolicyCount: game.trackState.liberalPolicyCount,
		enactedFascistPolicyCount: game.trackState.fascistPolicyCount,
		electionCount: game.general.electionCount,
		uid: game.general.uid
	}));

	if (socket) {
		socket.emit('gameList', formattedGames);
	} else {
		io.sockets.emit('gameList', formattedGames);
	}
};

module.exports.sendGeneralChats = socket => {
	socket.emit('generalChats', generalChats);
};

module.exports.sendUserList = socket => {
	if (socket) {
		socket.emit('userList', {
			list: userList,
			totalSockets: Object.keys(io.sockets.sockets).length
		});
	} else {
		io.sockets.emit('userList', {
			list: userList,
			totalSockets: Object.keys(io.sockets.sockets).length
		});
	}
};

module.exports.sendGameInfo = (socket, uid) => {
	const game = games.find(el => el.general.uid === uid),
		{passport} = socket.handshake.session;

	if (game) {
		const _game = Object.assign({}, game);

		if (passport && Object.keys(passport).length && game.publicPlayersState.find(player => player.userName === passport.user)) {
			game.publicPlayersState.find(player => player.userName === passport.user).leftGame = false;
		}

		// todo-release - doesn't work right for players who left game and then comes back into the old game - no gamechats
		_game.chats = _game.chats.concat(_game.private.unSeatedGameChats);
		socket.join(uid);
		socket.emit('gameUpdate', secureGame(_game));
	}
};