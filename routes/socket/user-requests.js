const Account = require('../../models/account');
const ModAction = require('../../models/modAction');
const PlayerReport = require('../../models/playerReport');
const PlayerNote = require('../../models/playerNote');
const Game = require('../../models/game');
//	const BannedIP = require('../../models/bannedIP');
const {
	games,
	userList,
	generalChats,
	accountCreationDisabled,
	ipbansNotEnforced,
	gameCreationDisabled,
	currentSeasonNumber,
	userListEmitter,
	formattedUserList
} = require('./models');
const { getProfile } = require('../../models/profile/utils');
const { sendInProgressGameUpdate } = require('./util');
const version = require('../../version');
const { obfIP } = require('./ip-obf');
//	const https = require('https');
//	const options = {
//	hostname: 'check.torproject.org',
//	path: '/cgi-bin/TorBulkExitList.py?ip=1.1.1.1'
//	};
//	http://torstatus.blutmagie.de/ip_list_exit.php/Tor_ip_list_EXIT.csv

let torIps = [];

// if (process.env.NODE_ENV) {
// 	try {
// 		https.get(options, res => {
// 			let rawData = '';
// 			res.on('data', chunk => {
// 				rawData += chunk;
// 			});
// 			res.on('end', () => {
// 				try {
// 					torIps = rawData.split('\n').slice(3, rawData.length);
// 				} catch (e) {
// 					console.error(e.message, 'retrieving tor ip addresses failed');
// 				}
// 				torIps.forEach(ip => {
// 					const ipban = new BannedIP({
// 						bannedDate: new Date(),
// 						type: 'large',
// 						ip
// 					});
// 					ipban.save();
// 				});
// 			});
// 		});
// 	} catch (e) {
// 		console.log(e, 'err receiving tor ip addresses');
// 	}
// }

module.exports.torIps = torIps;

/**
 * @param {object} socket - user socket reference.
 */
const sendUserList = (module.exports.sendUserList = socket => {
	// eslint-disable-line one-var
	if (socket) {
		socket.emit('userList', {
			list: formattedUserList()
		});
	} else {
		userListEmitter.send = true;
	}
});

/**
 * @param {object} socket - user socket reference.
 * @param {number} count - depth of modinfo requested.
 */
module.exports.sendModInfo = (socket, count) => {
	const userNames = userList.map(user => user.userName);

	Account.find({ username: userNames, 'gameSettings.isPrivate': false })
		.then(users => {
			ModAction.find()
				.sort({ $natural: -1 })
				.limit(500 * count)
				.then(actions => {
					const list = users.map(user => ({
						isRainbow: user.wins + user.losses > 49,
						userName: user.username,
						isTor: torIps && torIps.includes(user.lastConnectedIP || user.signupIP),
						ip: user.lastConnectedIP || user.signupIP,
						ipObf: false
					}));
					list.forEach(user => {
						if (user.ip && user.ip != '') {
							try {
								user.ip = '-' + obfIP(user.ip);
							} catch (e) {
								user.ip = 'ERROR';
								console.log(e);
							}
						}
					});
					actions.forEach(action => {
						if (action.ip && action.ip != '') {
							if (action.ip.startsWith('-')) {
								action.ip = 'ERROR'; // There are some bugged IPs in the list right now, need to suppress it.
							} else {
								try {
									action.ip = '-' + obfIP(action.ip);
								} catch (e) {
									action.ip = 'ERROR';
									console.log(e);
								}
							}
						}
					});
					socket.emit('modInfo', {
						modReports: actions,
						accountCreationDisabled,
						ipbansNotEnforced,
						gameCreationDisabled,
						userList: list
					});
				})
				.catch(err => {
					console.log(err, 'err in finding mod actions');
				});
		})
		.catch(err => {
			console.log(err, 'err in sending mod info');
		});
};

/**
 * @param {object} socket - user socket reference.
 */
