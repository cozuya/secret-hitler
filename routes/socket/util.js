/**
 * @param {object} game - game to act on.
 * @return {object} game
 */
const secureGame = game => {
	const _game = Object.assign({}, game);

	delete _game.private;
	return _game;
};

const combineInProgressChats = (game, userName) =>
	userName && game.gameState.isTracksFlipped
		? game.private.seatedPlayers.find(player => player.userName === userName).gameChats.concat(game.chats)
		: game.private.unSeatedGameChats.concat(game.chats);

/**
 * @param {object} game - game to act on.
 */
// todo-release make this accept a socket argument and emit only to it if it exists
module.exports.sendInProgressGameUpdate = game => {
	if (!io.sockets.adapter.rooms[game.general.uid]) {
		return;
	}

	const seatedPlayerNames = game.publicPlayersState.map(player => player.userName);
	const roomSockets = Object.keys(io.sockets.adapter.rooms[game.general.uid].sockets).map(sockedId => io.sockets.connected[sockedId]);
	const playerSockets = roomSockets.filter(
		socket =>
			socket &&
			socket.handshake.session.passport &&
			Object.keys(socket.handshake.session.passport).length &&
			seatedPlayerNames.includes(socket.handshake.session.passport.user)
	);
	const observerSockets = roomSockets.filter(
		socket => (socket && !socket.handshake.session.passport) || (socket && !seatedPlayerNames.includes(socket.handshake.session.passport.user))
	);

	if (playerSockets.length) {
		playerSockets.forEach(sock => {
			const _game = Object.assign({}, game);
			const { user } = sock.handshake.session.passport;

			if (!game.gameState.isCompleted && game.gameState.isTracksFlipped) {
				const privatePlayer = _game.private.seatedPlayers.find(player => user === player.userName);

				if (!_game || !privatePlayer) {
					return;
				}

				_game.playersState = privatePlayer.playersState;
				_game.cardFlingerState = privatePlayer.cardFlingerState || [];
			}

			_game.chats = combineInProgressChats(_game, user);
			sock.emit('gameUpdate', secureGame(_game));
		});
	}

	if (observerSockets.length) {
		observerSockets.forEach(sock => {
			const _game = Object.assign({}, game);

			_game.chats = combineInProgressChats(_game);
			sock.emit('gameUpdate', secureGame(_game));
		});
	}
};

module.exports.sendInProgressModChatUpdate = (game, chat, specificUser) => {
	if (!io.sockets.adapter.rooms[game.general.uid]) {
		return;
	}

	const roomSockets = Object.keys(io.sockets.adapter.rooms[game.general.uid].sockets).map(sockedId => io.sockets.connected[sockedId]);

	if (roomSockets.length) {
		playerSockets.forEach(sock => {
			const { user } = sock.handshake.session.passport;
			if (game.private.hiddenInfoSubscriptions.includes(user)) {
				// AEM status is ensured when adding to the subscription list
				if (!specificUser) {
					sock.emit('gameModChat', chat);
				} else if (specificUser === user) {
					game.private.hiddenInfoChat.forEach(chat => sock.emit('gameModChat', chat));
				}
			}
		});
	}
};

module.exports.sendPlayerChatUpdate = (game, chat) => {
	if (!io.sockets.adapter.rooms[game.general.uid]) {
		return;
	}

	const roomSockets = Object.keys(io.sockets.adapter.rooms[game.general.uid].sockets).map(sockedId => io.sockets.connected[sockedId]);

	roomSockets.forEach(sock => {
		sock.emit('playerChatUpdate', chat);
	});
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
		10: -31.539
	};
	const rk = 12;
	const nk = 3;
	// Players
	const losingPlayerNames = game.private.seatedPlayers.filter(player => !winningPlayerNames.includes(player.userName)).map(player => player.userName);
	// Accounts
	const winningAccounts = accounts.filter(account => winningPlayerNames.includes(account.username));
	const loosingAccounts = accounts.filter(account => losingPlayerNames.includes(account.username));
	// Construct some basic statistics for each team
	const b = game.gameState.isCompleted === 'liberal' ? 1 : 0;
	const size = game.private.seatedPlayers.length;
	const averageRatingWinners = avg(winningAccounts, a => a.eloOverall || defaultELO) + b * libAdjust[size];
	const averageRatingWinnersSeason = avg(winningAccounts, a => a.eloSeason || defaultELO) + b * libAdjust[size];
	const averageRatingLosers = avg(loosingAccounts, a => a.eloOverall || defaultELO) + (1 - b) * libAdjust[size];
	const averageRatingLosersSeason = avg(loosingAccounts, a => a.eloSeason || defaultELO) + (1 - b) * libAdjust[size];
	// Elo Formula
	const k = size * (game.general.rainbowgame ? rk : nk); // non-rainbow games are capped at k/r
	const winFactor = k / winningPlayerNames.length;
	const loseFactor = -k / losingPlayerNames.length;
	const p = 1 / (1 + Math.pow(10, (averageRatingWinners - averageRatingLosers) / 400));
	const pSeason = 1 / (1 + Math.pow(10, (averageRatingWinnersSeason - averageRatingLosersSeason) / 400));
	let ratingUpdates = {};
	accounts.forEach(account => {
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
