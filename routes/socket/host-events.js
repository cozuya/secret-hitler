const { userList } = require('./models');
const { sendGameList } = require('./user-requests');
const Account = require('../../models/account');
const { sendInProgressGameUpdate } = require('./util.js');
const { startCountdown, displayWaitingForPlayers } = require('./user-events');

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
 * @param {object} game - target game.
 * @param {object} data - from socket emit, userName = player to be kicked, blacklist = boolean set to true if function called in hostBlacklistPlayer()
 */
const hostKickPlayer = (game, data) => {
	// Authentication Assured in routes.js
	// Host Assured in routes.js

	if (game.gameState.isStarted) {
		return;
	}

	const playerKicked = game.publicPlayersState.find(player => player.userName === data.userName);

	if (playerKicked && playerKicked.userName !== game.general.host && !playerKicked.kicked) {
		const playerKickedIndex = game.publicPlayersState.findIndex(player => player.userName === data.userName);
		const msg = data.blacklist
			? `Host BLACKLISTED ${playerKicked.userName}`
			: `Host KICKED ${playerKicked.userName}. They will be unable to rejoin for 20 seconds`;
		game.chats.push({
			timestamp: Date.now(),
			hostChat: true,
			chat: [{ text: msg }]
		});

		// Save the time we kicked the player so we can prevent them from rejoining instantly
		game.general.kickedTimes[playerKicked.userName] = Date.now();

		game.publicPlayersState.splice(playerKickedIndex, 1);

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

	const host = userList.find(player => player.userName === passport.user);
	// Only run this if we are changing from non-rainbow to rainbow
	if (data.rainbowgame && !game.general.rainbowgame) {
		// Check if host is allowed to toggle rainbow
		if (host && host.wins + host.losses > 49) {
			game.general.rainbowgame = true;
			// Check each player and kick any not allowed in rainbow games
			for (let i = game.publicPlayersState.length - 1; i >= 0; i--) {
				const user = userList.find(player => player.userName === game.publicPlayersState[i].userName);
				if (user && user.wins + user.losses < 50) {
					hostKickPlayer(game, { userName: user.userName });
				}
			}
		}
	} else if (!data.rainbowgame) {
		game.general.rainbowgame = false;
	}

	if (typeof data.eloMinimum === 'number' && data.eloMinimum >= 1675 && data.eloMinimum <= host.eloSeason) {
		game.general.eloMinimum = data.eloMinimum;
		// Kick any players that don't meet minimum elo
		for (let i = game.publicPlayersState.length - 1; i >= 0; i--) {
			const user = userList.find(player => player.userName === game.publicPlayersState[i].userName);
			if (user && user.eloSeason < game.general.eloMinimum) {
				hostKickPlayer(game, { userName: user.userName });
			}
		}
	} else if (!data.eloMinimum) {
		game.general.eloMinimum = false;
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
