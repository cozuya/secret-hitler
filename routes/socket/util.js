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

module.exports.rateEloGame = (game, accounts, winningPlayerNames) => {
	const losingPlayerNames = game.private.seatedPlayers.filter(player => !winningPlayerNames.includes(player.userName)).map(player => player.userName);
	const libWinAdjust = {
		5: -19.253,
		6: 20.637,
		7: -17.282,
		8: 45.418,
		9: -70.679,
		10: -31.539
	};
	let averageRatingWinners =
		winningPlayerNames.reduce(
			(prev, curr) =>
				(accounts.find(account => account.username === curr).eloOverall ? accounts.find(account => account.username === curr).eloOverall : 1600) + prev,
			0
		) / winningPlayerNames.length;
	let averageRatingWinnersSeason =
		winningPlayerNames.reduce(
			(prev, curr) =>
				(accounts.find(account => account.username === curr).eloSeason ? accounts.find(account => account.username === curr).eloSeason : 1600) + prev,
			0
		) / winningPlayerNames.length;
	let averageRatingLosers =
		losingPlayerNames.reduce(
			(prev, curr) =>
				(accounts.find(account => account.username === curr).eloOverall ? accounts.find(account => account.username === curr).eloOverall : 1600) + prev,
			0
		) / losingPlayerNames.length;
	let averageRatingLosersSeason =
		losingPlayerNames.reduce(
			(prev, curr) =>
				(accounts.find(account => account.username === curr).eloSeason ? accounts.find(account => account.username === curr).eloSeason : 1600) + prev,
			0
		) / losingPlayerNames.length;

	if (game.gameState.isCompleted === 'liberal') {
		averageRatingWinners += libWinAdjust[game.private.seatedPlayers.length];
		averageRatingWinnersSeason += libWinAdjust[game.private.seatedPlayers.length];
	} else {
		averageRatingLosers += libWinAdjust[game.private.seatedPlayers.length];
		averageRatingLosersSeason += libWinAdjust[game.private.seatedPlayers.length];
	}

	const k = 64;

	const winFactor = k / winningPlayerNames.length;
	const loseFactor = -k / losingPlayerNames.length;

	let eloAdjustment = {};

	accounts.forEach(account => {
		let eloOverall;
		let eloSeason;

		if (!account.eloOverall) {
			eloOverall = 1600;
			eloSeason = 1600;
		} else {
			eloOverall = account.eloOverall;
			eloSeason = account.eloSeason;
		}

		const win = winningPlayerNames.includes(account.username);
		let change;
		let changeSeason;
		if (win) {
			const p = 1 / (1 + Math.pow(10, (eloOverall - averageRatingLosers) / 400));
			const pSeason = 1 / (1 + Math.pow(10, (eloSeason - averageRatingLosersSeason) / 400));
			change = p * winFactor;
			changeSeason = pSeason * winFactor;
		} else {
			const p = 1 / (1 + Math.pow(10, (averageRatingWinners - eloOverall) / 400));
			const pSeason = 1 / (1 + Math.pow(10, (averageRatingWinnersSeason - eloSeason) / 400));
			change = p * loseFactor;
			changeSeason = pSeason * loseFactor;
		}

		account.eloOverall = account.eloOverall + change;
		account.eloSeason = account.eloSeason + changeSeason;

		eloAdjustment[account.username] = {change, changeSeason};

		account.save();
	});

	return eloAdjustment;
};
