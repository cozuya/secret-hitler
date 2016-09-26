let generalChatCount = 0;

const {games, userList, generalChats} = require('./models'),
	{secureGame} = require('./util'),
	{sendGameList, sendGeneralChats, sendUserList} = require('./user-requests'),
	Game = require('../../models/game'),
	Account = require('../../models/account'),
	Generalchats = require('../../models/generalchats'),
	saveGame = game => {
		const gameToSave = new Game({
			uid: game.uid,
			time: game.time,
			date: new Date(),
			roles: game.roles,
			winningPlayers: game.internals.seatedPlayers.filter(player => player.wonGame).map(player => (
				{
					userName: player.userName,
					originalRole: player.originalRole,
					trueRole: player.trueRole
				}
			)),
			losingPlayers: game.internals.seatedPlayers.filter(player => !player.wonGame).map(player => (
				{
					userName: player.userName,
					originalRole: player.originalRole,
					trueRole: player.trueRole
				}
			)),
			reports: Object.keys(game.gameState.reportedGame).filter(seatNumber => game.gameState.reportedGame[seatNumber]).map(seatNumber => game.internals.seatedPlayers[seatNumber].userName),
			chats: game.chats.filter(chat => !chat.gameChat).map(chat => (
				{
					timestamp: chat.timestamp,
					chat: chat.chat,
					userName: chat.userName
				}
			)),
			kobk: game.kobk
		});

		gameToSave.save();
	},
	getInternalPlayerInGameByUserName = (game, userName) => game.internals.seatedPlayers.find(player => player.userName === userName),
	combineInProgressChats = (game, userName) => {
		let player;

		if (userName) {
			player = getInternalPlayerInGameByUserName(game, userName);
		}

		const gameChats = player ? player.gameChats : game.internals.unSeatedGameChats;

		return gameChats.concat(game.chats);
	},
	sendInProgressGameUpdate = game => { // todo-release make this accept a socket argument and emit only to it if it exists
		const seatedPlayerNames = Object.keys(game.seated).map(seat => game.seated[seat].userName);

		let roomSockets, playerSockets, observerSockets;

		if (io.sockets.adapter.rooms[game.uid]) {
			roomSockets = Object.keys(io.sockets.adapter.rooms[game.uid].sockets).map(sockedId => io.sockets.connected[sockedId]);

			playerSockets = roomSockets.filter(socket => socket.handshake.session.passport && Object.keys(socket.handshake.session.passport).length && seatedPlayerNames.includes(socket.handshake.session.passport.user));

			observerSockets = roomSockets.filter(socket => !socket.handshake.session.passport || !seatedPlayerNames.includes(socket.handshake.session.passport.user));
		}

		if (playerSockets) {
			playerSockets.forEach(sock => {
				const _game = Object.assign({}, game),
					{user} = sock.handshake.session.passport;

				if (!game.gameState.isCompleted) {
					_game.tableState = _game.internals.seatedPlayers.find(player => user === player.userName).tableState;
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
	},
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

module.exports.handleUpdatedReportGame = (socket, data) => {
	const game = games.find(el => el.uid === data.uid),
		seatNumber = parseInt(data.seatNumber, 10);

	if (game.gameState.reportedGame[seatNumber]) {
		game.gameState.reportedGame[seatNumber] = false;
	} else {
		game.gameState.reportedGame[seatNumber] = true;
	}

	sendInProgressGameUpdate(game);
};

module.exports.handleAddNewGame = (socket, data) => {
	data.private = {
		unSeatedGameChats: [],
		seatedPlayers: data.seatedPlayers
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
	const game = games.find(el => el.uid === data.uid);

	let completedGameLeftPlayerCount;

	if (game && io.sockets.adapter.rooms[game.uid]) {
		socket.leave(game.uid);
	}

	// todo-release for some reason when a player plays a game, it completes, leaves the table, and then comes back to the table, they don't have the private info from the game until there is a game update.

	if (game && game.gameState.isCompleted && data.seatNumber) {
		const playerSeat = Object.keys(game.seated).find(seatName => game.seated[seatName].userName === data.userName);

		game.seated[playerSeat].connected = false;

		completedGameLeftPlayerCount = Object.keys(game.seated).filter(seat => !game.seated[seat].connected).length;

		if (completedGameLeftPlayerCount === 7) {
			saveGame(game);
		}
	} else if (data.seatNumber && !game.gameState.isStarted) {
		delete game.seated[`seat${data.seatNumber}`];
	}

	if ((game && Object.keys(game.seated).length === 0) || completedGameLeftPlayerCount === 7) {
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
	const {passport} = socket.handshake.session;

	if (passport && Object.keys(passport).length) {
		const {user} = passport,
			{sockets} = io.sockets,
			game = games.find(game => game.seatedPlayers.find(player => player.userName === passport.user)),
			oldSocketID = Object.keys(sockets).find(socketID => ((sockets[socketID].handshake.session.passport && Object.keys(sockets[socketID].handshake.session.passport).length) && (sockets[socketID].handshake.session.passport.user === user && socketID !== socket.id)));

		if (oldSocketID && sockets[oldSocketID]) {
			sockets[oldSocketID].emit('manualDisconnection');
			delete sockets[oldSocketID];
		}

		if (game && game.gameState.isStarted && !game.gameState.isCompleted) {
			const internalPlayer = getInternalPlayerInGameByUserName(game, user)
				// ,
				// userSeatName = Object.keys(game.seated).find(seatName => game.seated[seatName].userName === user);
				;
			// game.seated[userSeatName].connected = true;
			socket.join(game.uid);
			socket.emit('updateSeatForUser', internalPlayer.seatNumber.toString());
			sendInProgressGameUpdate(game);
		}
	}

	sendUserList();
	sendGeneralChats(socket);
	sendGameList(socket);
};

module.exports.handleSocketDisconnect = handleSocketDisconnect;
module.exports.sendInProgressGameUpdate = sendInProgressGameUpdate;