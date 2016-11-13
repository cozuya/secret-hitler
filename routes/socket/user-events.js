let generalChatCount = 0;

const {games, userList, generalChats} = require('./models'),
	{sendGameList, sendGeneralChats, sendUserList} = require('./user-requests'),
	Game = require('../../models/game'),
	Account = require('../../models/account'),
	Generalchats = require('../../models/generalchats'),
	saveGame = game => {
		const gameToSave = new Game({
			uid: game.general.uid,
			date: new Date(),
			winningPlayers: game.private.seatedPlayers.filter(player => player.wonGame).map(player => (
				{
					userName: player.userName,
					team: player.role.team,
					role: player.role.cardName
				}
			)),
			losingPlayers: game.private.seatedPlayers.filter(player => !player.wonGame).map(player => (
				{
					userName: player.userName,
					team: player.role.team,
					role: player.role.cardName
				}
			)),
			chats: game.chats.filter(chat => !chat.gameChat).map(chat => (
				{
					timestamp: chat.timestamp,
					chat: chat.chat,
					userName: chat.userName
				}
			)),
			winningTeam: game.gameState.isCompleted,
			playerCount: game.general.playerCount
		});

		gameToSave.save();
	},
	startGame = require('./game/start-game.js'),
	{secureGame} = require('./util.js'),
	{sendInProgressGameUpdate} = require('./util.js'),
	handleSocketDisconnect = socket => {
		const {passport} = socket.handshake.session;

		if (passport && Object.keys(passport).length) {
			const userIndex = userList.findIndex(user => user.userName === passport.user),
				game = games.find(game => game.publicPlayersState.find(player => player.userName === passport.user));

			socket.emit('manualDisconnection');
			if (userIndex !== -1) {
				userList.splice(userIndex, 1);
			} else {
				console.log('userIndex returned -1');
			}

			if (game) {
				const {gameState, publicPlayersState} = game,
					playerIndex = publicPlayersState.findIndex(player => player.userName === passport.user);

				if (gameState.isStarted && !gameState.isCompleted) {
					publicPlayersState[playerIndex].connected = false;
					sendInProgressGameUpdate(game);
				} else if (gameState.isCompleted && game.publicPlayersState.filter(player => !player.connected || player.leftGame).length === game.general.playerCount - 1) {
					saveGame(game);
					games.splice(games.indexOf(game), 1);
				} else if (publicPlayersState.length === 1) {
					games.splice(games.indexOf(game), 1);
				} else if (!gameState.isStarted) {
					publicPlayersState.splice(playerIndex, 1);
					io.sockets.in(game.uid).emit('gameUpdate', game);
				} else if (gameState.isCompleted) {
					publicPlayersState[playerIndex].leftGame = true;
					sendInProgressGameUpdate(game);
				}
				sendGameList();
			}
		}

		sendUserList();
	};

module.exports.updateSeatedUser = data => {
	const game = games.find(el => el.general.uid === data.uid);

	if (game) {
		const {publicPlayersState} = game;

		publicPlayersState.push({
			userName: data.userName,
			connected: true,
			isDead: false,
			cardStatus: {
				cardDisplayed: false,
				isFlipped: false,
				cardFront: 'secretrole',
				cardBack: {}
			}
		});

		if (publicPlayersState.length === game.general.maxPlayersCount && !game.gameState.isStarted) { // sloppy but not trivial to get around
			game.gameState.isStarted = true;
			startGame(game);
		} else if (publicPlayersState.length === game.general.minPlayersCount) {
			let startGamePause = 20;

			game.gameState.isStarted = true;
			const countDown = setInterval(() => {
				if (startGamePause === 4) {
					clearInterval(countDown);
					startGame(game);
				} else {
					game.general.status = `Game starts in ${startGamePause} second${startGamePause === 1 ? '' : 's'}.`;
					io.in(game.general.uid).emit('gameUpdate', secureGame(game));
				}
				startGamePause--;
			}, 1000);
		} else if (!game.gameState.isStarted) {
			const count = game.general.minPlayersCount - publicPlayersState.length;

			game.general.status = count === 1 ? `Waiting for ${count} more player..` : `Waiting for ${count} more players..`;
		}

		io.sockets.in(data.uid).emit('gameUpdate', secureGame(game));

		sendGameList();
	}
};

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

	if (game.gameState.isTracksFlipped) {
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
	Account.findOne({username: socket.handshake.session.passport.user})
		.then(account => {
			for (const setting in data) {
				account.gameSettings[setting] = data[setting];
			}

			account.save(() => {
				socket.emit('gameSettings', account.gameSettings);
			});
		})
		.catch(err => {
			console.log(err);
		});
};

module.exports.handleUserLeaveGame = (socket, data) => {
	const game = games.find(el => el.general.uid === data.uid);

	if (io.sockets.adapter.rooms[data.uid]) {
		socket.leave(data.uid);
	}

	if (game && game.gameState.isStarted && data.isSeated) {
		const playerIndex = game.private.seatedPlayers.findIndex(player => player.userName === data.userName);

		game.publicPlayersState[playerIndex].leftGame = true;

		if (game.publicPlayersState.filter(publicPlayer => publicPlayer.leftGame).length === game.general.playerCount) {
			if (game.gameState.isCompleted) {
				saveGame(game);
			}

			games.splice(games.indexOf(game), 1);
		}
	}

	if (game && data.isSeated && !game.gameState.isStarted) {
		game.publicPlayersState.splice(game.publicPlayersState.findIndex(player => player.userName === data.userName), 1);
	}

	if (game && !game.publicPlayersState.length) {
		io.sockets.in(data.uid).emit('gameUpdate', {});
		games.splice(games.indexOf(game), 1);
	} else if (game && game.gameState.isStarted) {
		sendInProgressGameUpdate(game);
	}

	socket.emit('gameUpdate', {}, data.isSettings);
	sendGameList();
};

module.exports.checkUserStatus = socket => {
	const {passport} = socket.handshake.session;

	if (passport && Object.keys(passport).length) {
		const {user} = passport,
			{sockets} = io.sockets,
			game = games.find(game => game.publicPlayersState.find(player => player.userName === user && !player.leftGame)),
			oldSocketID = Object.keys(sockets).find(socketID => ((sockets[socketID].handshake.session.passport && Object.keys(sockets[socketID].handshake.session.passport).length) && (sockets[socketID].handshake.session.passport.user === user && socketID !== socket.id)));

		if (oldSocketID && sockets[oldSocketID]) {
			sockets[oldSocketID].emit('manualDisconnection');
			delete sockets[oldSocketID];
		}

		if (game && game.gameState.isStarted && !game.gameState.isCompleted) {
			game.publicPlayersState.find(player => player.userName === user).connected = true;
			socket.join(game.general.uid);
			socket.emit('updateSeatForUser', true);
			sendInProgressGameUpdate(game);
		}
	}

	sendUserList();
	sendGeneralChats(socket);
	sendGameList(socket);
};

module.exports.handleSocketDisconnect = handleSocketDisconnect;