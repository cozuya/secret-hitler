let generalChatCount = 0;

const {games, userList, generalChats} = require('./models'),
	{sendGameList, sendGeneralChats, sendUserList} = require('./user-requests'),
	// Game = require('../../models/game'),
	Account = require('../../models/account'),
	Generalchats = require('../../models/generalchats'),
	// saveGame = game => {
	// 	const gameToSave = new Game({
	// 		uid: game.uid,
	// 		time: game.time,
	// 		date: new Date(),
	// 		roles: game.roles,
	// 		winningPlayers: game.internals.seatedPlayers.filter(player => player.wonGame).map(player => (
	// 			{
	// 				userName: player.userName,
	// 				originalRole: player.originalRole,
	// 				trueRole: player.trueRole
	// 			}
	// 		)),
	// 		losingPlayers: game.internals.seatedPlayers.filter(player => !player.wonGame).map(player => (
	// 			{
	// 				userName: player.userName,
	// 				originalRole: player.originalRole,
	// 				trueRole: player.trueRole
	// 			}
	// 		)),
	// 		reports: Object.keys(game.gameState.reportedGame).filter(seatNumber => game.gameState.reportedGame[seatNumber]).map(seatNumber => game.internals.seatedPlayers[seatNumber].userName),
	// 		chats: game.chats.filter(chat => !chat.gameChat).map(chat => (
	// 			{
	// 				timestamp: chat.timestamp,
	// 				chat: chat.chat,
	// 				userName: chat.userName
	// 			}
	// 		)),
	// 		kobk: game.kobk
	// 	});

	// 	gameToSave.save();
	// },
	startGame = require('./game/start-game.js'),
	{getPrivatePlayerInGameByUserName, secureGame} = require('./util.js'),
	{sendInProgressGameUpdate} = require('./util.js'),
	handleSocketDisconnect = socket => {
		const {passport} = socket.handshake.session;

		if (passport && Object.keys(passport).length) {
			const userIndex = userList.findIndex(user => user.userName === passport.user),
				game = games.find(game => game.seatedPlayers.find(player => player.userName === passport.user));

			socket.emit('manualDisconnection');
			if (userIndex !== -1) {
				userList.splice(userIndex, 1);
			} else {
				console.log('userIndex returned -1');
			}

			if (game) {
				// const seatNames = Object.keys(game.seated),
				// 	userSeatName = seatNames.find(seatName => game.seated[seatName].userName === passport.user),
				// 	{gameState} = game;

				// if (gameState.isStarted && !gameState.isCompleted) {
				// 	game.seated[userSeatName].connected = false;
				// 	sendInProgressGameUpdate(game);
				// } else if (gameState.isCompleted && Object.keys(game.seated).filter(seat => !game.seated[seat].connected).length === 6) {
				// 	saveGame(game);
				// 	games.splice(games.indexOf(game), 1);
				// } else if (seatNames.length === 1) {
				// 	games.splice(games.indexOf(game), 1);
				// } else if (!gameState.isStarted) {
				// 	// todo-release kick out observer sockets/route to default?
				// 	delete game.seated[userSeatName];
				// 	io.sockets.in(game.uid).emit('gameUpdate', game);
				// } else if (gameState.isCompleted) {
				// 	game.seated[userSeatName].connected = false;
				// 	sendInProgressGameUpdate(game);
				// }
				sendGameList();
			}
		}

		sendUserList();
	};

module.exports.updateSeatedUser = data => {
	const game = games.find(el => el.general.uid === data.uid),
		{seatedPlayers} = game;

	seatedPlayers.push({
		userName: data.userName,
		connected: true,
		gameChats: []
	});

	io.sockets.in(data.uid).emit('gameUpdate', secureGame(game));

	if (seatedPlayers.length === game.general.maxPlayersCount) {
		startGame(game);
	}

	// if (Object.keys(game.seated).length === 7) {
	// 	let startGamePause = 5;

	// 	game.gameState.isStarted = true;

	// 	Object.keys(game.seated).forEach((seat, index) => {
	// 		const userName = game.seated[`seat${index}`].userName;

	// 		game.internals.seatedPlayers[index].userName = userName;
	// 		game.internals.seatedPlayers[index].seatNumber = index;
	// 		game.internals.seatedPlayers[index].gameChats.push({
	// 			gameChat: true,
	// 			userName,
	// 			chat: [{text: 'The table is full and the game will begin.'}],
	// 			timestamp: new Date()
	// 		});
	// 	});

	// 	const countDown = setInterval(() => {
	// 		if (startGamePause === 0) {
	// 			clearInterval(countDown);
	// 			startGame(game);
	// 		} else {
	// 			game.status = `Game starts in ${startGamePause} second${startGamePause === 1 ? '' : 's'}.`;
	// 			sendInProgressGameUpdate(game);
	// 		}
	// 		startGamePause--;
	// 	}, 1000);
	// } else {
	// 	io.sockets.in(data.uid).emit('gameUpdate', secureGame(game));
	// }

	sendGameList();
};

