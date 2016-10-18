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
		gameStatus: game.gameState.isCompleted ? 'isCompleted' : game.gameState.isStarted ? 'isStarted' : 'notStarted',
		seatedCount: game.seatedPlayers.length,
		minPlayersCount: game.general.minPlayersCount,
		maxPlayersCount: game.general.maxPlayersCount,
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
	const game = games.find(el => el.general.uid === uid);

	socket.join(uid);
	socket.emit('gameUpdate', secureGame(game));
};