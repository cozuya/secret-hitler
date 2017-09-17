const Account = require('../../models/account'),
	ModAction = require('../../models/modAction'),
	PlayerReport = require('../../models/playerReport'),
	{ games, userList, generalChats, accountCreationDisabled, ipbansDisabled } = require('./models'),
	{ getProfile } = require('../../models/profile/utils'),
	{ secureGame } = require('./util'),
	version = require('../../version'),
	https = require('https'),
	options = {
		hostname: 'check.torproject.org',
		path: '/cgi-bin/TorBulkExitList.py?ip=1.1.1.1'
	};

let torIps;

try {
	https.get(options, res => {
		let rawData = '';
		res.on('data', chunk => {
			rawData += chunk;
		});
		res.on('end', () => {
			try {
				torIps = rawData.split('\n').slice(3, rawData.length);
			} catch (e) {
				console.error(e.message, 'retrieving tor ip addresses failed');
			}
		});
	});
} catch (e) {
	console.log(e, 'err receiving tor ip addresses');
}

module.exports.sendModInfo = socket => {
	const userNames = userList.map(user => user.userName);

	Account.find({ username: userNames })
		.then(users => {
			ModAction.find()
				.sort({ $natural: -1 })
				.limit(500)
				.then(actions => {
					socket.emit('modInfo', {
						modReports: actions,
						accountCreationDisabled,
						ipbansDisabled,
						userList: users.map(user => ({
							isRainbow: user.wins + user.losses > 49,
							userName: user.username,
							isTor: torIps.includes(user.lastConnectedIP || user.signupIP),
							ip: user.lastConnectedIP || user.signupIP
						}))
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

module.exports.sendUserGameSettings = (socket, username) => {
	Account.findOne({ username })
		.then(account => {
			const userListNames = userList.map(user => user.userName);
			socket.emit('gameSettings', account.gameSettings);

			if (!userListNames.includes(username)) {
				userList.push({
					userName: username,
					wins: account.wins,
					losses: account.losses,
					rainbowWins: account.rainbowWins,
					rainbowLosses: account.rainbowLosses,
					status: {
						type: 'none',
						gameId: null
					}
				});
			}

			getProfile(username);

			socket.emit('version', {
				current: version,
				lastSeen: account.lastVersionSeen || 'none'
			});

			io.sockets.emit('userList', {
				list: userList,
				totalSockets: Object.keys(io.sockets.sockets).length
			});
		})
		.catch(err => {
			console.log(err);
		});
};

module.exports.sendGameList = socket => {
	const formattedGames = games.map(game => ({
		name: game.general.name,
		gameStatus: game.gameState.isCompleted ? game.gameState.isCompleted : game.gameState.isTracksFlipped ? 'isStarted' : 'notStarted',
		seatedCount: game.publicPlayersState.length,
		minPlayersCount: game.general.minPlayersCount,
		maxPlayersCount: game.general.maxPlayersCount,
		excludedPlayerCount: game.general.excludedPlayerCount,
		experiencedMode: game.general.experiencedMode,
		disableChat: game.general.disableChat,
		disableGamechat: game.general.disableGamechat,
		enactedLiberalPolicyCount: game.trackState.liberalPolicyCount,
		enactedFascistPolicyCount: game.trackState.fascistPolicyCount,
		electionCount: game.general.electionCount,
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

module.exports.sendUserReports = socket => {
	PlayerReport.find().sort({ $natural: -1 }).limit(200).then(reports => {
		socket.emit('reportInfo', reports);
	});
};

module.exports.sendGeneralChats = socket => {
	socket.emit('generalChats', generalChats);
};

const sendUserList = (module.exports.sendUserList = socket => {
	// eslint-disable-line one-var
	if (socket) {
		socket.emit('userList', {
			list: userList,
			totalSockets: Object.keys(io.sockets.sockets).length
		});
	} else {
		io.sockets.emit('userList', {
			list: userList,
			totalSockets: Object.keys(io.sockets.sockets).length
		});
	}
});

const updateUserStatus = (module.exports.updateUserStatus = (username, type, gameId) => {
	// eslint-disable-line one-var
	const user = userList.find(user => user.userName === username);

	if (user) {
		user.status = { type, gameId };
		sendUserList();
	}
});

module.exports.sendGameInfo = (socket, uid) => {
	const game = games.find(el => el.general.uid === uid),
		{ passport } = socket.handshake.session;

	if (game) {
		const _game = Object.assign({}, game);

		if (passport && Object.keys(passport).length) {
			const player = game.publicPlayersState.find(player => player.userName === passport.user);

			if (player) {
				player.leftGame = false;
				updateUserStatus(passport.user, 'playing', uid);
			} else {
				updateUserStatus(passport.user, 'observing', uid);
			}
		}

		// todo-release - doesn't work right for players who left game and then comes back into the old game - no gamechats
		_game.chats = _game.chats.concat(_game.private.unSeatedGameChats);
		socket.join(uid);
		socket.emit('gameUpdate', secureGame(_game));
	}
};
