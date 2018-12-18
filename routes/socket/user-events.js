const {
	games,
	userList,
	userListEmitter,
	generalChats,
	accountCreationDisabled,
	ipbansNotEnforced,
	gameCreationDisabled,
	limitNewPlayers,
	currentSeasonNumber,
	newStaff,
	createNewBypass,
	testIP
} = require('./models');
const { sendGameList, sendUserList, updateUserStatus, sendGameInfo, sendUserReports, sendPlayerNotes } = require('./user-requests');
const { selectVoting } = require('./game/election.js');
const Account = require('../../models/account');
const ModAction = require('../../models/modAction');
const PlayerReport = require('../../models/playerReport');
const BannedIP = require('../../models/bannedIP');
const Profile = require('../../models/profile/index');
const PlayerNote = require('../../models/playerNote');
const startGame = require('./game/start-game.js');
const { completeGame } = require('./game/end-game');
const { secureGame } = require('./util.js');
// const crypto = require('crypto');
const https = require('https');
const _ = require('lodash');
const { sendInProgressGameUpdate, sendPlayerChatUpdate, destroySession } = require('./util.js');
const animals = require('../../utils/animals');
const adjectives = require('../../utils/adjectives');
const { generateCombination } = require('gfycat-style-urls');
const { obfIP } = require('./ip-obf');
const { LEGALCHARACTERS } = require('../../src/frontend-scripts/constants');
const { makeReport } = require('./report.js');
const { expandAndSimplify } = require('./ip-obf');

/**
 * @param {object} game - game to act on.
 * @return {string} status text.
 */
