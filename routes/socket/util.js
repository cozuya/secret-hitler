const { CURRENTSEASONNUMBER } = require('../../src/frontend-scripts/node-constants');
const { setGameAsync, pushGameChatAsync, getRangeGameChatsAsync } = require('./models');

/**
 * @param {object} game - game to act on.
 * @return {object} game
 */
const secureGame = (game) => {
	const _game = Object.assign({}, game);

	delete _game.private;
	delete _game.remakeData;

	return _game;
};

module.exports.formatUserforUserlist = (passport, account) => {
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

	userListInfo[`winsSeason${CURRENTSEASONNUMBER}`] = account[`winsSeason${CURRENTSEASONNUMBER}`];
	userListInfo[`lossesSeason${CURRENTSEASONNUMBER}`] = account[`lossesSeason${CURRENTSEASONNUMBER}`];
	userListInfo[`rainbowWinsSeason${CURRENTSEASONNUMBER}`] = account[`rainbowWinsSeason${CURRENTSEASONNUMBER}`];
	userListInfo[`rainbowLossesSeason${CURRENTSEASONNUMBER}`] = account[`rainbowLossesSeason${CURRENTSEASONNUMBER}`];

	return userListInfo;
};

const combineInProgressChats = (game, userName) => {
	return userName && game.gameState.isTracksFlipped
		? game.private.seatedPlayers.find((player) => player.userName === userName).gameChats.concat(game.chats)
		: game.private.unSeatedGameChats.concat(game.chats);
};

/**
 * @param {object} game - game to act on.
 * @param {boolean} noChats - remove chats for client to handle.
 */
// FFS this is the most important function in the game if you have the need to modify it please be very careful/ask for help
module.exports.sendInProgressGameUpdate = async (game, noChats) => {
	if (!game || typeof game !== 'object') {
		return;
	}

	await setGameAsync(game);
	// const playerChats = await getRangeGameChatsAsync(game.general.uid, 0, -1);

	if (!io.sockets.adapter.rooms[game.general.uid]) {
		// may need adjustment via redis
		console.log('sendinprogressgameupdate returned as there was no room found');
		return;
	}

	const seatedPlayerNames = game.publicPlayersState.map((player) => player.userName);
	// io.sockets.adapter.clients

	const roomSockets = Object.keys(io.sockets.adapter.rooms[game.general.uid].sockets).map(
		(sockedId) => io.sockets.connected[sockedId]
	);

	const playerSockets = roomSockets.filter(
		(socket) =>
			socket &&
			socket.handshake.session.passport &&
			Object.keys(socket.handshake.session.passport).length &&
			seatedPlayerNames.includes(socket.handshake.session.passport.user)
	);

	const observerSockets = roomSockets.filter(
		(socket) =>
			(socket && !socket.handshake.session.passport) ||
			(socket && !seatedPlayerNames.includes(socket.handshake.session.passport.user))
	);

	playerSockets.forEach((sock) => {
		const _game = Object.assign({}, game);
		const { user } = sock.handshake.session.passport;

		if (!game.gameState.isCompleted && game.gameState.isTracksFlipped) {
			const privatePlayer = _game.private.seatedPlayers.find((player) => user === player.userName);

			if (!_game || !privatePlayer) {
				return;
			}

			_game.playersState = privatePlayer.playersState;
			_game.cardFlingerState = privatePlayer.cardFlingerState || [];
		}

		if (noChats) {
			sock.emit('gameUpdate', secureGame(_game), true);
		} else {
			_game.chats = combineInProgressChats(_game, user);
			sock.emit('gameUpdate', secureGame(_game));
		}
	});

	// redis todo look at this
	// let chatWithHidden = game.chats;
	// if (!noChats && game.private && game.private.hiddenInfoChat && game.private.hiddenInfoSubscriptions.length) {
	// 	chatWithHidden = [...chatWithHidden, ...game.private.hiddenInfoChat];
	// }
	if (observerSockets.length) {
		observerSockets.forEach((sock) => {
			const _game = Object.assign({}, game);
			const user = sock.handshake.session.passport ? sock.handshake.session.passport.user : null;

			if (noChats) {
				sock.emit('gameUpdate', secureGame(_game), true);
			} else if (
				user &&
				game.private &&
				game.private.hiddenInfoSubscriptions &&
				game.private.hiddenInfoSubscriptions.includes(user)
			) {
				// AEM status is ensured when adding to the subscription list
				_game.chats = chatWithHidden;
				_game.chats = combineInProgressChats(_game);
				sock.emit('gameUpdate', secureGame(_game));
			} else {
				_game.chats = combineInProgressChats(_game);
				sock.emit('gameUpdate', secureGame(_game));
			}
		});
	}
};

