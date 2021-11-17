const { games, userList, testIP } = require('../models');
const { sendInProgressGameUpdate } = require('../util.js');
const Account = require('../../../models/account');
const { sendUserList } = require('../user-requests');

/**
 * @param {object} socket - socket reference.
 * @param {function} callback - success callback.
 */
module.exports.checkUserStatus = (socket, callback) => {
	const { passport } = socket.handshake.session;

	if (passport && Object.keys(passport).length) {
		const { user } = passport;
		const { sockets } = io.sockets;

		const game = games[Object.keys(games).find(gameName => games[gameName].publicPlayersState.find(player => player.userName === user && !player.leftGame))];

		const oldSocketID = Object.keys(sockets).find(
			socketID =>
				sockets[socketID].handshake.session.passport &&
				Object.keys(sockets[socketID].handshake.session.passport).length &&
				sockets[socketID].handshake.session.passport.user === user &&
				socketID !== socket.id
		);

		if (oldSocketID && sockets[oldSocketID]) {
			sockets[oldSocketID].emit('manualDisconnection');
			delete sockets[oldSocketID];
		}

		const reconnectingUser = game ? game.publicPlayersState.find(player => player.userName === user) : undefined;

		if (game && game.gameState.isStarted && !game.gameState.isCompleted && reconnectingUser) {
			reconnectingUser.connected = true;
			socket.join(game.general.uid);
			socket.emit('updateSeatForUser');
			sendInProgressGameUpdate(game);
		}

		if (user) {
			// Double-check the user isn't sneaking past IP bans.
			const logOutUser = username => {
				const bannedUserlistIndex = userList.findIndex(user => user.userName === username);

				socket.emit('manualDisconnection');
				socket.disconnect(true);

				if (bannedUserlistIndex >= 0) {
					userList.splice(bannedUserlistIndex, 1);
				}

				// destroySession(username);
			};

			Account.findOne({ username: user }, function(err, account) {
				if (account) {
					if (account.isBanned || (account.isTimeout && new Date() < account.isTimeout)) {
						logOutUser(user);
					} else {
						testIP(account.lastConnectedIP, banType => {
							if (banType && banType != 'new' && banType != 'fragbanSmall' && banType != 'fragbanLarge' && !account.gameSettings.ignoreIPBans) logOutUser(user);
							else {
								sendUserList();
								callback();
							}
						});
					}
				}
			});
		} else callback();
	} else callback();
};

module.exports.handleHasSeenNewPlayerModal = socket => {
	const { passport } = socket.handshake.session;

	if (passport && Object.keys(passport).length) {
		const { user } = passport;
		Account.findOne({ username: user }).then(account => {
			account.hasNotDismissedSignupModal = false;
			socket.emit('checkRestrictions');
			account.save();
		});
	}
};
