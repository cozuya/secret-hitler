const { games, userList } = require('../models');
const { sendGameList, sendUserList, updateUserStatus } = require('../user-requests');
const { saveAndDeleteGame } = require('../game/end-game');
const { sendInProgressGameUpdate } = require('../util.js');
const { displayWaitingForPlayers, checkStartConditions } = require('./game-countdown');

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
			saveAndDeleteGame(game.general.uid);
		}
		if (!game.gameState.isTracksFlipped) {
			game.publicPlayersState.splice(
				game.publicPlayersState.findIndex(player => player.userName === passport.user),
				1
			);
			checkStartConditions(game);
			io.sockets.in(game.general.uid).emit('gameUpdate', game);
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
					io.sockets.in(game.uid).emit('gameUpdate', game);
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
						saveAndDeleteGame(game.general.uid);
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

module.exports.handleUserLeaveGame = handleUserLeaveGame;

module.exports.handleSocketDisconnect = handleSocketDisconnect;
