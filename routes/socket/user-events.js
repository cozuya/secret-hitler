const {
	generalChats,
	accountCreationDisabled,
	bypassVPNCheck,
	ipbansNotEnforced,
	gameCreationDisabled,
	limitNewPlayers,
	currentSeasonNumber,
	newStaff,
	createNewBypass,
	setGameAsync,
	deleteGameAsync,
	getGamesAsync,
	pushGameChatsAsync,
	deleteGameChatsAsync,
	scanGamesAsync,
	getGeneralChatsAsync,
	setGeneralChatsAsync,
	pushGeneralChatsAsync,
	getServerSettingAsync,
	getRangeUserlistAsync,
	spliceUserFromUserList,
} = require('./models');
const {
	sendGeneralChats,
	getModInfo,
	sendGameList,
	sendUserList,
	updateUserStatus,
	sendGameInfo,
	sendUserReports,
} = require('./user-requests');
const { selectVoting } = require('./game/election.js');
const { selectChancellor } = require('./game/election-util.js');
const Account = require('../../models/account');
const ModAction = require('../../models/modAction');
const PlayerReport = require('../../models/playerReport');
const BannedIP = require('../../models/bannedIP');
const Profile = require('../../models/profile/index');
const startGame = require('./game/start-game.js');
const { completeGame } = require('./game/end-game');
const { secureGame } = require('./util.js');
// const crypto = require('crypto');
const https = require('https');
const _ = require('lodash');
const { sendInProgressGameUpdate, sendPlayerChatUpdate } = require('./util.js');
const animals = require('../../utils/animals');
const adjectives = require('../../utils/adjectives');
const { generateCombination } = require('gfycat-style-urls');
const { obfIP } = require('./ip-obf');
const { LEGALCHARACTERS } = require('../../src/frontend-scripts/node-constants');
const { makeReport } = require('./report.js');
const { chatReplacements } = require('./chatReplacements');
const generalChatReplTime = Array(chatReplacements.length + 1).fill(0);

console.log(process.env.NODE_ENV);
/**
 * @param {object} game - game to act on.
 * @return {string} status text.
 */
const displayWaitingForPlayers = (game) => {
	if (game.general.isTourny) {
		const count = game.general.maxPlayersCount - game.general.tournyInfo.queuedPlayers.length;

		return count === 1 ? `Waiting for ${count} more player..` : `Waiting for ${count} more players..`;
	}
	const includedPlayerCounts = _.range(game.general.minPlayersCount, game.general.maxPlayersCount).filter(
		(value) => !game.general.excludedPlayerCount.includes(value)
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
const startCountdown = (game) => {
	if (game.gameState.isStarted) {
		return;
	}

	game.gameState.isStarted = true;
	let startGamePause = game.general.isTourny ? 5 : 20;

	const countDown = setInterval(async () => {
		if (game.gameState.cancellStart) {
			game.gameState.cancellStart = false;
			game.gameState.isStarted = false;
			await setGameAsync(game);
			clearInterval(countDown);
		} else if (startGamePause === 4 || game.publicPlayersState.length === game.general.maxPlayersCount) {
			clearInterval(countDown);

			if (game.general.isTourny) {
				const { queuedPlayers } = game.general.tournyInfo;
				const players = _.shuffle(queuedPlayers);
				const gameA = _.cloneDeep(game);
				const APlayers = players.filter((player, index) => index < game.general.maxPlayersCount / 2);
				const BPlayers = players.filter((player) => !APlayers.includes(player));
				const APlayerNames = APlayers.map((player) => player.userName);
				const BPlayerNames = BPlayers.map((player) => player.userName);
				const ASocketIds = Object.keys(io.sockets.sockets).filter(
					(socketId) =>
						io.sockets.sockets[socketId].handshake.session.passport &&
						APlayerNames.includes(io.sockets.sockets[socketId].handshake.session.passport.user)
				);
				const BSocketIds = Object.keys(io.sockets.sockets).filter(
					(socketId) =>
						io.sockets.sockets[socketId].handshake.session.passport &&
						BPlayerNames.includes(io.sockets.sockets[socketId].handshake.session.passport.user)
				);

				gameA.general.uid = `${game.general.uid}TableA`;
				gameA.general.minPlayersCount = gameA.general.maxPlayersCount = game.general.maxPlayersCount / 2;
				gameA.publicPlayersState = APlayers;

				const gameB = _.cloneDeep(gameA);
				gameB.general.uid = `${game.general.uid}TableB`;
				gameB.publicPlayersState = BPlayers;

				ASocketIds.forEach((id) => {
					const socket = io.sockets.sockets[id];

					Object.keys(socket.rooms).forEach((roomUid) => {
						socket.leave(roomUid);
					});
					socket.join(gameA.general.uid);
					socket.emit('joinGameRedirect', gameA.general.uid);
				});

				BSocketIds.forEach((id) => {
					const socket = io.sockets.sockets[id];

					Object.keys(socket.rooms).forEach((roomUid) => {
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
						.map(
							(animal, index) =>
								`${_shuffledAdjectives[index].charAt(0).toUpperCase()}${_shuffledAdjectives[index].slice(1)} ${animal}`
						);

					gameB.general.replacementNames = _.shuffle(animals)
						.slice(0, gameB.publicPlayersState.length)
						.map(
							(animal, index) =>
								`${_shuffledAdjectives[index].charAt(0).toUpperCase()}${_shuffledAdjectives[index].slice(1)} ${animal}`
						);
				}

				startGame(gameA);
				startGame(gameB);
				sendGameList();
			} else {
				if (game.general.blindMode) {
					const _shuffledAdjectives = _.shuffle(adjectives);

					game.general.replacementNames = _.shuffle(animals)
						.slice(0, game.publicPlayersState.length)
						.map(
							(animal, index) =>
								`${_shuffledAdjectives[index].charAt(0).toUpperCase()}${_shuffledAdjectives[index].slice(1)} ${animal}`
						);
					await setGameAsync(game);
				}

				startGame(game);
			}
		} else {
			game.general.status = game.general.isTourny
				? `Tournament starts in ${startGamePause} second${startGamePause === 1 ? '' : 's'}.`
				: `Game starts in ${startGamePause} second${startGamePause === 1 ? '' : 's'}.`;

			await setGameAsync(game);
			io.in(game.general.uid).emit('gameUpdate', secureGame(game));
		}
		startGamePause--;
	}, 1000);
};

/**
 * @param {object} game - game to act on.
 */
const checkStartConditions = async (game) => {
	let toUpdateGame = false;

	if (game.gameState.isTracksFlipped) {
		return;
	}

	if (game.electionCount !== 0) {
		game.electionCount = 0;
		toUpdateGame = true;
	}

	if (
		game.gameState.isStarted &&
		(game.publicPlayersState.length < game.general.minPlayersCount ||
			game.general.excludedPlayerCount.includes(game.publicPlayersState.length))
	) {
		game.gameState.cancellStart = true;
		game.general.status = displayWaitingForPlayers(game);
		toUpdateGame = true;
	} else if (
		(!game.gameState.isStarted &&
			game.publicPlayersState.length >= game.general.minPlayersCount &&
			!game.general.excludedPlayerCount.includes(game.publicPlayersState.length)) ||
		(game.general.isTourny && game.general.tournyInfo.queuedPlayers.length === game.general.maxPlayersCount)
	) {
		game.remakeData = game.publicPlayersState.map((player) => ({
			userName: player.userName,
			isRemaking: false,
			remakeTime: 0,
		}));
		startCountdown(game);
		toUpdateGame = true;
	} else if (!game.gameState.isStarted) {
		game.general.status = displayWaitingForPlayers(game);
		toUpdateGame = true;
	}

	if (toUpdateGame) {
		await setGameAsync(game);
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
		queuedPlayers.findIndex((player) => player.userName === playerName),
		1
	);

	game.chats.push({
		timestamp: new Date(),
		gameChat: true,
		chat: [
			{
				text: playerName,
				type: 'player',
			},
			{
				text: ` (${queuedPlayers.length}/${game.general.maxPlayersCount}) has left the tournament queue.`,
			},
		],
	});
	game.general.status = displayWaitingForPlayers(game);
	sendInProgressGameUpdate(game);
};

/**
 * @param {object} socket - user socket reference.
 */
const handleSocketDisconnect = async (socket) => {
	const { passport } = socket.handshake.session;

	if (passport && Object.keys(passport).length) {
		await spliceUserFromUserList(passport.user);

		if (passport.gameUidUserIsSeatedIn) {
			const game = JSON.parse(await getGamesAsync(passport.gameUidUserIsSeatedIn));
			if (!game) {
				return;
			}
			const { gameState, publicPlayersState } = game;
			const playerIndex = publicPlayersState.findIndex((player) => player.userName === passport.user);

			if (
				(!gameState.isStarted && publicPlayersState.length === 1) ||
				(gameState.isCompleted &&
					publicPlayersState.filter((player) => !player.connected || player.leftGame).length ===
						game.general.playerCount - 1)
			) {
				deleteGameAsync(game.general.uid);
				// deleteGameChatsAsync(gameName);
			} else if (!gameState.isTracksFlipped && playerIndex > -1) {
				publicPlayersState.splice(playerIndex, 1);
				checkStartConditions(game);
				await setGameAsync(game);
				io.to(game.uid).emit('gameUpdate', game);
			} else if (gameState.isTracksFlipped && publicPlayersState[playerIndex]) {
				publicPlayersState[playerIndex].connected = false;
				const playerRemakeData = game.remakeData && game.remakeData.find((player) => player.userName === passport.user);

				if (playerRemakeData && playerRemakeData.isRemaking) {
					const minimumRemakeVoteCount = game.general.playerCount - game.customGameSettings.fascistCount;
					const remakePlayerCount = game.remakeData.filter((player) => player.isRemaking).length;

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
								text: 'A player',
							},
						],
					};

					chat.chat.push({
						text: ` has left and rescinded their vote to ${
							game.general.isTourny ? 'cancel this tournament.' : 'remake this game.'
						} (${remakePlayerCount - 1}/${minimumRemakeVoteCount})`,
					});

					await pushGameChatsAsync(game, chat);
					game.remakeData.find((player) => player.userName === passport.user).isRemaking = false;
				}

				sendInProgressGameUpdate(game);
				if (
					game.publicPlayersState.filter((publicPlayer) => publicPlayer.leftGame).length === game.general.playerCount
				) {
					deleteGameAsync(game.general.uid);
					// deleteGameChatsAsync(game.general.uid);
				}
			}
			sendGameList();
			passport.gameUidUserIsSeatedIn = null;
		}
	}

	sendUserList();
};

/**
 * @param {object} socket - user socket reference.
 * @param {object} game - target game.
 * @param {object} data - from socket emit.
 * @param {object} passport - socket authentication.
 */
const handleUserLeaveGame = async (socket, game, data, passport) => {
	const playerIndex = game.publicPlayersState.findIndex((player) => player.userName === passport.user);

	if (playerIndex > -1) {
		const playerRemakeData = game.remakeData && game.remakeData.find((player) => player.userName === passport.user);

		if (playerRemakeData && playerRemakeData.isRemaking) {
			// Count leaving the game as rescinded remake vote.
			const minimumRemakeVoteCount = game.general.playerCount - game.customGameSettings.fascistCount;
			const remakePlayerCount = game.remakeData.filter((player) => player.isRemaking).length;

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
						text: 'A player',
					},
				],
			};
			chat.chat.push({
				text: ` has left and rescinded their vote to ${
					game.general.isTourny ? 'cancel this tournament.' : 'remake this game.'
				} (${remakePlayerCount - 1}/${minimumRemakeVoteCount})`,
			});

			game.remakeData.find((player) => player.userName === passport.user).isRemaking = false;
			await pushGameChatsAsync(game, chat);
		}

		if (game.gameState.isTracksFlipped) {
			game.publicPlayersState[playerIndex].leftGame = true;
			console.log(
				game.publicPlayersState.map((p) => ({
					leftGame: Boolean(p.leftGame),
					userName: p.userName,
				})),
				'pub1'
			);
			await setGameAsync(game);
			console.log(
				game.publicPlayersState.map((p) => ({
					leftGame: Boolean(p.leftGame),
					userName: p.userName,
				})),
				'pub2'
			);
		}

		console.log(
			game.publicPlayersState.map((p) => ({
				leftGame: Boolean(p.leftGame),
				userName: p.userName,
			})),
			'pub3'
		);

		if (game.publicPlayersState.filter((publicPlayer) => publicPlayer.leftGame).length === game.general.playerCount) {
			io.sockets.in(game.general.uid).emit('gameUpdate', game);

			console.log('deleted game ');
			await deleteGameAsync(game.general.uid);
			// deleteGameChatsAsync(game.general.uid);
		}

		if (!game.gameState.isTracksFlipped) {
			game.publicPlayersState.splice(
				game.publicPlayersState.findIndex((player) => player.userName === passport.user),
				1
			);
			checkStartConditions(game);
			await setGameAsync(game);
			io.sockets.in(game.general.uid).emit('gameUpdate', game);
		}
	}

	if (
		game.general.isTourny &&
		game.general.tournyInfo.round === 0 &&
		passport &&
		game.general.tournyInfo.queuedPlayers.map((player) => player.userName).find((name) => name === passport.user)
	) {
		playerLeavePretourny(game, passport.user);
	}

	if (
		(!game.publicPlayersState.length && !(game.general.isTourny && game.general.tournyInfo.round === 0)) ||
		(game.general.isTourny && game.general.tournyInfo.round === 0 && !game.general.tournyInfo.queuedPlayers.length)
	) {
		io.to(game.general.uid).emit('gameUpdate', {});

		if (!game.summarySaved && game.gameState.isTracksFlipped) {
			const summary = game.private.summary.publish();
			if (summary && summary.toObject() && game.general.uid !== 'devgame' && !game.general.private) {
				summary.save();
				game.summarySaved = true;
				await setGameAsync(game);
			}
		}

		console.log('delete fired in leavegame');
		await deleteGameAsync(game.general.uid);
	} else if (game.gameState.isTracksFlipped) {
		sendInProgressGameUpdate(game);
	}

	if (!data.isRemake) {
		updateUserStatus(passport, null);
		socket.emit('gameUpdate', {});
	}

	socket.join('sidebarInfoSubscription');
	socket.join('gameListInfoSubscription');
	sendUserList(socket);
	sendGeneralChats(socket);
	sendGameList();
};

