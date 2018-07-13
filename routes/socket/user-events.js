let generalChatCount = 0;

const { games, userList, generalChats, accountCreationDisabled, ipbansNotEnforced, gameCreationDisabled, currentSeasonNumber, newStaff } = require('./models');
const { sendGameList, sendGeneralChats, sendUserList, updateUserStatus, sendGameInfo, sendUserReports, sendPlayerNotes } = require('./user-requests');
const Account = require('../../models/account');
const Generalchats = require('../../models/generalchats');
const ModAction = require('../../models/modAction');
const PlayerReport = require('../../models/playerReport');
const BannedIP = require('../../models/bannedIP');
const Profile = require('../../models/profile/index');
const PlayerNote = require('../../models/playerNote');
const startGame = require('./game/start-game.js');
const { secureGame } = require('./util.js');
// const crypto = require('crypto');
const https = require('https');
const _ = require('lodash');
const { sendInProgressGameUpdate } = require('./util.js');
const animals = require('../../utils/animals');
const adjectives = require('../../utils/adjectives');
const version = require('../../version');
const { generateCombination } = require('gfycat-style-urls');
const { obfIP } = require('./ip-obf');
const { LEGALCHARACTERS } = require('../../src/frontend-scripts/constants');

/**
 * @param {object} game - game to act on.
 * @return {string} status text.
 */
const displayWaitingForPlayers = game => {
	if (game.general.isTourny) {
		const count = game.general.maxPlayersCount - game.general.tournyInfo.queuedPlayers.length;

		return count === 1 ? `Waiting for ${count} more player..` : `Waiting for ${count} more players..`;
	}
	const includedPlayerCounts = _.range(game.general.minPlayersCount, game.general.maxPlayersCount + 1).filter(
		value => !game.general.excludedPlayerCount.includes(value)
	);

	for (value of includedPlayerCounts) {
		if (value > game.publicPlayersState.length) {
			const count = value - game.publicPlayersState.length;

			return count === 1 ? `Waiting for ${count} more player..` : `Waiting for ${count} more players..`;
		} else {
			return `Waiting for host to start..`;
		}
	}
};

/**
 * @param {object} game - game to act on.
 */
const startCountdown = game => {
	if (game.gameState.isStarted) {
		return;
	}

	game.gameState.isStarted = true;
	let startGamePause = game.general.isTourny ? 5 : 10;

	const countDown = setInterval(() => {
		if (game.gameState.cancellStart) {
			game.gameState.cancellStart = false;
			game.gameState.isStarted = false;

			game.general.status = displayWaitingForPlayers(game);
			io.in(game.general.uid).emit('gameUpdate', secureGame(game));

			clearInterval(countDown);
		} else if (startGamePause === 3) {
			clearInterval(countDown);

			if (game.general.isTourny) {
				const { queuedPlayers } = game.general.tournyInfo;
				const players = _.shuffle(queuedPlayers);
				const gameA = _.cloneDeep(game);
				const APlayers = players.filter((player, index) => index < game.general.maxPlayersCount / 2);
				const BPlayers = players.filter(player => !APlayers.includes(player));
				const APlayerNames = APlayers.map(player => player.userName);
				const BPlayerNames = BPlayers.map(player => player.userName);
				const ASocketIds = Object.keys(io.sockets.sockets).filter(
					socketId =>
						io.sockets.sockets[socketId].handshake.session.passport && APlayerNames.includes(io.sockets.sockets[socketId].handshake.session.passport.user)
				);
				const BSocketIds = Object.keys(io.sockets.sockets).filter(
					socketId =>
						io.sockets.sockets[socketId].handshake.session.passport && BPlayerNames.includes(io.sockets.sockets[socketId].handshake.session.passport.user)
				);

				gameA.general.uid = `${game.general.uid}TableA`;
				gameA.general.minPlayersCount = gameA.general.maxPlayersCount = game.general.maxPlayersCount / 2;
				gameA.publicPlayersState = APlayers;

				const gameB = _.cloneDeep(gameA);
				gameB.general.uid = `${game.general.uid}TableB`;
				gameB.publicPlayersState = BPlayers;

				ASocketIds.forEach(id => {
					const socket = io.sockets.sockets[id];

					Object.keys(socket.rooms).forEach(roomUid => {
						socket.leave(roomUid);
					});
					socket.join(gameA.general.uid);
					socket.emit('joinGameRedirect', gameA.general.uid);
				});

				BSocketIds.forEach(id => {
					const socket = io.sockets.sockets[id];

					Object.keys(socket.rooms).forEach(roomUid => {
						socket.leave(roomUid);
					});
					socket.join(gameB.general.uid);
					socket.emit('joinGameRedirect', gameB.general.uid);
				});

				games.splice(games.indexOf(game), 1);
				gameA.general.tournyInfo.round = gameB.general.tournyInfo.round = 1;
				gameA.general.name = `${gameA.general.name}-tableA`;
				gameB.general.name = `${gameB.general.name}-tableB`;
				games.push(gameA, gameB);
				delete gameA.general.tournyInfo.queuedPlayers;
				delete gameB.general.tournyInfo.queuedPlayers;

				if (game.general.blindMode) {
					const _shuffledAdjectives = _.shuffle(adjectives);

					gameA.general.replacementNames = _.shuffle(animals)
						.slice(0, gameA.publicPlayersState.length)
						.map((animal, index) => `${_shuffledAdjectives[index].charAt(0).toUpperCase()}${_shuffledAdjectives[index].slice(1)} ${animal}`);

					gameB.general.replacementNames = _.shuffle(animals)
						.slice(0, gameB.publicPlayersState.length)
						.map((animal, index) => `${_shuffledAdjectives[index].charAt(0).toUpperCase()}${_shuffledAdjectives[index].slice(1)} ${animal}`);
				}

				startGame(gameA);
				startGame(gameB);
				sendGameList();
			} else {
				if (game.general.blindMode) {
					const _shuffledAdjectives = _.shuffle(adjectives);

					game.general.replacementNames = _.shuffle(animals)
						.slice(0, game.publicPlayersState.length)
						.map((animal, index) => `${_shuffledAdjectives[index].charAt(0).toUpperCase()}${_shuffledAdjectives[index].slice(1)} ${animal}`);
				}

				startGame(game);
			}
		} else {
			game.general.status = game.general.isTourny
				? `Tournament starts in ${startGamePause} second${startGamePause === 1 ? '' : 's'}.`
				: `Game starts in ${startGamePause} second${startGamePause === 1 ? '' : 's'}.`;
			io.in(game.general.uid).emit('gameUpdate', secureGame(game));
		}
		startGamePause--;
	}, 1000);
};

/**
 * @param {object} game - game to act on.
 */
// const checkStartConditions = game => {
// 	if (game.gameState.isTracksFlipped) {
// 		return;
// 	}

// 	if (game.electionCount !== 0) {
// 		game.electionCount = 0;
// 	}

// 	if (
// 		game.gameState.isStarted &&
// 		(game.publicPlayersState.length < game.general.minPlayersCount || game.general.excludedPlayerCount.includes(game.publicPlayersState.length))
// 	) {
// 		game.gameState.cancellStart = true;
// 		game.general.status = displayWaitingForPlayers(game);
// 	} else if (
// 		(!game.gameState.isStarted &&
// 			game.publicPlayersState.length >= game.general.minPlayersCount &&
// 			!game.general.excludedPlayerCount.includes(game.publicPlayersState.length)) ||
// 		(game.general.isTourny && game.general.tournyInfo.queuedPlayers.length === game.general.maxPlayersCount)
// 	) {
// 		startCountdown(game);
// 	} else if (!game.gameState.isStarted) {
// 		game.general.status = displayWaitingForPlayers(game);
// 	}
// };

/**
 * Called when a player leaves to check if we should transfer the host to another player
 *
 * @param {object} game - target game.
 * @param {number} playerIndex - target player.
 */
const checkTransferHost = (game, playerIndex) => {
	if (game.publicPlayersState[playerIndex].userName === game.general.host) {
		for (let i = 0; i < game.publicPlayersState.length; i++) {
			// Make sure the host we are transfering to is not the current player or a player who has left
			if (i !== playerIndex && !game.publicPlayersState[i].leftGame && !game.publicPlayersState[i].waitingForHostAccept) {
				game.general.host = game.publicPlayersState[i].userName;
				break;
			}
		}
		Account.findOne({ username: game.general.host }, { username: 1, 'gameSettings.blacklist': 1 })
			.then(account => {
				account.gameSettings.blacklist ? (game.general.hostBlacklist = account.gameSettings.blacklist) : (game.general.hostBlacklist = []);
				game.chats.push({
					timestamp: Date.now(),
					hostChat: true,
					chat: [{ text: `Host left the game. Host power has TRANSFERED to ${game.general.host}` }]
				});
				sendInProgressGameUpdate(game);
			})
			.catch(err => {
				console.log(err);
			});
	}
};

/**
 * @param {object} game - game to act on.
 * @param {string} playerName - name of player leaving pretourny.
 */
const playerLeavePretourny = (game, playerName) => {
	const { queuedPlayers } = game.general.tournyInfo;

	if (queuedPlayers.length === 1) {
		games.splice(games.indexOf(game), 1);
		return;
	}

	queuedPlayers.splice(queuedPlayers.findIndex(player => player.userName === playerName), 1);

	game.chats.push({
		timestamp: new Date(),
		gameChat: true,
		chat: [
			{
				text: playerName,
				type: 'player'
			},
			{
				text: ` (${queuedPlayers.length}/${game.general.maxPlayersCount}) has left the tournament queue.`
			}
		]
	});
	game.general.status = displayWaitingForPlayers(game);
	sendInProgressGameUpdate(game);
};

/**
 * @param {object} socket - user socket reference.
 */
