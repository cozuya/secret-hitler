/**
 * @param {object} game - game to act on.
 * @return {object} game
 */
const secureGame = game => {
	const _game = Object.assign({}, game);

	delete _game.private;
	delete _game.remakeData;
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
	if (!game || !io.sockets.adapter.rooms[game.general.uid]) {
		return;
	}

	// DEBUG ONLY
	// console.log(game.general.status, 'TimedMode:', game.gameState.timedModeEnabled, 'TimerId:', game.private.timerId ? 'exists' : 'null');

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

const avg = (accounts, accessor) => accounts.reduce((prev, curr) => prev + accessor(curr), 0) / accounts.length;

// Calculates the bias in elo points
const probToEloPoints = (p) => 400 * Math.log10((1/p) - 1);

// The probability of this team winning in this game size, given perfectly equal teams, in terms of elo points
const winnerBiasPoints = (game) => {
	const liberalBias = game.gameState.isCompleted === 'liberal' ? 1 : -1;
	const fascistBias = game.gameState.isCompleted === 'liberal' ? -1 : 1;
	if (game.general.rebalance6p) {
		return probToEloPoints(.5 + (0.03 * fascistBias))
	} else if (game.general.rebalance7p) {
		return probToEloPoints(.5 + (0.01 * fascistBias))
	} else if (game.general.rebalance9p2f) {
		return probToEloPoints(.5 + (0.07 * fascistBias))
	} else {
		switch (game.general.playerCount) {
			case 5: return probToEloPoints(.5 + (0.04 * fascistBias));
			case 6: return probToEloPoints(.5 + (0.07 * liberalBias));
			case 7: return probToEloPoints(.5 + (0.02 * fascistBias));
			case 8: return probToEloPoints(.5 + (0.04 * liberalBias));
			case 9: return probToEloPoints(.5 + (0.08 * fascistBias));
			case 10: return probToEloPoints(.5 + (0.04 * fascistBias));
			default: return .5;
		}
	}
};

module.exports.rateEloGame = (game, accounts, winningPlayerNames) => {
	const size = game.general.playerCount;
	// The default starting elo is 1600 (totally arbitrary but now we are stuck with it)
	const defaultELO = 1600;
	// The maximum change for rainbow games is rk
	const rk = 9;
	// The maximum change for non-rainbow games is nk
	const nk = 4;
	// Choose the right factor
	const k = size * (game.general.rainbowgame ? rk : nk); // non-rainbow games are capped at k/r
	// Sort the players into winners and losers
	const winningAccounts = accounts.filter(account => winningPlayerNames.includes(account.username));
	const winningSize = winningPlayerNames.length;
	const losingAccounts = accounts.filter(account => !winningPlayerNames.includes(account.username));
	const losingSize = size - winningSize;
	// Construct some basic statistics for each team
	const averageRatingWinners = avg(winningAccounts, a => a.eloOverall || defaultELO);
	const averageRatingWinnersSeason = avg(winningAccounts, a => a.eloSeason || defaultELO);
	const averageRatingLosers = avg(losingAccounts, a => a.eloOverall || defaultELO);
	const averageRatingLosersSeason = avg(losingAccounts, a => a.eloSeason || defaultELO);
	// Elo Formula
	const bias = winnerBiasPoints(game);
	const winFactor = k / winningSize;
	const loseFactor = -k / losingSize;
	// P is the degree to which the new win surprised us, given our current ratings
	// Bias is applied within the sigmoid to ensure that elo is conserved even in situations with huge team differences
	const p = 1 / (1 + Math.pow(10, (averageRatingWinners - averageRatingLosers + bias) / 400));
	const pSeason = 1 / (1 + Math.pow(10, (averageRatingWinnersSeason - averageRatingLosersSeason + bias) / 400));
	// Now we will use our 'supprisedness' p to correct the player rankings
	const ratingUpdates = {};
	accounts.forEach(account => {
		const eloOverall = account.eloOverall ? account.eloOverall : defaultELO;
		const eloSeason = account.eloSeason ? account.eloSeason : defaultELO;
		// If this player won, use the win factor. If they lost, use the lost factor.
		const factor = winningPlayerNames.includes(account.username) ? winFactor : loseFactor;
		const change = p * factor;
		const changeSeason = pSeason * factor;
		account.eloOverall = eloOverall + change;
		account.eloSeason = eloSeason + changeSeason;
		account.save();
		ratingUpdates[account.username] = { change, changeSeason };
	});
	return ratingUpdates;
	// Future work: Someone should make this a single function, applied twice: once to overall and once to seasonal.
};

module.exports.destroySession = username => {
	if (process.env.NODE_ENV !== 'production') {
		const Mongoclient = require('mongodb').MongoClient;

		let mongoClient;

		Mongoclient.connect('mongodb://localhost:27017', { useNewUrlParser: true }, (err, client) => {
			mongoClient = client;
		});

		if (!mongoClient) {
			console.log('WARN: No mongo connection, cannot destroy user session.');
			return;
		}
		mongoClient
			.db('secret-hitler-app')
			.collection('sessions')
			.findOneAndDelete({ 'session.passport.user': username }, err => {
				if (err) {
					try {
						console.log(err, 'err in logoutuser');
					} catch (error) {}
				}
			});
	}
};
