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
 * @param {boolean} noChats - remove chats for client to handle.
 */
module.exports.sendInProgressGameUpdate = (game, noChats) => {
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

		if (noChats) {
			delete _game.chats;
			sock.emit('gameUpdate', secureGame(_game), true);
		} else {
			_game.chats = combineInProgressChats(_game, user);
			sock.emit('gameUpdate', secureGame(_game));
		}
	});

	let chatWithHidden = game.chats;
	if (!noChats && game.private && game.private.hiddenInfoChat && game.private.hiddenInfoSubscriptions.length) {
		chatWithHidden = [...chatWithHidden, ...game.private.hiddenInfoChat];
	}
	if (observerSockets.length) {
		observerSockets.forEach(sock => {
			const _game = Object.assign({}, game);
			const user = sock.handshake.session.passport ? sock.handshake.session.passport.user : null;

			if (noChats) {
				delete _game.chats;
				sock.emit('gameUpdate', secureGame(_game), true);
			} else if (user && game.private && game.private.hiddenInfoSubscriptions && game.private.hiddenInfoSubscriptions.includes(user)) {
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

module.exports.sendInProgressModChatUpdate = (game, chat, specificUser) => {
	if (!io.sockets.adapter.rooms[game.general.uid]) {
		return;
	}

	const roomSockets = Object.keys(io.sockets.adapter.rooms[game.general.uid].sockets).map(sockedId => io.sockets.connected[sockedId]);

	if (roomSockets.length) {
		roomSockets.forEach(sock => {
			if (sock && sock.handshake && sock.handshake.passport && sock.handshake.passport.user) {
				const { user } = sock.handshake.session.passport;
				if (game.private.hiddenInfoSubscriptions.includes(user)) {
					// AEM status is ensured when adding to the subscription list
					if (!specificUser) {
						// single message
						sock.emit('gameModChat', chat);
					} else if (specificUser === user) {
						// list of messages
						chat.forEach(msg => sock.emit('gameModChat', msg));
					}
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
		if (sock) {
			sock.emit('playerChatUpdate', chat);
		}
	});
};

module.exports.secureGame = secureGame;

const formTeams = (game, accounts, winningPlayerNames) => {
	const losingPlayerNames = game.private.seatedPlayers
		.filter(p => !winningPlayerNames.includes(p.userName))
		.map(p => p.userName);
	const winners = accounts.filter(account => winningPlayerNames.includes(account.username));
	const losers = accounts.filter(account => losingPlayerNames.includes(account.username));
	const libWin = game.gameState.isCompleted === 'liberal';
	return {'liberals': libWin ? winners : losers, 'fascists': libWin ? losers : winners};
};

const avg = (accounts, accessor, defaultELO) => {
	return accounts.reduce((prev, curr) => prev + (accessor(curr) || defaultELO), 0) / accounts.length;
};

const agragateRanks = (game, liberals, fascists, gameStatistics, defaultELO, accessor) => {
	// Average each team's rank
	const lAvg = avg(liberals, accessor, defaultELO);
	const fAvg = avg(fascists, accessor, defaultELO);
	// Adjust each team
	const lRank = lAvg + (gameStatistics.liberalBias || defaultELO);
	const fRank = fAvg + (gameStatistics.fascistBias || defaultELO);
	// Calculate the rank difference
	const libWin = game.gameState.isCompleted === 'liberal';
	return libWin ? lRank - fRank : fRank - lRank;
};

const updateRating = (delta) => 1 / (1 + Math.pow(10, delta / 400));

module.exports.rateEloGame = (game, accounts, winningPlayerNames, gameStatistics) => {
	// ELO constants
	const defaultELO = 1600;
	const size = game.private.seatedPlayers.length;
	const k = size * (game.general.rainbowgame ? 12 : 3);
	const libWin = game.gameState.isCompleted === 'liberal';
	const comp = 4;
	// Average each team's rank
  const { liberals, fascists } = formTeams(game, accounts, winningPlayerNames);
	const deltaOverall = agragateRanks(game, liberals, fascists, gameStatistics, defaultELO, a => a.eloOverall);
	const deltaSeason = agragateRanks(game, liberals, fascists, gameStatistics, defaultELO, a => a.eloSeason);
	// Apply rating
	const pOverall = updateRating(deltaOverall);
	const pSeason = updateRating(deltaSeason);
	// Update bias
	gameStatistics.liberalBias = (gameStatistics.liberalBias || defaultELO) + ((libWin ? 1 : -1 ) * pOverall * comp);
	gameStatistics.fascistBias = (gameStatistics.fascistBias || defaultELO) + ((libWin ? -1 : 1 ) * pOverall * comp);
	gameStatistics.save();
	// Calculate distribution
	const lFactor = k / liberals.length;
	const fFactor = k / fascists.length;
	const winFactor = libWin ? lFactor : fFactor;
	const loseFactor = -(libWin ? fFactor : lFactor);
	// Apply the changes to all players
	let ratingUpdates = {};
	accounts.forEach(account => {
		const isWinner = winningPlayerNames.includes(account.username);
		const factor = isWinner ? winFactor : loseFactor;
		// Apply overall elo change
		const updateOverall = pOverall * factor;
		account.eloOverall = (account.eloOverall || defaultELO) + updateOverall;
		// Apply seasonal elo change
		const updateSeason = pSeason * factor;
		account.eloSeason = (account.eloSeason || defaultELO) + updateSeason;

		account.save();
		ratingUpdates[account.username] = { change: updateOverall, changeSeason: updateSeason };
	});
	return ratingUpdates;
};