module.exports.handleUserLeaveGame = handleUserLeaveGame;

/**
 * @param {object} socket - user socket reference.
 * @param {object} passport - socket authentication.
 * @param {object} data - from socket emit.
 */
module.exports.handleUpdatedTheme = (socket, passport, data) => {
	const fields = ['primaryColor', 'secondaryColor', 'tertiaryColor', 'backgroundColor', 'textColor'];

	Account.findOne({ username: passport && passport.user }).then((account) => {
		if (!account) {
			return;
		}

		for (const field of fields) {
			if (data[field]) {
				account[field] = data[field];
			}
		}

		account.save();
	});
};

/**
 * @param {object} game - game reference.
 * @param {object} socket - user socket reference.
 * @param {object} passport - socket authentication.
 * @param {object} data - from socket emit.
 */
const updateSeatedUser = (game, socket, passport, data) => {
	if (!game || game.gameState.isTracksFlipped) {
		return; // Game already started
	}

	Account.findOne({ username: passport.user }).then(async (account) => {
		const isNotMaxedOut = game.publicPlayersState.length < game.general.maxPlayersCount;
		const isNotInGame = !game.publicPlayersState.find((player) => player.userName === passport.user);
		const isRainbowSafe = !game.general.rainbowgame || (game.general.rainbowgame && account.wins + account.losses > 49);
		const isPrivateSafe =
			!game.general.private ||
			(game.general.private &&
				(data.password === game.private.privatePassword || game.general.whitelistedPlayers.includes(passport.user)));
		const isBlacklistSafe =
			!game.general.gameCreatorBlacklist || !game.general.gameCreatorBlacklist.includes(passport.user);
		const isMeetingEloMinimum =
			!game.general.eloMinimum ||
			game.general.eloMinimum <= account.eloSeason ||
			game.general.eloMinimum <= account.eloOverall;

		if (account.wins + account.losses < 3 && limitNewPlayers && limitNewPlayers.status && !game.general.private) {
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
				specialTournamentStatus: account.gameSettings.specialTournamentStatus,
				staffDisableVisibleElo: account.gameSettings.staffDisableVisibleElo,
				staffDisableStaffColor: account.gameSettings.staffDisableStaffColor,
				cardStatus: {
					cardDisplayed: false,
					isFlipped: false,
					cardFront: 'secretrole',
					cardBack: {},
				},
			};

			if (game.general.isTourny) {
				if (
					game.general.tournyInfo.queuedPlayers.map((player) => player.userName).includes(player.userName) ||
					game.general.tournyInfo.queuedPlayers.length >= game.general.maxPlayersCount
				) {
					return;
				}
				game.general.tournyInfo.queuedPlayers.push(player);
				await pushGameChatsAsync(game, {
					timestamp: new Date(),
					gameChat: true,
					chat: [
						{
							text: `${passport.user}`,
							type: 'player',
						},
						{
							text: ` (${game.general.tournyInfo.queuedPlayers.length}/${game.general.maxPlayersCount}) has entered the tournament queue.`,
						},
					],
				});
			} else {
				publicPlayersState.unshift(player);
			}
			passport.gameUidUserIsSeatedIn = game.general.uid;
			await setGameAsync(game);
			socket.emit('updateSeatForUser', true);
			checkStartConditions(game);
			updateUserStatus(passport, game);
			sendGameList();
			io.sockets.in(data.uid).emit('gameUpdate', secureGame(game));
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
	Account.findOne({ username: passport.user }).then((account) => {
		account.bio = data;
		account.save();
	});
};

/**
 * @param {object} socket - user socket reference.
 * @param {object} passport - socket authentication.
 * @param {object} data - from socket emit.
 */
module.exports.handleAddNewGame = async (socket, passport, data) => {
	const isGameCreationDisabled = await getServerSettingAsync('gameCreationDisabled');
	const isLimitNewPlayers = await getServerSettingAsync('limitNewPlayers');
	const account = await Account.findOne({ username: passport.user });
	const { user } = passport;

	if (
		!account ||
		isGameCreationDisabled ||
		(!data.privatePassword && isLimitNewPlayers && isLimitNewPlayers.status) ||
		!data ||
		!data.gameName ||
		data.gameName.length > 20 ||
		!LEGALCHARACTERS(data.gameName) ||
		(data.eloSliderValue && (account.eloSeason < data.eloSliderValue || account.eloOverall < data.eloSliderValue))
	) {
		return;
	}

	const currentTime = new Date();

	let playerCounts = [];

	for (let a = Math.max(data.minPlayersCount, 5); a <= Math.min(10, data.maxPlayersCount); a++) {
		if (!data.excludedPlayerCount.includes(a)) {
			playerCounts.push(a);
		}
	}

	if (playerCounts.length === 0) {
		// Someone is messing with the data, ignore it
		return;
	}

	const excludes = [];

	for (let a = playerCounts[0]; a <= playerCounts[playerCounts.length - 1]; a++) {
		if (!playerCounts.includes(a)) {
			excludes.push(a);
		}
	}

	if (data.customGameSettings && data.customGameSettings.enabled) {
		if (!data.customGameSettings.deckState || !data.customGameSettings.trackState) {
			return;
		}

		const validPowers = ['investigate', 'deckpeek', 'election', 'bullet', 'reverseinv', 'peekdrop'];

		if (
			!data.customGameSettings.powers ||
			data.customGameSettings.powers.length !== 5 ||
			!(data.customGameSettings.hitlerZone >= 1) ||
			data.customGameSettings.hitlerZone > 5 ||
			!data.customGameSettings.vetoZone ||
			data.customGameSettings.vetoZone <= data.customGameSettings.trackState.fas ||
			data.customGameSettings.vetoZone > 5
		) {
			return;
		}

		for (let a = 0; a < 5; a++) {
			if (data.customGameSettings.powers[a] == '' || data.customGameSettings.powers[a] == 'null') {
				data.customGameSettings.powers[a] = null;
			} else if (data.customGameSettings.powers[a] && !validPowers.includes(data.customGameSettings.powers[a])) {
				return;
			}
		}

		// Ensure that there is never a fas majority at the start.
		// Custom games should probably require a fixed player count, which will be in playerCounts[0] regardless.
		if (!(data.customGameSettings.fascistCount >= 1) || data.customGameSettings.fascistCount + 1 > playerCounts[0] / 2)
			return;

		// Ensure standard victory conditions can be met for both teams.
		if (!(data.customGameSettings.deckState.lib >= 5) || data.customGameSettings.deckState.lib > 8) return;
		if (!(data.customGameSettings.deckState.fas >= 6) || data.customGameSettings.deckState.fas > 19) return;

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
			enabled: false,
		};
	}
	const uid = generateCombination(3, '', true);

	const newGame = {
		gameState: {
			previousElectedGovernment: [],
			undrawnPolicyCount: 17,
			discardedPolicyCount: 0,
			presidentIndex: -1,
		},
		chats: [],
		general: {
			whitelistedPlayers: [],
			uid: data.isTourny ? `${generateCombination(3, '', true)}Tournament` : uid,
			name: account.isPrivate ? 'Private Game' : data.gameName ? data.gameName : 'New Game',
			flag: data.flag || 'none', // TODO: verify that the flag exists, or that an invalid flag does not cause issues
			minPlayersCount: 5,
			maxPlayersCount: 5,

			// minPlayersCount: playerCounts[0],
			// maxPlayersCount: playerCounts[playerCounts.length - 1],
			gameCreatorName: user,
			gameCreatorBlacklist: account.gameSettings.blacklist,
			excludedPlayerCount: excludes,
			status: `Waiting for ${playerCounts[0] - 1} more players..`,
			experiencedMode: data.experiencedMode,
			disableChat: data.disableChat,
			isVerifiedOnly: data.isVerifiedOnly,
			disableObserver: data.disableObserver && !data.isTourny,
			isTourny: false,
			lastModPing: 0,
			chatReplTime: Array(chatReplacements.length + 1).fill(0),
			disableGamechat: data.disableGamechat,
			rainbowgame: account.wins + account.losses > 49 ? data.rainbowgame : false,
			blindMode: data.blindMode,
			timedMode:
				typeof data.timedMode === 'number' && data.timedMode >= 2 && data.timedMode <= 6000 ? data.timedMode : false,
			flappyMode: data.flappyMode,
			flappyOnlyMode: data.flappyMode && data.flappyOnlyMode,
			casualGame:
				typeof data.timedMode === 'number' && data.timedMode < 30 && !data.casualGame ? true : data.casualGame,
			rebalance6p: data.rebalance6p,
			rebalance7p: data.rebalance7p,
			rebalance9p2f: data.rebalance9p2f,
			unlisted: data.unlistedGame && !data.privatePassword,
			private: account.isPrivate
				? data.privatePassword
					? data.privatePassword
					: 'private'
				: !data.unlistedGame && data.privatePassword,
			privateOnly: false,
			electionCount: 0,
			isRemade: false,
			eloMinimum: data.eloSliderValue,
		},
		customGameSettings: data.customGameSettings,
		publicPlayersState: [],
		playersState: [],
		cardFlingerState: [],
		trackState: {
			liberalPolicyCount: 0,
			fascistPolicyCount: 0,
			electionTrackerCount: 0,
			enactedPolicies: [],
		},
	};

	if (newGame.customGameSettings.enabled) {
		let chat = {
			timestamp: new Date(),
			gameChat: true,
			chat: [
				{
					text: 'There will be ',
				},
				{
					text: `${newGame.customGameSettings.deckState.lib - newGame.customGameSettings.trackState.lib} liberal`,
					type: 'liberal',
				},
				{
					text: ' and ',
				},
				{
					text: `${newGame.customGameSettings.deckState.fas - newGame.customGameSettings.trackState.fas} fascist`,
					type: 'fascist',
				},
				{
					text: ' policies in the deck.',
				},
			],
		};

		const t = chat.timestamp.getMilliseconds();
		await pushGameChatsAsync(newGame, chat);

		chat = {
			timestamp: new Date(),
			gameChat: true,
			chat: [
				{
					text: 'The game will start with ',
				},
				{
					text: `${newGame.customGameSettings.trackState.lib} liberal`,
					type: 'liberal',
				},
				{
					text: ' and ',
				},
				{
					text: `${newGame.customGameSettings.trackState.fas} fascist`,
					type: 'fascist',
				},
				{
					text: ' policies.',
				},
			],
		};
		chat.timestamp.setMilliseconds(t + 1);
		await pushGameChatsAsync(newGame, chat);
	}

	if (data.isTourny) {
		newGame.general.tournyInfo = {
			round: 0,
			queuedPlayers: [
				{
					userName: user,
					customCardback: account.gameSettings.customCardback,
					customCardbackUid: account.gameSettings.customCardbackUid,
					tournyWins: account.gameSettings.tournyWins,
					connected: true,
					cardStatus: {
						cardDisplayed: false,
						isFlipped: false,
						cardFront: 'secretrole',
						cardBack: {},
					},
				},
			],
		};
	} else {
		newGame.publicPlayersState = [
			{
				userName: user,
				customCardback: account.gameSettings.customCardback,
				customCardbackUid: account.gameSettings.customCardbackUid,
				previousSeasonAward: account.gameSettings.previousSeasonAward,
				specialTournamentStatus: account.gameSettings.specialTournamentStatus,
				tournyWins: account.gameSettings.tournyWins,
				connected: true,
				isPrivate: account.gameSettings.isPrivate,
				cardStatus: {
					cardDisplayed: false,
					isFlipped: false,
					cardFront: 'secretrole',
					cardBack: {},
				},
			},
		];
	}

	if (data.isTourny) {
		const { minPlayersCount } = newGame.general;

		newGame.general.minPlayersCount = newGame.general.maxPlayersCount =
			minPlayersCount === 1 ? 14 : minPlayersCount === 2 ? 16 : 18;
		newGame.general.status = `Waiting for ${newGame.general.minPlayersCount - 1} more players..`;
		await pushGameChatsAsync(newGame, {
			timestamp: new Date(),
			gameChat: true,
			chat: [
				{
					text: `${user}`,
					type: 'player',
				},
				{
					text: ` (${data.general.tournyInfo.queuedPlayers.length}/${data.general.maxPlayersCount}) has entered the tournament queue.`,
				},
			],
		});
	}

	newGame.private = {
		reports: {},
		unSeatedGameChats: [],
		lock: {},
		votesPeeked: false,
		invIndex: -1,
		hiddenInfoChat: [],
		hiddenInfoSubscriptions: [],
		hiddenInfoShouldNotify: true,
	};

	if (newGame.general.private) {
		newGame.private.privatePassword = newGame.general.private;
		newGame.general.private = true;
	}

	newGame.general.timeCreated = currentTime;
	updateUserStatus(passport, newGame);

	await setGameAsync(newGame);
	passport.gameUidUserIsSeatedIn = newGame.general.uid;
	sendGameList();
	socket.join(newGame.general.uid);
	socket.leave('gameListInfoSubscription');
	socket.emit('updateSeatForUser');
	socket.emit('gameUpdate', newGame);
	socket.emit('joinGameRedirect', newGame.general.uid);
};

/**
 * @param {object} socket - user socket reference.
 * @param {object} passport - socket authentication.
 * @param {object} game - target game.
 * @param {object} data - from socket emit.
 * @return {bool} - Success of adding claim
 */
module.exports.handleAddNewClaim = async (socket, passport, game, data) => {
	const playerIndex = game.publicPlayersState.findIndex((player) => player.userName === passport.user);

	if (
		(game &&
			game.private &&
			game.private.seatedPlayers &&
			game.private.seatedPlayers[playerIndex] &&
			game.private.seatedPlayers[playerIndex].playersState &&
			game.private.seatedPlayers[playerIndex].playersState[playerIndex] &&
			!/^(wasPresident|wasChancellor|didSinglePolicyPeek|didPolicyPeek|didInvestigateLoyalty)$/.exec(
				game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim
			)) ||
		!game.private ||
		!game.private.summary ||
		game.publicPlayersState[playerIndex].isDead
	) {
		return;
	}

	const { blindMode, replacementNames } = game.general;

	const chat = (() => {
		let text;

		switch (data.claim) {
			case 'wasPresident':
				text = [
					{
						text: 'President ',
					},
					{
						text: blindMode
							? `${replacementNames[playerIndex]} {${playerIndex + 1}} `
							: `${passport.user} {${playerIndex + 1}} `,
						type: 'player',
					},
				];
				switch (data.claimState) {
					case 'rrr':
						// game.private.summary = game.private.summary.updateLog(
						// 	{
						// 		presidentClaim: { reds: 3, blues: 0 },
						// 	},
						// 	{ presidentId: playerIndex }
						// );

						text.push(
							{
								text: 'claims ',
							},
							{
								text: 'RRR',
								type: 'fascist',
							},
							{
								text: '.',
							}
						);

						return text;
					case 'rrb':
						// game.private.summary = game.private.summary.updateLog(
						// 	{
						// 		presidentClaim: { reds: 2, blues: 1 },
						// 	},
						// 	{ presidentId: playerIndex }
						// );

						text.push(
							{
								text: 'claims ',
							},
							{
								text: 'RR',
								type: 'fascist',
							},
							{
								text: 'B',
								type: 'liberal',
							},
							{
								text: '.',
							}
						);

						return text;
					case 'rbb':
						// game.private.summary = game.private.summary.updateLog(
						// 	{
						// 		presidentClaim: { reds: 1, blues: 2 },
						// 	},
						// 	{ presidentId: playerIndex }
						// );

						text.push(
							{
								text: 'claims ',
							},
							{
								text: 'R',
								type: 'fascist',
							},
							{
								text: 'BB',
								type: 'liberal',
							},
							{
								text: '.',
							}
						);

						return text;
					case 'bbb':
						// game.private.summary = game.private.summary.updateLog(
						// 	{
						// 		presidentClaim: { reds: 0, blues: 3 },
						// 	},
						// 	{ presidentId: playerIndex }
						// );

						text.push(
							{
								text: 'claims ',
							},
							{
								text: 'BBB',
								type: 'liberal',
							},
							{
								text: '.',
							}
						);

						return text;
				}

			case 'wasChancellor':
				text = [
					{
						text: 'Chancellor ',
					},
					{
						text: blindMode
							? `${replacementNames[playerIndex]} {${playerIndex + 1}} `
							: `${passport.user} {${playerIndex + 1}} `,
						type: 'player',
					},
				];
				switch (data.claimState) {
					case 'rr':
						// game.private.summary = game.private.summary.updateLog(
						// 	{
						// 		chancellorClaim: { reds: 2, blues: 0 },
						// 	},
						// 	{ chancellorId: playerIndex }
						// );

						text.push(
							{
								text: 'claims ',
							},
							{
								text: 'RR',
								type: 'fascist',
							},
							{
								text: '.',
							}
						);

						return text;
					case 'rb':
						// game.private.summary = game.private.summary.updateLog(
						// 	{
						// 		chancellorClaim: { reds: 1, blues: 1 },
						// 	},
						// 	{ chancellorId: playerIndex }
						// );

						text.push(
							{
								text: 'claims ',
							},
							{
								text: 'R',
								type: 'fascist',
							},
							{
								text: 'B',
								type: 'liberal',
							},
							{
								text: '.',
							}
						);

						return text;
					case 'bb':
						// game.private.summary = game.private.summary.updateLog(
						// 	{
						// 		chancellorClaim: { reds: 0, blues: 2 },
						// 	},
						// 	{ chancellorId: playerIndex }
						// );

						text.push(
							{
								text: 'claims ',
							},
							{
								text: 'BB',
								type: 'liberal',
							},
							{
								text: '.',
							}
						);

						return text;
				}
			case 'didSinglePolicyPeek':
				if (data.claimState === 'liberal' || data.claimState === 'fascist') {
					text = [
						{
							text: 'President ',
						},
						{
							text: blindMode
								? `${replacementNames[playerIndex]} {${playerIndex + 1}} `
								: `${passport.user} {${playerIndex + 1}} `,
							type: 'player',
						},
						{
							text: ' claims to have peeked at a ',
						},
						{
							text: data.claimState,
							type: data.claimState,
						},
						{
							text: ' policy.',
						},
					];
					return text;
				}
			case 'didPolicyPeek':
				text = [
					{
						text: 'President ',
					},
					{
						text: blindMode
							? `${replacementNames[playerIndex]} {${playerIndex + 1}} `
							: `${passport.user} {${playerIndex + 1}} `,
						type: 'player',
					},
				];
				switch (data.claimState) {
					case 'rrr':
						// game.private.summary = game.private.summary.updateLog(
						// 	{
						// 		policyPeekClaim: { reds: 3, blues: 0 },
						// 	},
						// 	{ presidentId: playerIndex }
						// );

						text.push(
							{
								text: 'claims to have peeked at ',
							},
							{
								text: 'RRR',
								type: 'fascist',
							},
							{
								text: '.',
							}
						);

						return text;
					case 'rbr':
						// game.private.summary = game.private.summary.updateLog(
						// 	{
						// 		policyPeekClaim: { reds: 2, blues: 1 },
						// 	},
						// 	{ presidentId: playerIndex }
						// );

						text.push(
							{
								text: 'claims to have peeked at ',
							},
							{
								text: 'R',
								type: 'fascist',
							},
							{
								text: 'B',
								type: 'liberal',
							},
							{
								text: 'R',
								type: 'fascist',
							},
							{
								text: '.',
							}
						);

						return text;
					case 'brr':
						// game.private.summary = game.private.summary.updateLog(
						// 	{
						// 		policyPeekClaim: { reds: 2, blues: 1 },
						// 	},
						// 	{ presidentId: playerIndex }
						// );

						text.push(
							{
								text: 'claims to have peeked at ',
							},
							{
								text: 'B',
								type: 'liberal',
							},
							{
								text: 'R',
								type: 'fascist',
							},

							{
								text: 'R',
								type: 'fascist',
							},
							{
								text: '.',
							}
						);

						return text;
					case 'rrb':
						// game.private.summary = game.private.summary.updateLog(
						// 	{
						// 		policyPeekClaim: { reds: 2, blues: 1 },
						// 	},
						// 	{ presidentId: playerIndex }
						// );

						text.push(
							{
								text: 'claims to have peeked at ',
							},
							{
								text: 'R',
								type: 'fascist',
							},

							{
								text: 'R',
								type: 'fascist',
							},
							{
								text: 'B',
								type: 'liberal',
							},
							{
								text: '.',
							}
						);

						return text;
					case 'rbb':
						// game.private.summary = game.private.summary.updateLog(
						// 	{
						// 		policyPeekClaim: { reds: 1, blues: 2 },
						// 	},
						// 	{ presidentId: playerIndex }
						// );

						text.push(
							{
								text: 'claims to have peeked at ',
							},
							{
								text: 'R',
								type: 'fascist',
							},
							{
								text: 'BB',
								type: 'liberal',
							},
							{
								text: '.',
							}
						);

						return text;
					case 'bbr':
						// game.private.summary = game.private.summary.updateLog(
						// 	{
						// 		policyPeekClaim: { reds: 1, blues: 2 },
						// 	},
						// 	{ presidentId: playerIndex }
						// );

						text.push(
							{
								text: 'claims to have peeked at ',
							},
							{
								text: 'BB',
								type: 'liberal',
							},
							{
								text: 'R',
								type: 'fascist',
							},
							{
								text: '.',
							}
						);

						return text;
					case 'brb':
						// game.private.summary = game.private.summary.updateLog(
						// 	{
						// 		policyPeekClaim: { reds: 1, blues: 2 },
						// 	},
						// 	{ presidentId: playerIndex }
						// );

						text.push(
							{
								text: 'claims to have peeked at ',
							},
							{
								text: 'B',
								type: 'liberal',
							},
							{
								text: 'R',
								type: 'fascist',
							},
							{
								text: 'B',
								type: 'liberal',
							},
							{
								text: '.',
							}
						);

						return text;
					case 'bbb':
						// game.private.summary = game.private.summary.updateLog(
						// 	{
						// 		policyPeekClaim: { reds: 0, blues: 3 },
						// 	},
						// 	{ presidentId: playerIndex }
						// );

						text.push(
							{
								text: 'claims to have peeked at ',
							},
							{
								text: 'BBB',
								type: 'liberal',
							},
							{
								text: '.',
							}
						);

						return text;
				}
			case 'didInvestigateLoyalty':
				const { invIndex } = game.private;
				if (invIndex != -1 && invIndex < game.private.seatedPlayers.length) {
					text = [
						{
							text: 'President ',
						},
						{
							text: blindMode
								? `${replacementNames[playerIndex]} {${playerIndex + 1}} `
								: `${passport.user} {${playerIndex + 1}} `,
							type: 'player',
						},
						{
							text: 'sees the party membership of ',
						},
						{
							text: blindMode
								? `${replacementNames[invIndex]} {${invIndex + 1}} `
								: `${game.private.seatedPlayers[invIndex] && game.private.seatedPlayers[invIndex].userName} {${
										invIndex + 1
								  }} `,
							type: 'player',
						},
						{
							text: 'and claims to see a member of the ',
						},
					];
				} else {
					text = [
						{
							text: 'President ',
						},
						{
							text: blindMode
								? `${replacementNames[playerIndex]} {${playerIndex + 1}} `
								: `${passport.user} {${playerIndex + 1}} `,
							type: 'player',
						},
						{
							text: ' claims to see a member of the ',
						},
					];
				}

				// game.private.summary = game.private.summary.updateLog(
				// 	{
				// 		investigationClaim: data.claimState,
				// 	},
				// 	{ presidentId: playerIndex }
				// );
				switch (data.claimState) {
					case 'fascist':
						text.push(
							{
								text: 'fascist ',
								type: 'fascist',
							},
							{
								text: 'team.',
							}
						);

						return text;
					case 'liberal':
						text.push(
							{
								text: 'liberal ',
								type: 'liberal',
							},
							{
								text: 'team.',
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
		const claimChat = {
			chat,
			isClaim: true,
			timestamp: new Date(),
			uid: game.general.uid,
			userName: passport.user,
			claim: data.claim,
			claimState: data.claimState,
		};
		if (claimChat && claimChat.chat) {
			if (game.private.seatedPlayers[playerIndex]) {
				game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim = '';
			}

			await pushGameChatsAsync(game, claimChat);
			socket.emit('removeClaim');
			sendInProgressGameUpdate(game);

			return true;
		}
		return false;
	}
};

/**
 * @param {object} passport - socket authentication.
 * @param {object} game - target game.
 * @param {object} data - from socket emit.
 * @param {object} socket - socket
 */
module.exports.handleUpdatedRemakeGame = async (passport, game, data, socket) => {
	if (game.gameState.isGameFrozen || game.general.isRemade) {
		if (socket) {
			socket.emit('sendAlert', 'An AEM member has prevented this game from proceeding. Please wait.');
		}
		return;
	}

	const remakeText = game.general.isTourny ? 'cancel' : 'remake';
	const { remakeData, publicPlayersState } = game;
	const playerIndex = remakeData.findIndex((player) => player.userName === passport.user);
	const player = remakeData[playerIndex];
	let chat;
	const minimumRemakeVoteCount =
		(game.customGameSettings.fascistCount && game.general.playerCount - game.customGameSettings.fascistCount) ||
		Math.floor(game.general.playerCount / 2) + 2;
	if (game && game.general && game.general.private) {
		chat = {
			timestamp: new Date(),
			gameChat: true,
			chat: [
				{
					text: 'Player ',
				},
				{
					text: `${passport.user} {${playerIndex + 1}} `,
					type: 'player',
				},
			],
		};
	} else {
		chat = {
			timestamp: new Date(),
			gameChat: true,
			chat: [
				{
					text: 'A player',
				},
			],
		};
	}

	const makeNewGame = async () => {
		if (gameCreationDisabled.status) {
			await pushGameChatsAsync(game, {
				gameChat: true,
				timestamp: new Date(),
				chat: [
					{
						text: 'Game remake aborted, game creation is currently disabled.',
						type: 'hitler',
					},
				],
			});
			sendInProgressGameUpdate(game);
			return;
		}

		const newGame = _.cloneDeep(game);
		const remakePlayerNames = remakeData.filter((player) => player.isRemaking).map((player) => player.userName);
		const remakePlayerSocketIDs = Object.keys(io.sockets.sockets).filter(
			(socketId) =>
				io.sockets.sockets[socketId].handshake.session.passport &&
				remakePlayerNames.includes(io.sockets.sockets[socketId].handshake.session.passport.user)
		);
		sendInProgressGameUpdate(game);

		newGame.gameState = {
			previousElectedGovernment: [],
			undrawnPolicyCount: 17,
			discardedPolicyCount: 0,
			presidentIndex: -1,
		};

		if (newGame.customGameSettings.enabled) {
			let chat = {
				timestamp: new Date(),
				gameChat: true,
				chat: [
					{
						text: 'There will be ',
					},
					{
						text: `${newGame.customGameSettings.deckState.lib - newGame.customGameSettings.trackState.lib} liberal`,
						type: 'liberal',
					},
					{
						text: ' and ',
					},
					{
						text: `${newGame.customGameSettings.deckState.fas - newGame.customGameSettings.trackState.fas} fascist`,
						type: 'fascist',
					},
					{
						text: ' policies in the deck.',
					},
				],
			};
			const t = chat.timestamp.getMilliseconds();
			await pushGameChatsAsync(game, chat);
			newGame.chats.push(chat);
			chat = {
				timestamp: new Date(),
				gameChat: true,
				chat: [
					{
						text: 'The game will start with ',
					},
					{
						text: `${newGame.customGameSettings.trackState.lib} liberal`,
						type: 'liberal',
					},
					{
						text: ' and ',
					},
					{
						text: `${newGame.customGameSettings.trackState.fas} fascist`,
						type: 'fascist',
					},
					{
						text: ' policies.',
					},
				],
			};
			chat.timestamp.setMilliseconds(t + 1);
			newGame.chats.push(chat);
		}
		newGame.general.isRemade = false;
		newGame.general.isRemaking = false;
		newGame.general.isRecorded = false;
		newGame.summarySaved = false;
		newGame.general.uid = `${game.general.uid}Remake`;
		newGame.general.electionCount = 0;
		newGame.timeCreated = Date.now();
		newGame.general.lastModPing = 0;
		newGame.general.chatReplTime = Array(chatReplacements.length + 1).fill(0);
		newGame.publicPlayersState = game.publicPlayersState
			.filter((player) =>
				game.remakeData
					.filter((rmkPlayer) => rmkPlayer.isRemaking)
					.map((rmkPlayer) => rmkPlayer.userName)
					.some((rmkPlayer) => rmkPlayer === player.userName)
			)
			.map((player) => ({
				userName: player.userName,
				customCardback: player.customCardback,
				customCardbackUid: player.customCardbackUid,
				previousSeasonAward: player.previousSeasonAward,
				connected: player.connected,
				isRemakeVoting: false,
				pingTime: undefined,
				cardStatus: {
					cardDisplayed: false,
					isFlipped: false,
					cardFront: 'secretrole',
					cardBack: {},
				},
			}));
		newGame.remakeData = [];
		newGame.playersState = [];
		newGame.cardFlingerState = [];
		newGame.trackState = {
			liberalPolicyCount: 0,
			fascistPolicyCount: 0,
			electionTrackerCount: 0,
			enactedPolicies: [],
		};
		newGame.private = {
			reports: {},
			unSeatedGameChats: [],
			lock: {},
			votesPeeked: false,
			invIndex: -1,
			privatePassword: game.private.privatePassword,
			hiddenInfoChat: [],
			hiddenInfoSubscriptions: [],
			hiddenInfoShouldNotify: true,
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

		setTimeout(async () => {
			game.publicPlayersState.forEach((player) => {
				if (remakePlayerNames.includes(player.userName)) player.leftGame = true;
			});

			if (game.publicPlayersState.filter((publicPlayer) => publicPlayer.leftGame).length === game.general.playerCount) {
				deleteGameAsync(game.general.uid);
				// deleteGameChatsAsync(game.general.uid);
			} else {
				sendInProgressGameUpdate(game);
			}

			setGameAsync(game);
			sendGameList();

			let creatorRemade = false;
			remakePlayerSocketIDs.forEach((id, index) => {
				if (io.sockets.sockets[id]) {
					io.sockets.sockets[id].leave(game.general.uid);
					sendGameInfo(io.sockets.sockets[id], newGame.general.uid);
					if (
						io.sockets.sockets[id] &&
						io.sockets.sockets[id].handshake &&
						io.sockets.sockets[id].handshake.session &&
						io.sockets.sockets[id].handshake.session.passport
					) {
						updateSeatedUser(io.sockets.sockets[id], io.sockets.sockets[id].handshake.session.passport, {
							uid: newGame.general.uid,
						});
						// handleUserLeaveGame(io.sockets.sockets[id], passport, game, {isSeated: true, isRemake: true});
						if (io.sockets.sockets[id].handshake.session.passport.user === newGame.general.gameCreatorName)
							creatorRemade = true;
					}
				}
			});
			if (creatorRemade && newGame.general.gameCreatorBlacklist != null) {
				const creator = userList.find((user) => user.userName === newGame.general.gameCreatorName);
				if (creator) newGame.general.gameCreatorBlacklist = creator.blacklist;
			} else newGame.general.gameCreatorBlacklist = null;
			await setGameAsync(newGame);
			checkStartConditions(newGame);
		}, 3000);
	};

	/**
	 * @param {string} firstTableUid - the UID of the first tournament table
	 */
	const cancellTourny = async (firstTableUid) => {
		const secondTableUid =
			firstTableUid.charAt(firstTableUid.length - 1) === 'A'
				? `${firstTableUid.slice(0, firstTableUid.length - 1)}B`
				: `${firstTableUid.slice(0, firstTableUid.length - 1)}A`;
		const secondTable = games.find((game) => game.general.uid === secondTableUid);

		if (secondTable) {
			secondTable.general.tournyInfo.isCancelled = true;
			await pushGameChatsAsync(secondTable, {
				gameChat: true,
				timestamp: new Date(),
				chat: [
					{
						text: 'Due to the other tournament table voting for cancellation, this tournament has been cancelled.',
						type: 'hitler',
					},
				],
			});
			secondTable.general.status = 'Tournament has been cancelled.';
			sendInProgressGameUpdate(secondTable);
		}
	};

	if (!game || !player || !game.remakeData) {
		return;
	}

	if (data.remakeStatus && Date.now() > player.remakeTime + 7000) {
		player.isRemaking = true;
		player.remakeTime = Date.now();

		const remakePlayerCount = remakeData.filter((player) => player.isRemaking).length;
		await pushGameChatsAsync(game, {
			text: ` has voted to ${remakeText} this ${
				game.general.isTourny ? 'tournament.' : 'game.'
			} (${remakePlayerCount}/${minimumRemakeVoteCount})`,
		});

		if (!game.general.isRemaking && publicPlayersState.length > 3 && remakePlayerCount >= minimumRemakeVoteCount) {
			game.general.isRemaking = true;
			game.general.remakeCount = 5;

			game.private.remakeTimer = setInterval(() => {
				if (game.general.remakeCount !== 0) {
					game.general.status = `Game is ${game.general.isTourny ? 'cancelled ' : 'remade'} in ${
						game.general.remakeCount
					} ${game.general.remakeCount === 1 ? 'second' : 'seconds'}.`;
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
	} else if (!data.remakeStatus && Date.now() > player.remakeTime + 2000) {
		player.isRemaking = false;
		player.remakeTime = Date.now();

		const remakePlayerCount = remakeData.filter((player) => player.isRemaking).length;

		if (game.general.isRemaking && remakePlayerCount < minimumRemakeVoteCount) {
			game.general.isRemaking = false;
			game.general.status = 'Game remaking has been cancelled.';
			clearInterval(game.private.remakeTimer);
		}
		await pushGameChatsAsync(game, {
			text: ` has rescinded their vote to ${
				game.general.isTourny ? 'cancel this tournament.' : 'remake this game.'
			} (${remakePlayerCount}/${minimumRemakeVoteCount})`,
		});
	} else {
		return;
	}
	socket.emit('updateRemakeVoting', player.isRemaking);
	await pushGameChatsAsync(game, chat);

	sendInProgressGameUpdate(game);
};

/**
 * @param {object} socket - socket reference.
 * @param {object} passport - socket authentication.
 * @param {object} data - from socket emit.
 * @param {object} game - target game
 * @param {array} modUserNames - list of mods
 * @param {array} editorUserNames - list of editors
 * @param {array} adminUserNames - list of admins
 * @param {function} addNewClaim - links to handleAddNewClaim
 */
module.exports.handleAddNewGameChat = async (
	socket,
	passport,
	data,
	game,
	modUserNames,
	editorUserNames,
	adminUserNames,
	addNewClaim
) => {
	const { user } = passport;

	if (!game || !game.general || !data.chat) {
		return;
	}

	const { uid } = game.general;
	const chat = data.chat.trim();
	const staffUserNames = [...modUserNames, ...editorUserNames, ...adminUserNames];
	const playerIndex = game.publicPlayersState.findIndex((player) => player.userName === passport.user);

	if (chat.length > 300 || !chat.length) {
		return;
	}

	const { publicPlayersState } = game;
	const player = publicPlayersState.find((player) => player.userName === user);
	const AEM =
		staffUserNames.includes(user) || newStaff.modUserNames.includes(user) || newStaff.editorUserNames.includes(user);

	if (
		!(AEM && playerIndex === -1) &&
		((game.general.disableChat && !game.gameState.isCompleted && game.gameState.isStarted && playerIndex !== -1) ||
			(game.general.disableObserver && playerIndex === -1))
	) {
		return;
	}

	data.userName = user;

	if (
		game &&
		game.private &&
		game.private.seatedPlayers &&
		game.private.seatedPlayers[playerIndex] &&
		game.private.seatedPlayers[playerIndex].playersState &&
		game.private.seatedPlayers[playerIndex].playersState[playerIndex] &&
		game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim
	) {
		if (/^[RB]{2,3}$/i.exec(chat)) {
			const formattedChat = chat.toLowerCase().split('').sort().reverse().join('');

			if (
				chat.length === 3 &&
				0 <= playerIndex <= 9 &&
				game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim === 'wasPresident'
			) {
				const claimData = {
					userName: user,
					claimState: formattedChat,
					claim: game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim,
					uid,
				};
				if (addNewClaim(socket, passport, game, claimData)) {
					return;
				}
			}

			if (
				chat.length === 2 &&
				0 <= playerIndex <= 9 &&
				game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim === 'wasChancellor'
			) {
				const claimData = {
					userName: user,
					claimState: formattedChat,
					claim: game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim,
					uid,
				};
				if (addNewClaim(socket, passport, game, claimData)) {
					return;
				}
			}

			if (
				chat.length === 3 &&
				0 <= playerIndex <= 9 &&
				game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim === 'didPolicyPeek'
			) {
				const claimData = {
					userName: user,
					claimState: chat,
					claim: game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim,
					uid,
				};
				if (addNewClaim(socket, passport, game, claimData)) {
					return;
				}
			}
		}

		if (/^(b|blue|l|lib|liberal)$/i.exec(chat)) {
			if (
				0 <= playerIndex <= 9 &&
				(game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim === 'didSinglePolicyPeek' ||
					game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim === 'didInvestigateLoyalty')
			) {
				const claimData = {
					userName: user,
					claimState: 'liberal',
					claim: game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim,
					uid,
				};
				if (addNewClaim(socket, passport, game, claimData)) {
					return;
				}
			}
		}

		if (/^(r|red|fas|f|fasc|fascist)$/i.exec(chat)) {
			if (
				0 <= playerIndex <= 9 &&
				(game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim === 'didSinglePolicyPeek' ||
					game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim === 'didInvestigateLoyalty')
			) {
				const claimData = {
					userName: user,
					claimState: 'fascist',
					claim: game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim,
					uid,
				};
				if (addNewClaim(socket, passport, game, claimData)) {
					return;
				}
			}
		}
	}

	if (!AEM) {
		if (player) {
			if (
				(player.isDead && !game.gameState.isCompleted) ||
				player.leftGame ||
				(game.general.private && !game.general.whitelistedPlayers.includes(passport.user)) ||
				game.general.disableObserver ||
				user.wins + user.losses < 11
			) {
				return;
			}
		}
	}

	const { gameState } = game;

	if (
		player &&
		(gameState.phase === 'presidentSelectingPolicy' || gameState.phase === 'chancellorSelectingPolicy') &&
		(publicPlayersState.find((play) => play.userName === player.userName).governmentStatus === 'isPresident' ||
			publicPlayersState.find((play) => play.userName === player.userName).governmentStatus === 'isChancellor')
	) {
		return;
	}

	data.timestamp = new Date();

	if (AEM) {
		// const { blindMode, replacementNames } = game.general;
		const aemRigdeck = /^\/forcerigdeck (.*)$/i.exec(chat);

		if (aemRigdeck) {
			if (game && game.private) {
				const deck = aemRigdeck[0].split(' ')[1];

				if (/^([RB]{1,27})$/i.exec(deck)) {
					if (deck.length > 27 || deck.length === 0) {
						socket.emit('sendAlert', 'This deck is too big (or too small).');
						return;
					}

					const changedChat = [
						{
							text: 'An AEM member has changed the deck to ',
						},
					];

					for (let card of deck) {
						card = card.toUpperCase();

						if (card === 'R' || card === 'B') {
							changedChat.push({
								text: card,
								type: `${card === 'R' ? 'fascist' : 'liberal'}`,
							});
						}
					}

					changedChat.push({
						text: '.',
					});

					// redis todo

					// await pushGameChatsAsync(game, {
					// 	gameChat: true,
					// 	timestamp: new Date(),
					// 	chat: changedChat,
					// });

					// sendPlayerChatUpdate(game, data);

					sendInProgressGameUpdate(game, false);
				} else {
					socket.emit('sendAlert', 'This is not a valid deck.');
					return;
				}
			} else {
				socket.emit('sendAlert', 'The game has not started yet.');
			}
			return;
		}

		const aemForce = /^\/forcevote (\d{1,2}) (ya|ja|nein|yes|no|true|false)$/i.exec(chat);

		if (aemForce) {
			if (player) {
				socket.emit('sendAlert', 'You cannot force a vote while playing.');
				return;
			}
			if (game.general.isRemade) {
				socket.emit('sendAlert', 'This game has been remade.');
				return;
			}
			const affectedPlayerNumber = parseInt(aemForce[1]) - 1;
			const voteString = aemForce[2].toLowerCase();

			if (game && game.private && game.private.seatedPlayers) {
				const affectedPlayer = game.private.seatedPlayers[affectedPlayerNumber];

				if (!affectedPlayer) {
					socket.emit('sendAlert', `There is no seat {${affectedPlayerNumber + 1}}.`);
					return;
				}

				const vote = Boolean(
					voteString === 'ya' || voteString === 'ja' || voteString === 'yes' || voteString === 'true'
				);

				if (affectedPlayer.voteStatus.hasVoted) {
					socket.emit(
						'sendAlert',
						`${affectedPlayer.userName} {${affectedPlayerNumber + 1}} has already voted.\nThey were voting: ${
							affectedPlayer.voteStatus.didVoteYes ? 'ja' : 'nein'
						}\nYou have set them to vote: ${vote ? 'ja' : 'nein'}
						`
					);
				}

				// await pushGameChatsAsync(game, {
				// 	gameChat: true,
				// 	timestamp: new Date(),
				// 	chat: [
				// 		{
				// 			text: 'An AEM member has forced ',
				// 		},
				// 		{
				// 			text: blindMode
				// 				? `${replacementNames[affectedPlayerNumber]} {${affectedPlayerNumber + 1}} `
				// 				: `${affectedPlayer.userName} {${affectedPlayerNumber + 1}}`,
				// 			type: 'player',
				// 		},
				// 		{
				// 			text: ' to vote ',
				// 		},
				// 		{
				// 			text: `${vote ? 'ja' : 'nein'}`,
				// 			type: 'player',
				// 		},
				// 		{
				// 			text: '.',
				// 		},
				// 	],
				// });

				selectVoting({ user: affectedPlayer.userName }, game, { vote }, null, true);
				// sendPlayerChatUpdate(game, data);
				sendInProgressGameUpdate(game, false);
			} else {
				socket.emit('sendAlert', 'The game has not started yet.');
			}
			return;
		}

		const aemSkip = /^\/forceskip (\d{1,2})$/i.exec(chat);

		if (aemSkip) {
			if (player) {
				socket.emit('sendAlert', 'You cannot force skip a government while playing.');
				return;
			}
			if (game.general.isRemade) {
				socket.emit('sendAlert', 'This game has been remade.');
				return;
			}

			const affectedPlayerNumber = parseInt(aemSkip[1]) - 1;

			if (game && game.private && game.private.seatedPlayers) {
				const affectedPlayer = game.private.seatedPlayers[affectedPlayerNumber];

				if (!affectedPlayer) {
					socket.emit('sendAlert', `There is no seat ${affectedPlayerNumber + 1}.`);
					return;
				}

				if (affectedPlayerNumber !== game.gameState.presidentIndex) {
					socket.emit('sendAlert', `The player in seat ${affectedPlayerNumber + 1} is not president.`);
					return;
				}

				let chancellor = -1;
				const currentPlayers = [];

				for (let i = 0; i < game.private.seatedPlayers.length; i++) {
					currentPlayers[i] = !(
						game.private.seatedPlayers[i].isDead ||
						(i === game.gameState.previousElectedGovernment[0] && game.general.livingPlayerCount > 5) ||
						i === game.gameState.previousElectedGovernment[1]
					);
				}

				currentPlayers[affectedPlayerNumber] = false;

				let counter = affectedPlayerNumber + 1;

				while (chancellor === -1) {
					if (counter >= currentPlayers.length) {
						counter = 0;
					}
					if (currentPlayers[counter]) {
						chancellor = counter;
					}
					counter++;
				}

				// await pushGameChatsAsync(game, {
				// 	gameChat: true,
				// 	timestamp: new Date(),
				// 	chat: [
				// 		{
				// 			text: 'An AEM member has force skipped the government with ',
				// 		},
				// 		{
				// 			text: blindMode
				// 				? `${replacementNames[affectedPlayerNumber]} {${affectedPlayerNumber + 1}} `
				// 				: `${affectedPlayer.userName} {${affectedPlayerNumber + 1}}`,
				// 			type: 'player',
				// 		},
				// 		{
				// 			text: ' as president.',
				// 		},
				// 	],
				// });

				selectChancellor(null, { user: affectedPlayer.userName }, game, { chancellorIndex: chancellor }, true);

				setTimeout(() => {
					for (const p of game.private.seatedPlayers.filter((player) => !player.isDead)) {
						selectVoting({ user: p.userName }, game, { vote: false }, null, true);
					}
				}, 1000);

				// sendPlayerChatUpdate(game, data);
				sendInProgressGameUpdate(game, false);
			} else {
				socket.emit('sendAlert', 'The game has not started yet.');
			}
			return;
		}

		const aemPick = /^\/forcepick (\d{1,2}) (\d{1,2})$/i.exec(chat);

		if (aemPick) {
			if (player) {
				socket.emit('sendAlert', 'You cannot force a pick while playing.');
				return;
			}
			if (game.general.isRemade) {
				socket.emit('sendAlert', 'This game has been remade.');
				return;
			}

			const affectedPlayerNumber = parseInt(aemPick[1]) - 1;
			const chancellorPick = aemPick[2];

			if (game && game.private && game.private.seatedPlayers) {
				const affectedPlayer = game.private.seatedPlayers[affectedPlayerNumber];
				const affectedChancellor = game.private.seatedPlayers[chancellorPick - 1];

				if (!affectedPlayer) {
					socket.emit('sendAlert', `There is no seat ${affectedPlayerNumber + 1}.`);
					return;
				}

				if (!affectedChancellor) {
					socket.emit('sendAlert', `There is no seat ${chancellorPick}.`);
					return;
				}

				if (affectedPlayerNumber !== game.gameState.presidentIndex) {
					socket.emit('sendAlert', `The player in seat ${affectedPlayerNumber + 1} is not president.`);
					return;
				}

				if (
					game.publicPlayersState[chancellorPick - 1].isDead ||
					chancellorPick - 1 === affectedPlayerNumber ||
					chancellorPick - 1 === game.gameState.previousElectedGovernment[1] ||
					(chancellorPick - 1 === game.gameState.previousElectedGovernment[0] && game.general.livingPlayerCount > 5)
				) {
					socket.emit('sendAlert', `The player in seat ${chancellorPick} is not a valid chancellor. (Dead or TL)`);
					return;
				}

				// await pushGameChatsAsync(game, {
				// 	gameChat: true,
				// 	timestamp: new Date(),
				// 	chat: [
				// 		{
				// 			text: 'An AEM member has forced ',
				// 		},
				// 		{
				// 			text: blindMode
				// 				? `${replacementNames[affectedPlayerNumber]} {${affectedPlayerNumber + 1}} `
				// 				: `${affectedPlayer.userName} {${affectedPlayerNumber + 1}}`,
				// 			type: 'player',
				// 		},
				// 		{
				// 			text: ' to pick ',
				// 		},
				// 		{
				// 			text: blindMode
				// 				? `${replacementNames[chancellorPick - 1]} {${chancellorPick}} `
				// 				: `${affectedChancellor.userName} {${chancellorPick}}`,
				// 			type: 'player',
				// 		},
				// 		{
				// 			text: ' as chancellor.',
				// 		},
				// 	],
				// });

				selectChancellor(null, { user: affectedPlayer.userName }, game, { chancellorIndex: chancellorPick - 1 }, true);
				// sendPlayerChatUpdate(game, data);
				sendInProgressGameUpdate(game, false);
			} else {
				socket.emit('sendAlert', 'The game has not started yet.');
			}
			return;
		}

		const aemPing = /^\/forceping (\d{1,2})$/i.exec(chat);

		if (aemPing) {
			if (player) {
				socket.emit('sendAlert', 'You cannot force a ping while playing.');
				return;
			}

			if (game.general.isRemade) {
				socket.emit('sendAlert', 'This game has been remade.');
				return;
			}

			const affectedPlayerNumber = parseInt(aemPing[1]) - 1;

			if (game && game.private && game.private.seatedPlayers) {
				const affectedPlayer = game.private.seatedPlayers[affectedPlayerNumber];

				if (!affectedPlayer) {
					socket.emit('sendAlert', `There is no seat ${affectedPlayerNumber + 1}.`);
					return;
				}

				// await pushGameChatsAsync(game, {
				// 	gameChat: true,
				// 	timestamp: new Date(),
				// 	chat: [
				// 		{
				// 			text: 'An AEM member has pinged ',
				// 		},
				// 		{
				// 			text: blindMode
				// 				? `${replacementNames[affectedPlayerNumber]} {${affectedPlayerNumber + 1}} `
				// 				: `${affectedPlayer.userName} {${affectedPlayerNumber + 1}}`,
				// 			type: 'player',
				// 		},
				// 		{
				// 			text: '.',
				// 		},
				// 	],
				// });

				try {
					const affectedSocketId = Object.keys(io.sockets.sockets).find(
						(socketId) =>
							io.sockets.sockets[socketId].handshake.session.passport &&
							io.sockets.sockets[socketId].handshake.session.passport.user ===
								game.publicPlayersState[affectedPlayerNumber].userName
					);
					if (!io.sockets.sockets[affectedSocketId]) {
						socket.emit('sendAlert', 'Unable to send ping.');
						return;
					}
					io.sockets.sockets[affectedSocketId].emit('pingPlayer', 'Secret Hitler IO: A moderator has pinged you.');
				} catch (e) {
					console.log(e, 'caught exception in ping chat');
				}
				// sendPlayerChatUpdate(game, data);
				sendInProgressGameUpdate(game, false);
			} else {
				socket.emit('sendAlert', 'The game has not started yet.');
				return;
			}
			return;
		}
	}

	const pingMods = /^@(mod|moderator|editor|aem|mods) (.*)$/i.exec(chat);

	if (pingMods && player) {
		if (!game.lastModPing || Date.now() > game.lastModPing + 180000) {
			game.lastModPing = Date.now();
			sendInProgressGameUpdate(game, false);
			makeReport(
				{
					player: passport.user,
					situation: `"${pingMods[2]}".`,
					election: game.general.electionCount,
					title: game.general.name,
					uid: game.general.uid,
					gameType: game.general.casualGame ? 'Casual' : 'Ranked',
				},
				game,
				'ping'
			);
		} else {
			socket.emit(
				'sendAlert',
				`You can't ping mods for another ${(game.lastModPing + 180000 - Date.now()) / 1000} seconds.`
			);
		}
		return;
	}

	for (repl of chatReplacements) {
		const replace = repl.regex.exec(chat);

		if (replace) {
			if (AEM) {
				if (
					game.general.chatReplTime[repl.id] === 0 ||
					Date.now() > game.general.chatReplTime[repl.id] + repl.aemCooldown * 1000
				) {
					data.chat = repl.replacement;
					game.general.chatReplTime[repl.id] = game.general.chatReplTime[0] = Date.now();
				} else {
					socket.emit(
						'sendAlert',
						`You can do this command again in ${(
							(game.general.chatReplTime[repl.id] + repl.aemCooldown * 1000 - Date.now()) /
							1000
						).toFixed(2)} seconds.`
					);
					return;
				}
				// redis todo, user (passport) doesn't have this atm
			} else if (user.wins + user.losses > repl.normalGames) {
				if (
					Date.now() > game.general.chatReplTime[0] + 30000 &&
					(game.general.chatReplTime[repl.id] === 0 ||
						Date.now() > game.general.chatReplTime[repl.id] + repl.normalCooldown * 1000)
				) {
					data.chat = repl.replacement;
					game.general.chatReplTime[repl.id] = game.general.chatReplTime[0] = Date.now();
				} else {
					socket.emit(
						'sendAlert',
						`You can't do this right now, try again in ${Math.max(
							(game.general.chatReplTime[0] + 30000 - Date.now()) / 1000,
							(game.general.chatReplTime[repl.id] + repl.normalCooldown * 1000 - Date.now()) / 1000
						).toFixed(2)} seconds.`
					);
					return;
				}
			}
		}
	}

	const pinged = /^Ping(\d{1,2})/i.exec(chat);

	if (
		pinged &&
		player &&
		game.gameState.isStarted &&
		parseInt(pinged[1]) <= game.publicPlayersState.length &&
		(!player.pingTime || Date.now() - player.pingTime > 180000)
	) {
		try {
			const affectedPlayerNumber = parseInt(pinged[1]) - 1;
			const affectedSocketId = Object.keys(io.sockets.sockets).find(
				(socketId) =>
					io.sockets.sockets[socketId].handshake.session.passport &&
					io.sockets.sockets[socketId].handshake.session.passport.user ===
						game.publicPlayersState[affectedPlayerNumber].userName
			);

			player.pingTime = Date.now();
			if (!io.sockets.sockets[affectedSocketId]) {
				return;
			}
			io.sockets.sockets[affectedSocketId].emit(
				'pingPlayer',
				game.general.blindMode
					? 'Secret Hitler IO: A player has pinged you.'
					: `Secret Hitler IO: Player ${data.userName} just pinged you.`
			);

			await pushGameChatsAsync(game, {
				gameChat: true,
				userName: passport.user,
				timestamp: new Date(),
				chat: [
					{
						text: game.general.blindMode
							? `A player has pinged player number ${affectedPlayerNumber + 1}.`
							: `${passport.user} has pinged ${publicPlayersState[affectedPlayerNumber].userName} (${
									affectedPlayerNumber + 1
							  }).`,
					},
				],
				previousSeasonAward: user.previousSeasonAward,
				uid: data.uid,
				inProgress: game.gameState.isStarted,
			});
			sendInProgressGameUpdate(game);
		} catch (e) {
			console.log(e, 'caught exception in ping chat');
		}
	} else if (!pinged) {
		const lastMessage = game.chats
			.filter((chat) => !chat.gameChat && typeof chat.chat === 'string' && chat.userName === user.userName)
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
			if (!AEM && timeSince < leniancy * 1000) {
				return; // Prior chat was too recent.
			}
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

		if (AEM && user.staffIncognito) {
			data.hiddenUsername = data.userName;
			data.staffRole = 'moderator';
			data.userName = 'Incognito';
		}

		sendPlayerChatUpdate(game, data);
	}
};

/**
 * @param {object} passport - socket authentication.
 * @param {object} game - target game.
 * @param {object} data - from socket emit.
 */
module.exports.handleUpdateWhitelist = async (passport, game, data) => {
	const isPrivateSafe =
		!game.general.private ||
		(game.general.private &&
			(data.password === game.private.privatePassword || game.general.whitelistedPlayers.includes(passport.user)));

	// Only update the whitelist if whitelisted, has password, or is the creator
	if (isPrivateSafe || game.general.gameCreatorName === passport.user) {
		game.general.whitelistedPlayers = data.whitelistPlayers;
		await setGameAsync(game);
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
module.exports.handleNewGeneralChat = async (socket, passport, data, modUserNames, editorUserNames, adminUserNames) => {
	// const user = userList.find(u => u.userName === passport.user);
	// if (!user || user.isPrivate) return;

	if (!data.chat) {
		return;
	}

	const chat = (data.chat = data.chat.trim());
	if (data.chat.length > 300 || !data.chat.length) {
		return;
	}

	// const AEM = user.staffRole && user.staffRole !== 'altmod' && user.staffRole !== 'trialmod' && user.staffRole !== 'veteran';

	const curTime = new Date();
	// const lastMessage = generalChats.list
	// 	.filter(chat => chat.userName === user.userName)
	// 	.reduce(
	// 		(acc, cur) => {
	// 			return acc.time > cur.time ? acc : cur;
	// 		},
	// 		{ time: new Date(0) }
	// 	);

	// if (lastMessage.chat) {
	// 	let leniancy; // How much time (in seconds) must pass before allowing the message.
	// 	if (lastMessage.chat.toLowerCase() === data.chat.toLowerCase()) leniancy = 3;
	// 	else leniancy = 0.5;

	// 	const timeSince = curTime - lastMessage.time;
	// 	if (timeSince < leniancy * 1000) return; // Prior chat was too recent.
	// }

	for (repl of chatReplacements) {
		const replace = repl.regex.exec(chat);
		if (replace) {
			if (AEM) {
				if (generalChatReplTime[repl.id] === 0 || Date.now() > generalChatReplTime[repl.id] + repl.aemCooldown * 1000) {
					data.chat = repl.replacement;
					generalChatReplTime[repl.id] = generalChatReplTime[0] = Date.now();
				} else {
					socket.emit(
						'sendAlert',
						`You can do this command again in ${(
							(generalChatReplTime[repl.id] + repl.aemCooldown * 1000 - Date.now()) /
							1000
						).toFixed(2)} seconds.`
					);
					return;
				}
			} else if (user.wins + user.losses > repl.normalGames) {
				if (
					Date.now() > generalChatReplTime[0] + 30000 &&
					(generalChatReplTime[repl.id] === 0 || Date.now() > generalChatReplTime[repl.id] + repl.normalCooldown * 1000)
				) {
					data.chat = repl.replacement;
					generalChatReplTime[repl.id] = generalChatReplTime[0] = Date.now();
				} else {
					socket.emit(
						'sendAlert',
						`You can't do this right now, try again in ${Math.max(
							(generalChatReplTime[0] + 30000 - Date.now()) / 1000,
							(generalChatReplTime[repl.id] + repl.normalCooldown * 1000 - Date.now()) / 1000
						).toFixed(2)} seconds.`
					);
					return;
				}
			}
		}
	}

	if (true) {
		// redis todo
		// if (user.wins + user.losses >= 10) {
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
			staffRole: getStaffRole(),
		};
		// const staffUserNames = [...modUserNames, ...editorUserNames, ...adminUserNames];
		// const AEM =
		// 	staffUserNames.includes(passport.user) ||
		// 	newStaff.modUserNames.includes(passport.user) ||
		// 	newStaff.editorUserNames.includes(passport.user);
		// if (AEM && user.staffIncognito) {
		// 	newChat.hiddenUsername = newChat.userName;
		// 	newChat.staffRole = 'moderator';
		// 	newChat.userName = 'Incognito';
		// }

		await pushGeneralChatsAsync('list', JSON.stringify(newChat));

		sendGeneralChats(null, true);

		// generalChats.list.push(newChat);

		// if (generalChats.list.length > 99) {
		// 	generalChats.list.shift();
		// }
		// io.sockets.emit('generalChats', generalChats);
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
		.then((account) => {
			const currentPrivate = account.gameSettings.isPrivate;
			// const userIdx = userList.findIndex(user => user.userName === passport.user);

			for (const setting in data) {
				if (setting == 'blacklist') {
					data[setting].splice(0, data[setting].length - 30);
				}

				const restrictedSettings = [
					'blacklist',
					'staffDisableVisibleElo',
					'staffDisableStaffColor',
					'staffIncognito',
					'newReport',
					'previousSeasonAward',
					'specialTournamentStatus',
					'ignoreIPBans',
					'tournyWins',
				];

				if (
					!restrictedSettings.includes(setting) ||
					(setting === 'blacklist' && data[setting].length <= 30) ||
					(setting === 'staffDisableVisibleElo' && (aem || veteran)) ||
					(setting === 'staffIncognito' && aem) ||
					(setting === 'staffDisableStaffColor' && (aem || veteran))
				) {
					account.gameSettings[setting] = data[setting];
				}

				if (setting === 'staffIncognito' && aem) {
					const userListInfo = {
						userName: passport.user,
						staffRole: account.staffRole || '',
						isContributor: account.isContributor || false,
						staffDisableVisibleElo: account.gameSettings.staffDisableVisibleElo,
						staffDisableStaffColor: account.gameSettings.staffDisableStaffColor,
						staffIncognito: account.gameSettings.staffIncognito,
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
						specialTournamentStatus: account.gameSettings.specialTournamentStatus,
						eloOverall: account.eloOverall,
						eloSeason: account.eloSeason,
						status: {
							type: 'none',
							gameId: null,
						},
					};

					userListInfo[`winsSeason${currentSeasonNumber}`] = account[`winsSeason${currentSeasonNumber}`];
					userListInfo[`lossesSeason${currentSeasonNumber}`] = account[`lossesSeason${currentSeasonNumber}`];
					userListInfo[`rainbowWinsSeason${currentSeasonNumber}`] = account[`rainbowWinsSeason${currentSeasonNumber}`];
					userListInfo[`rainbowLossesSeason${currentSeasonNumber}`] =
						account[`rainbowLossesSeason${currentSeasonNumber}`];
					// if (userIdx !== -1) {
					// 	userList.splice(userIdx, 1);
					// }
					// userList.push(userListInfo);
					// sendUserList();
				}
			}

			// const user = userList.find(u => u.userName === passport.user);
			// if (user) user.blacklist = account.gameSettings.blacklist;

			if (
				((data.isPrivate && !currentPrivate) || (!data.isPrivate && currentPrivate)) &&
				(!account.gameSettings.privateToggleTime || account.gameSettings.privateToggleTime < Date.now() - 64800000)
			) {
				account.gameSettings.privateToggleTime = Date.now();
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
		.catch((err) => {
			console.log(err);
		});
};

module.exports.handleHasSeenNewPlayerModal = (socket) => {
	const { passport } = socket.handshake.session;

	if (passport && Object.keys(passport).length) {
		const { user } = passport;

		Account.findOne({ username: user }).then((account) => {
			account.hasNotDismissedSignupModal = false;
			socket.emit('checkRestrictions');
			account.save();
		});
	}
};

module.exports.handleSocketDisconnect = handleSocketDisconnect;

module.exports.handleFlappyEvent = (data, game) => {
	// if (!io.sockets.adapter.rooms[game.general.uid]) {
	// 	return;
	// }
	// const roomSockets = Object.keys(io.sockets.adapter.rooms[game.general.uid].sockets).map(
	// 	(sockedId) => io.sockets.connected[sockedId]
	// );
	// const updateFlappyRoom = (newData) => {
	// 	roomSockets.forEach((sock) => {
	// 		if (sock) {
	// 			sock.emit('flappyUpdate', newData);
	// 		}
	// 	});
	// };
	// updateFlappyRoom(data);
	// if (data.type === 'startFlappy') {
	// 	game.flappyState = {
	// 		controllingLibUser: '',
	// 		controllingFascistUser: '',
	// 		liberalScore: 0,
	// 		fascistScore: 0,
	// 		pylonDensity: 1.3,
	// 		flapDistance: 1,
	// 		pylonOffset: 1.3,
	// 		passedPylonCount: 0,
	// 	};
	// 	game.general.status = 'FLAPPY HITLER: 0 - 0';
	// 	io.sockets.in(game.general.uid).emit('gameUpdate', game);
	// 	game.flappyState.pylonGenerator = setInterval(() => {
	// 		const offset = Math.floor(Math.random() * 50 * game.flappyState.pylonOffset);
	// 		const newData = {
	// 			type: 'newPylon',
	// 			pylonType: 'normal',
	// 			offset,
	// 		};
	// 		updateFlappyRoom(newData);
	// 	}, 1500 * game.flappyState.pylonDensity);
	// }
	// if (data.type === 'collision') {
	// 	game.flappyState[`${data.team}Score`]++;
	// 	clearInterval(game.flappyState.pylonGenerator);
	// 	// game.general.status = 'FLAPPY HITLER: x - x';
	// 	// io.sockets.in(game.general.uid).emit('gameUpdate', game);
	// }
	// if (data.type === 'passedPylon') {
	// 	game.flappyState.passedPylonCount++;
	// 	game.general.status = `FLAPPY HITLER: ${game.flappyState.liberalScore} - ${game.flappyState.fascistScore} (${game.flappyState.passedPylonCount})`;
	// 	io.sockets.in(game.general.uid).emit('gameUpdate', game);
	// }
};
