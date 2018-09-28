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
	formattedUserList,
	gameListEmitter,
	formattedGameList
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

	const maskEmail = email => {
		const data = email.split('@');
		// if (data[0].length < 7) return '#####@' + data[1]; // Too short to show first/last two chars.
		// return data[0].substring(2) + '#' + data[0].substring(data[0].length-2, data[0].length) + '@' + data[1];
		return data[1] || '';
	};

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
						email: `${user.verified ? '+' : '-'}${maskEmail(user.verification.email)}`
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
					staffRole: account.staffRole || '',
					staffDisableVisibleElo: account.gameSettings.staffDisableVisibleElo,
					staffDisableStaffColor: account.gameSettings.staffDisableStaffColor,
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
	// eslint-disable-line one-var
	if (socket) {
		socket.emit('gameList', formattedGameList());
	} else {
		gameListEmitter.send = true;
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
	const game = games[uid];
	const { passport } = socket.handshake.session;

	if (game) {
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
		sendInProgressGameUpdate(game);
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
