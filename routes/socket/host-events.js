const { games, userList } = require('./models');
const { sendGameList, sendGameInfo } = require('./user-requests');
const Account = require('../../models/account');
const _ = require('lodash');
const { sendInProgressGameUpdate } = require('./util.js');
const { generateCombination } = require('gfycat-style-urls');
const { startCountdown, displayWaitingForPlayers, updateSeatedUser } = require('./user-events');

/**
 * @param {object} game - target game.
 */
module.exports.hostStartGame = game => {
	// Authentication Assured in routes.js
	// Host Assured in routes.js
	startCountdown(game);
};

/**
 * @param {object} game - target game.
 */
module.exports.hostCancelStart = game => {
	// Authentication Assured in routes.js
	// Host Assured in routes.js
	if (game.gameState.isStarted && !game.gameState.isTracksFlipped) {
		game.gameState.cancellStart = true;
	}
};

/**
 * @param {object} passport - socket authentication.
 * @param {object} game - target game.
 */
module.exports.hostRemake = (passport, game) => {
	// Authentication Assured in routes.js
	// Host Assured in routes.js

	if (game.general.isRemaking) {
		return;
	}

	game.general.isRemaking = true;

	const { publicPlayersState } = game;
	const newGame = _.cloneDeep(game);
	const remakePlayerNames = publicPlayersState.filter(player => !player.leftGame).map(player => player.userName);
	const remakePlayerSocketIDs = Object.keys(io.sockets.sockets).filter(
		socketId =>
			io.sockets.sockets[socketId].handshake.session.passport && remakePlayerNames.includes(io.sockets.sockets[socketId].handshake.session.passport.user)
	);

	newGame.gameState = {
		previousElectedGovernment: [],
		undrawnPolicyCount: 17,
		discardedPolicyCount: 0,
		presidentIndex: -1
	};

	newGame.chats = [];
	newGame.general.isRemaking = false;
	newGame.summarySaved = false;
	newGame.general.uid = generateCombination(2, '', true);
	newGame.general.electionCount = 0;
	newGame.timeCreated = new Date().getTime();
	newGame.publicPlayersState = game.publicPlayersState.filter(player => !player.leftGame).map(player => ({
		userName: player.userName,
		customCardback: player.customCardback,
		customCardbackUid: player.customCardbackUid,
		connected: player.connected,
		isRemakeVoting: false,
		cardStatus: {
			cardDisplayed: false,
			isFlipped: false,
			cardFront: 'secretrole',
			cardBack: {}
		}
	}));
	newGame.general.status = displayWaitingForPlayers(game);
	newGame.playersState = [];
	newGame.cardFlingerState = [];
	newGame.trackState = {
		liberalPolicyCount: 0,
		fascistPolicyCount: 0,
		electionTrackerCount: 0,
		enactedPolicies: []
	};
	newGame.private = {
		reports: {},
		unSeatedGameChats: [],
		lock: {},
		privatePassword: game.private.privatePassword
	};

	if (newGame.general.voiceGame) {
		newGame.chats.push({
			timestamp: Date.now(),
			gameChat: true,
			chat: [{ text: `This is a VOICE GAME. Join Discord or the host may kick you.` }]
		});
	}

	game.publicPlayersState.forEach((player, i) => {
		player.cardStatus.cardFront = 'secretrole';
		player.cardStatus.cardBack = game.private.seatedPlayers[i].role;
		player.cardStatus.cardDisplayed = true;
		player.cardStatus.isFlipped = true;
	});

	game.general.status = 'Game is being remade..';
	game.chats.push({
		timestamp: Date.now(),
		hostChat: true,
		chat: [{ text: `Host is REMAKING the game...` }]
	});

	if (!game.summarySaved) {
		const summary = game.private.summary.publish();
		if (summary && summary.toObject() && game.general.uid !== 'devgame' && !game.general.private) {
			summary.save();
			game.summarySaved = true;
		}
	}
	sendInProgressGameUpdate(game);

	setTimeout(() => {
		game.publicPlayersState.forEach(player => {
			if (remakePlayerNames.includes(player.userName)) player.leftGame = true;
		});

		games.splice(games.indexOf(game), 1);
		games.push(newGame);
		sendGameList();

		remakePlayerSocketIDs.forEach((id, index) => {
			if (io.sockets.sockets[id]) {
				io.sockets.sockets[id].leave(game.general.uid);
				sendGameInfo(io.sockets.sockets[id], newGame.general.uid);
				updateSeatedUser(io.sockets.sockets[id], passport, { uid: newGame.general.uid });
			}
		});
	}, 3000);
};

