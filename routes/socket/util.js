/**
 * @param {object} game - game to act on.
 * @return {object} game
 */
const secureGame = game => {
	const _game = Object.assign({}, game);

	delete _game.private;
	return _game;
};

/**
 * @param {object} game - game to act on.
 */
// todo-release make this accept a socket argument and emit only to it if it exists
module.exports.sendInProgressGameUpdate = game => {
	const seatedPlayerNames = game.publicPlayersState.map(player => player.userName);

	/**
	 * @param {object} game - game to act on.
	 * @param {string} userName - name of user to act on.
	 * @return {array} list of chats.
	 */
	const combineInProgressChats = (game, userName) => {
		let player;

		if (userName && game.gameState.isTracksFlipped) {
			player = game.private.seatedPlayers.find(player => player.userName === userName);
		}

		return player ? player.gameChats.concat(game.chats) : game.private.unSeatedGameChats.concat(game.chats);
	};

	let roomSockets;
	let playerSockets;
	let observerSockets;

	if (io.sockets.adapter.rooms[game.general.uid]) {
		roomSockets = Object.keys(io.sockets.adapter.rooms[game.general.uid].sockets).map(sockedId => io.sockets.connected[sockedId]);

		playerSockets = roomSockets.filter(
			socket =>
				socket &&
				socket.handshake.session.passport &&
				Object.keys(socket.handshake.session.passport).length &&
				seatedPlayerNames.includes(socket.handshake.session.passport.user)
		);

		observerSockets = roomSockets.filter(
			socket => (socket && !socket.handshake.session.passport) || (socket && !seatedPlayerNames.includes(socket.handshake.session.passport.user))
		);
	}

	if (playerSockets) {
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

	if (observerSockets) {
		observerSockets.forEach(sock => {
			const _game = Object.assign({}, game);

			_game.chats = combineInProgressChats(_game);
			sock.emit('gameUpdate', secureGame(_game));
		});
	}
};

module.exports.secureGame = secureGame;

function avg(accounts, players, accessor, fallback) {
	return (
		players.reduce(
			(prev, curr) =>
				accessor(accounts.find(account => account.username === curr)) ? acsessor(accounts.find(account => account.username === curr)) + prev : fallback,
			0
		) / players.length
	);
}

module.exports.rateEloGame = (game, accounts, winningPlayerNames) => {
	// ELO constants
	const defaultELO = 1600;
	const winAdjust = {
		5: -19.253,
		6: 20.637,
		7: -17.282,
		8: 45.418,
		9: -70.679,
		10: -31.539
	};
	const k = 64;
	// Players
	const losingPlayerNames = game.private.seatedPlayers.filter(player => !winningPlayerNames.includes(player.userName)).map(player => player.userName);
	// Construct some basic statistics for each team
	const b = game.winningTeam === 'liberal' ? 1 : -1;
	const averageRatingWinners = avg(accounts, winningPlayerNames, a => a.eloOverall, defaultELO) + b * winAdjust[game.playerCount];
	const averageRatingLosers = avg(accounts, losingPlayerNames, a => a.eloOverall, defaultELO) - b * winAdjust[game.playerCount];
	const averageRatingWinnersSeason = avg(accounts, winningPlayerNames, a => a.eloSeason, defaultELO) + b * winAdjust[game.playerCount];
	const averageRatingLosersSeason = avg(accounts, losingPlayerNames, a => a.eloSeason, defaultELO) - b * winAdjust[game.playerCount];
	// Elo Formula
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