const handleSocketDisconnect = socket => {
	const { passport } = socket.handshake.session;

	let listUpdate = false;
	if (passport && Object.keys(passport).length) {
		const userIndex = userList.findIndex(user => user.userName === passport.user);
		const gamesPlayerSeatedIn = games.filter(game => game.publicPlayersState.find(player => player.userName === passport.user && !player.leftGame));

		if (userIndex !== -1) {
			userList.splice(userIndex, 1);
			listUpdate = true;
		}

		if (gamesPlayerSeatedIn.length) {
			gamesPlayerSeatedIn.forEach(game => {
				const { gameState, publicPlayersState } = game;
				const playerIndex = publicPlayersState.findIndex(player => player.userName === passport.user);

				if (
					(!gameState.isStarted && publicPlayersState.length === 1) ||
					(gameState.isCompleted && game.publicPlayersState.filter(player => !player.connected || player.leftGame).length === game.general.playerCount - 1)
				) {
					games.splice(games.indexOf(game), 1);
				} else if (!gameState.isTracksFlipped && playerIndex > -1) {
					checkTransferHost(game, playerIndex);
					publicPlayersState.splice(playerIndex, 1);
					// checkStartConditions(game);
					if (game.gameState.isStarted) {
						game.gameState.cancellStart = true;
					} else {
						game.general.status = displayWaitingForPlayers(game);
						io.in(game.general.uid).emit('gameUpdate', secureGame(game));
					}
					// io.sockets.in(game.uid).emit('gameUpdate', game);
				} else if (gameState.isTracksFlipped) {
					publicPlayersState[playerIndex].connected = false;
					publicPlayersState[playerIndex].leftGame = true;
					checkTransferHost(game, playerIndex);
					sendInProgressGameUpdate(game);
					if (game.publicPlayersState.filter(publicPlayer => publicPlayer.leftGame).length === game.general.playerCount) {
						games.splice(games.indexOf(game), 1);
					}
				}
			});
			sendGameList();
			listUpdate = true;
		} else {
			const tournysPlayerQueuedIn = games.filter(
				game =>
					game.general.isTourny &&
					game.general.tournyInfo.queuedPlayers &&
					game.general.tournyInfo.queuedPlayers.map(player => player.userName).includes(passport.user)
			);

			tournysPlayerQueuedIn.forEach(game => {
				playerLeavePretourny(game, passport.user);
			});
		}
	}
	if (listUpdate) sendUserList();
};

const crashReport = JSON.stringify({
	content: `${process.env.DISCORDADMINPING} the site just crashed or reset.`
});

const crashOptions = {
	hostname: 'discordapp.com',
	path: process.env.DISCORDCRASHURL,
	method: 'POST',
	headers: {
		'Content-Type': 'application/json',
		'Content-Length': Buffer.byteLength(crashReport)
	}
};

if (process.env.NODE_ENV === 'production') {
	const crashReq = https.request(crashOptions);

	crashReq.end(crashReport);
}

/**
 * @param {object} socket - user socket reference.
 * @param {object} game - target game.
 * @param {object} data - from socket emit.
 * @param {object} passport - socket authentication.
 */
const handleUserLeaveGame = (socket, game, data, passport) => {
	// Authentication Assured in routes.js
	// In-game Assured in routes.js

	const playerIndex = game.publicPlayersState.findIndex(player => player.userName === passport.user);

	if (playerIndex > -1) {
		// if (game.publicPlayersState[playerIndex].isRemakeVoting) {
		// 	Count leaving the game as rescinded remake vote.
		// 	const minimumRemakeVoteCount = (() => {
		// 		switch (game.general.playerCount) {
		// 			case 5:
		// 				return 4;
		// 			case 6:
		// 				return 5;
		// 			case 7:
		// 				return 5;
		// 			case 8:
		// 				return 6;
		// 			case 9:
		// 				return 6;
		// 			case 10:
		// 				return 7;
		// 		}
		// 	})();
		// 	const remakePlayerCount = game.publicPlayersState.filter(player => player.isRemakeVoting).length;

		// 	if (game.general.isRemaking && remakePlayerCount <= minimumRemakeVoteCount) {
		// 		game.general.isRemaking = false;
		// 		game.general.status = 'Game remaking has been cancelled.';
		// 		clearInterval(game.private.remakeTimer);
		// 	}
		// 	const chat = {
		// 		timestamp: new Date(),
		// 		gameChat: true,
		// 		chat: [
		// 			{
		// 				text: 'A player'
		// 			}
		// 		]
		// 	};
		// 	chat.chat.push({
		// 		text: ` has left and rescinded their vote to ${game.general.isTourny ? 'cancel this tournament.' : 'remake this game.'} (${remakePlayerCount -
		// 			1}/${minimumRemakeVoteCount})`
		// 	});
		// 	game.chats.push(chat);
		// 	game.publicPlayersState[playerIndex].isRemakeVoting = false;
		// }
		if (game.gameState.isTracksFlipped) {
			game.publicPlayersState[playerIndex].leftGame = true;
		}
		if (game.publicPlayersState.filter(publicPlayer => publicPlayer.leftGame).length === game.general.playerCount) {
			games.splice(games.indexOf(game), 1);
		}
		checkTransferHost(game, playerIndex);
		if (!game.gameState.isTracksFlipped) {
			game.publicPlayersState.splice(game.publicPlayersState.findIndex(player => player.userName === passport.user), 1);
			// checkStartConditions(game);
			if (game.gameState.isStarted) {
				game.gameState.cancellStart = true;
			} else {
				game.general.status = displayWaitingForPlayers(game);
				io.sockets.in(data.uid).emit('gameUpdate', game);
			}
			// io.sockets.in(game.general.uid).emit('gameUpdate', game);
		}
	}

	if (
		game.general.isTourny &&
		game.general.tournyInfo.round === 0 &&
		passport &&
		game.general.tournyInfo.queuedPlayers.map(player => player.userName).find(name => name === passport.user)
	) {
		playerLeavePretourny(game, passport.user);
	}

	if (
		(!game.publicPlayersState.length && !(game.general.isTourny && game.general.tournyInfo.round === 0)) ||
		(game.general.isTourny && game.general.tournyInfo.round === 0 && !game.general.tournyInfo.queuedPlayers.length)
	) {
		io.sockets.in(game.general.uid).emit('gameUpdate', {});
		if (!game.summarySaved && game.gameState.isTracksFlipped) {
			const summary = game.private.summary.publish();
			if (summary && summary.toObject() && game.general.uid !== 'devgame' && !game.general.private) {
				summary.save();
				game.summarySaved = true;
			}
		}
		games.splice(games.indexOf(game), 1);
	} else if (game.gameState.isTracksFlipped) {
		sendInProgressGameUpdate(game);
	}

	if (!data.isRemake) {
		updateUserStatus(passport, null);
		socket.emit('gameUpdate', {});
	}
	sendGameList();
};

/**
 * @param {object} socket - user socket reference.
 * @param {object} data - from socket emit.
 */
module.exports.handleUpdatedPlayerNote = (socket, data) => {
	PlayerNote.findOne({ userName: data.userName, notedUser: data.notedUser }).then(note => {
		if (note) {
			note.note = data.note;
			note.save(() => {
				sendPlayerNotes(socket, { userName: data.userName, seatedPlayers: [data.notedUser] });
			});
		} else {
			const playerNote = new PlayerNote({
				userName: data.userName,
				notedUser: data.notedUser,
				note: data.note
			});

			playerNote.save(() => {
				sendPlayerNotes(socket, { userName: data.userName, seatedPlayers: [data.notedUser] });
			});
		}
	});
};
/**
 * @param {object} socket - user socket reference.
 * @param {object} passport - socket authentication.
 * @param {object} data - from socket emit.
 */
const updateSeatedUser = (socket, passport, data) => {
	// Authentication Assured in routes.js
	const game = games.find(el => el.general.uid === data.uid);

	if (game && (!game.gameState.isStarted || game.gameState.waitingForReplacement)) {
		Account.findOne({ username: passport.user }).then(account => {
			const isNotMaxedOut = game.publicPlayersState.length < game.general.maxPlayersCount;
			const isNotInGame = !game.publicPlayersState.find(player => player.userName === passport.user);
			const isRainbowSafe = !game.general.rainbowgame || (game.general.rainbowgame && account.wins + account.losses > 49);
			const isPrivateSafe =
				!game.general.private ||
				(game.general.private && (data.password === game.private.privatePassword || game.general.whitelistedPlayers.includes(passport.user)));
			const isBlacklistSafe = !game.general.hostBlacklist.includes(passport.user);
			const isKickedTimeoutSafe = !game.general.kickedPlayers.find(player => {
				if (player.userName === passport.user && Date.now() - player.timeKicked < 20000) {
					return player;
				}
			});
			if (isNotInGame && isRainbowSafe && isPrivateSafe && isBlacklistSafe && isKickedTimeoutSafe) {
				const { publicPlayersState } = game;
				const player = {
					userName: passport.user,
					connected: true,
					isDead: false,
					customCardback: account.gameSettings.customCardback,
					customCardbackUid: account.gameSettings.customCardbackUid,
					isPrivate: account.gameSettings.isPrivate,
					tournyWins: account.gameSettings.tournyWins,
					previousSeasonAward: account.gameSettings.previousSeasonAward,
					cardStatus: {
						cardDisplayed: false,
						isFlipped: false,
						cardFront: 'secretrole',
						cardBack: {}
					}
				};

				if (game.general.isTourny) {
					if (
						game.general.tournyInfo.queuedPlayers.map(player => player.userName).includes(player.userName) ||
						game.general.tournyInfo.queuedPlayers.length >= game.general.maxPlayersCount
					) {
						return;
					}
					game.general.tournyInfo.queuedPlayers.push(player);
					game.chats.push({
						timestamp: new Date(),
						gameChat: true,
						chat: [
							{
								text: `${passport.user}`,
								type: 'player'
							},
							{
								text: ` (${game.general.tournyInfo.queuedPlayers.length}/${game.general.maxPlayersCount}) has entered the tournament queue.`
							}
						]
					});
				} else {
					if (game.gameState.waitingForReplacement && publicPlayersState[data.seatIndex].kicked === true) {
						publicPlayersState[data.seatIndex].leftGame = false;
						publicPlayersState[data.seatIndex].kicked = false;
						publicPlayersState[data.seatIndex].userName = passport.user;
						publicPlayersState[data.seatIndex].customCardback = account.gameSettings.customCardback;
						publicPlayersState[data.seatIndex].customCardbackUid = account.gameSettings.customCardbackUid;
						game.private.seatedPlayers[data.seatIndex].userName = passport.user;
						if (
							(game.gameState.phase === 'selectingChancellor' && publicPlayersState[data.seatIndex].governmentStatus === 'isPendingPresident') ||
							(data.seatIndex === game.gameState.presidentIndex &&
								(game.gameState.phase === 'selectPartyMembershipInvestigate' ||
									game.gameState.phase === 'specialElection' ||
									game.gameState.phase === 'execution'))
						) {
							game.gameState.clickActionInfo[0] = passport.user;
						}
						game.chats.push({
							timestamp: Date.now(),
							hostChat: true,
							chat: [{ text: `${passport.user} is asking the host to sit in seat #${data.seatIndex + 1}` }]
						});
					} else if (!game.gameState.isStarted && isNotMaxedOut) {
						publicPlayersState.push(player);
						game.general.status = displayWaitingForPlayers(game);
					}
				}

				socket.emit('updateSeatForUser', true);
				updateUserStatus(passport, game);
				sendInProgressGameUpdate(game);
				sendGameList();
			}
		});
	}
};