module.exports.sendUserGameSettings = socket => {
	const { passport } = socket.handshake.session;
	if (!passport || !passport.user) {
		return;
	}
	Account.findOne({ username: passport.user })
		.then(account => {
			socket.emit('gameSettings', account.gameSettings);

			const userListNames = userList.map(user => user.userName);

			getProfile(passport.user);
			if (!userListNames.includes(passport.user)) {
				const userListInfo = {
					userName: passport.user,
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
				sendUserList();
			}

			getProfile(passport.user);

			socket.emit('version', {
				current: version,
				lastSeen: account.lastVersionSeen || 'none'
			});
		})
		.catch(err => {
			console.log(err);
		});
};

/**
 * @param {object} socket - user socket reference.
 * @param {object} data - data about the request
 */
module.exports.sendPlayerNotes = (socket, data) => {
	PlayerNote.find({ userName: data.userName, notedUser: { $in: data.seatedPlayers } })
		.then(notes => {
			if (notes) {
				socket.emit('notesUpdate', notes);
			}
		})
		.catch(err => {
			console.log(err, 'err in getting playernotes');
		});
};

/**
 * @param {object} socket - user socket reference.
 * @param {string} uid - uid of game.
 */
module.exports.sendReplayGameChats = (socket, uid) => {
	Game.findOne({ uid }).then((game, err) => {
		if (err) {
			console.log(err, 'game err retrieving for replay');
		}

		if (game) {
			socket.emit('replayGameChats', game.chats);
		}
	});
};

/**
 * @param {object} socket - user socket reference.
 */
module.exports.sendGameList = socket => {
	const formattedGames = games.map(game => ({
		name: game.general.name,
		flag: game.general.flag,
		userNames: game.publicPlayersState.map(val => val.userName),
		customCardback: game.publicPlayersState.map(val => val.customCardback),
		customCardbackUid: game.publicPlayersState.map(val => val.customCardbackUid),
		gameStatus: game.gameState.isCompleted ? game.gameState.isCompleted : game.gameState.isTracksFlipped ? 'isStarted' : 'notStarted',
		seatedCount: game.publicPlayersState.length,
		gameCreatorName: game.general.gameCreatorName,
		minPlayersCount: game.general.minPlayersCount,
		maxPlayersCount: game.general.maxPlayersCount || game.general.minPlayersCount,
		excludedPlayerCount: game.general.excludedPlayerCount,
		casualGame: game.general.casualGame,
		isVerifiedOnly: game.general.isVerifiedOnly,
		isTourny: game.general.isTourny,
		timedMode: game.general.timedMode,
		tournyStatus: (() => {
			if (game.general.isTourny) {
				if (game.general.tournyInfo.queuedPlayers && game.general.tournyInfo.queuedPlayers.length) {
					return {
						queuedPlayers: game.general.tournyInfo.queuedPlayers.length
					};
				}
			}
			return null;
		})(),
		experiencedMode: game.general.experiencedMode,
		disableChat: game.general.disableChat,
		disableGamechat: game.general.disableGamechat,
		blindMode: game.general.blindMode,
		enactedLiberalPolicyCount: game.trackState.liberalPolicyCount,
		enactedFascistPolicyCount: game.trackState.fascistPolicyCount,
		electionCount: game.general.electionCount,
		rebalance6p: game.general.rebalance6p,
		rebalance7p: game.general.rebalance7p,
		rebalance9p: game.general.rerebalance9p,
		privateOnly: game.general.privateOnly,
		private: game.general.private,
		uid: game.general.uid,
		rainbowgame: game.general.rainbowgame
	}));

	if (socket) {
		socket.emit('gameList', formattedGames);
	} else {
		io.sockets.emit('gameList', formattedGames);
	}
};

/**
 * @param {object} socket - user socket reference.
 */
module.exports.sendUserReports = socket => {
	PlayerReport.find()
		.sort({ $natural: -1 })
		.limit(500)
		.then(reports => {
			socket.emit('reportInfo', reports);
		});
};

/**
 * @param {object} socket - user socket reference.
 */
module.exports.sendGeneralChats = socket => {
	socket.emit('generalChats', generalChats);
};

/**
 * @param {object} passport - socket authentication.
 * @param {object} game - target game.
 * @param {string} override - type of user status to be displayed.
 */
const updateUserStatus = (module.exports.updateUserStatus = (passport, game, override) => {
	const user = userList.find(user => user.userName === passport.user);

	if (user) {
		user.status = {
			type: override ? override : game ? (game.general.rainbowgame ? 'rainbow' : 'playing') : 'none',
			gameId: game ? game.general.uid : false
		};
		sendUserList();
	}
});

/**
 * @param {object} socket - user socket reference.
 * @param {string} uid - uid of game.
 */
module.exports.sendGameInfo = (socket, uid) => {
	const game = games.find(el => el.general.uid === uid);
	const { passport } = socket.handshake.session;

	if (game) {
		// Not sure if we need this copy of game anymore? all it's doing is being passed to sendInProgressGameUpdate
		const _game = Object.assign({}, game);

		if (passport && Object.keys(passport).length) {
			const player = game.publicPlayersState.find(player => player.userName === passport.user);

			if (player) {
				player.leftGame = false;
				player.connected = true;
				socket.emit('updateSeatForUser', true);
				updateUserStatus(passport, game);
			} else {
				updateUserStatus(passport, game, 'observing');
			}
		}

		socket.join(uid);
		sendInProgressGameUpdate(_game);
		socket.emit('joinGameRedirect', game.general.uid);
	} else {
		Game.findOne({ uid }).then((game, err) => {
			if (err) {
				console.log(err, 'game err retrieving for replay');
			}

			socket.emit('manualReplayRequest', game ? game.uid : '');
		});
	}
};
