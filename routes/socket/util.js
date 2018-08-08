const Bias = require('../../models/bias');
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

/**
 * Averages a list of numbers.
 * @param {array} elements
 * @return {number}
 */
function average(elements) {
	return elements.reduce((sum, value) => sum + value, 0) / elements.length;
}

/**
 * Computes the standard deviation of a list of numbers.
 * @param {array} elements
 * @return {number}
 */
function standardDeviation(elements) {
	const avg = average(elements);
	return Math.sqrt(average(elements.map(p => (p - avg) ** 2)));
}

/**
 * Arpad Elo's original rank formulation
 * @param {number} w - winner's rank
 * @param {number} l - loser's rank
 * @param {number} k - maximum rank change multiplyer
 * @return {number} - amount to take from the losers and give to the winners
 */
function elo(w, l, k) {
	p = 1 / (1 + 10 ** ((w - l) / 400));
	return p * k;
}

/**
 * A generalised sigmoid builder
 * @param {number} bias - translates the sigmoid in y
 * @param {number} offset - translates the sigmoid in x
 * @param {number} spread - controlls falloff of sigmoid
 * @return {function(number): number} - parameterised sigmoid
 */
function sigmoid(bias, offset, spread) {
	return x => bias + 1 / (1 + 10 ** ((x - offset) / spread));
}

/**
 * Updates the database with rankings for a game
 * @param {object} game - game to rate
 * @param {array} accounts - accounts of players in game
 * @param {array} winningPlayerNames - names of winning players
 * @return {object} - dict of changes to players
 */
module.exports.rateEloGame = (game, accounts, winningPlayerNames) => {
	// Constants
	const startingElo = 1600;
	const kBase = 3 * 6;
	const deviationWeight = sigmoid(.091, 200, 200);
	// players
	const losingPlayerNames = game.private.seatedPlayers.filter(player => !winningPlayerNames.includes(player.userName)).map(player => player.userName);
	// Accounts
	const winners = accounts.filter(account => winningPlayerNames.includes(account.username));
	const losers = accounts.filter(account => losingPlayerNames.includes(account.username));
	// Teams
	const averageWinnerOverall = average(winners.map(w => w.eloOverall[0]));
	const averageWinnerSeason = average(winners.map(w => w.eloSeason[0]));
	const averageLoserOverall = average(losers.map(l => l.eloOverall[0]));
	const averageLoserSeason = average(losers.map(l => l.eloSeason[0]));
	// Bias
	let r = 0;
	if (game.playerCount === 6 && game.rebalance6p) r = 1;
	if (game.playerCount === 7 && game.rebalance7p) r = 1;
	if (game.playerCount === 9 && game.rebalance9p) r = 1;
	if (game.playerCount === 9 && game.rerebalance9p) r = 2;
	if (game.playerCount === 9 && game.rebalance9p2f) r = 3;
	let bias = Bias.findOne({ size: game.playerCount, balance: r }).exec();
	if (!bias) {
		bias = new Bias({ size: game.playerCount, balance: r });
	}
	const libsWon = game.winningTeam === 'liberal';
	const winnerBias = libsWon ? bias.liberal : bias.fascist;
	const loserBias = libsWon ? bias.fascist : bias.liberal;
	// Player Elo
	let delta = {};
	for (let account of accounts) {
		delta[account.username] = {
			changeOverall: 0,
			changeSeason: 0
		};
	}
	for (let winner of winners) {
		if (winner.wins + winner.losses < 50) continue;
		const winnerEloOverall = winner.eloOverall[0] + winnerBias + averageWinnerOverall;
		const winnerEloSeason = winner.eloSeason[0] + winnerBias + averageWinnerSeason;
		for (let loser of losers) {
			if (loser.wins + loser.losses < 50) continue;
			if (winner.username === 'cbell' || loser.username === 'cbell') continue;
			const loserEloOverall = loser.eloOverall[0]+ loserBias + averageLoserOverall;
			const loserEloSeason = loser.eloSeason[0] + loserBias + averageLoserSeason;
			// Overall
			const kOverall = kBase * deviationWeight(standardDeviation(accounts.map(w => w.eloOverall[0] || startingElo)));
			const rewardOverall = elo(winnerEloOverall, loserEloOverall, kOverall);
			delta[winner.username].changeOverall += rewardOverall;
			delta[loser.username].changeOverall -= rewardOverall;
			// Seasonal
			const kSeason = kBase * deviationWeight(standardDeviation(accounts.map(w => w.eloSeason[0] || startingElo)));
			const rewardSeasonal = elo(winnerEloSeason, loserEloSeason, kSeason);
			delta[winner.username].changeSeason += rewardSeasonal;
			delta[loser.username].changeSeason -= rewardSeasonal;
		}
	}
	// Setup game data
	game.elo = [];
	for (let account of accounts) {
		if (delta[account.username].changeOverall !== 0) {
			const newOverall = account.eloOverall[0] + delta[account.username].changeOverall;
			account.eloOverall = [newOverall, ...account.eloOverall].slice(0, 100);
			if (newOverall > account.eloOverallMax) account.eloOverallMax = newOverall;
			account.eloOverallDisplay = 1600 + smoothing(account.eloOverall.map(e => e - 1600), .3);
		}
		if (delta[account.username].changeSeason !== 0) {
			const newSeason = account.eloSeason[0] + delta[account.username].changeSeason;
			account.eloSeason = [newSeason, ...account.eloSeason].slice(0, 100);
			if (newSeason > account.eloSeasonMax) account.eloSeasonMax = newSeason;
			account.eloSeasonDisplay = 1600 + smoothing(account.eloSeason.map(e => e - 1600), .3);
		}
		account.save();
		game.elo.push({
			username: account.username,
			eloOverall: account.eloOverall[0],
			changeOverall: delta[account.username].changeOverall,
			eloSeason: account.eloSeason[0],
			changeSeason: delta[account.username].changeSeason,
		});
		game.save();
	}
	// Team Elo
	const rewardTeams = elo(winnerBias, loserBias, 6) * (libsWon ? 1 : -1);
	bias.liberal += rewardTeams;
	bias.fascist -= rewardTeams;
	bias.save();
	return delta;
};