module.exports.updateSeatedUser = updateSeatedUser;

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

	const { publicPlayersState } = game;
	const newGame = _.cloneDeep(game);
	const remakePlayerNames = publicPlayersState.filter(player => !player.leftGame).map(player => player.userName);
	const remakePlayerSocketIDs = Object.keys(io.sockets.sockets).filter(
		socketId =>
			io.sockets.sockets[socketId].handshake.session.passport && remakePlayerNames.includes(io.sockets.sockets[socketId].handshake.session.passport.user)
	);

	game.general.isRemaking = true;

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
 * @param {object} data - from socket emit.
 */
module.exports.hostKickPlayer = (game, data) => {
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
		const chat = {
			timestamp: currentTime,
			hostChat: true,
			chat: [{ text: msg }]
		};
		game.chats.push(chat);
		game.general.kickedPlayers.push({ userName: playerKicked.userName, timeKicked: currentTime });
		if (game.gameState.isTracksFlipped) {
			game.publicPlayersState[playerKickedIndex].leftGame = true;
			game.publicPlayersState[playerKickedIndex].kicked = true;
			game.publicPlayersState[playerKickedIndex].waitingForHostAccept = true; // used to prevent players immediately taking actions upon sitting without host first accepting them
			game.publicPlayersState[playerKickedIndex].userName = '';
			game.publicPlayersState[playerKickedIndex].customCardback = '';
			game.publicPlayersState[playerKickedIndex].customCardbackUid = '';
			game.private.seatedPlayers[playerKickedIndex].userName = '';
			game.gameState.waitingForReplacement = true;
			game.general.casualGame = true; // Don't rate games when a player is kicked mid-game

			game.chats.push({
				timestamp: currentTime,
				hostChat: true,
				chat: [{ text: `Waiting for replacement player..` }]
			});
		} else {
			game.publicPlayersState.splice(playerKickedIndex, 1);
			if (game.gameState.isStarted) {
				game.gameState.cancellStart = true;
			} else {
				game.general.status = displayWaitingForPlayers(game);
			}
		}
		// Send kicked player an emit so that isSeated is changed to false on their client.
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

/**
 * @param {object} socket - user socket reference.
 * @param {object} game - target game.
 * @param {object} data - from socket emit.
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
					// Update hosts gameSettings
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

					game.general.hostBlacklist.push(data.userName);
					data.blacklist = true; // checked in hostKickPlayer() to change the chat message
					module.exports.hostKickPlayer(game, data);
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
 * @param {object} data - from socket emit.
 */
module.exports.hostRemoveFromBlacklist = (socket, game, data) => {
	// Authentication Assured in routes.js
	// Host Assured in routes.js
	const { passport } = socket.handshake.session;
	const blacklistPlayer = data.userName;
	const gameBlacklistIndex = game.general.hostBlacklist.findIndex(player => player === blacklistPlayer);

	// Update the games current blacklist
	if (gameBlacklistIndex >= 0) {
		game.general.hostBlacklist.splice(gameBlacklistIndex, 1);
		sendInProgressGameUpdate(game);
	}

	// Update our gamesettings
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
 * @param {object} game - target game.
 * @param {object} data - from socket emit.
 */
module.exports.hostAcceptPlayer = (game, data) => {
	// Authentication Assured in routes.js
	// Host Assured in routes.js
	if (game.publicPlayersState[data.seatIndex]) {
		game.publicPlayersState[data.seatIndex].waitingForHostAccept = false;
		game.chats.push({
			timestamp: Date.now(),
			hostChat: true,
			chat: [{ text: `Host has accepted ${game.publicPlayersState[data.seatIndex].userName} in seat #${data.seatIndex + 1}` }]
		});
		sendInProgressGameUpdate(game);
		if (!game.publicPlayersState.map(player => player.waitingForHostAccept).includes(true)) {
			let gamePause = 3;
			const countDown = setInterval(() => {
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
 * @param {object} data - from socket emit.
 */
module.exports.hostUpdateTableSettings = (passport, game, data) => {
	// Authentication Assured in routes.js
	// Host Assured in routes.js
	const updateClients = () => {
		const chat = {
			timestamp: Date.now(),
			hostChat: true,
			chat: [{ text: 'Host has changed the SETTINGS' }]
		};
		game.chats.push(chat);
		game.general.status = displayWaitingForPlayers(game);
		sendInProgressGameUpdate(game);
		sendGameList();
	};

	if (game.gameState.isStarted) {
		return;
	}

	if (typeof data.name === 'string' && data.name.length <= 20 && data.name !== '') {
		game.general.name = data.name;
	}

	if (typeof data.flag === 'string' && data.flag.length < 10) {
		game.general.flag = data.flag;
	}

	if (typeof data.minPlayersCount === 'number' && data.minPlayersCount >= 5 && data.minPlayersCount <= 10) {
		game.general.minPlayersCount = data.minPlayersCount;
	}

	if (typeof data.maxPlayersCount === 'number' && data.maxPlayersCount >= 5 && data.maxPlayersCount <= 10) {
		game.general.maxPlayersCount = data.maxPlayersCount;
		// Kick players who exceed the new max player count
		if (data.maxPlayersCount < game.publicPlayersState.length) {
			while (game.publicPlayersState.length > data.maxPlayersCount) {
				const index = data.maxPlayersCount;
				module.exports.hostKickPlayer(game, { userName: game.publicPlayersState[index].userName });
			}
		}
	}

	if (data.excludedPlayerCount.constructor === Array && data.excludedPlayerCount.length < 6) {
		game.general.excludedPlayerCount = [];
		data.excludedPlayerCount.forEach(val => {
			if (typeof val === 'number' && val >= 5 && val <= 10) {
				game.general.excludedPlayerCount.push(val);
			}
		});
	}

	if (typeof data.experiencedMode === 'boolean') {
		game.general.experiencedMode = data.experiencedMode;
	}

	if (data.voiceGame && !game.general.voiceGame) {
		game.chats.push({
			timestamp: Date.now(),
			gameChat: true,
			chat: [{ text: `This is a VOICE GAME. Join Discord or the host may kick you.` }]
		});
	}

	if (typeof data.voiceGame === 'boolean') {
		game.general.voiceGame = data.voiceGame;
	}

	if (typeof data.disableGamechat === 'boolean') {
		game.general.disableGamechat = data.disableGamechat;
	}

	if (typeof data.blindMode === 'boolean') {
		game.general.blindMode = data.blindMode;
	}

	if (typeof data.disableObserver === 'boolean') {
		game.general.disableObserver = data.disableObserver;
	}

	game.general.timedMode = typeof data.timedMode === 'number' && data.timedMode >= 2 && data.timedMode <= 600 ? data.timedMode : false;

	game.general.casualGame = typeof data.timedMode === 'number' && data.timedMode < 30 && !data.casualGame ? true : data.casualGame;

	if (typeof data.rebalance6p === 'boolean') {
		game.general.rebalance6p = data.rebalance6p;
	}

	if (typeof data.rebalance7p === 'boolean') {
		game.general.rebalance7p = data.rebalance7p;
	}

	if (typeof data.rebalance9p === 'boolean') {
		game.general.rebalance9p = data.rebalance9p;
	}

	if (data.private || data.private === false) {
		if (typeof data.private === 'string' && data.private.length <= 20) {
			game.private.privatePassword = data.private;
			game.general.private = true;
		} else if (data.private === false) {
			game.general.private = false;
		}
	}

	if (data.rainbowgame && !game.general.rainbowgame) {
		// Only run this if we are changing from non-rainbow to rainbow
		Account.findOne({ username: passport.user }, { wins: 1, losses: 1 })
			.then(account => {
				game.general.rainbowgame = Boolean(account.wins + account.losses > 49);
				if (game.general.rainbowgame) {
					const promises = [];
					for (let i = game.publicPlayersState.length - 1; i >= 0; i--) {
						promises.push(
							Account.findOne({ username: game.publicPlayersState[i].userName }, { wins: 1, losses: 1 })
								.then(account => {
									// Kick any players who aren't rainbowSafe
									if (account.wins + account.losses < 50) {
										module.exports.hostKickPlayer(game, { userName: game.publicPlayersState[i].userName });
									}
								})
								.catch(err => {
									console.log(err);
								})
						);
					}
					Promise.all(promises)
						.then(updateClients)
						.catch(err => {
							console.log(err);
						});
				} else {
					updateClients();
				}
			})
			.catch(err => {
				console.log(err);
			});
	} else if (!data.rainbowgame) {
		game.general.rainbowgame = false;
		updateClients();
	} else {
		updateClients();
	}
};

/**
 * @param {object} socket - user socket reference.
 * @param {object} passport - socket authentication.
 * @param {object} data - from socket emit.
 */
module.exports.handleUpdatedBio = (socket, passport, data) => {
	// Authentication Assured in routes.js
	Account.findOne({ username: passport.user }).then(account => {
		account.bio = data;
		account.save();
	});
};

/**
 * @param {object} socket - user socket reference.
 * @param {object} passport - socket authentication.
 * @param {object} data - from socket emit.
 */
module.exports.handleAddNewGame = (socket, passport, data) => {
	// Authentication Assured in routes.js
	if (gameCreationDisabled.status) {
		return;
	}

	const user = userList.find(obj => obj.userName === passport.user);
	const currentTime = new Date();

	if (!user || currentTime - user.timeLastGameCreated < 8000) {
		// Check if !user here in case of bug where user doesn't appear on userList
		return;
	}

	// Make sure it exists
	if (!data) return;

	let a;
	let playerCounts = [];
	for (a = Math.max(data.minPlayersCount, 5); a <= Math.min(10, data.maxPlayersCount); a++) {
		if (!data.excludedPlayerCount.includes(a)) playerCounts.push(a);
	}
	if (playerCounts.length === 0) {
		// Someone is messing with the data, ignore it
		return;
	}

	let excludes = [];
	for (a = playerCounts[0]; a <= playerCounts[playerCounts.length - 1]; a++) {
		if (!playerCounts.includes(a)) excludes.push(a);
	}

	if (!data.gameName || data.gameName.length > 20 || !LEGALCHARACTERS(data.gameName)) {
		// Should be enforced on the client. Copy-pasting characters can get past the LEGALCHARACTERS client check.
		return;
	}

	if (data.eloSliderValue && user.eloSeason < data.eloSliderValue) {
		return;
	}

	const newGame = {
		gameState: {
			previousElectedGovernment: [],
			undrawnPolicyCount: 17,
			discardedPolicyCount: 0,
			presidentIndex: -1
		},
		chats: [],
		general: {
			whitelistedPlayers: [],
			uid: data.isTourny ? `${generateCombination(2, '', true)}Tournament` : generateCombination(2, '', true),
			name: user.isPrivate ? 'Private Game' : data.gameName ? data.gameName : 'New Game',
			flag: data.flag || 'none', // TODO: verify that the flag exists, or that an invalid flag does not cause issues
			minPlayersCount: playerCounts[0],
			gameCreatorName: user.userName,
			excludedPlayerCount: excludes,
			maxPlayersCount: playerCounts[playerCounts.length - 1],
			status: `Waiting for ${playerCounts[0] - 1} more players..`,
			experiencedMode: data.experiencedMode,
			voiceGame: data.voiceGame,
			isVerifiedOnly: data.isVerifiedOnly,
			disableObserver: data.disableObserver && !data.isTourny,
			// isTourny: data.isTourny, // temp
			isTourny: false,
			disableGamechat: data.disableGamechat,
			rainbowgame: user.wins + user.losses > 49 ? data.rainbowgame : false,
			blindMode: data.blindMode,
			timedMode: typeof data.timedMode === 'number' && data.timedMode >= 2 && data.timedMode <= 6000 ? data.timedMode : false,
			casualGame: typeof data.timedMode === 'number' && data.timedMode < 30 && !data.casualGame ? true : data.casualGame,
			rebalance6p: data.rebalance6p,
			rebalance7p: data.rebalance7p,
			rebalance9p: data.rebalance9p,
			private: user.isPrivate ? (data.privatePassword ? data.privatePassword : 'private') : data.privatePassword,
			privateOnly: user.isPrivate,
			electionCount: 0,
			eloMinimum: data.eloSliderValue,
			host: user.userName,
			hostBlacklist: user.blacklist,
			kickedPlayers: []
		},
		publicPlayersState: [],
		playersState: [],
		cardFlingerState: [],
		trackState: {
			liberalPolicyCount: 0,
			fascistPolicyCount: 0,
			electionTrackerCount: 0,
			enactedPolicies: []
		}
	};

	if (data.voiceGame) {
		newGame.chats.push({
			timestamp: currentTime,
			gameChat: true,
			chat: [{ text: `This is a VOICE GAME. Join Discord or the host may kick you.` }]
		});
	}

	if (data.isTourny) {
		newGame.general.tournyInfo = {
			round: 0,
			queuedPlayers: [
				{
					userName: user.userName,
					customCardback: user.customCardback,
					customCardbackUid: user.customCardbackUid,
					tournyWins: user.tournyWins,
					connected: true,
					cardStatus: {
						cardDisplayed: false,
						isFlipped: false,
						cardFront: 'secretrole',
						cardBack: {}
					}
				}
			]
		};
	} else {
		newGame.publicPlayersState = [
			{
				userName: user.userName,
				customCardback: user.customCardback,
				customCardbackUid: user.customCardbackUid,
				previousSeasonAward: user.previousSeasonAward,
				tournyWins: user.tournyWins,
				connected: true,
				isPrivate: user.isPrivate,
				cardStatus: {
					cardDisplayed: false,
					isFlipped: false,
					cardFront: 'secretrole',
					cardBack: {}
				}
			}
		];
	}

	if (data.isTourny) {
		const { minPlayersCount } = newGame.general;

		newGame.general.minPlayersCount = newGame.general.maxPlayersCount = minPlayersCount === 1 ? 14 : minPlayersCount === 2 ? 16 : 18;
		newGame.general.status = `Waiting for ${newGame.general.minPlayersCount - 1} more players..`;
		newGame.chats.push({
			timestamp: new Date(),
			gameChat: true,
			chat: [
				{
					text: `${user.userName}`,
					type: 'player'
				},
				{
					text: ` (${data.general.tournyInfo.queuedPlayers.length}/${data.general.maxPlayersCount}) has entered the tournament queue.`
				}
			]
		});
	}

	user.timeLastGameCreated = currentTime;

	Account.findOne({ username: user.userName }).then(account => {
		newGame.private = {
			reports: {},
			unSeatedGameChats: [],
			lock: {}
		};

		if (newGame.general.private) {
			newGame.private.privatePassword = newGame.general.private;
			newGame.general.private = true;
		}

		newGame.general.timeCreated = currentTime;
		updateUserStatus(passport, newGame);
		games.push(newGame);
		sendGameList();
		socket.join(newGame.general.uid);
		socket.emit('updateSeatForUser');
		socket.emit('gameUpdate', newGame);
		socket.emit('joinGameRedirect', newGame.general.uid);
	});
};

/**
 * @param {object} passport - socket authentication.
 * @param {object} game - target game.
 * @param {object} data - from socket emit.
 */
module.exports.handleAddNewClaim = (passport, game, data) => {
	if (!game.private || !game.private.summary) {
		return;
	}

	const playerIndex = game.publicPlayersState.findIndex(player => player.userName === passport.user);
	const { blindMode, replacementNames } = game.general;

	const chat = (() => {
		let text;

		switch (data.claim) {
			case 'wasPresident':
				text = [
					{
						text: 'President '
					},
					{
						text: blindMode ? `${replacementNames[playerIndex]} {${playerIndex + 1}} ` : `${passport.user} {${playerIndex + 1}} `,
						type: 'player'
					}
				];
				switch (data.claimState) {
					case 'threefascist':
						game.private.summary = game.private.summary.updateLog(
							{
								presidentClaim: { reds: 3, blues: 0 }
							},
							{ presidentId: playerIndex }
						);

						text.push(
							{
								text: 'claims '
							},
							{
								text: 'RRR',
								type: 'fascist'
							},
							{
								text: '.'
							}
						);

						return text;
					case 'twofascistoneliberal':
						game.private.summary = game.private.summary.updateLog(
							{
								presidentClaim: { reds: 2, blues: 1 }
							},
							{ presidentId: playerIndex }
						);

						text.push(
							{
								text: 'claims '
							},
							{
								text: 'RR',
								type: 'fascist'
							},
							{
								text: 'B',
								type: 'liberal'
							},
							{
								text: '.'
							}
						);

						return text;
					case 'twoliberalonefascist':
						game.private.summary = game.private.summary.updateLog(
							{
								presidentClaim: { reds: 1, blues: 2 }
							},
							{ presidentId: playerIndex }
						);

						text.push(
							{
								text: 'claims '
							},
							{
								text: 'R',
								type: 'fascist'
							},
							{
								text: 'BB',
								type: 'liberal'
							},
							{
								text: '.'
							}
						);

						return text;
					case 'threeliberal':
						game.private.summary = game.private.summary.updateLog(
							{
								presidentClaim: { reds: 0, blues: 3 }
							},
							{ presidentId: playerIndex }
						);

						text.push(
							{
								text: 'claims '
							},
							{
								text: 'BBB',
								type: 'liberal'
							},
							{
								text: '.'
							}
						);

						return text;
				}

			case 'wasChancellor':
				text = [
					{
						text: 'Chancellor '
					},
					{
						text: blindMode ? `${replacementNames[playerIndex]} {${playerIndex + 1}} ` : `${passport.user} {${playerIndex + 1}} `,
						type: 'player'
					}
				];
				switch (data.claimState) {
					case 'twofascist':
						game.private.summary = game.private.summary.updateLog(
							{
								chancellorClaim: { reds: 2, blues: 0 }
							},
							{ chancellorId: playerIndex }
						);

						text.push(
							{
								text: 'claims '
							},
							{
								text: 'RR',
								type: 'fascist'
							},
							{
								text: '.'
							}
						);

						return text;
					case 'onefascistoneliberal':
						game.private.summary = game.private.summary.updateLog(
							{
								chancellorClaim: { reds: 1, blues: 1 }
							},
							{ chancellorId: playerIndex }
						);

						text.push(
							{
								text: 'claims '
							},
							{
								text: 'R',
								type: 'fascist'
							},
							{
								text: 'B',
								type: 'liberal'
							},
							{
								text: '.'
							}
						);

						return text;
					case 'twoliberal':
						game.private.summary = game.private.summary.updateLog(
							{
								chancellorClaim: { reds: 0, blues: 2 }
							},
							{ chancellorId: playerIndex }
						);

						text.push(
							{
								text: 'claims '
							},
							{
								text: 'BB',
								type: 'liberal'
							},
							{
								text: '.'
							}
						);

						return text;
				}
			case 'didPolicyPeek':
				text = [
					{
						text: 'President '
					},
					{
						text: blindMode ? `${replacementNames[playerIndex]} {${playerIndex + 1}} ` : `${passport.user} {${playerIndex + 1}} `,
						type: 'player'
					}
				];
				switch (data.claimState) {
					case 'threefascist':
						game.private.summary = game.private.summary.updateLog(
							{
								policyPeekClaim: { reds: 3, blues: 0 }
							},
							{ presidentId: playerIndex }
						);

						text.push(
							{
								text: 'claims to have peeked at '
							},
							{
								text: 'RRR',
								type: 'fascist'
							},
							{
								text: '.'
							}
						);

						return text;
					case 'twofascistoneliberal':
						game.private.summary = game.private.summary.updateLog(
							{
								policyPeekClaim: { reds: 2, blues: 1 }
							},
							{ presidentId: playerIndex }
						);

						text.push(
							{
								text: 'claims to have peeked at '
							},
							{
								text: 'RR',
								type: 'fascist'
							},
							{
								text: 'B',
								type: 'liberal'
							},
							{
								text: '.'
							}
						);

						return text;
					case 'twoliberalonefascist':
						game.private.summary = game.private.summary.updateLog(
							{
								policyPeekClaim: { reds: 1, blues: 2 }
							},
							{ presidentId: playerIndex }
						);

						text.push(
							{
								text: 'claims to have peeked at '
							},
							{
								text: 'R',
								type: 'fascist'
							},
							{
								text: 'BB',
								type: 'liberal'
							},
							{
								text: '.'
							}
						);

						return text;
					case 'threeliberal':
						game.private.summary = game.private.summary.updateLog(
							{
								policyPeekClaim: { reds: 0, blues: 3 }
							},
							{ presidentId: playerIndex }
						);

						text.push(
							{
								text: 'claims to have peeked at '
							},
							{
								text: 'BBB',
								type: 'liberal'
							},
							{
								text: '.'
							}
						);

						return text;
				}
			case 'didInvestigateLoyalty':
				text = [
					{
						text: 'President '
					},
					{
						text: blindMode ? `${replacementNames[playerIndex]} {${playerIndex + 1}} ` : `${passport.user} {${playerIndex + 1}} `,
						type: 'player'
					},
					{
						text: 'claims to see a party membership of the '
					}
				];

				game.private.summary = game.private.summary.updateLog(
					{
						investigationClaim: data.claimState
					},
					{ presidentId: playerIndex }
				);
				switch (data.claimState) {
					case 'fascist':
						text.push(
							{
								text: 'fascist ',
								type: 'fascist'
							},
							{
								text: 'team.'
							}
						);

						return text;
					case 'liberal':
						text.push(
							{
								text: 'liberal ',
								type: 'liberal'
							},
							{
								text: 'team.'
							}
						);

						return text;
				}
		}
	})();

	if (
		Number.isInteger(playerIndex) &&
		game.private.seatedPlayers[playerIndex] &&
		game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim !== ''
	) {
		if (game.private.seatedPlayers[playerIndex]) {
			game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim = '';
		}

		const claimChat = {
			chat: chat,
			isClaim: true,
			timestamp: new Date(),
			uid: game.general.uid,
			userName: passport.user,
			claim: data.claim,
			claimState: data.claimState
		};

		game.chats.push(claimChat);
		sendInProgressGameUpdate(game);
	}
};

// /**
//  * @param {object} passport - socket authentication.
//  * @param {object} game - target game.
//  * @param {object} data - from socket emit.
//  */
// module.exports.handleUpdatedRemakeGame = (passport, game, data) => {
// 	if (game.general.isRemade) {
// 		return; // Games can only be remade once.
// 	}

// 	const remakeText = game.general.isTourny ? 'cancel' : 'remake';
// 	const { publicPlayersState } = game;
// 	const playerIndex = publicPlayersState.findIndex(player => player.userName === passport.user);
// 	const player = publicPlayersState[playerIndex];

// 	/**
// 	 * @return {number} minimum number of remake votes to remake a game
// 	 */
// 	const minimumRemakeVoteCount = (() => {
// 		switch (game.general.playerCount) {
// 			case 5:
// 				return 4;
// 			case 6:
// 				return 5;
// 			case 7:
// 				return 5;
// 			case 8:
// 				return 6;
// 			case 9:
// 				return 6;
// 			case 10:
// 				return 7;
// 		}
// 	})();
// 	const chat = {
// 		timestamp: new Date(),
// 		gameChat: true,
// 		chat: [
// 			{
// 				text: 'A player'
// 			}
// 		]
// 	};
// 	const makeNewGame = () => {
// 		const newGame = _.cloneDeep(game);
// 		const remakePlayerNames = publicPlayersState.filter(player => player.isRemaking).map(player => player.userName);
// 		const remakePlayerSocketIDs = Object.keys(io.sockets.sockets).filter(
// 			socketId =>
// 				io.sockets.sockets[socketId].handshake.session.passport && remakePlayerNames.includes(io.sockets.sockets[socketId].handshake.session.passport.user)
// 		);

// 		sendInProgressGameUpdate(game);

// 		newGame.gameState = {
// 			previousElectedGovernment: [],
// 			undrawnPolicyCount: 17,
// 			discardedPolicyCount: 0,
// 			presidentIndex: -1
// 		};

// 		newGame.chats = [];
// 		newGame.general.isRemade = false;
// 		newGame.general.isRemaking = false;
// 		newGame.summarySaved = false;
// 		newGame.general.uid = `${game.general.uid}Remake`;
// 		newGame.general.electionCount = 0;
// 		newGame.timeCreated = new Date().getTime();
// 		newGame.publicPlayersState = game.publicPlayersState.filter(player => player.isRemaking).map(player => ({
// 			userName: player.userName,
// 			customCardback: player.customCardback,
// 			customCardbackUid: player.customCardbackUid,
// 			connected: player.connected,
// 			isRemakeVoting: false,
// 			cardStatus: {
// 				cardDisplayed: false,
// 				isFlipped: false,
// 				cardFront: 'secretrole',
// 				cardBack: {}
// 			}
// 		}));
// 		newGame.playersState = [];
// 		newGame.cardFlingerState = [];
// 		newGame.trackState = {
// 			liberalPolicyCount: 0,
// 			fascistPolicyCount: 0,
// 			electionTrackerCount: 0,
// 			enactedPolicies: []
// 		};
// 		newGame.private = {
// 			reports: {},
// 			unSeatedGameChats: [],
// 			lock: {},
// 			privatePassword: game.private.privatePassword
// 		};

// 		game.publicPlayersState.forEach((player, i) => {
// 			player.cardStatus.cardFront = 'secretrole';
// 			player.cardStatus.cardBack = game.private.seatedPlayers[i].role;
// 			player.cardStatus.cardDisplayed = true;
// 			player.cardStatus.isFlipped = true;
// 		});

// 		game.general.status = 'Game is being remade..';
// 		if (!game.summarySaved) {
// 			const summary = game.private.summary.publish();
// 			if (summary && summary.toObject() && game.general.uid !== 'devgame' && !game.general.private) {
// 				summary.save();
// 				game.summarySaved = true;
// 			}
// 		}
// 		sendInProgressGameUpdate(game);

// 		setTimeout(() => {
// 			game.publicPlayersState.forEach(player => {
// 				if (remakePlayerNames.includes(player.userName)) player.leftGame = true;
// 			});

// 			if (game.publicPlayersState.filter(publicPlayer => publicPlayer.leftGame).length === game.general.playerCount) {
// 				games.splice(games.indexOf(game), 1);
// 			} else {
// 				sendInProgressGameUpdate(game);
// 			}

// 			games.push(newGame);
// 			sendGameList();

// 			remakePlayerSocketIDs.forEach((id, index) => {
// 				if (io.sockets.sockets[id]) {
// 					io.sockets.sockets[id].leave(game.general.uid);
// 					sendGameInfo(io.sockets.sockets[id], newGame.general.uid);
// 					updateSeatedUser(io.sockets.sockets[id], passport, { uid: newGame.general.uid });
// 					// handleUserLeaveGame(io.sockets.sockets[id], passport, game, {isSeated: true, isRemake: true});
// 				}
// 			});
// 			checkStartConditions(newGame);
// 		}, 3000);
// 	};

// 	/**
// 	 * @param {string} firstTableUid - the UID of the first tournament table
// 	 */
// 	const cancellTourny = firstTableUid => {
// 		const secondTableUid =
// 			firstTableUid.charAt(firstTableUid.length - 1) === 'A'
// 				? `${firstTableUid.slice(0, firstTableUid.length - 1)}B`
// 				: `${firstTableUid.slice(0, firstTableUid.length - 1)}A`;
// 		const secondTable = games.find(game => game.general.uid === secondTableUid);

// 		if (secondTable) {
// 			secondTable.general.tournyInfo.isCancelled = true;
// 			secondTable.chats.push({
// 				gameChat: true,
// 				timestamp: new Date(),
// 				chat: [
// 					{
// 						text: 'Due to the other tournament table voting for cancellation, this tournament has been cancelled.',
// 						type: 'hitler'
// 					}
// 				]
// 			});
// 			secondTable.general.status = 'Tournament has been cancelled.';
// 			sendInProgressGameUpdate(secondTable);
// 		}
// 	};

// 	if (!game || !player || !game.publicPlayersState) {
// 		return;
// 	}

// 	player.isRemakeVoting = data.remakeStatus;

// 	if (data.remakeStatus) {
// 		const remakePlayerCount = publicPlayersState.filter(player => player.isRemakeVoting).length;

// 		chat.chat.push({
// 			text: ` has voted to ${remakeText} this ${game.general.isTourny ? 'tournament.' : 'game.'} (${remakePlayerCount}/${minimumRemakeVoteCount})`
// 		});
// 		player.isRemaking = true;

// 		if (!game.general.isRemaking && publicPlayersState.length > 3 && remakePlayerCount >= minimumRemakeVoteCount) {
// 			game.general.isRemaking = true;
// 			game.general.remakeCount = 5;

// 			game.private.remakeTimer = setInterval(() => {
// 				if (game.general.remakeCount !== 0) {
// 					game.general.status = `Game is ${game.general.isTourny ? 'cancelled ' : 'remade'} in ${game.general.remakeCount} ${
// 						game.general.remakeCount === 1 ? 'second' : 'seconds'
// 					}.`;
// 					game.general.remakeCount--;
// 				} else {
// 					clearInterval(game.private.remakeTimer);
// 					game.general.status = `Game has been ${game.general.isTourny ? 'cancelled' : 'remade'}.`;
// 					game.general.isRemade = true;
// 					if (game.general.isTourny) {
// 						cancellTourny(game.general.uid);
// 					} else {
// 						makeNewGame();
// 					}
// 				}
// 				sendInProgressGameUpdate(game);
// 			}, 1000);
// 		}
// 	} else {
// 		const remakePlayerCount = publicPlayersState.filter(player => player.isRemakeVoting).length;

// 		if (game.general.isRemaking && remakePlayerCount <= minimumRemakeVoteCount) {
// 			game.general.isRemaking = false;
// 			game.general.status = 'Game remaking has been cancelled.';
// 			clearInterval(game.private.remakeTimer);
// 		}
// 		chat.chat.push({
// 			text: ` has rescinded their vote to ${
// 				game.general.isTourny ? 'cancel this tournament.' : 'remake this game.'
// 			} (${remakePlayerCount}/${minimumRemakeVoteCount})`
// 		});
// 	}
// 	game.chats.push(chat);

// 	sendInProgressGameUpdate(game);
// };

/**
 * @param {object} socket - socket reference.
 * @param {object} passport - socket authentication.
 * @param {object} data - from socket emit.
 * @param {array} modUserNames - list of mods
 * @param {array} editorUserNames - list of editors
 * @param {array} adminUserNames - list of admins
 */
module.exports.handleAddNewGameChat = (socket, passport, data, modUserNames, editorUserNames, adminUserNames) => {
	// Authentication Assured in routes.js
	const game = games.find(el => el.general.uid === data.uid);
	const { chat } = data;
	const staffUserNames = [...modUserNames, ...editorUserNames, ...adminUserNames];

	if (!chat.length > 300 || !chat.trim().length || !game) {
		return;
	}

	const { publicPlayersState } = game;
	const player = publicPlayersState.find(player => player.userName === passport.user);
	const user = userList.find(u => passport.user === u.userName);

	if (!user) {
		return;
	}

	if (!staffUserNames.includes(passport.user) && !newStaff.modUserNames.includes(passport.user) && !newStaff.editorUserNames.includes(passport.user)) {
		if (player) {
			if ((player.isDead && !game.gameState.isCompleted) || player.leftGame) {
				return;
			}
		} else {
			if (game.general.disableObserver || user.wins + user.losses < 2) {
				return;
			}
		}
	}

	const { gameState } = game;

	if (
		player &&
		((gameState.phase === 'presidentSelectingPolicy' || gameState.phase === 'chancellorSelectingPolicy') &&
			(publicPlayersState.find(play => play.userName === player.userName).governmentStatus === 'isPresident' ||
				publicPlayersState.find(play => play.userName === player.userName).governmentStatus === 'isChancellor'))
	) {
		return;
	}

	data.timestamp = new Date();

	const pinged = /^Ping(\d{1,2})/i.exec(chat);

	if (
		pinged &&
		player &&
		game.gameState.isStarted &&
		parseInt(pinged[1]) <= game.publicPlayersState.length &&
		(!player.pingTime || new Date().getTime() - player.pingTime > 180000)
	) {
		try {
			const affectedPlayerNumber = parseInt(pinged[1]) - 1;
			const affectedSocketId = Object.keys(io.sockets.sockets).find(
				socketId =>
					io.sockets.sockets[socketId].handshake.session.passport &&
					io.sockets.sockets[socketId].handshake.session.passport.user === game.publicPlayersState[affectedPlayerNumber].userName
			);

			player.pingTime = new Date().getTime();
			if (!io.sockets.sockets[affectedSocketId]) {
				return;
			}
			io.sockets.sockets[affectedSocketId].emit(
				'pingPlayer',
				game.general.blindMode ? 'Secret Hitler IO: A player has pinged you.' : `Secret Hitler IO: Player ${data.userName} just pinged you.`
			);

			game.chats.push({
				gameChat: true,
				userName: passport.user,
				timestamp: new Date(),
				chat: [
					{
						text: game.general.blindMode
							? `A player has pinged player number ${affectedPlayerNumber + 1}.`
							: `${passport.user} has pinged ${publicPlayersState[affectedPlayerNumber].userName} (${affectedPlayerNumber + 1}).`
					}
				],
				previousSeasonAward: user.previousSeasonAward,
				uid: data.uid,
				inProgress: game.gameState.isStarted
			});
			sendInProgressGameUpdate(game);
		} catch (e) {
			console.log(e, 'caught exception in ping chat');
		}
	} else if (!pinged) {
		const lastMessage = game.chats.filter(chat => !chat.gameChat && typeof chat.message === 'string' && chat.userName === user.userName).reduce(
			(acc, cur) => {
				return acc.timestamp > cur.timestamp ? acc : cur;
			},
			{ timestamp: new Date(0) }
		);

		if (lastMessage.chat) {
			let leniancy; // How much time (in seconds) must pass before allowing the message.
			if (lastMessage.chat.toLowerCase() === data.chat.toLowerCase()) leniancy = 1.5;
			else leniancy = 0.25;

			const timeSince = data.timestamp - lastMessage.timestamp;
			if (timeSince < leniancy * 1000) return; // Prior chat was too recent.
		}

		data.userName = passport.user;
		data.staffRole = (() => {
			if (modUserNames.includes(passport.user) || newStaff.modUserNames.includes(passport.user)) {
				return 'moderator';
			} else if (editorUserNames.includes(passport.user) || newStaff.editorUserNames.includes(passport.user)) {
				return 'editor';
			} else if (adminUserNames.includes(passport.user)) {
				return 'admin';
			}
		})();
		game.chats.push(data);

		if (game.gameState.isTracksFlipped) {
			sendInProgressGameUpdate(game);
		} else {
			io.in(data.uid).emit('gameUpdate', secureGame(game));
		}
	}
};

/**
 * @param {object} passport - socket authentication.
 * @param {object} game - target game.
 * @param {object} data - from socket emit.
 */
module.exports.handleUpdateWhitelist = (passport, game, data) => {
	const isPrivateSafe =
		!game.general.private ||
		(game.general.private && (data.password === game.private.privatePassword || game.general.whitelistedPlayers.includes(passport.user)));

	// Only update the whitelist if whitelistsed, has password, or is the creator
	if (isPrivateSafe || game.general.gameCreatorName === passport.user) {
		game.general.whitelistedPlayers = data.whitelistPlayers;
		io.in(data.uid).emit('gameUpdate', secureGame(game));
	}
};

/**
 * @param {object} socket - socket reference.
 * @param {object} passport - socket authentication.
 * @param {object} data - from socket emit.
 * @param {array} modUserNames - list of mods
 * @param {array} editorUserNames - list of editors
 * @param {array} adminUserNames - list of admins
 */
module.exports.handleNewGeneralChat = (socket, passport, data, modUserNames, editorUserNames, adminUserNames) => {
	const user = userList.find(u => u.userName === passport.user);

	if (data.chat.length > 300 || !data.chat.trim().length || !user || user.isPrivate) {
		return;
	}

	const curTime = new Date();
	const lastMessage = generalChats.list.filter(chat => chat.userName === user.userName).reduce(
		(acc, cur) => {
			return acc.time > cur.time ? acc : cur;
		},
		{ time: new Date(0) }
	);

	if (lastMessage.chat) {
		let leniancy; // How much time (in seconds) must pass before allowing the message.
		if (lastMessage.chat.toLowerCase() === data.chat.toLowerCase()) leniancy = 3;
		else leniancy = 0.5;

		const timeSince = curTime - lastMessage.time;
		if (timeSince < leniancy * 1000) return; // Prior chat was too recent.
	}

	if (generalChatCount === 100) {
		const chats = new Generalchats({ chats: generalChats.list });

		chats.save(() => {
			generalChatCount = 0;
		});
	}

	if (user.wins > 0 || user.losses > 0) {
		const getStaffRole = () => {
			if (modUserNames.includes(passport.user) || newStaff.modUserNames.includes(passport.user)) {
				return 'moderator';
			} else if (editorUserNames.includes(passport.user) || newStaff.editorUserNames.includes(passport.user)) {
				return 'editor';
			} else if (adminUserNames.includes(passport.user)) {
				return 'admin';
			}
			return '';
		};
		const newChat = {
			time: curTime,
			chat: data.chat,
			userName: passport.user,
			staffRole: getStaffRole()
		};
		generalChatCount++;
		generalChats.list.push(newChat);

		if (generalChats.list.length > 99) {
			generalChats.list.shift();
		}
		io.sockets.emit('generalChats', generalChats);
	}
};

/**
 * @param {object} socket - socket reference.
 * @param {object} passport - socket authentication.
 * @param {object} data - from socket emit.
 */
module.exports.handleUpdatedGameSettings = (socket, passport, data) => {
	// Authentication Assured in routes.js

	Account.findOne({ username: passport.user })
		.then(account => {
			const currentPrivate = account.gameSettings.isPrivate;

			for (const setting in data) {
				if (
					setting !== 'blacklist' ||
					(account.gameSettings.blacklist && account.gameSettings.blacklist.length < 10) ||
					(setting === 'staffDisableVisibleElo' && account.staffRole)
				) {
					account.gameSettings[setting] = data[setting];
				}
			}

			const user = userList.find(u => u.userName === passport.user);
			if (user) user.blacklist = account.gameSettings.blacklist;

			if (
				((data.isPrivate && !currentPrivate) || (!data.isPrivate && currentPrivate)) &&
				(!account.gameSettings.privateToggleTime || account.gameSettings.privateToggleTime < new Date().getTime() - 64800000)
			) {
				account.gameSettings.privateToggleTime = new Date().getTime();
				account.save(() => {
					socket.emit('manualDisconnection');
				});
			} else {
				account.save(() => {
					socket.emit('gameSettings', account.gameSettings);
				});
			}
		})
		.catch(err => {
			console.log(err);
		});
};

/**
 * @param {object} socket - socket reference.
 * @param {object} passport - socket authentication.
 * @param {object} data - from socket emit.
 * @param {boolean} skipCheck - true if there was an account lookup to find the IP
 * @param {array} modUserNames - list of usernames that are mods
 * @param {array} superModUserNames - list of usernames that are editors and admins
 */
module.exports.handleModerationAction = (socket, passport, data, skipCheck, modUserNames, superModUserNames) => {
	// Authentication Assured in routes.js
	if (data.userName) {
		data.userName = data.userName.trim();
	}

	if (!skipCheck && !data.isReportResolveChange) {
		if (!data.ip || data.ip === '') {
			if (data.userName && data.userName !== '') {
				if (data.userName.startsWith('-')) {
					try {
						data.ip = obfIP(data.userName.substring(1));
					} catch (e) {
						data.ip = '';
						console.log(e);
					}
				} else {
					// Try to find the IP from the account specified if possible.
					Account.findOne({ username: data.userName }, (err, account) => {
						if (err) console.log(err, 'err finding user');
						else if (account) data.ip = account.lastConnectedIP || account.signupIP;
						module.exports.handleModerationAction(socket, passport, data, true, modUserNames, superModUserNames);
					});
					return;
				}
			}
		} else {
			if (data.ip.startsWith('-')) {
				try {
					data.ip = obfIP(data.ip.substring(1));
				} catch (e) {
					data.ip = '';
					console.log(e);
				}
			} else {
				// Should never happen, so pass it back in with no IP.
				data.ip = '';
				module.exports.handleModerationAction(socket, passport, data, false, modUserNames, superModUserNames); // Note: Check is not skipped here, we want to still check the username.
				return;
			}
		}
	}

	if ((!data.ip || data.ip === '') && (data.action === 'timeOut' || data.action === 'ipban' || data.action === 'getIP')) {
		// Failed to get a relevant IP, abort the action since it needs one.
		socket.emit('sendAlert', 'That action requires a valid IP.');
		return;
	}

	const isSuperMod = superModUserNames.includes(passport.user) || newStaff.editorUserNames.includes(passport.user);

	const affectedSocketId = Object.keys(io.sockets.sockets).find(
		socketId => io.sockets.sockets[socketId].handshake.session.passport && io.sockets.sockets[socketId].handshake.session.passport.user === data.userName
	);

	if (
		modUserNames.includes(passport.user) ||
		superModUserNames.includes(passport.user) ||
		newStaff.modUserNames.includes(passport.user) ||
		newStaff.editorUserNames.includes(passport.user)
	) {
		if (data.isReportResolveChange) {
			PlayerReport.findOne({ _id: data._id })
				.then(report => {
					if (report) {
						report.isActive = !report.isActive;
						report.save(() => {
							sendUserReports(socket);
						});
					}
				})
				.catch(err => {
					console.log(err, 'err in finding player report');
				});
		} else {
			const modaction = new ModAction({
				date: new Date(),
				modUserName: passport.user,
				userActedOn: data.userName,
				modNotes: data.comment,
				ip: data.ip,
				actionTaken: typeof data.action === 'string' ? data.action : data.action.type
			});
			/**
			 * @param {string} username - name of user.
			 */
			const logOutUser = username => {
				const bannedUserlistIndex = userList.findIndex(user => user.userName === username);

				if (io.sockets.sockets[affectedSocketId]) {
					io.sockets.sockets[affectedSocketId].emit('manualDisconnection');
				}

				if (bannedUserlistIndex >= 0) {
					userList.splice(bannedUserlistIndex, 1);
				}
			};

			/**
			 * @param {string} username - name of user.
			 */
			const banAccount = username => {
				if (!isSuperMod) {
					Account.findOne({ username })
						.then(account => {
							if (account) {
								// account.hash = crypto.randomBytes(20).toString('hex');
								// account.salt = crypto.randomBytes(20).toString('hex');
								account.isBanned = true;
								account.save(() => {
									const bannedAccountGeneralChats = generalChats.list.filter(chat => chat.userName === username);

									bannedAccountGeneralChats.reverse().forEach(chat => {
										generalChats.list.splice(generalChats.list.indexOf(chat), 1);
									});
									logOutUser(username);
									io.sockets.emit('generalChats', generalChats);
								});
							}
						})
						.catch(err => {
							console.log(err, 'ban user err');
						});
				}
			};

			switch (data.action) {
				case 'setVerified':
					Account.findOne({ username: data.userName }).then(account => {
						if (account) {
							account.verified = true;
							account.verification.email = 'mod@VERIFIEDVIAMOD.info';
							account.save();
						} else socket.emit('sendAlert', `No account found with a matching username: ${data.userName}`);
					});
					break;

				case 'getIP':
					if (isSuperMod) {
						socket.emit('sendAlert', `Requested IP: ${data.ip}`);
					} else {
						socket.emit('sendAlert', 'Only editors and admins can request a raw IP.');
						return;
					}
					break;
				case 'deleteUser':
					if (isSuperMod) {
						Account.findOne({ username: data.userName }).remove(() => {
							if (io.sockets.sockets[affectedSocketId]) {
								io.sockets.sockets[affectedSocketId].emit('manualDisconnection');
							}
						});
					} else {
						socket.emit('sendAlert', 'Only editors and admins can delete users.');
						return;
					}
					break;
				case 'ban':
					banAccount(data.userName);
					break;
				case 'deleteBio':
					Account.findOne({ username: data.userName }).then(account => {
						if (account) {
							account.bio = '';
							account.save();
						} else socket.emit('sendAlert', `No account found with a matching username: ${data.userName}`);
					});
					break;
				case 'setSticky':
					generalChats.sticky = data.comment.trim().length ? `(${passport.user}) ${data.comment.trim()}` : '';
					io.sockets.emit('generalChats', generalChats);
					break;
				case 'broadcast':
					const discordBroadcastBody = JSON.stringify({
						content: `Text: ${data.comment}\nMod: ${passport.user}`
					});
					const discordBroadcastOptions = {
						hostname: 'discordapp.com',
						path: process.env.DISCORDBROADCASTURL,
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'Content-Length': Buffer.byteLength(discordBroadcastBody)
						}
					};
					try {
						const broadcastReq = https.request(discordBroadcastOptions);
						broadcastReq.end(discordBroadcastBody);
					} catch (e) {
						console.log(e, 'err in broadcast');
					}
					games.forEach(game => {
						game.chats.push({
							userName: `[BROADCAST] ${data.modName}`,
							chat: data.comment,
							isBroadcast: true,
							timestamp: new Date()
						});
					});
					generalChats.list.push({
						userName: `[BROADCAST] ${data.modName}`,
						time: new Date(),
						chat: data.comment,
						isBroadcast: true
					});

					if (data.isSticky) {
						generalChats.sticky = data.comment.trim().length ? `(${passport.user}) ${data.comment.trim()}` : '';
					}

					io.sockets.emit('generalChats', generalChats);
					break;
				case 'ipban':
					const ipban = new BannedIP({
						bannedDate: new Date(),
						type: 'small',
						ip: data.ip
					});

					ipban.save(() => {
						Account.find({ lastConnectedIP: data.ip }, function(err, users) {
							if (users && users.length > 0) {
								users.forEach(user => {
									if (isSuperMod) {
										banAccount(user.username);
									} else {
										logOutUser(user.username);
									}
								});
							}
						});
					});
					break;
				case 'timeOut':
					const timeout = new BannedIP({
						bannedDate: new Date(),
						type: 'small',
						ip: data.ip
					});
					timeout.save(() => {
						Account.find({ lastConnectedIP: data.ip }, function(err, users) {
							if (users && users.length > 0) {
								users.forEach(user => {
									logOutUser(user.username);
								});
							}
						});
					});
					break;
				case 'timeOut2':
					Account.findOne({ username: data.userName })
						.then(account => {
							if (account) {
								account.isTimeout = new Date();
								account.save(() => {
									logOutUser(data.userName);
								});
							} else {
								socket.emit('sendAlert', `No account found with a matching username: ${data.userName}`);
							}
						})
						.catch(err => {
							console.log(err, 'timeout2 user err');
						});
					break;
				case 'timeOut3':
					const timeout3 = new BannedIP({
						bannedDate: new Date(),
						type: 'tiny',
						ip: data.ip
					});
					timeout3.save(() => {
						Account.find({ lastConnectedIP: data.ip }, function(err, users) {
							if (users && users.length > 0) {
								users.forEach(user => {
									logOutUser(user.username);
								});
							}
						});
					});
					break;
				case 'togglePrivate':
					Account.findOne({ username: data.userName })
						.then(account => {
							if (account) {
								const { isPrivate } = account.gameSettings;

								account.gameSettings.isPrivate = !isPrivate;
								account.gameSettings.privateToggleTime = new Date().getTime();
								account.save(() => {
									logOutUser(data.userName);
								});
							} else {
								socket.emit('sendAlert', `No account found with a matching username: ${data.userName}`);
							}
						})
						.catch(err => {
							console.log(err, 'private convert user err');
						});
					break;
				case 'clearGenchat':
					generalChats.list = [];

					io.sockets.emit('generalChats', generalChats);
					break;
				case 'deleteProfile':
					if (isSuperMod) {
						Profile.findOne({ _id: data.userName })
							.remove(() => {
								if (io.sockets.sockets[affectedSocketId]) {
									io.sockets.sockets[affectedSocketId].emit('manualDisconnection');
								}
							})
							.catch(err => {
								console.log(err);
							});
					} else {
						socket.emit('sendAlert', 'Only editors and admins can delete profiles.');
						return;
					}
					break;
				case 'ipbanlarge':
					const ipbanl = new BannedIP({
						bannedDate: new Date(),
						type: 'big',
						ip: data.ip
					});

					if (isSuperMod) {
						ipbanl.save(() => {
							Account.find({ lastConnectedIP: data.ip }, function(err, users) {
								if (users && users.length > 0) {
									users.forEach(user => {
										banAccount(user.username);
									});
								}
							});
						});
					} else {
						socket.emit('sendAlert', 'Only editors and admins can perform large IP bans.');
						return;
					}
					break;
				case 'deleteCardback':
					Account.findOne({ username: data.userName })
						.then(account => {
							if (account) {
								account.gameSettings.customCardback = '';

								account.save(() => {
									if (io.sockets.sockets[affectedSocketId]) {
										io.sockets.sockets[affectedSocketId].emit('manualDisconnection');
									}
								});
							} else {
								socket.emit('sendAlert', `No account found with a matching username: ${data.userName}`);
							}
						})
						.catch(err => {
							console.log(err);
						});
					break;
				case 'disableAccountCreation':
					accountCreationDisabled.status = true;
					break;
				case 'enableAccountCreation':
					accountCreationDisabled.status = false;
					break;
				case 'disableIpbans':
					ipbansNotEnforced.status = true;
					break;
				case 'enableIpbans':
					ipbansNotEnforced.status = false;
					break;
				case 'disableGameCreation':
					gameCreationDisabled.status = true;
					break;
				case 'enableGameCreation':
					gameCreationDisabled.status = false;
					break;
				case 'removeStaffRole':
					if (isSuperMod) {
						Account.findOne({ username: data.userName })
							.then(account => {
								if (account) {
									account.staffRole = '';
									account.save(() => {
										if (newStaff.modUserNames.includes(account.username)) {
											newStaff.modUserNames.splice(indexOf(newStaff.modUserNames.find(name => account.username)), 1);
										}
										if (io.sockets.sockets[affectedSocketId]) {
											io.sockets.sockets[affectedSocketId].emit('manualDisconnection');
										}
									});
								} else {
									socket.emit('sendAlert', `No account found with a matching username: ${data.userName}`);
								}
							})
							.catch(err => {
								console.log(err);
							});
					}
					break;
				case 'promoteToMod':
					if (isSuperMod) {
						Account.findOne({ username: data.userName })
							.then(account => {
								if (account) {
									account.staffRole = 'moderator';
									account.save(() => {
										newStaff.modUserNames.push(account.username);

										if (io.sockets.sockets[affectedSocketId]) {
											io.sockets.sockets[affectedSocketId].emit('manualDisconnection');
										}
									});
								} else {
									socket.emit('sendAlert', `No account found with a matching username: ${data.userName}`);
								}
							})
							.catch(err => {
								console.log(err);
							});
					}
					break;

				case 'promoteToEditor':
					if (isSuperMod) {
						Account.findOne({ username: data.userName })
							.then(account => {
								if (account) {
									account.staffRole = 'editor';
									account.save(() => {
										newStaff.editorUserNames.push(account.username);

										if (io.sockets.sockets[affectedSocketId]) {
											io.sockets.sockets[affectedSocketId].emit('manualDisconnection');
										}
									});
								} else {
									socket.emit('sendAlert', `No account found with a matching username: ${data.userName}`);
								}
							})
							.catch(err => {
								console.log(err);
							});
					}
					break;
				case 'resetServer':
					if (isSuperMod) {
						console.log('server crashing manually via mod action');
						const crashReport = JSON.stringify({
							content: `${process.env.DISCORDADMINPING} the site was just reset manually by an admin or editor.`
						});

						const crashOptions = {
							hostname: 'discordapp.com',
							path: process.env.DISCORDCRASHURL,
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								'Content-Length': Buffer.byteLength(crashReport)
							}
						};

						if (process.env.NODE_ENV === 'production') {
							const crashReq = https.request(crashOptions);

							crashReq.end(crashReport);
						}
						crashServer();
					} else {
						socket.emit('sendAlert', 'Only editors and admins can restart the server.');
						return;
					}
					break;
				default:
					if (data.userName.substr(0, 7) === 'DELGAME') {
						const game = games.find(el => el.general.uid === data.userName.slice(7));

						if (game) {
							games.splice(games.indexOf(game), 1);
							game.publicPlayersState.forEach(player => (player.leftGame = true)); // Causes timed games to stop.
							sendGameList();
						}
					} else if (isSuperMod && data.action.type) {
						const setType = /setRWins/.test(data.action.type)
							? 'rainbowWins'
							: /setRLosses/.test(data.action.type)
								? 'rainbowLosses'
								: /setWins/.test(data.action.type)
									? 'wins'
									: 'losses';
						const number =
							setType === 'wins'
								? data.action.type.substr(7)
								: setType === 'losses'
									? data.action.type.substr(9)
									: setType === 'rainbowWins'
										? data.action.type.substr(8)
										: data.action.type.substr(10);
						const isPlusOrMinus = number.charAt(0) === '+' || number.charAt(0) === '-';

						if (!isNaN(parseInt(number, 10)) || isPlusOrMinus) {
							Account.findOne({ username: data.userName })
								.then(account => {
									if (account) {
										account[setType] = isPlusOrMinus
											? number.charAt(0) === '+'
												? account[setType] + parseInt(number.substr(1, number.length))
												: account[setType] - parseInt(number.substr(1, number.length))
											: parseInt(number);

										if (!data.action.isNonSeason) {
											account[`${setType}Season${currentSeasonNumber}`] = isPlusOrMinus
												? account[`${setType}Season${currentSeasonNumber}`]
													? number.charAt(0) === '+'
														? account[`${setType}Season${currentSeasonNumber}`] + parseInt(number.substr(1, number.length))
														: account[`${setType}Season${currentSeasonNumber}`] - parseInt(number.substr(1, number.length))
													: parseInt(number.substr(1, number.length))
												: parseInt(number);
										}
										account.save();
									} else socket.emit('sendAlert', `No account found with a matching username: ${data.userName}`);
								})
								.catch(err => {
									console.log(err, 'set wins/losses error');
								});
						}
					}
			}
			modaction.save();
		}
	}
};

/**
 * @param {object} passport - socket authentication.
 * @param {object} data - from socket emit.
 */
module.exports.handlePlayerReport = (passport, data) => {
	const user = userList.find(u => data.userName === passport.user);

	if (data.userName !== 'from replay' && (!user || user.wins + user.losses < 2)) {
		return;
	}

	const playerReport = new PlayerReport({
		date: new Date(),
		gameUid: data.uid,
		reportingPlayer: passport.user,
		reportedPlayer: data.reportedPlayer,
		reason: data.reason,
		gameType: data.gameType,
		comment: data.comment,
		isActive: true
	});
	const body = JSON.stringify({
		content: `Game UID: https://secrethitler.io/game/#/table/${data.uid}\nReported player: ${data.reportedPlayer}\nReason: ${data.reason}\nComment: ${
			data.comment
		}`
	});

	const options = {
		hostname: 'discordapp.com',
		path: process.env.DISCORDURL,
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Content-Length': Buffer.byteLength(body)
		}
	};

	const game = games.find(el => el.general.uid === data.uid);
	if (game) {
		if (!game.reportCounts) game.reportCounts = {};
		if (!game.reportCounts[passport.user]) game.reportCounts[passport.user] = 0;
		if (game.reportCounts[passport.user] >= 4) return;
		game.reportCounts[passport.user]++;
	}

	try {
		const req = https.request(options);
		req.end(body);
	} catch (error) {
		console.log(error, 'Caught exception in player request https request to discord server');
	}

	playerReport.save(err => {
		if (err) {
			console.log(err, 'Failed to save player report');
			return;
		}
		Account.find({ staffRole: { $exists: true } }).then(accounts => {
			accounts.forEach(account => {
				const onlineSocketId = Object.keys(io.sockets.sockets).find(
					socketId =>
						io.sockets.sockets[socketId].handshake.session.passport && io.sockets.sockets[socketId].handshake.session.passport.user === account.username
				);

				account.gameSettings.newReport = true;

				if (onlineSocketId) {
					io.sockets.sockets[onlineSocketId].emit('reportUpdate', true);
				}
				account.save();
			});
		});
	});
};

module.exports.handlePlayerReportDismiss = () => {
	Account.find({ staffRole: { $exists: true } }).then(accounts => {
		accounts.forEach(account => {
			const onlineSocketId = Object.keys(io.sockets.sockets).find(
				socketId => io.sockets.sockets[socketId].handshake.session.passport && io.sockets.sockets[socketId].handshake.session.passport.user === account.username
			);

			account.gameSettings.newReport = false;

			if (onlineSocketId) {
				io.sockets.sockets[onlineSocketId].emit('reportUpdate', false);
			}
			account.save();
		});
	});
};

/**
 * @param {object} socket - socket reference.
 */
module.exports.checkUserStatus = socket => {
	const { passport } = socket.handshake.session;

	if (passport && Object.keys(passport).length) {
		const { user } = passport;
		const { sockets } = io.sockets;
		const game = games.find(game => game.publicPlayersState.find(player => player.userName === user && !player.leftGame));
		const oldSocketID = Object.keys(sockets).find(
			socketID =>
				sockets[socketID].handshake.session.passport &&
				Object.keys(sockets[socketID].handshake.session.passport).length &&
				(sockets[socketID].handshake.session.passport.user === user && socketID !== socket.id)
		);

		if (oldSocketID && sockets[oldSocketID]) {
			sockets[oldSocketID].emit('manualDisconnection');
			delete sockets[oldSocketID];
		}

		if (game && game.gameState.isStarted && !game.gameState.isCompleted) {
			game.publicPlayersState.find(player => player.userName === user).connected = true;
			socket.join(game.general.uid);
			socket.emit('updateSeatForUser');
			sendInProgressGameUpdate(game);
		}
		if (user) {
			// Double-check the user isn't sneaking past IP bans.
			const logOutUser = username => {
				const bannedUserlistIndex = userList.findIndex(user => user.userName === username);

				socket.emit('manualDisconnection');

				if (bannedUserlistIndex >= 0) {
					userList.splice(bannedUserlistIndex, 1);
				}
			};
			Account.findOne({ username: user }, function(err, account) {
				if (account) {
					BannedIP.find(
						{
							ip: account.lastConnectedIP,
							type: 'tiny' || 'small' || 'big'
						},
						(err, ips) => {
							let date;
							let unbannedTime;
							const ip = ips[ips.length - 1];

							if (ip) {
								date = new Date().getTime();
								unbannedTime =
									ip.type === 'small'
										? ip.bannedDate.getTime() + 64800000
										: ip.type === 'tiny'
											? ip.bannedDate.getTime() + 60000
											: ip.bannedDate.getTime() + 604800000;
							}

							if (ip && unbannedTime > date) logOutUser(user);
						}
					);
				}
			});

			sendUserList();
		}
	}

	socket.emit('version', { current: version });

	sendGeneralChats(socket);
	sendGameList(socket);
};

module.exports.handleUserLeaveGame = handleUserLeaveGame;

module.exports.handleSocketDisconnect = handleSocketDisconnect;
