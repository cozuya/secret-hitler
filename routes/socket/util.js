const { newStaff } = require('./models');
const util = require('util');
const { Webhook } = require('discord-webhook-node');
const tempy = require('tempy');

/**
 * Debugging function to send a game to Discord after it's been identified to be cyclic
 */

const debugSendGame = (game, message = '') => {
	const _game = Object.assign({}, game);
	delete _game.unsentReports;
	const webhook = new Webhook(process.env.DISCORDPRIVATEDEVELOPERS);
	const gameStr = util.inspect(_game, { showHidden: true, depth: null, colors: false });

	tempy.write.task(
		gameStr,
		filename => {
			if (message) webhook.send(message);
			webhook.sendFile(filename);
		},
		{ extension: '.txt' }
	);
};
module.exports.debugSendGame = debugSendGame;

const identified = [];
/**
 * Check if a game is cyclic (JSON stringify fails on a cyclic object)
 * @param {*} game game object
 * @param {string} phase identifier of when this was detected
 */
const testGameObject = game => {
	if (identified.indexOf(game.general.uid) !== -1) return;
	try {
		// eslint-disable-next-line no-unused-vars
		const str = JSON.stringify(game);
	} catch (e) {
		debugSendGame(game, `Cyclic game object detected, stack trace: \n${e.stack}`);
		identified.push(game.general.uid);
	}
};
module.exports.testGameObject = testGameObject;

/**
 * @param {object} game - game to act on.
 * @return {object} game
 */
const secureGame = game => {
	const _game = Object.assign({}, game);

	delete _game.private;
	delete _game.remakeData;
	delete _game.guesses;
	delete _game.unsentReports;
	return _game;
};

const combineInProgressChats = (game, userName) =>
	userName && game.gameState.isTracksFlipped
		? game.private.seatedPlayers.find(player => player.userName === userName).gameChats.concat(game.chats)
		: game.private.unSeatedGameChats.concat(game.chats);

const combineCommandChats = (game, user, commandChats) => (commandChats[user] ? game.chats.concat(commandChats[user]) : game.chats);

module.exports.combineCommandChats = combineCommandChats;

/**
 * @param {object} game - game to act on.
 * @param {boolean} noChats - remove chats for client to handle.
 */