const displayWaitingForPlayers = game => {
	if (game.general.isTourny) {
		const count = game.general.maxPlayersCount - game.general.tournyInfo.queuedPlayers.length;

		return count === 1 ? `Waiting for ${count} more player..` : `Waiting for ${count} more players..`;
	}
	const includedPlayerCounts = _.range(game.general.minPlayersCount, game.general.maxPlayersCount).filter(
		value => !game.general.excludedPlayerCount.includes(value)
	);

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
					delete games[gameName];
				} else if (!gameState.isTracksFlipped && playerIndex > -1) {
					publicPlayersState.splice(playerIndex, 1);
					checkStartConditions(game);
					io.sockets.in(game.uid).emit('gameUpdate', game);
				} else if (gameState.isTracksFlipped) {
					publicPlayersState[playerIndex].connected = false;
					publicPlayersState[playerIndex].leftGame = true;
					sendInProgressGameUpdate(game);
					if (game.publicPlayersState.filter(publicPlayer => publicPlayer.leftGame).length === game.general.playerCount) {
						delete games[game.general.uid];
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
		if (game.publicPlayersState[playerIndex].isRemakeVoting) {
			// Count leaving the game as rescinded remake vote.
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
			const remakePlayerCount = game.publicPlayersState.filter(player => player.isRemakeVoting).length;

			if (game.general.isRemaking && remakePlayerCount <= minimumRemakeVoteCount) {
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
			game.publicPlayersState[playerIndex].isRemakeVoting = false;
		}
		if (game.gameState.isTracksFlipped) {
			game.publicPlayersState[playerIndex].leftGame = true;
		}
		if (game.publicPlayersState.filter(publicPlayer => publicPlayer.leftGame).length === game.general.playerCount) {
			delete games[game.general.uid];
		}
		if (!game.gameState.isTracksFlipped) {
			game.publicPlayersState.splice(game.publicPlayersState.findIndex(player => player.userName === passport.user), 1);
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
		delete games[game.general.uid];
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
	// In-game Assured in routes.js
	const game = games[data.uid];
	// prevents race condition between 1) taking a seat and 2) the game starting

	if (!game || game.gameState.isTracksFlipped) {
		return; // Game already started
	}

	Account.findOne({ username: passport.user }).then(account => {
		const isNotMaxedOut = game.publicPlayersState.length < game.general.maxPlayersCount;
		const isNotInGame = !game.publicPlayersState.find(player => player.userName === passport.user);
		const isRainbowSafe = !game.general.rainbowgame || (game.general.rainbowgame && account.wins + account.losses > 49);
		const isPrivateSafe =
			!game.general.private ||
			(game.general.private && (data.password === game.private.privatePassword || game.general.whitelistedPlayers.includes(passport.user)));
		const isBlacklistSafe = !game.general.gameCreatorBlacklist.includes(passport.user);
		const isMeetingEloMinimum = !game.general.eloMinimum || game.general.eloMinimum <= account.eloSeason || game.general.eloMinimum <= account.eloOverall;

		if (account.wins + account.losses < 3 && limitNewPlayers.status && !game.general.private) {
			return;
		}

		if (isNotMaxedOut && isNotInGame && isRainbowSafe && isPrivateSafe && isBlacklistSafe && isMeetingEloMinimum) {
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
				staffDisableVisibleElo: account.gameSettings.staffDisableVisibleElo,
				staffDisableStaffColor: account.gameSettings.staffDisableStaffColor,
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
				publicPlayersState.push(player);
			}

			socket.emit('updateSeatForUser', true);
			checkStartConditions(game);
			updateUserStatus(passport, game);
			io.sockets.in(data.uid).emit('gameUpdate', secureGame(game));
			sendGameList();
		}
	});
};

module.exports.updateSeatedUser = updateSeatedUser;

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
	if (gameCreationDisabled.status || (!data.privatePassword && limitNewPlayers.status)) {
		return;
	}

	const user = userList.find(obj => obj.userName === passport.user);
	const currentTime = new Date();

	if (!user || currentTime - user.timeLastGameCreated < 8000 || user.status.type !== 'none') {
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

	if (data.eloSliderValue && (user.eloSeason < data.eloSliderValue || user.eloOverall < data.eloSliderValue)) {
		return;
	}

	if (data.customGameSettings && data.customGameSettings.enabled) {
		if (!data.customGameSettings.deckState || !data.customGameSettings.trackState) return;

		const validPowers = ['investigate', 'deckpeek', 'election', 'bullet', 'reverseinv', 'peekdrop'];
		if (!data.customGameSettings.powers || data.customGameSettings.powers.length != 5) return;
		for (let a = 0; a < 5; a++) {
			if (data.customGameSettings.powers[a] == '' || data.customGameSettings.powers[a] == 'null') data.customGameSettings.powers[a] = null;
			else if (data.customGameSettings.powers[a] && !validPowers.includes(data.customGameSettings.powers[a])) return;
		}

		if (!(data.customGameSettings.hitlerZone >= 1) || data.customGameSettings.hitlerZone > 5) return;
		if (
			!data.customGameSettings.vetoZone ||
			data.customGameSettings.vetoZone <= data.customGameSettings.trackState.fas ||
			data.customGameSettings.vetoZone > 5
		) {
			return;
		}

		// Ensure that there is never a fas majority at the start.
		// Custom games should probably require a fixed player count, which will be in playerCounts[0] regardless.
		if (!(data.customGameSettings.fascistCount >= 0) || data.customGameSettings.fascistCount + 1 > playerCounts[0] / 2) return;

		// Ensure standard victory conditions can be met for both teams.
		if (!(data.customGameSettings.deckState.lib >= 5)) return;
		if (!(data.customGameSettings.deckState.fas >= 6)) return;

		// Roundabout way of checking for null/undefined but not 0.
		if (!(data.customGameSettings.trackState.lib >= 0) || data.customGameSettings.trackState.lib > 4) return;
		if (!(data.customGameSettings.trackState.fas >= 0) || data.customGameSettings.trackState.fas > 5) return;

		// Need at least 13 cards (11 on track plus two left-overs) to ensure that the deck does not run out.
		if (data.customGameSettings.deckState.lib + data.customGameSettings.deckState.fas < 13) return;

		if (
			!(data.customGameSettings.trackState.lib >= 0) ||
			data.customGameSettings.trackState.lib > 4 ||
			!(data.customGameSettings.trackState.fas >= 0) ||
			data.customGameSettings.trackState.fas > 5
		) {
			return;
		}

		data.casualGame = true; // Force this on if everything looks ok.
		playerCounts = [playerCounts[0]]; // Lock the game to a specific player count. Eventually there should be one set of settings per size.
	} else {
		data.customGameSettings = {
			enabled: false
		};
	}
	const uid = generateCombination(2, '', true);

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
			uid: data.isTourny ? `${generateCombination(2, '', true)}Tournament` : uid,
			name: user.isPrivate ? 'Private Game' : data.gameName ? data.gameName : 'New Game',
			flag: data.flag || 'none', // TODO: verify that the flag exists, or that an invalid flag does not cause issues
			minPlayersCount: playerCounts[0],
			gameCreatorName: user.userName,
			gameCreatorBlacklist: user.blacklist,
			excludedPlayerCount: excludes,
			maxPlayersCount: playerCounts[playerCounts.length - 1],
			status: `Waiting for ${playerCounts[0] - 1} more players..`,
			experiencedMode: data.experiencedMode,
			disableChat: data.disableChat,
			isVerifiedOnly: data.isVerifiedOnly,
			disableObserver: data.disableObserver && !data.isTourny,
			// isTourny: data.isTourny, // temp
			isTourny: false,
			disableGamechat: data.disablegamechat,
			rainbowgame: user.wins + user.losses > 49 ? data.rainbowgame : false,
			blindMode: data.blindMode,
			timedMode: typeof data.timedMode === 'number' && data.timedMode >= 2 && data.timedMode <= 6000 ? data.timedMode : false,
			casualGame: typeof data.timedMode === 'number' && data.timedMode < 30 && !data.casualGame ? true : data.casualGame,
			rebalance6p: data.rebalance6p,
			rebalance7p: data.rebalance7p,
			rebalance9p2f: data.rebalance9p2f,
			private: user.isPrivate ? (data.privatePassword ? data.privatePassword : 'private') : data.privatePassword,
			privateOnly: user.isPrivate,
			electionCount: 0,
			isRemade: false,
			eloMinimum: data.eloSliderValue
		},
		customGameSettings: data.customGameSettings,
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

	// for (let index = 0; index < 3000; index++) {
	// 	newGame.chats.push({
	// 		chat: Math.random()
	// 			.toString(36)
	// 			.substring(6),
	// 		timestamp: new Date(),
	// 		uid,
	// 		userName: 'Uther'
	// 	});
	// }

	if (newGame.customGameSettings.enabled) {
		let chat = {
			timestamp: new Date(),
			gameChat: true,
			chat: [
				{
					text: 'There will be '
				},
				{
					text: `${newGame.customGameSettings.deckState.lib - newGame.customGameSettings.trackState.lib} liberal`,
					type: 'liberal'
				},
				{
					text: ' and '
				},
				{
					text: `${newGame.customGameSettings.deckState.fas - newGame.customGameSettings.trackState.fas} fascist`,
					type: 'fascist'
				},
				{
					text: ' policies in the deck.'
				}
			]
		};
		const t = chat.timestamp.getMilliseconds();
		newGame.chats.push(chat);
		chat = {
			timestamp: new Date(),
			gameChat: true,
			chat: [
				{
					text: 'The game will start with '
				},
				{
					text: `${newGame.customGameSettings.trackState.lib} liberal`,
					type: 'liberal'
				},
				{
					text: ' and '
				},
				{
					text: `${newGame.customGameSettings.trackState.fas} fascist`,
					type: 'fascist'
				},
				{
					text: ' policies.'
				}
			]
		};
		chat.timestamp.setMilliseconds(t + 1);
		newGame.chats.push(chat);
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
			lock: {},
			hiddenInfoChat: [],
			hiddenInfoSubscriptions: [],
			hiddenInfoShouldNotify: true
		};

		if (newGame.general.private) {
			newGame.private.privatePassword = newGame.general.private;
			newGame.general.private = true;
		}

		newGame.general.timeCreated = currentTime;
		updateUserStatus(passport, newGame);
		games[newGame.general.uid] = newGame;
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
			case 'didSinglePolicyPeek':
				if (data.claimState === 'liberal' || data.claimState === 'fascist') {
					text = [
						{
							text: 'President '
						},
						{
							text: blindMode ? `${replacementNames[playerIndex]} {${playerIndex + 1}} ` : `${passport.user} {${playerIndex + 1}} `,
							type: 'player'
						},
						{
							text: ' claims to have peeked at a '
						},
						{
							text: data.claimState,
							type: data.claimState
						},
						{
							text: ' policy.'
						}
					];
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

/**
 * @param {object} passport - socket authentication.
 * @param {object} game - target game.
 * @param {object} data - from socket emit.
 */
module.exports.handleUpdatedRemakeGame = (passport, game, data) => {
	if (game.general.isRemade) {
		return; // Games can only be remade once.
	}

	const remakeText = game.general.isTourny ? 'cancel' : 'remake';
	const { publicPlayersState } = game;
	const playerIndex = publicPlayersState.findIndex(player => player.userName === passport.user);
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
		if (gameCreationDisabled.status) {
			game.chats.push({
				gameChat: true,
				timestamp: new Date(),
				chat: [
					{
						text: 'Game remake aborted, game creation is currently disabled.',
						type: 'hitler'
					}
				]
			});
			sendInProgressGameUpdate(game);
			return;
		}

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
		if (newGame.customGameSettings.enabled) {
			let chat = {
				timestamp: new Date(),
				gameChat: true,
				chat: [
					{
						text: 'There will be '
					},
					{
						text: `${newGame.customGameSettings.deckState.lib - newGame.customGameSettings.trackState.lib} liberal`,
						type: 'liberal'
					},
					{
						text: ' and '
					},
					{
						text: `${newGame.customGameSettings.deckState.fas - newGame.customGameSettings.trackState.fas} fascist`,
						type: 'fascist'
					},
					{
						text: ' policies in the deck.'
					}
				]
			};
			const t = chat.timestamp.getMilliseconds();
			newGame.chats.push(chat);
			chat = {
				timestamp: new Date(),
				gameChat: true,
				chat: [
					{
						text: 'The game will start with '
					},
					{
						text: `${newGame.customGameSettings.trackState.lib} liberal`,
						type: 'liberal'
					},
					{
						text: ' and '
					},
					{
						text: `${newGame.customGameSettings.trackState.fas} fascist`,
						type: 'fascist'
					},
					{
						text: ' policies.'
					}
				]
			};
			chat.timestamp.setMilliseconds(t + 1);
			newGame.chats.push(chat);
		}
		newGame.general.isRemade = false;
		newGame.general.isRemaking = false;
		newGame.summarySaved = false;
		newGame.general.uid = `${game.general.uid}Remake`;
		newGame.general.electionCount = 0;
		newGame.timeCreated = new Date().getTime();
		newGame.publicPlayersState = game.publicPlayersState
			.filter(player => player.isRemaking)
			.map(player => ({
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
			if (game.private.seatedPlayers && game.private.seatedPlayers[i] && game.private.seatedPlayers[i].role) {
				player.cardStatus.cardFront = 'secretrole';
				player.cardStatus.cardBack = game.private.seatedPlayers[i].role;
				player.cardStatus.cardDisplayed = true;
				player.cardStatus.isFlipped = true;
			}
		});

		game.general.status = 'Game is being remade..';
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

			if (game.publicPlayersState.filter(publicPlayer => publicPlayer.leftGame).length === game.general.playerCount) {
				delete games[game.general.uid];
			} else {
				sendInProgressGameUpdate(game);
			}

			games[newGame.general.uid] = newGame;
			sendGameList();

			remakePlayerSocketIDs.forEach((id, index) => {
				if (io.sockets.sockets[id]) {
					io.sockets.sockets[id].leave(game.general.uid);
					sendGameInfo(io.sockets.sockets[id], newGame.general.uid);
					updateSeatedUser(io.sockets.sockets[id], passport, { uid: newGame.general.uid });
					// handleUserLeaveGame(io.sockets.sockets[id], passport, game, {isSeated: true, isRemake: true});
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
		const remakePlayerCount = publicPlayersState.filter(player => player.isRemakeVoting).length;

		chat.chat.push({
			text: ` has voted to ${remakeText} this ${game.general.isTourny ? 'tournament.' : 'game.'} (${remakePlayerCount}/${minimumRemakeVoteCount})`
		});
		player.isRemaking = true;

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
 * @param {object} passport - socket authentication.
 * @param {object} data - from socket emit.
 * @param {array} modUserNames - list of mods
 * @param {array} editorUserNames - list of editors
 * @param {array} adminUserNames - list of admins
 */
module.exports.handleAddNewGameChat = (socket, passport, data, modUserNames, editorUserNames, adminUserNames) => {
	// Authentication Assured in routes.js
	const game = games[data.uid];
	if (!game || !game.general || game.general.disableChat || !data.chat) return;
	const chat = data.chat.trim();
	const staffUserNames = [...modUserNames, ...editorUserNames, ...adminUserNames];

	if (chat.length > 300 || !chat.length) {
		return;
	}

	const { publicPlayersState } = game;
	const player = publicPlayersState.find(player => player.userName === passport.user);
	if (game.general.private && !player && !game.general.whitelistedPlayers.includes(passport.user)) {
		return;
	}

	const user = userList.find(u => passport.user === u.userName);

	if (!user || game.general.disableChat) {
		return;
	}

	data.userName = passport.user;

	const AEM = staffUserNames.includes(passport.user) || newStaff.modUserNames.includes(passport.user) || newStaff.editorUserNames.includes(passport.user);
	if (!AEM) {
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

	if (AEM) {
		const aemForce = /forcevote (\d{1,2}) (ya|ja|nein|yes|no|true|false)/i.exec(chat);
		if (aemForce) {
			if (player) {
				socket.emit('sendAlert', 'You cannot force a vote whilst playing.');
				return;
			}
			const affectedPlayerNumber = parseInt(aemForce[1]) - 1;
			const voteString = aemForce[2].toLowerCase();
			const affectedPlayer = game.private.seatedPlayers[affectedPlayerNumber];
			if (!affectedPlayer) {
				socket.emit('sendAlert', `There is no seat {${affectedPlayerNumber + 1}}.`);
				return;
			}
			if (affectedPlayer.voteStatus.hasVoted) {
				socket.emit('sendAlert', `${affectedPlayer.userName} {${affectedPlayerNumber + 1}} has already voted.`);
				return;
			}
			let vote = false;
			if (voteString == 'ya' || voteString == 'ja' || voteString == 'yes' || voteString == 'true') vote = true;
			game.private.unSeatedGameChats = [
				{
					gameChat: true,
					timestamp: new Date(),
					chat: [
						{
							text: 'An AEM member has forced '
						},
						{
							text: `${affectedPlayer.userName} {${affectedPlayerNumber + 1}}`,
							type: 'player'
						},
						{
							text: ' to vote '
						},
						{
							text: `${vote ? 'ja' : 'nein'}`,
							type: 'player'
						},
						{
							text: '.'
						}
					]
				}
			];
			selectVoting({ user: affectedPlayer.userName }, game, { vote });
			sendPlayerChatUpdate(game, data);
			return;
		}
	}

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
		const lastMessage = game.chats
			.filter(chat => !chat.gameChat && typeof chat.chat === 'string' && chat.userName === user.userName)
			.reduce(
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
			sendPlayerChatUpdate(game, data);
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
	if (!user || user.isPrivate) return;

	if (!data.chat) return;
	data.chat = data.chat.trim();
	if (data.chat.length > 300 || !data.chat.length) return;

	const curTime = new Date();
	const lastMessage = generalChats.list
		.filter(chat => chat.userName === user.userName)
		.reduce(
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
					(setting === 'blacklist' && data[setting].length <= 30) ||
					(setting === 'staffDisableVisibleElo' && account.staffRole && account.staffRole !== 'contributor' && account.staffRole !== 'trialmod') ||
					(setting === 'staffIncognito' && account.staffRole && account.staffRole !== 'contributor' && account.staffRole !== 'trialmod')
				) {
					account.gameSettings[setting] = data[setting];
				}

				if (setting === 'staffIncognito' && account.staffRole && account.staffRole !== 'contributor' && account.staffRole !== 'trialmod') {
					if (data.staffIncognito) {
						userList.splice(userList.findIndex(user => user.userName === passport.user), 1);
					} else {
						const userListInfo = {
							userName: passport.user,
							staffRole: account.staffRole || '',
							staffDisableVisibleElo: account.gameSettings.staffDisableVisibleElo,
							staffDisableStaffColor: account.gameSettings.staffDisableStaffColor,
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
							eloOverall: account.eloOverall,
							eloSeason: account.eloSeason,
							status: {
								type: 'none',
								gameId: null
							}
						};

						userListInfo[`winsSeason${currentSeasonNumber}`] = account[`winsSeason${currentSeasonNumber}`];
						userListInfo[`lossesSeason${currentSeasonNumber}`] = account[`lossesSeason${currentSeasonNumber}`];
						userListInfo[`rainbowWinsSeason${currentSeasonNumber}`] = account[`rainbowWinsSeason${currentSeasonNumber}`];
						userListInfo[`rainbowLossesSeason${currentSeasonNumber}`] = account[`rainbowLossesSeason${currentSeasonNumber}`];
						userList.push(userListInfo);
					}
					sendUserList();
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
				account.gameSettings.isPrivate = currentPrivate;
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
 * @param {object} game - game reference.
 */
module.exports.handleSubscribeModChat = (socket, passport, game) => {
	// Authentication Assured in routes.js

	if (game.private.hiddenInfoSubscriptions.includes(passport.user)) return;

	if (game.private.hiddenInfoShouldNotify) {
		makeReport(`AEM user ${passport.user} has subscribed to mod chat for a game without an auto-report.`, game);
		game.private.hiddenInfoShouldNotify = false;
	}

	const modOnlyChat = {
		timestamp: new Date(),
		gameChat: true,
		chat: [{ text: `${passport.user} has subscribed to mod chat. Current deck: ` }]
	};
	game.private.policies.forEach(policy => {
		modOnlyChat.chat.push({
			text: policy === 'liberal' ? 'B' : 'R',
			type: policy
		});
	});
	game.private.hiddenInfoChat.push(modOnlyChat);
	game.private.hiddenInfoSubscriptions.push(passport.user);
	sendInProgressGameUpdate(game);
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

	if ((!data.ip || data.ip === '') && (data.action === 'timeOut' || data.action === 'ipban' || data.action === 'getIP' || data.action === 'clearTimeoutIP')) {
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
		newStaff.editorUserNames.includes(passport.user) ||
		newStaff.trialmodUserNames.includes(passport.user)
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
					io.sockets.sockets[affectedSocketId].disconnect();
				}

				if (bannedUserlistIndex >= 0) {
					userList.splice(bannedUserlistIndex, 1);
				}

				destroySession(username);
			};

			/**
			 * @param {string} username - name of user.
			 */
			const banAccount = username => {
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
			};

			switch (data.action) {
				case 'clearTimeout':
					Account.findOne({ username: data.userName })
						.then(account => {
							if (account) {
								account.isTimeout = new Date(0);
								account.isBanned = false;
								account.save();
							} else {
								socket.emit('sendAlert', `No account found with a matching username: ${data.userName}`);
							}
						})
						.catch(err => {
							console.log(err, 'clearTimeout user err');
						});
					break;
				case 'clearTimeoutIP':
					BannedIP.remove({ ip: data.ip }, (err, res) => {
						if (err) socket.emit('sendAlert', `IP clear failed:\n${err}`);
					});
					break;
				case 'modEndGame':
					const gameToEnd = games[data.uid];

					if (gameToEnd) {
						gameToEnd.chats.push({
							userName: data.modName,
							chat: 'This game has been ended by a moderator, game deletes in 5 seconds.',
							isBroadcast: true,
							timestamp: new Date()
						});
						completeGame(gameToEnd, data.winningTeamName);
						setTimeout(() => {
							gameToEnd.publicPlayersState.forEach(player => (player.leftGame = true));
							delete games[gameToEnd.general.uid];
							sendGameList();
						}, 5000);
					}
					break;
				case 'setVerified':
					Account.findOne({ username: data.userName }).then(account => {
						if (account) {
							account.verified = true;
							account.verification.email = 'mod@VERIFIEDVIAMOD.info';
							account.save();
						} else socket.emit('sendAlert', `No account found with a matching username: ${data.userName}`);
					});
					break;
				case 'makeBypass':
					const key = createNewBypass();
					if (modaction.modNotes.length) modaction.modNotes += '\n';
					modaction.modNotes += `Created bypass key: ${key}`;
					socket.emit('sendAlert', `Created bypass key: ${key}`);
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

					Object.keys(games).forEach(gameName => {
						games[gameName].chats.push({
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
				case 'timeOut4':
					Account.findOne({ username: data.userName })
						.then(account => {
							if (account) {
								account.isTimeout6Hour = new Date();
								account.save(() => {
									logOutUser(data.userName);
								});
							} else {
								socket.emit('sendAlert', `No account found with a matching username: ${data.userName}`);
							}
						})
						.catch(err => {
							console.log(err, 'timeout4 user err');
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
								logOutUser(data.userName);
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
								const user = userList.find(u => u.userName === data.userName);
								if (user) {
									user.customCardback = '';
									userListEmitter.send = true;
								}
								Object.keys(games).forEach(uid => {
									const game = games[uid];
									const foundUser = game.publicPlayersState.find(user => user.userName === data.userName);
									if (foundUser) {
										foundUser.customCardback = '';
										io.sockets.in(uid).emit('gameUpdate', secureGame(game));
										sendGameList();
									}
								});
								account.save(() => {
									if (io.sockets.sockets[affectedSocketId]) {
										io.sockets.sockets[affectedSocketId].emit('gameSettings', account.gameSettings);
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
				case 'enableLimitNewPlayers':
					limitNewPlayers.status = true;
					break;
				case 'disableLimitNewPlayers':
					limitNewPlayers.status = false;
					break;
				case 'removeStaffRole':
					if (isSuperMod) {
						Account.findOne({ username: data.userName })
							.then(account => {
								if (account) {
									account.staffRole = '';
									account.save(() => {
										let idx = newStaff.modUserNames.indexOf(account.username);
										if (idx != -1) newStaff.modUserNames.splice(idx, 1);
										idx = newStaff.editorUserNames.indexOf(account.username);
										if (idx != -1) newStaff.editorUserNames.splice(idx, 1);
										idx = newStaff.trialmodUserNames.indexOf(account.username);
										if (idx != -1) newStaff.trialmodUserNames.splice(idx, 1);
										idx = newStaff.contributorUserNames.indexOf(account.username);
										if (idx != -1) newStaff.contributorUserNames.splice(idx, 1);
										logOutUser(account.username);
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
				case 'promoteToContributor':
					if (isSuperMod) {
						Account.findOne({ username: data.userName })
							.then(account => {
								if (account) {
									account.staffRole = 'contributor';
									account.save(() => {
										newStaff.contributorUserNames.push(account.username);
										logOutUser(account.username);
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
				case 'promoteToTrialMod':
					if (isSuperMod) {
						Account.findOne({ username: data.userName })
							.then(account => {
								if (account) {
									account.staffRole = 'trialmod';
									account.save(() => {
										newStaff.trialmodUserNames.push(account.username);
										logOutUser(account.username);
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
										logOutUser(account.username);
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
										logOutUser(account.username);
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
						setTimeout(() => {
							crashServer();
						}, 1000);
					} else {
						socket.emit('sendAlert', 'Only editors and admins can restart the server.');
						return;
					}
					break;
				default:
					if (data.userName.substr(0, 7) === 'DELGAME') {
						const game = games[data.userName.slice(7)];

						if (game) {
							delete games[game.general.uid];
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
	const user = userList.find(u => u.userName === passport.user);

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
	const httpEscapedComment = data.comment.replace(/( |^)(https?:\/\/\S+)( |$)/gm, '$1<$2>$3');
	const body = JSON.stringify({
		content: `Game UID: <https://secrethitler.io/game/#/table/${data.uid}>\nReported player: ${data.reportedPlayer}\nReason: ${
			data.reason
		}\nComment: ${httpEscapedComment}`
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

	const game = games[data.uid];

	if (game) {
		if (!game.reportCounts) game.reportCounts = {};
		if (!game.reportCounts[passport.user]) game.reportCounts[passport.user] = 0;
		if (game.reportCounts[passport.user] >= 4) {
			return;
		}
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
 * @param {function} callback - success callback.
 */
module.exports.checkUserStatus = (socket, callback) => {
	const { passport } = socket.handshake.session;

	if (passport && Object.keys(passport).length) {
		const { user } = passport;
		const { sockets } = io.sockets;

		const game = games[Object.keys(games).find(gameName => games[gameName].publicPlayersState.find(player => player.userName === user && !player.leftGame))];

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

		const reconnectingUser = game ? game.publicPlayersState.find(player => player.userName === user) : undefined;

		if (game && game.gameState.isStarted && !game.gameState.isCompleted && reconnectingUser) {
			reconnectingUser.connected = true;
			socket.join(game.general.uid);
			socket.emit('updateSeatForUser');
			sendInProgressGameUpdate(game);
		}

		if (user) {
			// Double-check the user isn't sneaking past IP bans.
			const logOutUser = username => {
				const bannedUserlistIndex = userList.findIndex(user => user.userName === username);

				socket.emit('manualDisconnection');
				socket.disconnect(true);

				if (bannedUserlistIndex >= 0) {
					userList.splice(bannedUserlistIndex, 1);
				}

				destroySession(username);
			};
			testIP(expandAndSimplify(socket.handshake.address), banType => {
				if (banType && banType != 'new') logOutUser(user);
				else {
					Account.findOne({ username: user }, function(err, account) {
						if (account) {
							if (
								account.isBanned ||
								(account.isTimeout && new Date().getTime() - new Date(account.isTimeout).getTime() < 64800000) ||
								(account.isTimeout6Hour && new Date().getTime() - new Date(account.isTimeout6Hour).getTime() < 21600000)
							) {
								logOutUser(user);
							} else {
								testIP(account.lastConnectedIP, banType => {
									if (banType && banType != 'new') logOutUser(user);
									else {
										sendUserList();
										callback();
									}
								});
							}
						}
					});
				}
			});
		} else callback();
	} else callback();
};

module.exports.handleUserLeaveGame = handleUserLeaveGame;

module.exports.handleSocketDisconnect = handleSocketDisconnect;
