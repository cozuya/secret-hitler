const { sendCommandChatsUpdate } = require('../util');
const { saveAndDeleteGame } = require('../game/end-game');
const { sendInProgressGameUpdate } = require('../util.js');
const { updateUserStatus, sendGameList } = require('../user-requests');
const { games, userList } = require('../models');
const { sendUserList } = require('../user-requests');
const _ = require('lodash');
const adjectives = require('../../../utils/adjectives');
const animals = require('../../../utils/animals');
const startGame = require('../game/start-game.js');

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

	for (const value of includedPlayerCounts) {
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
				game.remakeData = game.publicPlayersState.map(player => ({ userName: player.userName, isRemaking: false, timesVoted: 0, remakeTime: 0 }));
				startGame(game);
			}
		} else {
			game.general.status = game.general.isTourny
				? `Tournament starts in ${startGamePause} second${startGamePause === 1 ? '' : 's'}.`
				: `Game starts in ${startGamePause} second${startGamePause === 1 ? '' : 's'}.`;
			sendCommandChatsUpdate(game);
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
		game.remakeData = game.publicPlayersState.map(player => ({ userName: player.userName, isRemaking: false, timesVoted: 0, remakeTime: 0 }));
		startCountdown(game);
	} else if (!game.gameState.isStarted) {
		game.general.status = displayWaitingForPlayers(game);
	}
};

/**
 * @param {object} socket - user socket reference.
 */
const handleSocketDisconnect = socket => {
	const { passport } = socket.handshake.session;

	let listUpdate = false;
	if (passport && Object.keys(passport).length) {
		const userIndex = userList.findIndex(user => user.userName === passport.user);
		const gameNamesPlayerSeatedIn = Object.keys(games).filter(gameName =>
			games[gameName].publicPlayersState.find(player => player.userName === passport.user && !player.leftGame)
		);

		if (userIndex !== -1) {
			userList.splice(userIndex, 1);
			listUpdate = true;
		}

		if (gameNamesPlayerSeatedIn.length) {
			gameNamesPlayerSeatedIn.forEach(gameName => {
				const game = games[gameName];
				const { gameState, publicPlayersState } = game;
				const playerIndex = publicPlayersState.findIndex(player => player.userName === passport.user);

				if (
					(!gameState.isStarted && publicPlayersState.length === 1) ||
					(gameState.isCompleted && publicPlayersState.filter(player => !player.connected || player.leftGame).length === game.general.playerCount - 1)
				) {
					saveAndDeleteGame(gameName);
				} else if (!gameState.isTracksFlipped && playerIndex > -1) {
					publicPlayersState.splice(playerIndex, 1);
					checkStartConditions(game);
					sendCommandChatsUpdate(game);
				} else if (gameState.isTracksFlipped) {
					publicPlayersState[playerIndex].connected = false;
					publicPlayersState[playerIndex].leftGame = true;
					const playerRemakeData = game.remakeData && game.remakeData.find(player => player.userName === passport.user);
					if (playerRemakeData && playerRemakeData.isRemaking) {
						const minimumRemakeVoteCount = game.general.playerCount - game.customGameSettings.fascistCount;
						const remakePlayerCount = game.remakeData.filter(player => player.isRemaking).length;

						if (!game.general.isRemade && game.general.isRemaking && remakePlayerCount <= minimumRemakeVoteCount) {
							game.general.isRemaking = false;
							game.general.status = 'Game remaking has been cancelled.';
							clearInterval(game.private.remakeTimer);
						}
						const chat = {
							timestamp: new Date(),
							gameChat: true,
							chat: [
								{
									text: 'A player'
								}
							]
						};
						chat.chat.push({
							text: ` has left and rescinded their vote to ${game.general.isTourny ? 'cancel this tournament.' : 'remake this game.'} (${remakePlayerCount -
								1}/${minimumRemakeVoteCount})`
						});
						game.chats.push(chat);
						game.remakeData.find(player => player.userName === passport.user).isRemaking = false;
					}
					sendInProgressGameUpdate(game);
					if (game.publicPlayersState.filter(publicPlayer => publicPlayer.leftGame).length === game.general.playerCount) {
						game.general.timeAbandoned = new Date();
					}
				}
			});
			sendGameList();
			listUpdate = true;
		}
		//  else {
		// 	const tournysPlayerQueuedIn = games.filter(
		// 		game =>
		// 			game.general.isTourny &&
		// 			game.general.tournyInfo.queuedPlayers &&
		// 			game.general.tournyInfo.queuedPlayers.map(player => player.userName).includes(passport.user)
		// 	);

		// 	tournysPlayerQueuedIn.forEach(game => {
		// 		playerLeavePretourny(game, passport.user);
		// 	});
		// }
	}
	if (listUpdate) {
		sendUserList();
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

	queuedPlayers.splice(
		queuedPlayers.findIndex(player => player.userName === playerName),
		1
	);

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
 * @param {object} game - target game.
 * @param {object} data - from socket emit.
 * @param {object} passport - socket authentication.
 */
const handleUserLeaveGame = (socket, game, data, passport) => {
	// Authentication Assured in routes.js
	// In-game Assured in routes.js

	const playerIndex = game.publicPlayersState.findIndex(player => player.userName === passport.user);

	if (playerIndex > -1) {
		const playerRemakeData = game.remakeData && game.remakeData.find(player => player.userName === passport.user);
		if (playerRemakeData && playerRemakeData.isRemaking) {
			// Count leaving the game as rescinded remake vote.
			const minimumRemakeVoteCount =
				(game.customGameSettings.fascistCount && game.general.playerCount - game.customGameSettings.fascistCount) ||
				Math.floor(game.general.playerCount / 2) + 2;
			const remakePlayerCount = game.remakeData.filter(player => player.isRemaking).length;

			if (!game.general.isRemade && game.general.isRemaking && remakePlayerCount <= minimumRemakeVoteCount) {
				game.general.isRemaking = false;
				game.general.status = 'Game remaking has been cancelled.';
				clearInterval(game.private.remakeTimer);
			}
			const chat = {
				timestamp: new Date(),
				gameChat: true,
				chat: [
					{
						text: 'A player'
					}
				]
			};
			chat.chat.push({
				text: ` has left and rescinded their vote to ${game.general.isTourny ? 'cancel this tournament.' : 'remake this game.'} (${remakePlayerCount -
					1}/${minimumRemakeVoteCount})`
			});
			game.chats.push(chat);
			game.remakeData.find(player => player.userName === passport.user).isRemaking = false;
		}
		if (game.gameState.isTracksFlipped) {
			game.publicPlayersState[playerIndex].leftGame = true;
		}
		if (game.publicPlayersState.filter(publicPlayer => publicPlayer.leftGame).length === game.general.playerCount) {
			game.general.timeAbandoned = new Date();
		}
		if (!game.gameState.isTracksFlipped) {
			game.publicPlayersState.splice(
				game.publicPlayersState.findIndex(player => player.userName === passport.user),
				1
			);
			checkStartConditions(game);
			sendCommandChatsUpdate(game);
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
		saveAndDeleteGame(game.general.uid);
	} else if (game.gameState.isTracksFlipped) {
		sendInProgressGameUpdate(game);
	}

	if (!data.isRemake) {
		updateUserStatus(passport, null);
		socket.emit('gameUpdate', {});
	}
	sendGameList();
};

module.exports.handleUserLeaveGame = handleUserLeaveGame;

module.exports.handleSocketDisconnect = handleSocketDisconnect;

module.exports.checkStartConditions = checkStartConditions;