module.exports.sendInProgressGameUpdate = (game, noChats = false) => {
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

		_game.chats = combineCommandChats(_game, user, game.private.commandChats);

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

			if (user && game.private && game.private.hiddenInfoSubscriptions && game.private.hiddenInfoSubscriptions.includes(user)) {
				// AEM status is ensured when adding to the subscription list
				_game.chats = chatWithHidden;
			}

			if (noChats) {
				delete _game.chats;
				sock.emit('gameUpdate', secureGame(_game), true);
			} else {
				_game.chats = combineInProgressChats(_game);
				_game.chats = combineCommandChats(_game, user, game.private.commandChats);

				sock.emit('gameUpdate', secureGame(_game));
			}

			testGameObject(_game);
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

module.exports.sendCommandChatsUpdate = game => {
	if (!io.sockets.adapter.rooms[game.general.uid]) {
		return;
	}

	const roomSockets = Object.keys(io.sockets.adapter.rooms[game.general.uid].sockets).map(sockedId => io.sockets.connected[sockedId]);

	roomSockets.forEach(sock => {
		if (sock) {
			const _game = Object.assign({}, game);
			const user = sock.handshake?.session?.passport?.user;
			if (user) {
				_game.chats = combineCommandChats(_game, user, game.private.commandChats);
				sock.emit('gameUpdate', secureGame(_game));
			}
		}
	});
};

module.exports.secureGame = secureGame;

const getStaffRole = (user, modUserNames, editorUserNames, adminUserNames) => {
	if (modUserNames.includes(user) || newStaff.modUserNames.includes(user)) {
		return 'moderator';
	} else if (editorUserNames.includes(user) || newStaff.editorUserNames.includes(user)) {
		return 'editor';
	} else if (adminUserNames && adminUserNames.includes(user)) {
		return 'admin';
	}
	return '';
};
module.exports.getStaffRole = getStaffRole;

const handleAEMMessages = (dm, user, modUserNames, editorUserNames, adminUserNames) => {
	const dmClone = Object.assign({}, dm);

	if (getStaffRole(user, modUserNames, editorUserNames, adminUserNames)) {
		dmClone.messages = dmClone.aemOnlyMessages;
	}

	delete dmClone.aemOnlyMessages;
	delete dmClone.subscribedPlayers;

	return dmClone;
};
module.exports.handleAEMMessages = handleAEMMessages;

module.exports.sendInProgressModDMUpdate = (dm, modUserNames, editorUserNames, adminUserNames) => {
	for (const user of dm.subscribedPlayers) {
		try {
			io.sockets.sockets[
				Object.keys(io.sockets.sockets).find(
					socketId => io.sockets.sockets[socketId].handshake.session.passport && io.sockets.sockets[socketId].handshake.session.passport.user === user
				)
			].emit('inProgressModDMUpdate', handleAEMMessages(dm, user, modUserNames, editorUserNames, adminUserNames));
		} catch (e) {
			console.log('err', e);
		}
	}
};

const avg = (accounts, accessor) => accounts.reduce((prev, curr) => prev + accessor(curr), 0) / accounts.length;

// Calculates the bias in elo points
const probToEloPoints = p => -400 * Math.log10(1 / p - 1);

// The probability of this team winning in this game size, given perfectly equal teams, in terms of elo points
const winnerBiasPoints = game => {
	const liberalBias = game.gameState.isCompleted === 'liberal' ? 1 : -1;
	const fascistBias = game.gameState.isCompleted === 'liberal' ? -1 : 1;
	if (game.general.rebalance6p) {
		return probToEloPoints(0.5 + 0.03 * fascistBias);
	} else if (game.general.rebalance7p) {
		return probToEloPoints(0.5 + 0.01 * fascistBias);
	} else if (game.general.rebalance9p2f) {
		return probToEloPoints(0.5 + 0.07 * fascistBias);
	} else {
		switch (game.general.playerCount) {
			case 5:
				return probToEloPoints(0.5 + 0.04 * fascistBias);
			case 6:
				return probToEloPoints(0.5 + 0.07 * liberalBias);
			case 7:
				return probToEloPoints(0.5 + 0.02 * fascistBias);
			case 8:
				return probToEloPoints(0.5 + 0.04 * liberalBias);
			case 9:
				return probToEloPoints(0.5 + 0.08 * fascistBias);
			case 10:
				return probToEloPoints(0.5 + 0.04 * fascistBias);
			default:
				return 0;
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
	const date = new Date(); // ensure we use the same date for each player
	accounts.forEach(account => {
		const eloOverall = account.eloOverall ? account.eloOverall : defaultELO;
		const eloSeason = account.eloSeason ? account.eloSeason : defaultELO;
		// If this player won, use the win factor. If they lost, use the lost factor.
		const factor = winningPlayerNames.includes(account.username) ? winFactor : loseFactor;
		const change = p * factor;
		const changeSeason = pSeason * factor;

		const xpChange = change > 0 ? change / 1.5 : 1;
		const xpChangeSeason = changeSeason > 0 ? changeSeason / 1.5 : 1;

		account.eloOverall = eloOverall + change;
		account.maxElo = Math.max(account.maxElo, account.eloOverall);
		account.pastElo.push({
			date,
			value: account.eloOverall
		});
		account.xpOverall = (account.xpOverall || 0) + xpChange;
		account.eloSeason = eloSeason + changeSeason;
		account.xpSeason = (account.xpSeason || 0) + xpChangeSeason;

		if (account.xpOverall >= 10.0) {
			account.isRainbowOverall = true;
			account.dateRainbowOverall = new Date();
		}

		if (account.xpSeason >= 10.0) {
			account.isRainbowSeason = true;
		}

		account.save();
		ratingUpdates[account.username] = { change, changeSeason, xpChange, xpChangeSeason };
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

class LineGuess {
	/**
	 * @type number[]
	 */
	regs;

	/**
	 * @type number|null
	 */
	hit;

	/**
	 * @param {{regs: number[], hit: (number|null)}} o
	 */
	constructor(o = { regs: [], hit: null }) {
		this.regs = o.regs;
		this.hit = o.hit;
	}

	/**
	 * @return {string} - A string representation of the guess, can be passed to parse.
	 */
	toString() {
		return this.regs
			.map(reg => {
				const newReg = reg === 10 ? 0 : reg;
				return reg === this.hit ? `${newReg}h` : `${newReg}`;
			})
			.join('');
	}

	/**
	 * @param {LineGuess} other - the guess to compare this to.
	 * @return {boolean} - whether the guesses are equal.
	 */
	equals(other) {
		if (this.hit !== other.hit) {
			return false;
		}

		if (this.regs.length !== other.regs.length) {
			return false;
		}

		for (let i = 0; i < this.regs.length; i++) {
			if (this.regs[i] !== other.regs[i]) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Parses a string guess into a structured format.
	 *
	 * @param {string} guess - the guess string.
	 * @return {LineGuess|null} - the resulting guess, or null if it is invalid.
	 */
	static parse(guess) {
		const fasRegex = /(\dh?)/gi;

		const result = new LineGuess();
		const m = guess.match(fasRegex);
		if (!m) {
			return null;
		}

		for (const match of m) {
			let seat = parseInt(match[0]);
			seat = seat === 0 ? 10 : seat;

			if (result.regs.includes(seat)) {
				return null;
			}

			result.regs.push(seat);
			if (match.length === 2) {
				if (result.hit) {
					return null;
				}

				result.hit = seat;
			}
		}

		result.regs.sort((a, b) => a - b);
		return result;
	}

	/**
	 * @param {LineGuess} other - the guess to find the difference of this to.
	 * @return {[number, boolean]} - the number of fas the same and whether hit is the same.
	 */
	difference(other) {
		const fasSame = this.regs.reduce((accum, f) => accum + other.regs.includes(f), 0);
		return [fasSame, this.hit === other.hit];
	}
}

module.exports.LineGuess = LineGuess;

// tacks on "/64" to IPv6 ips; needed to properly ban IPv6 ips
module.exports.handleDefaultIPv6Range = ip => {
	// check if there is NOT a : or there IS a / (ie. it's not IPv6 or it already has a CIDR range)
	return ip.indexOf(':') === -1 || ip.indexOf('/') !== -1 ? ip : ip + '/64';
};