/**
 * @param {object} game - target game.
 * @param {object} data - from socket emit, userName = player to be kicked, blacklist = boolean set to true if function called in hostBlacklistPlayer()
 */
const hostKickPlayer = (game, data) => {
	// Authentication Assured in routes.js
	// Host Assured in routes.js

	if (game.gameState.isCompleted) {
		return;
	}

	const playerKicked = game.publicPlayersState.find(player => player.userName === data.userName);

	if (playerKicked && playerKicked.userName !== game.general.host && !playerKicked.kicked) {
		const currentTime = Date.now();
		const playerKickedIndex = game.publicPlayersState.findIndex(player => player.userName === data.userName);
		const msg = data.blacklist
			? `Host BLACKLISTED ${playerKicked.userName}`
			: `Host KICKED ${playerKicked.userName}. They will be unable to rejoin for 20 seconds`;
		game.chats.push({
			timestamp: currentTime,
			hostChat: true,
			chat: [{ text: msg }]
		});

		// Save the time we kicked the player so we can prevent them from rejoining instantly
		game.general.kickedTimes[playerKicked.userName] = currentTime;

		// If the game is in progress then just set their name, cardback etc. to empty strings, we will replace these when a new player takes the seat
		if (game.gameState.isTracksFlipped) {
			game.publicPlayersState[playerKickedIndex].leftGame = true;
			game.publicPlayersState[playerKickedIndex].kicked = true;
			game.publicPlayersState[playerKickedIndex].waitingForHostAccept = true; // used to prevent players immediately taking actions upon sitting without host first accepting them
			game.publicPlayersState[playerKickedIndex].userName = '';
			game.publicPlayersState[playerKickedIndex].customCardback = '';
			game.publicPlayersState[playerKickedIndex].customCardbackUid = '';
			game.publicPlayersState[playerKickedIndex].tournyWins = undefined;
			game.publicPlayersState[playerKickedIndex].previousSeasonAward = undefined;
			game.publicPlayersState[playerKickedIndex].staffDisableVisibleElo = undefined;
			game.publicPlayersState[playerKickedIndex].staffDisableStaffColor = undefined;

			game.private.seatedPlayers[playerKickedIndex].userName = '';
			game.gameState.waitingForReplacement = true;
			game.general.casualGame = true; // Don't rate games when a player is kicked mid-game

			game.chats.push({
				timestamp: currentTime,
				hostChat: true,
				chat: [{ text: `Waiting for replacement player..` }]
			});
		} else {
			// If the tracks haven't flipped yet then just remove the player
			game.publicPlayersState.splice(playerKickedIndex, 1);
			if (game.gameState.isStarted) {
				game.gameState.cancellStart = true;
			} else {
				game.general.status = displayWaitingForPlayers(game);
			}
		}
		// Send kicked player an emit so that isSeated is changed to false on their client (lets them see the Take a Seat button again)
		const affectedSocketId = Object.keys(io.sockets.sockets).find(
			socketId =>
				io.sockets.sockets[socketId].handshake.session.passport && io.sockets.sockets[socketId].handshake.session.passport.user === playerKicked.userName
		);
		if (io.sockets.sockets[affectedSocketId]) {
			io.sockets.sockets[affectedSocketId].emit('playerKicked');
		}
		sendInProgressGameUpdate(game);
		sendGameList();
	}
};

module.exports.hostKickPlayer = hostKickPlayer;

/**
 * @param {object} socket - user socket reference.
 * @param {object} game - target game.
 * @param {object} data - userName of player to blacklist from socket emit.
 */
