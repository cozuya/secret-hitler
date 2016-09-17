const Account = require('../../models/account'),
	{games, userList, generalChats} = require('./models'),
	{secureGame} = require('./util');

module.exports.sendUserGameSettings = (socket, username) => {
	Account.findOne({username}, (err, account) => {
		if (err) {
			console.log(err);
		}

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
	});
};

module.exports.sendGameList = socket => {
	const formattedGames = games.map(game => ({
		kobk: game.kobk,
		time: game.time,
		name: game.name,
		gameState: game.gameState,
		roles: game.roles,
		seatedCount: Object.keys(game.seated).length,
		inProgress: game.gameState.isStarted,
		uid: game.uid
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
	const game = games.find(el => el.uid === uid);

	socket.join(uid);
	socket.emit('gameUpdate', secureGame(game));
};