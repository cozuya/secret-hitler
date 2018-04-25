let generalChatCount = 0;

const { games, userList, generalChats, accountCreationDisabled, ipbansNotEnforced, gameCreationDisabled, currentSeasonNumber } = require('./models');
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
const crypto = require('crypto');
const https = require('https');
const _ = require('lodash');
const { sendInProgressGameUpdate } = require('./util.js');
const animals = require('../../utils/animals');
const adjectives = require('../../utils/adjectives');
const version = require('../../version');
const { generateCombination } = require('gfycat-style-urls');
const { PLAYERCOLORS, MODERATORS, ADMINS, EDITORS } = require('../../src/frontend-scripts/constants');

/**
 * @param {object} game - game to act on.
 * @return {string} status text.
 */
const displayWaitingForPlayers = game => {
	if (game.general.isTourny) {
		const count = game.general.maxPlayersCount - game.general.tournyInfo.queuedPlayers.length;

		return count === 1 ? `Waiting for ${count} more player..` : `Waiting for ${count} more players..`;
	}
	const includedPlayerCounts = [5, 6, 7, 8, 9, 10].filter(value => !game.general.excludedPlayerCount.includes(value));

	for (value of includedPlayerCounts) {
		if (value > game.publicPlayersState.length) {
			const count = value - game.publicPlayersState.length;

			return count === 1 ? `Waiting for ${count} more player..` : `Waiting for ${count} more players..`;
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
	let startGamePause = game.general.isTourny ? 5 : 20;

	const countDown = setInterval(() => {
		if (game.gameState.cancellStart) {
			game.gameState.cancellStart = false;
			game.gameState.isStarted = false;
			clearInterval(countDown);
		} else if (startGamePause === 4 || game.publicPlayersState.length === game.general.maxPlayersCount) {
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
const checkStartConditions = game => {
	if (game.gameState.isTracksFlipped) {
		return;
	}

	if (game.electionCount !== 0) {
		game.electionCount = 0;
	}

	if (
		game.gameState.isStarted &&
		(game.publicPlayersState.length < game.general.minPlayersCount || game.general.excludedPlayerCount.includes(game.publicPlayersState.length))
	) {
		game.gameState.cancellStart = true;
		game.general.status = displayWaitingForPlayers(game);
	} else if (
		(!game.gameState.isStarted &&
			game.publicPlayersState.length >= game.general.minPlayersCount &&
			!game.general.excludedPlayerCount.includes(game.publicPlayersState.length)) ||
		(game.general.isTourny && game.general.tournyInfo.queuedPlayers.length === game.general.maxPlayersCount)
	) {
		startCountdown(game);
	} else if (!game.gameState.isStarted) {
		game.general.status = displayWaitingForPlayers(game);
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

	if (passport && Object.keys(passport).length) {
		const userIndex = userList.findIndex(user => user.userName === passport.user);
		const gamesPlayerSeatedIn = games.filter(game => game.publicPlayersState.find(player => player.userName === passport.user && !player.leftGame));

		if (userIndex !== -1) {
			userList.splice(userIndex, 1);
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
					publicPlayersState.splice(playerIndex, 1);
					checkStartConditions(game);
					io.sockets.in(game.uid).emit('gameUpdate', game);
				} else if (gameState.isTracksFlipped) {
					publicPlayersState[playerIndex].connected = false;
					publicPlayersState[playerIndex].leftGame = true;
					sendInProgressGameUpdate(game);
					if (game.publicPlayersState.filter(publicPlayer => publicPlayer.leftGame).length === game.general.playerCount) {
						games.splice(games.indexOf(game), 1);
					}
				}
			});
			sendGameList();
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
	sendUserList();
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
 * @param {object} data - from socket emit.
 */
const handleUserLeaveGame = (socket, data) => {
	const game = games.find(el => el.general.uid === data.uid);
	const { passport } = socket.handshake.session;

	if (!passport || !passport.user) {
		return;
	}

	if (io.sockets.adapter.rooms[data.uid] && socket) {
		socket.leave(data.uid);
	}

	if (game) {
		const playerIndex = game.publicPlayersState.findIndex(player => player.userName === passport.user);

		if (playerIndex > -1) {
			if (game.gameState.isTracksFlipped) {
				game.publicPlayersState[playerIndex].leftGame = true;
			}
			if (game.publicPlayersState.filter(publicPlayer => publicPlayer.leftGame).length === game.general.playerCount) {
				games.splice(games.indexOf(game), 1);
			}
			if (!game.gameState.isTracksFlipped) {
				game.publicPlayersState.splice(game.publicPlayersState.findIndex(player => player.userName === passport.user), 1);
				checkStartConditions(game);
				io.sockets.in(data.uid).emit('gameUpdate', game);
			}
		}

		if (
			game.general.isTourny &&
			game.general.tournyInfo.round === 0 &&
			passport &&
			game.general.tournyInfo.queuedPlayers.map(player => player.userName).find(name => name === passport.user)
		) {
			playerLeavePretourny(game, data.userName);
		}

		if (
			(!game.publicPlayersState.length && !(game.general.isTourny && game.general.tournyInfo.round === 0)) ||
			(game.general.isTourny && game.general.tournyInfo.round === 0 && !game.general.tournyInfo.queuedPlayers.length)
		) {
			io.sockets.in(data.uid).emit('gameUpdate', {});
			games.splice(games.indexOf(game), 1);
		} else if (game.gameState.isTracksFlipped) {
			sendInProgressGameUpdate(game);
		}
	}

	if (!data.isRemake) {
		updateUserStatus(passport.user, 'none', data.uid);
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
 * @param {object} data - from socket emit.
 */
module.exports.updateSeatedUser = (socket, data) => {
	const game = games.find(el => el.general.uid === data.uid);
	// prevents race condition between 1) taking a seat and 2) the game starting

	if (game && game.gameState.isTracksFlipped) {
		return;
	}

	const { passport } = socket.handshake.session;

	if (!passport || !passport.user) {
		return;
	}

	const user = userList.find(u => passport.user === u.userName);

	if (
		game &&
		game.publicPlayersState.length < game.general.maxPlayersCount &&
		!game.publicPlayersState.find(player => player.userName === user.userName) &&
		user &&
		(!game.general.private ||
			((game.general.private && data.password === game.private.privatePassword) ||
				(game.general.private && game.general.whitelistedPlayers.includes(user.userName))))
	) {
		const { publicPlayersState } = game;
		const player = {
			userName: socket.handshake.session.passport.user,
			connected: true,
			isDead: false,
			customCardback: user.customCardback,
			customCardbackUid: user.customCardbackUid,
			isPrivate: user.isPrivate,
			tournyWins: user.tournyWins,
			previousSeasonAward: user.previousSeasonAward,
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
						text: `${data.userName}`,
						type: 'player'
					},
					{
						text: ` (${game.general.tournyInfo.queuedPlayers.length}/${game.general.maxPlayersCount}) has entered the tournament queue.`
					}
				]
			});
		} else {
			publicPlayersState.push(player);
		}

		socket.emit('updateSeatForUser', true);
		checkStartConditions(game);
		updateUserStatus(user.userName, game.general.rainbowgame ? 'rainbow' : 'playing', data.uid);
		io.sockets.in(data.uid).emit('gameUpdate', secureGame(game));
		sendGameList();
	}
};

/**
 * @param {object} socket - user socket reference.
 * @param {object} data - from socket emit.
 */
module.exports.handleUpdatedBio = (socket, data) => {
	if (socket.handshake.session.passport) {
		const username = socket.handshake.session.passport.user;

		Account.findOne({ username }).then(account => {
			account.bio = data;
			account.save();
		});
	}
};

/**
 * @param {object} socket - user socket reference.
 * @param {object} data - from socket emit.
 */
module.exports.handleAddNewGame = (socket, data) => {
	if (!socket.handshake.session.passport || !socket.handshake.session.passport.user || gameCreationDisabled.status) {
		return;
	}

	// seems ridiculous to do this i.e. how can someone who's not logged in fire this function at all but here I go crashing again..
	const username = socket.handshake.session.passport.user;
	const user = userList.find(obj => obj.userName === username);
	const currentTime = new Date();

	if (!user || currentTime - user.timeLastGameCreated < 8000) {
		// Check if !user here in case of bug where user doesn't appear on userList
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
			flag: data.flag || 'none',
			minPlayersCount: typeof data.minPlayersCount === 'number' && data.minPlayersCount > 4 && data.minPlayersCount < 11 ? data.minPlayersCount : 5,
			gameCreatorName: username,
			gameCreatorBlacklist: user.blacklist,
			excludedPlayerCount: data.excludedPlayerCount, // should check this but its minor
			maxPlayersCount: typeof data.maxPlayersCount === 'number' && data.maxPlayersCount > 4 && data.maxPlayersCount < 11 ? data.maxPlayersCount : 10,
			status: `Waiting for ${typeof data.minPlayersCount === 'number' ? data.minPlayersCount - 1 : 4} more players..`,
			experiencedMode: data.experiencedMode,
			disableChat: data.disableChat,
			disableObserver: data.disableObserver && !data.isTourny,
			// isTourny: data.isTourny, // temp
			isTourny: false,
			disableGamechat: data.disablegamechat,
			rainbowGame: user.wins + user.losses > 49 ? data.rainbowGame : false,
			blindMode: data.blindMode,
			timedMode: typeof data.timedMode === 'number' && data.timedMode > 2 && data.timedMode < 6001 ? data.timedMode : false,
			casualGame: typeof data.timedMode === 'number' && data.timedMode < 30 && !data.casualGame ? true : data.casualGame,
			rebalance6p: data.rebalance6p,
			rebalance7p: data.rebalance7p,
			rebalance9p2f: data.rebalance9p2f,
			private: user.isPrivate ? (data.privatePassword ? data.privatePassword : 'private') : data.privatePassword,
			privateOnly: user.isPrivate,
			electionCount: 0
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

	if (data.isTourny) {
		newGame.general.tournyInfo = {
			round: 0,
			queuedPlayers: [
				{
					userName: username,
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
				userName: username,
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
					text: `${username}`,
					type: 'player'
				},
				{
					text: ` (${data.general.tournyInfo.queuedPlayers.length}/${data.general.maxPlayersCount}) has entered the tournament queue.`
				}
			]
		});
	}

	user.timeLastGameCreated = currentTime;

	Account.findOne({ username }).then(account => {
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
		updateUserStatus(username, newGame.general.rainbowgame ? 'rainbow' : 'playing', newGame.general.uid);
		games.push(newGame);
		sendGameList();
		socket.join(newGame.general.uid);
		socket.emit('updateSeatForUser');
		socket.emit('gameUpdate', newGame);
		socket.emit('joinGameRedirect', newGame.general.uid);
	});
};

/**
 * @param {object} data - from socket emit.
 */
module.exports.handleAddNewClaim = data => {
	const game = games.find(el => el.general.uid === data.uid);

	if (!game || !game.private || !game.private.summary) {
		return;
	}

	const playerIndex = game.publicPlayersState.findIndex(player => player.userName === data.userName);
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
						text: blindMode ? `${replacementNames[playerIndex]} {${playerIndex + 1}} ` : `${data.userName} {${playerIndex + 1}} `,
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
						text: blindMode ? `${replacementNames[playerIndex]} {${playerIndex + 1}} ` : `${data.userName} {${playerIndex + 1}} `,
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
						text: blindMode ? `${replacementNames[playerIndex]} {${playerIndex + 1}} ` : `${data.userName} {${playerIndex + 1}} `,
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
						text: blindMode ? `${replacementNames[playerIndex]} {${playerIndex + 1}} ` : `${data.userName} {${playerIndex + 1}} `,
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
		data.chat = chat;
		data.isClaim = true;
		data.timestamp = new Date();

		game.chats.push(data);
		sendInProgressGameUpdate(game);
	}
};

/**
 * @param {object} data - from socket emit.
 */
module.exports.handleUpdatedRemakeGame = data => {
	const game = games.find(el => el.general.uid === data.uid);
	if (!game) {
		return;
	}
	const remakeText = game.general.isTourny ? 'cancel' : 'remake';
	const { publicPlayersState } = game;
	const playerIndex = publicPlayersState.findIndex(player => player.userName === data.userName);
	const player = publicPlayersState[playerIndex];

	/**
	 * @return {number} minimum number of remake votes to remake a game
	 */
	const minimumRemakeVoteCount = (() => {
		switch (game.general.playerCount) {
			case 5:
				return 4;
			case 6:
				return 5;
			case 7:
				return 5;
			case 8:
				return 6;
			case 9:
				return 6;
			case 10:
				return 7;
		}
	})();
	const chat = {
		timestamp: new Date(),
		gameChat: true,
		chat: [
			{
				text: 'A player'
			}
		]
	};
	const makeNewGame = () => {
		const newGame = _.cloneDeep(game);
		const remakePlayerNames = publicPlayersState.filter(player => player.isRemaking).map(player => player.userName);
		const remakePlayerSocketIDs = Object.keys(io.sockets.sockets).filter(
			socketId =>
				io.sockets.sockets[socketId].handshake.session.passport && remakePlayerNames.includes(io.sockets.sockets[socketId].handshake.session.passport.user)
		);

		sendInProgressGameUpdate(game);

		newGame.gameState = {
			previousElectedGovernment: [],
			undrawnPolicyCount: 17,
			discardedPolicyCount: 0,
			presidentIndex: -1
		};

		newGame.chats = [];
		newGame.general.isRemade = false;
		newGame.general.uid = `${game.general.uid}Remake`;
		newGame.general.electionCount = 0;
		newGame.timeCreated = new Date().getTime();
		newGame.publicPlayersState = game.publicPlayersState.filter(player => player.isRemaking).map(player => ({
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

		game.publicPlayersState.forEach((player, i) => {
			player.cardStatus.cardFront = 'secretrole';
			player.cardStatus.cardBack = game.private.seatedPlayers[i].role;
			player.cardStatus.cardDisplayed = true;
			player.cardStatus.isFlipped = true;
		});

		game.general.status = 'Game is being remade..';
		sendInProgressGameUpdate(game);

		setTimeout(() => {
			remakePlayerNames.forEach(name => {
				const play = game.publicPlayersState.find(p => p.userName === name);

				play.leftGame = true;
			});
			games.push(newGame);
			sendGameList();
			remakePlayerSocketIDs.forEach((id, index) => {
				if (io.sockets.sockets[id]) {
					io.sockets.sockets[id].leave(game.general.uid);
					sendGameInfo(io.sockets.sockets[id], newGame.general.uid);
					handleUserLeaveGame(io.sockets.sockets[id], {
						uid: game.general.uid,
						userName: remakePlayerNames[index],
						isSeated: true,
						isRemake: true
					});
				}
			});
			checkStartConditions(newGame);
		}, 3000);
	};

	/**
	 * @param {string} firstTableUid - the UID of the first tournament table
	 */
	const cancellTourny = firstTableUid => {
		const secondTableUid =
			firstTableUid.charAt(firstTableUid.length - 1) === 'A'
				? `${firstTableUid.slice(0, firstTableUid.length - 1)}B`
				: `${firstTableUid.slice(0, firstTableUid.length - 1)}A`;
		const secondTable = games.find(game => game.general.uid === secondTableUid);

		if (secondTable) {
			secondTable.general.tournyInfo.isCancelled = true;
			secondTable.chats.push({
				gameChat: true,
				timestamp: new Date(),
				chat: [
					{
						text: 'Due to the other tournament table voting for cancellation, this tournament has been cancelled.',
						type: 'hitler'
					}
				]
			});
			secondTable.general.status = 'Tournament has been cancelled.';
			sendInProgressGameUpdate(secondTable);
		}
	};

	if (!game || !player || !game.publicPlayersState) {
		return;
	}

	player.isRemakeVoting = data.remakeStatus;

	if (data.remakeStatus) {
		const publicPlayer = game.publicPlayersState.find(player => player.userName === data.userName);
		const remakePlayerCount = publicPlayersState.filter(player => player.isRemakeVoting).length;

		chat.chat.push({
			text: ` has voted to ${remakeText} this ${game.general.isTourny ? 'tournament.' : 'game.'} (${remakePlayerCount}/${minimumRemakeVoteCount})`
		});
		publicPlayer.isRemaking = true;

		if (!game.general.isRemaking && publicPlayersState.length > 3 && remakePlayerCount >= minimumRemakeVoteCount) {
			game.general.isRemaking = true;
			game.general.remakeCount = 5;

			game.private.remakeTimer = setInterval(() => {
				if (game.general.remakeCount !== 0) {
					game.general.status = `Game is ${game.general.isTourny ? 'cancelled ' : 'remade'} in ${game.general.remakeCount} ${
						game.general.remakeCount === 1 ? 'second' : 'seconds'
					}.`;
					game.general.remakeCount--;
				} else {
					clearInterval(game.private.remakeTimer);
					game.general.status = `Game has been ${game.general.isTourny ? 'cancelled' : 'remade'}.`;
					game.general.isRemade = true;
					if (game.general.isTourny) {
						cancellTourny(game.general.uid);
					} else {
						makeNewGame();
					}
				}
				sendInProgressGameUpdate(game);
			}, 1000);
		}
	} else {
		const remakePlayerCount = publicPlayersState.filter(player => player.isRemakeVoting).length;

		if (game.general.isRemaking && remakePlayerCount <= minimumRemakeVoteCount) {
			game.general.isRemaking = false;
			game.general.status = 'Game remaking has been cancelled.';
			clearInterval(game.private.remakeTimer);
		}
		chat.chat.push({
			text: ` has rescinded their vote to ${
				game.general.isTourny ? 'cancel this tournament.' : 'remake this game.'
			} (${remakePlayerCount}/${minimumRemakeVoteCount})`
		});
	}
	game.chats.push(chat);

	sendInProgressGameUpdate(game);
};

/**
 * @param {object} socket - socket reference.
 * @param {object} data - from socket emit.
 */
module.exports.handleAddNewGameChat = (socket, data) => {
	const { passport } = socket.handshake.session;
	const game = games.find(el => el.general.uid === data.uid);
	const { chat } = data;

	if (!passport || !passport.user || passport.user !== data.userName || chat.length > 300 || !chat.trim().length || !game) {
		return;
	}

	const { publicPlayersState } = game;
	const player = publicPlayersState.find(player => player.userName === passport.user);
	const user = userList.find(u => passport.user === u.userName);

	if (
		(player && player.isDead && !game.gameState.isCompleted) ||
		(player && player.leftGame) ||
		(!player && game.general.disableObserver && !(MODERATORS.includes(passport.user) || ADMINS.includes(passport.user) || EDITORS.includes(passport.user))) ||
		(user && !player && user.wins + user.losses < 2)
	) {
		return;
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

	if (
		/^Ping/i.test(chat) &&
		game.gameState.isStarted &&
		player &&
		(parseInt(chat.charAt(4)) <= game.publicPlayersState.length || chat.substr(4, 5) === '10') &&
		(!player.pingTime || new Date().getTime() - player.pingTime > 180000)
	) {
		try {
			const affectedPlayerNumber = parseInt(chat.substr(4, 5) === '10' ? 10 : chat.charAt(4)) - 1;
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
				timestamp: new Date(),
				inProgress: game.gameState.isStarted
			});
			sendInProgressGameUpdate(game);
		} catch (e) {
			console.log(e, 'caught exception in ping chat');
		}
	} else if (!/^Ping/i.test(chat)) {
		game.chats.push({
			gameChat: false,
			userName: passport.user,
			chat: data.chat,
			timestamp: new Date()
		});

		if (game.gameState.isTracksFlipped) {
			sendInProgressGameUpdate(game);
		} else {
			io.in(data.uid).emit('gameUpdate', secureGame(game));
		}
	}
};

/**
 * @param {object} data - from socket emit.
 */
module.exports.handleUpdateWhitelist = data => {
	const game = games.find(el => el.general.uid === data.uid);

	game.general.whitelistedPlayers = data.whitelistPlayers;
	io.in(data.uid).emit('gameUpdate', secureGame(game));
};

/**
 * @param {object} socket - socket reference.
 * @param {object} data - from socket emit.
 */
module.exports.handleNewGeneralChat = (socket, data) => {
	const { passport } = socket.handshake.session;
	const user = userList.find(u => passport.user === u.userName);

	if (!user || !passport || !passport.user || data.chat.length > 300 || !data.chat.trim().length || user.isPrivate) {
		return;
	}

	if (generalChatCount === 100) {
		const chats = new Generalchats({ chats: generalChats.list });

		chats.save(() => {
			generalChatCount = 0;
		});
	}

	const seasonColor = user && user[`winsSeason${currentSeasonNumber}`] + user[`lossesSeason${currentSeasonNumber}`] > 49 ? PLAYERCOLORS(user, true) : '';
	const color = user && user.wins + user.losses > 49 ? PLAYERCOLORS(user) : '';

	if (user.wins > 0 || user.losses > 0) {
		generalChatCount++;
		const newChat = {
			time: new Date(),
			color,
			seasonColor,
			userName: passport.user
		};

		generalChats.list.push(newChat);

		if (generalChats.list.length > 99) {
			generalChats.list.shift();
		}
		io.sockets.emit('generalChats', generalChats);
	}
};

/**
 * @param {object} socket - socket reference.
 * @param {object} data - from socket emit.
 */
module.exports.handleUpdatedGameSettings = (socket, data) => {
	if (!socket.handshake.session.passport) {
		// yes, even THIS crashed the site once.
		return;
	}

	Account.findOne({ username: socket.handshake.session.passport.user })
		.then(account => {
			const currentPrivate = account.gameSettings.isPrivate;

			for (const setting in data) {
				account.gameSettings[setting] = data[setting];
			}

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
 * @param {object} data - from socket emit.
 */
module.exports.handleModerationAction = (socket, data) => {
	const { passport } = socket.handshake.session;

	if (!passport || !Object.keys(passport).length) {
		return;
	}

	const isSuperMod = EDITORS.includes(passport.user) || ADMINS.includes(passport.user);
	const affectedSocketId = Object.keys(io.sockets.sockets).find(
		socketId => io.sockets.sockets[socketId].handshake.session.passport && io.sockets.sockets[socketId].handshake.session.passport.user === data.userName
	);

	if (passport && (MODERATORS.includes(passport.user) || ADMINS.includes(passport.user) || EDITORS.includes(passport.user))) {
		if (data.isReportResolveChange) {
			PlayerReport.findOne({ _id: data._id })
				.then(report => {
					report.isActive = !report.isActive;
					report.save(() => {
						sendUserReports(socket);
					});
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
				const bannedUserlistIndex = userList.findIndex(user => user.userName === data.userName);

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
				if (!ADMINS.includes(username) && (!MODERATORS.includes(username) || !EDITORS.includes(username) || isSuperMod)) {
					Account.findOne({ username })
						.then(account => {
							if (account) {
								account.hash = crypto.randomBytes(20).toString('hex');
								account.salt = crypto.randomBytes(20).toString('hex');
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

			modaction.save();
			switch (data.action) {
				case 'deleteUser':
					if (isSuperMod) {
						Account.findOne({ username: data.userName }).remove(() => {
							if (io.sockets.sockets[affectedSocketId]) {
								io.sockets.sockets[affectedSocketId].emit('manualDisconnection');
							}
						});
					}
					break;
				case 'ban':
					banAccount(data.userName);
					break;
				case 'deleteBio':
					Account.findOne({ username: data.userName }).then(account => {
						account.bio = '';
						account.save();
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
					const broadcastReq = https.request(discordBroadcastOptions);

					broadcastReq.end(discordBroadcastBody);
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

					if (isSuperMod) {
						ipban.save(() => {
							banAccount(data.userName);
						});
					}
					break;
				case 'timeOut':
					const timeout = new BannedIP({
						bannedDate: new Date(),
						type: 'small',
						ip: data.ip
					});
					timeout.save(() => {
						logOutUser(data.userName);
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
							}
						})
						.catch(err => {
							console.log(err, 'timeout2 user err');
						});
					break;
				case 'togglePrivate':
					Account.findOne({ username: data.userName })
						.then(account => {
							if (account) {
								const { isPrivate } = account.gameSettings;

								account.gameSettings.isPrivate = !isPrivate;
								account.save(() => {
									logOutUser(data.userName);
								});
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
					}
					break;
				// case 'renamePlayer':
				// 	Account.findOne({ username: data.userName })
				// 		.then(account => {
				// 			account.username = data.modNotes;
				// 			account.save(() => {
				// 				Profile.findOne({ _id: data.userName })
				// 					.then(profile => {
				// 						profile._id = data.modNotes;
				// 						profile.save(() => {
				// 							if (io.sockets.sockets[affectedSocketId]) {
				// 								io.sockets.sockets[affectedSocketId].emit('manualDisconnection');
				// 							}
				// 						});
				// 					})
				// 					.catch(err => {
				// 						console.log(err);
				// 					});
				// 			});
				// 		})
				// 		.catch(err => {
				// 			console.log(err);
				// 		});
				case 'ipbanlarge':
					const ipbanl = new BannedIP({
						bannedDate: new Date(),
						type: 'big',
						ip: data.ip
					});

					if (isSuperMod) {
						ipbanl.save(() => {
							banAccount(data.userName);
						});
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
				case 'resetServer':
					if (isSuperMod) {
						console.log('server crashing manually via mod action');
						crashServer();
					}
					break;
				default:
					if (data.userName.substr(0, 7) === 'DELGAME') {
						const game = games.find(el => el.general.uid === data.userName.slice(7));

						if (game) {
							games.splice(games.indexOf(game), 1);
							sendGameList();
						}
					} else if (isSuperMod && data.action.type) {
						const setType = /setRWins/.test(data.action.type)
							? 'rainbowWins'
							: /setRLosses/.test(data.action.type) ? 'rainbowLosses' : /setWins/.test(data.action.type) ? 'wins' : 'losses';
						const number =
							setType === 'wins'
								? data.action.type.substr(7)
								: setType === 'losses' ? data.action.type.substr(9) : setType === 'rainbowWins' ? data.action.type.substr(8) : data.action.type.substr(10);
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
									}
								})
								.catch(err => {
									console.log(err, 'set wins/losses error');
								});
						}
					}
			}
		}
	}
};

/**
 * @param {object} data - from socket emit.
 */
module.exports.handlePlayerReport = data => {
	const user = userList.find(u => data.userName === u.userName);

	if (data.userName !== 'from replay' && (!user || user.wins + user.losses < 2)) {
		return;
	}

	const mods = MODERATORS.concat(ADMINS);
	const playerReport = new PlayerReport({
		date: new Date(),
		gameUid: data.uid,
		reportingPlayer: data.userName,
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

	PlayerReport.find({ gameUid: data.uid, reportingPlayer: data.userName }).then(reports => {
		if (!reports || reports.length < 4) {
			playerReport.save(() => {
				Account.find({ username: mods }).then(accounts => {
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

				try {
					const req = https.request(options);
					req.end(body);
				} catch (error) {
					console.log(err, 'Caught exception in player request https request to discord server');
				}
			});
		}
	});
};

module.exports.handlePlayerReportDismiss = () => {
	const mods = MODERATORS.concat(ADMINS);

	Account.find({ username: mods }).then(accounts => {
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

        Account.findOne({ username: user })
            .then(account => {
                const userListNames = userList.map(user => user.userName);
                if (!userListNames.includes(user)) {
                    const userListInfo = {
                        userName: user,
                        wins: account.wins,
                        losses: account.losses,
                        rainbowWins: account.rainbowWins,
                        rainbowLosses: account.rainbowLosses,
                        isPrivate: account.gameSettings.isPrivate,
                        tournyWins: account.gameSettings.tournyWins,
                        blacklist: account.gameSettings.blacklist,
                        customCardback: account.gameSettings.customCardback,
                        customCardbackUid: account.gameSettings.customCardbackUid,
                        previousSeasonAward: account.gameSettings.previousSeasonAward,
                        status: {
							type: game ? (game.general.rainbowgame ? 'rainbow' : 'playing') : 'none',
							gameId: game ? game.general.uid : null
                        }
                    };

                    userListInfo[`winsSeason${currentSeasonNumber}`] = account[`winsSeason${currentSeasonNumber}`];
                    userListInfo[`lossesSeason${currentSeasonNumber}`] = account[`lossesSeason${currentSeasonNumber}`];
                    userListInfo[`rainbowWinsSeason${currentSeasonNumber}`] = account[`rainbowWinsSeason${currentSeasonNumber}`];
                    userListInfo[`rainbowLossesSeason${currentSeasonNumber}`] = account[`rainbowLossesSeason${currentSeasonNumber}`];
                    userList.push(userListInfo);
                }
            });
    }

	socket.emit('version', { current: version });

	sendUserList();
	sendGeneralChats(socket);
	sendGameList(socket);
};

module.exports.handleUserLeaveGame = handleUserLeaveGame;

module.exports.handleSocketDisconnect = handleSocketDisconnect;