module.exports.hostBlacklistPlayer = (socket, game, data) => {
	// Authentication Assured in routes.js
	// Host Assured in routes.js
	const { passport } = socket.handshake.session;
	const blacklistPlayer = data.userName;

	// Make sure we can't blacklist ourselves
	if (passport.user !== blacklistPlayer) {
		// Make sure the blacklistPlayer exists in the db
		Account.find({ username: blacklistPlayer }, { username: 1 })
			.limit(1)
			.then(cursor => {
				if (cursor.length > 0) {
					// Add the player to the hosts gameSettings blacklist
					Account.findOne({ username: passport.user }, { gameSettings: 1 })
						.then(account => {
							if (!account.gameSettings.blacklist.includes(blacklistPlayer)) {
								account.gameSettings.blacklist.push(blacklistPlayer);
								account.save(() => {
									socket.emit('gameSettings', account.gameSettings);
								});
							}
						})
						.catch(err => {
							console.log(err);
						});

					// Add the player to the current game blacklist
					game.general.hostBlacklist.push(data.userName);
					data.blacklist = true; // checked in hostKickPlayer() to change the chat message
					hostKickPlayer(game, data);
				}
			})
			.catch(err => {
				console.log(err);
			});
	}
};

/**
 * @param {object} socket - user socket reference.
 * @param {object} game - target game.
 * @param {object} data - userName of player to remove from blacklist from socket emit.
 */
module.exports.hostRemoveFromBlacklist = (socket, game, data) => {
	// Authentication Assured in routes.js
	// Host Assured in routes.js
	const { passport } = socket.handshake.session;
	const blacklistPlayer = data.userName;
	const gameBlacklistIndex = game.general.hostBlacklist.findIndex(player => player === blacklistPlayer);

	// Remove the player from the games current blacklist
	if (gameBlacklistIndex >= 0) {
		game.general.hostBlacklist.splice(gameBlacklistIndex, 1);
		sendInProgressGameUpdate(game);
	}

	// Remove the player from the hosts gamesettings blacklist
	Account.findOne({ username: passport.user }, { gameSettings: 1 }).then(account => {
		const settingsBlacklistIndex = account.gameSettings.blacklist.findIndex(player => player === blacklistPlayer);
		if (settingsBlacklistIndex >= 0) {
			account.gameSettings.blacklist.splice(settingsBlacklistIndex, 1);
			account.save(() => {
				socket.emit('gameSettings', account.gameSettings);
			});
		}
	});
};

/**
 * Host must call this function before players sitting down at in progress game are sent private game info or can take actions
 * Resumes the game (allows player actions) if no more players need the host to accept them
 *
 * @param {object} game - target game.
 * @param {object} data - seatIndex of player from socket emit.
 */
module.exports.hostAcceptPlayer = (game, data) => {
	// Authentication Assured in routes.js
	// Host Assured in routes.js
	if (game.publicPlayersState[data.seatIndex]) {
		game.publicPlayersState[data.seatIndex].waitingForHostAccept = false;
		game.chats.push({
			timestamp: Date.now(),
			hostChat: true,
			chat: [{ text: `Host has accepted ${game.publicPlayersState[data.seatIndex].userName} in seat {${data.seatIndex + 1}}` }]
		});
		sendInProgressGameUpdate(game);
		// If no other players need the host to accept them, start countdown to resume game
		if (!game.publicPlayersState.map(player => player.waitingForHostAccept).includes(true)) {
			let gamePause = 3;
			const countDown = setInterval(() => {
				// If the host kicks someone during countdown then just clear it and the game remains paused
				if (game.publicPlayersState.map(player => player.waitingForHostAccept).includes(true)) {
					clearInterval(countDown);
				} else {
					if (!gamePause) {
						clearInterval(countDown);
						game.gameState.waitingForReplacement = false;
						game.chats.push({
							timestamp: Date.now(),
							hostChat: true,
							chat: [{ text: `Game Resumed` }]
						});
						sendInProgressGameUpdate(game);
					} else {
						game.chats.push({
							timestamp: Date.now(),
							hostChat: true,
							chat: [{ text: `Resuming game in ${gamePause}` }]
						});

						sendInProgressGameUpdate(game);
						gamePause--;
					}
				}
			}, 1000);
		}
	}
};

/**
 * @param {object} passport - socket authentication.
 * @param {object} game - target game.
 * @param {object} data - game settings from client socket emit.
 */