module.exports.sendInProgressModChatUpdate = async (game, chat, specificUser) => {
	if (!io.sockets.adapter.rooms[game.general.uid]) {
		return;
	}

	await setGameAsync(game);

	const roomSockets = Object.keys(io.sockets.adapter.rooms[game.general.uid].sockets).map(
		(sockedId) => io.sockets.connected[sockedId]
	);

	if (roomSockets.length) {
		roomSockets.forEach((sock) => {
			if (sock && sock.handshake && sock.handshake.passport && sock.handshake.passport.user) {
				const { user } = sock.handshake.session.passport;
				if (game.private.hiddenInfoSubscriptions.includes(user)) {
					// AEM status is ensured when adding to the subscription list
					if (!specificUser) {
						// single message
						sock.emit('gameModChat', chat);
					} else if (specificUser === user) {
						// list of messages
						chat.forEach((msg) => sock.emit('gameModChat', msg));
					}
				}
			}
		});
	}
};

module.exports.sendPlayerChatUpdate = async (game, chat) => {
	const { uid } = game.general;
	if (!io.sockets.adapter.rooms[uid]) {
		return;
	}

	const roomSockets = Object.keys(io.sockets.adapter.rooms[game.general.uid].sockets).map(
		(sockedId) => io.sockets.connected[sockedId]
	);

	roomSockets.forEach((sock) => {
		if (sock) {
			sock.emit('playerChatUpdate', chat);
		}
	});

	game.chats.push(chat);

	setGameAsync(game);

	// pushGameChatAsync(uid, chat);
};

module.exports.secureGame = secureGame;

const avg = (accounts, accessor) => accounts.reduce((prev, curr) => prev + accessor(curr), 0) / accounts.length;

module.exports.rateEloGame = (game, accounts, winningPlayerNames) => {
	// ELO constants
	const defaultELO = 1600;
	const libAdjust = {
		5: -19.253,
		6: 20.637,
		7: -17.282,
		8: 45.418,
		9: -70.679,
		10: -31.539,
	};
	const rk = 9;
	const nk = 4;
	// Players
	const losingPlayerNames = game.private.seatedPlayers
		.filter((player) => !winningPlayerNames.includes(player.userName))
		.map((player) => player.userName);
	// Accounts
	const winningAccounts = accounts.filter((account) => winningPlayerNames.includes(account.username));
	const loosingAccounts = accounts.filter((account) => losingPlayerNames.includes(account.username));
	// Construct some basic statistics for each team
	const b = game.gameState.isCompleted === 'liberal' ? 1 : 0;
	const size = game.private.seatedPlayers.length;
	const averageRatingWinners = avg(winningAccounts, (a) => a.eloOverall || defaultELO) + b * libAdjust[size];
	const averageRatingWinnersSeason = avg(winningAccounts, (a) => a.eloSeason || defaultELO) + b * libAdjust[size];
	const averageRatingLosers = avg(loosingAccounts, (a) => a.eloOverall || defaultELO) + (1 - b) * libAdjust[size];
	const averageRatingLosersSeason = avg(loosingAccounts, (a) => a.eloSeason || defaultELO) + (1 - b) * libAdjust[size];
	// Elo Formula
	const k = size * (game.general.rainbowgame ? rk : nk); // non-rainbow games are capped at k/r
	const winFactor = k / winningPlayerNames.length;
	const loseFactor = -k / losingPlayerNames.length;
	const p = 1 / (1 + Math.pow(10, (averageRatingWinners - averageRatingLosers) / 400));
	const pSeason = 1 / (1 + Math.pow(10, (averageRatingWinnersSeason - averageRatingLosersSeason) / 400));
	const ratingUpdates = {};
	accounts.forEach((account) => {
		const eloOverall = account.eloOverall ? account.eloOverall : defaultELO;
		const eloSeason = account.eloSeason ? account.eloSeason : defaultELO;
		const factor = winningPlayerNames.includes(account.username) ? winFactor : loseFactor;
		const change = p * factor;
		const changeSeason = pSeason * factor;
		account.eloOverall = eloOverall + change;
		account.eloSeason = eloSeason + changeSeason;
		account.save();
		ratingUpdates[account.username] = { change, changeSeason };
	});
	return ratingUpdates;
};
