const Account = require('../../models/account');
const ModAction = require('../../models/modAction');
const PlayerReport = require('../../models/playerReport');
const PlayerNote = require('../../models/playerNote');
const Game = require('../../models/game');
const Signups = require('../../models/signups');

const {
	games,
	userList,
	generalChats,
	accountCreationDisabled,
	ipbansNotEnforced,
	gameCreationDisabled,
	limitNewPlayers,
	userListEmitter,
	formattedUserList,
	gameListEmitter,
	formattedGameList
} = require('./models');
const { getProfile } = require('../../models/profile/utils');
const { sendInProgressGameUpdate } = require('./util');
const version = require('../../version');
const { obfIP } = require('./ip-obf');
const { CURRENTSEASONNUMBER } = require('../../src/frontend-scripts/node-constants');

/**
 * @param {object} socket - user socket reference.
 */
const sendUserList = (module.exports.sendUserList = socket => {
	// eslint-disable-line one-var
	if (socket) {
		socket.emit('fetchUser');
		socket.emit('userList', {
			list: formattedUserList()
		});
	} else {
		userListEmitter.send = true;
	}
});

module.exports.sendSpecificUserList = (socket, staffRole) => {
	// eslint-disable-line one-var
	if (socket) {
		console.log(staffRole);
		socket.emit('userList', {
			list: formattedUserList()
		});
	} else {
		userListEmitter.send = true;
	}
};

const getModInfo = (games, users, socket, queryObj, count = 1, isTrial) => {
	const maskEmail = email => (email && email.split('@')[1]) || '';
	ModAction.find(queryObj)
		.sort({ $natural: -1 })
		.limit(500 * count)
		.then(actions => {
			const list = users.map(user => ({
				status: userList.find(userListUser => user.username === userListUser.userName).status,
				isRainbow: user.wins + user.losses > 49,
				userName: user.username,
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
			const gList = [];
			if (games) {
				Object.values(games).forEach(game => {
					gList.push({
						name: game.general.name,
						uid: game.general.uid,
						electionNum: game.general.electionCount,
						casual: game.general.casualGame,
						private: game.general.private,
						custom: game.customGameSettings.enabled,
						unlisted: game.general.unlisted
					});
				});
			}
			socket.emit('modInfo', {
				modReports: actions,
				accountCreationDisabled,
				ipbansNotEnforced,
				gameCreationDisabled,
				limitNewPlayers,
				userList: list,
				gameList: gList,
				hideActions: isTrial || undefined
			});
		})
		.catch(err => {
			console.log(err, 'err in finding mod actions');
		});
};

module.exports.getModInfo = getModInfo;

module.exports.sendSignups = socket => {
	Signups.find({ type: { $in: ['local', 'discord', 'github'] } })
		.sort({ $natural: -1 })
		.limit(500)
		.then(signups => {
			socket.emit('signupsInfo', signups);
		})
		.catch(err => {
			console.log(err, 'err in finding signups');
		});
};

module.exports.sendAllSignups = socket => {
	Signups.find({ type: { $nin: ['local', 'private', 'discord', 'github'] } })
		.sort({ $natural: -1 })
		.limit(500)
		.then(signups => {
			socket.emit('signupsInfo', signups);
		})
		.catch(err => {
			console.log(err, 'err in finding signups');
		});
};

module.exports.sendPrivateSignups = socket => {
	Signups.find({ type: 'private' })
		.sort({ $natural: -1 })
		.limit(500)
		.then(signups => {
			socket.emit('signupsInfo', signups);
		})
		.catch(err => {
			console.log(err, 'err in finding signups');
		});
};

/**
 * @param {array} games - list of all games
 * @param {object} socket - user socket reference.
 * @param {number} count - depth of modinfo requested.
 * @param {boolean} isTrial - true if the user is a trial mod.
 */
module.exports.sendModInfo = (games, socket, count, isTrial) => {
	const userNames = userList.map(user => user.userName);

	Account.find({ username: userNames, 'gameSettings.isPrivate': { $ne: true } })
		.then(users => {
			getModInfo(games, users, socket, {}, count, isTrial);
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
			if (!userListNames.includes(passport.user) && !account.gameSettings.staffIncognito) {
				const userListInfo = {
					userName: passport.user,
					staffRole: account.staffRole || '',
					isContributor: account.isContributor || false,
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
					specialTournamentStatus: account.gameSettings.specialTournamentStatus,
					eloOverall: account.eloOverall,
					eloSeason: account.eloSeason,
					status: {
						type: 'none',
						gameId: null
					}
				};

				userListInfo[`winsSeason${CURRENTSEASONNUMBER}`] = account[`winsSeason${CURRENTSEASONNUMBER}`];
				userListInfo[`lossesSeason${CURRENTSEASONNUMBER}`] = account[`lossesSeason${CURRENTSEASONNUMBER}`];
				userListInfo[`rainbowWinsSeason${CURRENTSEASONNUMBER}`] = account[`rainbowWinsSeason${CURRENTSEASONNUMBER}`];
				userListInfo[`rainbowLossesSeason${CURRENTSEASONNUMBER}`] = account[`rainbowLossesSeason${CURRENTSEASONNUMBER}`];
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
 * @param {boolean} isAEM - user AEM designation
 */
module.exports.sendGameList = (socket, isAEM) => {
	// eslint-disable-line one-var
	if (socket) {
		let gameList = formattedGameList();
		gameList = gameList.filter(game => isAEM || (game && !game.isUnlisted));
		socket.emit('gameList', gameList);
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
			type: override ? override : game ? (game.general.private ? 'private' : game.general.rainbowgame ? 'rainbow' : 'playing') : 'none',
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