module.exports.hostUpdateTableSettings = (passport, game, data) => {
	// Authentication Assured in routes.js
	// Host Assured in routes.js

	if (game.gameState.isStarted) {
		return;
	}

	if (typeof data.name === 'string' && data.name.length <= 20 && data.name !== '') {
		game.general.name = data.name;
	}

	if (typeof data.flag === 'string' && data.flag.length < 10) {
		game.general.flag = data.flag;
	}

	// Only run this if we are changing from non-rainbow to rainbow
	if (data.rainbowgame && !game.general.rainbowgame) {
		// Check if host is allowed to toggle rainbow
		const host = userList.find(player => player.userName === passport.user);
		if (host.wins + host.losses > 49) {
			game.general.rainbowgame = true;
			// Check each player and kick any not allowed in rainbow games
			for (let i = game.publicPlayersState.length - 1; i >= 0; i--) {
				const user = userList.find(player => player.userName === game.publicPlayersState[i].userName);
				if (user.wins + user.losses < 50) {
					hostKickPlayer(game, { userName: user.userName });
				}
			}
		}
	} else if (!data.rainbowgame) {
		game.general.rainbowgame = false;
	}

	// Make sure we run rainbow game kick check before this so that any non-rainbow players are kicked first before we check max player count
	if (typeof data.maxPlayersCount === 'number' && data.maxPlayersCount >= 5 && data.maxPlayersCount <= 10) {
		game.general.maxPlayersCount = data.maxPlayersCount;
		// Kick players who exceed the new max player count
		if (data.maxPlayersCount < game.publicPlayersState.length) {
			while (game.publicPlayersState.length > data.maxPlayersCount) {
				const index = data.maxPlayersCount;
				hostKickPlayer(game, { userName: game.publicPlayersState[index].userName });
			}
		}
	}

	if (typeof data.minPlayersCount === 'number' && data.minPlayersCount >= 5 && data.minPlayersCount <= 10) {
		game.general.minPlayersCount = data.minPlayersCount;
	}

	if (data.excludedPlayerCount.constructor === Array && data.excludedPlayerCount.length < 6) {
		game.general.excludedPlayerCount = [];
		data.excludedPlayerCount.forEach(val => {
			if (typeof val === 'number' && val >= 5 && val <= 10) {
				game.general.excludedPlayerCount.push(val);
			}
		});
	}

	if (data.voiceGame && !game.general.voiceGame) {
		game.chats.push({
			timestamp: Date.now(),
			gameChat: true,
			chat: [{ text: `This is a VOICE GAME. Join Discord or the host may kick you.` }]
		});
	}

	// Don't push data directly from client, just check it exists and then set boolean
	game.general.voiceGame = data.voiceGame ? true : false;
	game.general.experiencedMode = data.experiencedMode ? true : false;
	game.general.disableGamechat = data.disableGamechat ? true : false;
	game.general.blindMode = data.blindMode ? true : false;
	game.general.disableObserver = data.disableObserver ? true : false;
	game.general.rebalance6p = data.rebalance6p ? true : false;
	game.general.rebalance7p = data.rebalance7p ? true : false;
	game.general.rebalance9p = data.rebalance9p ? true : false;

	if (typeof data.timedMode === 'number' && data.timedMode >= 2 && data.timedMode <= 600) {
		game.general.timedMode = data.timedMode;
	} else {
		game.general.timedMode = false;
	}

	if (game.general.timedMode && game.general.timedMode < 30) {
		game.general.casualGame = true;
	} else {
		game.general.casualGame = data.casualGame ? true : false;
	}

	/**
	 * Check if we are adding a password or if we are turning private off
	 * Client will emit an empty string if they don't make changes to password with private enabled
	 * Empty string is neither data.private or === false, therefore this won't run and password stays the same
	 */
	if (data.private || data.private === false) {
		if (typeof data.private === 'string' && data.private.length <= 20) {
			game.private.privatePassword = data.private;
			game.general.private = true;
		} else {
			game.general.private = false;
		}
	}

	game.chats.push({
		timestamp: Date.now(),
		hostChat: true,
		chat: [{ text: 'Host has changed the SETTINGS' }]
	});

	game.general.status = displayWaitingForPlayers(game);
	sendInProgressGameUpdate(game);
	sendGameList();
};
