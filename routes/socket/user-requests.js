const Account = require('../../models/account');
const ModAction = require('../../models/modAction');
const PlayerReport = require('../../models/playerReport');
const PlayerNote = require('../../models/playerNote');
const Game = require('../../models/game');
const Signups = require('../../models/signups');
const {
	generalChats,
	accountCreationDisabled,
	ipbansNotEnforced,
	gameCreationDisabled,
	limitNewPlayers,
	bypassVPNCheck,
	formattedGameList,
	scanGamesAsync,
	getGamesAsync,
	getGeneralChatsAsync,
	getRangeGeneralChatsAsync,
	trimGeneralChatsAsync,
	getRangeUserlistAsync,
	setUserInListAsync,
	setNewUserInListAsync,
} = require('./models');
const { getProfile } = require('../../models/profile/utils');
const { sendInProgressGameUpdate } = require('./util');
const version = require('../../version');
const { obfIP } = require('./ip-obf');
const { CURRENTSEASONNUMBER } = require('../../src/frontend-scripts/node-constants');

let throttledLastUserListSentTime = Date.now();
/**
 * @param {object} socket - user socket reference.
 */
const sendUserList = async (socket) => {
	if (socket) {
		const list = await getRangeUserlistAsync('userList', 0, -1);
		const userList = list.map(JSON.parse);

		socket.emit('userList', { list: userList });
	} else {
		const now = Date.now();

		if (now - throttledLastUserListSentTime > 4000 || process.env.NODE_ENV !== 'production') {
			const list = await getRangeUserlistAsync('userList', 0, -1);
			const userList = list.map(JSON.parse);

			io.to('sidebarInfoSubscription').emit('userList', { list: userList });
			throttledLastUserListSentTime = now;
		}
	}
};

module.exports.sendUserList = sendUserList;