// module.exports.handleUpdatedReportGame = (socket, data) => {
// 	const game = games.find(el => el.uid === data.uid),
// 		seatNumber = parseInt(data.seatNumber, 10);

// 	if (game.gameState.reportedGame[seatNumber]) {
// 		game.gameState.reportedGame[seatNumber] = false;
// 	} else {
// 		game.gameState.reportedGame[seatNumber] = true;
// 	}

// 	sendInProgressGameUpdate(game);
// };

module.exports.handleAddNewGame = (socket, data) => {
	data.private = {
		unSeatedGameChats: []
	};

	games.push(data);
	sendGameList();
	socket.join(data.general.uid);
};

module.exports.handleAddNewGameChat = data => {
	const game = games.find(el => el.general.uid === data.uid);

	data.timestamp = new Date();
	game.chats.push(data);

	if (game.gameState.isStarted) {
		sendInProgressGameUpdate(game);
	} else {
		io.in(data.uid).emit('gameUpdate', secureGame(game));
	}
};

module.exports.handleNewGeneralChat = data => {
	if (generalChatCount === 100) {
		const chats = new Generalchats({chats: generalChats});

		chats.save();
		generalChatCount = 0;
	}

	generalChatCount++;
	data.time = new Date();
	generalChats.push(data);

	if (generalChats.length > 99) {
		generalChats.shift();
	}

	io.sockets.emit('generalChats', generalChats);
};

module.exports.handleUpdatedGameSettings = (socket, data) => {
	Account.findOne({username: socket.handshake.session.passport.user}, (err, account) => {
		if (err) {
			console.log(err);
		}

		for (const setting in data) {
			account.gameSettings[setting] = data[setting];
		}

		account.save(() => {
			socket.emit('gameSettings', account.gameSettings);

			if (Object.keys(data)[0] === 'enableDarkTheme') {
				socket.emit('manualReload');
			}
		});
	});
};

module.exports.handleUserLeaveGame = (socket, data) => {
	const game = games.find(el => el.general.uid === data.uid);

	let completedGameLeftPlayerCount;

	if (game && io.sockets.adapter.rooms[game.uid]) {
		socket.leave(game.uid);
	}

	// if (game && game.gameState.isCompleted && data.seatNumber) {
		// const playerSeat = Object.keys(game.seated).find(seatName => game.seated[seatName].userName === data.userName);

		// game.seated[playerSeat].connected = false;

		// completedGameLeftPlayerCount = Object.keys(game.seated).filter(seat => !game.seated[seat].connected).length;

		// if (completedGameLeftPlayerCount === 7) {
		// 	saveGame(game);
		// }
	// }
	// else
	if (data.seatNumber && !game.gameState.isStarted) {
		// todo-alpha unstart min player countdown if 5th player leaves seat
		game.seatedPlayers.splice(game.seatedPlayers.findIndex(player => player.userName === data.userName), 1);
	}

	if (game && !game.seatedPlayers.length || completedGameLeftPlayerCount === 7) {
		socket.emit('gameUpdate', {}, data.isSettings);
		io.sockets.in(data.uid).emit('gameUpdate', {});
		games.splice(games.indexOf(game), 1);
	} else {
		io.sockets.in(data.uid).emit('gameUpdate', secureGame(game));
		socket.emit('gameUpdate', {}, data.isSettings);
	}

	sendGameList();
};

module.exports.checkUserStatus = socket => {
	// const {passport} = socket.handshake.session;

	// if (passport && Object.keys(passport).length) {
	// 	const {user} = passport,
	// 		{sockets} = io.sockets,
	// 		game = games.find(game => game.seatedPlayers.find(player => player.userName === passport.user)),
	// 		oldSocketID = Object.keys(sockets).find(socketID => ((sockets[socketID].handshake.session.passport && Object.keys(sockets[socketID].handshake.session.passport).length) && (sockets[socketID].handshake.session.passport.user === user && socketID !== socket.id)));

	// 	if (oldSocketID && sockets[oldSocketID]) {
	// 		sockets[oldSocketID].emit('manualDisconnection');
	// 		delete sockets[oldSocketID];
	// 	}

	// 	if (game && game.gameState.isStarted && !game.gameState.isCompleted) {
	// 		const internalPlayer = getPrivatePlayerInGameByUserName(game, user)
	// 			// ,
	// 			// userSeatName = Object.keys(game.seated).find(seatName => game.seated[seatName].userName === user);
	// 			;
	// 		// game.seated[userSeatName].connected = true;
	// 		socket.join(game.uid);
	// 		socket.emit('updateSeatForUser', internalPlayer.seatNumber.toString());
	// 		sendInProgressGameUpdate(game);
	// 	}
	// }

	sendUserList();
	sendGeneralChats(socket);
	sendGameList(socket);
};

module.exports.handleSocketDisconnect = handleSocketDisconnect;