// redis todo fix this
const getModInfo = (games, users, socket, queryObj, count = 1, isTrial) => {
	const maskEmail = (email) => (email && email.split('@')[1]) || '';
	ModAction.find(queryObj)
		.sort({ $natural: -1 })
		.limit(500 * count)
		.then((actions) => {
			const list = users.map((user) => ({
				status: userList.find((userListUser) => user.username === userListUser.userName).status,
				isRainbow: user.wins + user.losses > 49,
				userName: user.username,
				ip: user.lastConnectedIP || user.signupIP,
				email: `${user.verified ? '+' : '-'}${maskEmail(user.verification.email)}`,
			}));
			list.forEach((user) => {
				if (user.ip && user.ip != '') {
					try {
						user.ip = '-' + obfIP(user.ip);
					} catch (e) {
						user.ip = 'ERROR';
						console.log(e);
					}
				}
			});
			actions.forEach((action) => {
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
				Object.values(games).forEach((game) => {
					gList.push({
						name: game.general.name,
						uid: game.general.uid,
						electionNum: game.general.electionCount,
						casual: game.general.casualGame,
						private: game.general.private,
						custom: game.customGameSettings.enabled,
						unlisted: game.general.unlisted,
					});
				});
			}
			socket.emit('modInfo', {
				modReports: actions,
				accountCreationDisabled,
				ipbansNotEnforced,
				gameCreationDisabled,
				limitNewPlayers,
				bypassVPNCheck,
				userList: list,
				gameList: gList,
				hideActions: isTrial || undefined,
			});
		})
		.catch((err) => {
			console.log(err, 'err in finding mod actions');
		});
};

module.exports.getModInfo = getModInfo;

module.exports.sendSignups = (socket) => {
	Signups.find({ type: { $in: ['local', 'discord', 'github'] } })
		.sort({ $natural: -1 })
		.limit(500)
		.then((signups) => {
			socket.emit('signupsInfo', signups);
		})
		.catch((err) => {
			console.log(err, 'err in finding signups');
		});
};

module.exports.sendAllSignups = (socket) => {
	Signups.find({ type: { $nin: ['local', 'private', 'discord', 'github'] } })
		.sort({ $natural: -1 })
		.limit(500)
		.then((signups) => {
			socket.emit('signupsInfo', signups);
		})
		.catch((err) => {
			console.log(err, 'err in finding all signups');
		});
};

module.exports.sendPrivateSignups = (socket) => {
	Signups.find({ type: 'private' })
		.sort({ $natural: -1 })
		.limit(500)
		.then((signups) => {
			socket.emit('signupsInfo', signups);
		})
		.catch((err) => {
			console.log(err, 'err in finding private signups');
		});
};

/**
 * @param {array} games - list of all games
 * @param {object} socket - user socket reference.
 * @param {number} count - depth of modinfo requested.
 * @param {boolean} isTrial - true if the user is a trial mod.
 */

// redis todo fix this
module.exports.sendModInfo = (games, socket, count, isTrial) => {
	// const userNames = userList.map(user => user.userName);
	// Account.find({ username: userNames, 'gameSettings.isPrivate': { $ne: true } })
	// 	.then(users => {
	// 		getModInfo(games, users, socket, {}, count, isTrial);
	// 	})
	// 	.catch(err => {
	// 		console.log(err, 'err in sending mod info');
	// 	});
};

/**
 * @param {object} socket - user socket reference.
 */
module.exports.sendUserGameSettings = (socket) => {
	const { passport } = socket.handshake.session;

	if (!passport || !passport.user) {
		return;
	}

	Account.findOne({ username: passport.user })
		.then((account) => {
			socket.emit('gameSettings', account.gameSettings);

			getProfile(passport.user);

			socket.emit('version', {
				current: version,
				lastSeen: account.lastVersionSeen || 'none',
			});
		})
		.catch((err) => {
			console.log(err);
		});
};

/**
 * @param {object} socket - user socket reference.
 * @param {object} data - data about the request
 */
module.exports.sendPlayerNotes = (socket, data) => {
	PlayerNote.find({ userName: data.userName, notedUser: { $in: data.seatedPlayers } })
		.then((notes) => {
			if (notes) {
				socket.emit('notesUpdate', notes);
			}
		})
		.catch((err) => {
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

let throttledLastGameListSentTime = Date.now();
/**
 * @param {object} socket - user socket reference.
 * @param {boolean} isAEM - user AEM designation
 */
const sendGameList = async (socket, isAEM) => {
	const now = Date.now();

	if (!socket && now - throttledLastGameListSentTime < 2000) {
		return;
	}

	const g = await scanGamesAsync(0);
	const gameUids = g[1];
	const formattedGameList = [];

	for (let index = 0; index < gameUids.length; index++) {
		const game = JSON.parse(await getGamesAsync(gameUids[index]));

		if (game) {
			formattedGameList.push({
				name: game.general.name,
				flag: game.general.flag,
				userNames: game.publicPlayersState.map((val) => val.userName),
				customCardback: game.publicPlayersState.map((val) => val.customCardback),
				customCardbackUid: game.publicPlayersState.map((val) => val.customCardbackUid),
				gameStatus: game.gameState.isCompleted
					? game.gameState.isCompleted
					: game.gameState.isTracksFlipped
					? 'isStarted'
					: 'notStarted',
				seatedCount: game.publicPlayersState.length,
				gameCreatorName: game.general.gameCreatorName,
				minPlayersCount: game.general.minPlayersCount,
				maxPlayersCount: game.general.maxPlayersCount || game.general.minPlayersCount,
				excludedPlayerCount: game.general.excludedPlayerCount,
				casualGame: game.general.casualGame || undefined,
				eloMinimum: game.general.eloMinimum || undefined,
				isVerifiedOnly: game.general.isVerifiedOnly || undefined,
				isTourny: game.general.isTourny || undefined,
				timedMode: game.general.timedMode || undefined,
				flappyMode: game.general.flappyMode || undefined,
				flappyOnlyMode: game.general.flappyOnlyMode || undefined,
				tournyStatus:
					game.general.isTourny &&
					game.general.tournyInfo.queuedPlayers &&
					game.general.tournyInfo.queuedPlayers.length,
				experiencedMode: game.general.experiencedMode || undefined,
				disableChat: game.general.disableChat || undefined,
				disableGamechat: game.general.disableGamechat || undefined,
				blindMode: game.general.blindMode || undefined,
				enactedLiberalPolicyCount: game.trackState.liberalPolicyCount,
				enactedFascistPolicyCount: game.trackState.fascistPolicyCount,
				electionCount: game.general.electionCount,
				rebalance6p: game.general.rebalance6p || undefined,
				rebalance7p: game.general.rebalance7p || undefined,
				rebalance9p: game.general.rerebalance9p || undefined,
				privateOnly: game.general.privateOnly || undefined,
				private: game.general.private || undefined,
				uid: game.general.uid,
				rainbowgame: game.general.rainbowgame || undefined,
				isCustomGame: game.customGameSettings.enabled,
				isUnlisted: game.general.unlisted || undefined,
			});
		}
	}

	// redis todo isaem in leavegame is undef
	if (socket) {
		socket.emit(
			'gameList',
			formattedGameList.filter((game) => isAEM || (game && !game.isUnlisted))
		);
	} else {
		io.to('gameListInfoSubscription').emit(
			'gameList',
			formattedGameList.filter((game) => isAEM || (game && !game.isUnlisted))
		);
		throttledLastGameListSentTime = now;
	}
};

module.exports.sendGameList = sendGameList;

/**
 * @param {object} socket - user socket reference.
 */
module.exports.sendUserReports = (socket) => {
	PlayerReport.find()
		.sort({ $natural: -1 })
		.limit(500)
		.then((reports) => {
			socket.emit('reportInfo', reports);
		});
};

/**
 * @param {object} socket - user socket reference
 * @param {boolean} toRoom - send chats to the room not the socket
 */
module.exports.sendGeneralChats = async (socket, toRoom) => {
	await trimGeneralChatsAsync('list', 0, 99);
	const list = ((await getRangeGeneralChatsAsync('list', 0, -1)) || []).map(JSON.parse).reverse();
	const sticky = (await getGeneralChatsAsync('sticky')) || '';
	const genChat = {
		list,
		sticky,
	};

	if (toRoom) {
		io.to('sidebarInfoSubscription').emit('generalChats', genChat);
	} else {
		socket.emit('generalChats', genChat);
	}
};

/**
 * @param {object} passport - socket authentication.
 * @param {object} game - target game.
 * @param {string} override - type of user status to be displayed.
 */
const updateUserStatus = (module.exports.updateUserStatus = async (passport, game, override) => {
	const list = await getRangeUserlistAsync('userList', 0, -1);
	const userL = list.map(JSON.parse);
	const userIndexInList = userL.findIndex((user) => user.userName === passport.user);
	const status = JSON.stringify({
		type:
			override && game && !game.general.unlisted
				? override
				: game
				? game.general.private
					? 'private'
					: !game.general.unlisted && game.general.rainbowgame
					? 'rainbow'
					: !game.general.unlisted
					? 'playing'
					: 'none'
				: 'none',
		gameId: game ? game.general.uid : false,
		userName: passport.user,
	});

	if (userIndexInList >= 0) {
		await setUserInListAsync('userList', userIndexInList, status);
	} else {
		await setNewUserInListAsync('userList', status);
	}

	sendUserList();
});

/**
 * @param {object} socket - user socket reference.
 * @param {string} uid - uid of game.
 */
module.exports.sendGameInfo = async (socket, uid) => {
	const game = JSON.parse(await getGamesAsync(uid));

	const { passport } = socket.handshake.session;

	if (game) {
		if (passport && Object.keys(passport).length) {
			const player = game.publicPlayersState.find((player) => player.userName === passport.user);

			if (player) {
				player.leftGame = false;
				player.connected = true;
				socket.emit('updateSeatForUser', true);
				updateUserStatus(passport, game);
			} else {
				updateUserStatus(passport, game, 'observing');
			}
		}

		socket.leave('gameListInfoSubscription');
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
