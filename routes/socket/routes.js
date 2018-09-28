const {
	handleUpdatedTruncateGame,
	handleUpdatedReportGame,
	handleAddNewGame,
	handleAddNewGameChat,
	handleNewGeneralChat,
	handleUpdatedGameSettings,
	handleSocketDisconnect,
	handleUserLeaveGame,
	checkUserStatus,
	updateSeatedUser,
	handleUpdateWhitelist,
	handleAddNewClaim,
	handleModerationAction,
	handlePlayerReport,
	handlePlayerReportDismiss,
	handleUpdatedBio,
	handleUpdatedRemakeGame,
	handleUpdatedPlayerNote,
	handleSubscribeModChat
} = require('./user-events');
const {
	sendPlayerNotes,
	sendUserReports,
	sendGameInfo,
	sendUserGameSettings,
	sendModInfo,
	sendGameList,
	sendGeneralChats,
	sendUserList,
	sendReplayGameChats,
	updateUserStatus
} = require('./user-requests');
const { selectVoting, selectPresidentPolicy, selectChancellorPolicy, selectChancellorVoteOnVeto, selectPresidentVoteOnVeto } = require('./game/election');
const { selectChancellor } = require('./game/election-util');
const { selectSpecialElection, selectPartyMembershipInvestigate, selectPolicies, selectPlayerToExecute } = require('./game/policy-powers');
const { games } = require('./models');
const Account = require('../../models/account');

const gamesGarbageCollector = () => {
	const currentTime = new Date().getTime();
	const toRemoveGameNames = Object.keys(games).filter(
		gameName =>
			(games[gameName].general.timeStarted && games[gameName].general.timeStarted + 4200000 < currentTime) ||
			(games[gameName].general.timeCreated &&
				games[gameName].general.timeCreated + 600000 < currentTime &&
				games[gameName].general.private &&
				games[gameName].publicPlayersState.length < 5)
	);

	toRemoveGameNames.forEach(gameName => {
		delete games[gameName];
	});

	sendGameList();
};

const ensureAuthenticated = socket => {
	if (socket.handshake && socket.handshake.session) {
		const { passport } = socket.handshake.session;

		return Boolean(passport && passport.user && Object.keys(passport).length);
	}
};

const findGame = data => {
	if (games && data && data.uid) {
		return games[data.uid];
	}
};

const ensureInGame = (passport, game) => {
	if (game && game.publicPlayersState && game.gameState && passport && passport.user) {
		const player = game.publicPlayersState.find(player => player.userName === passport.user);

		return Boolean(player);
	}
};

module.exports = (modUserNames, editorUserNames, adminUserNames) => {
	setInterval(gamesGarbageCollector, 100000);

	io.on('connection', socket => {
		checkUserStatus(socket);

		// defensively check if game exists
		socket.use((packet, next) => {
			const data = packet[1];
			const uid = data && data.uid;
			const isGameFound = uid && findGame(data);

			if (!uid || isGameFound) {
				return next();
			} else {
				socket.emit('gameUpdate', {});
			}
		});

		const { passport } = socket.handshake.session;
		const authenticated = ensureAuthenticated(socket);

		let isAEM = false;
		if (authenticated && passport && passport.user) {
			Account.findOne({ username: passport.user }).then(account => {
				if (account.staffRole && account.staffRole.length > 0 && account.staffRole !== 'contributor') isAEM = true;
			});
		}

		// Instantly sends the userlist as soon as the websocket is created.
		// For some reason, sending the userlist before this happens actually doesn't work on the client. The event gets in, but is not used.
		socket.conn.on('upgrade', () => {
			sendUserList(socket);
		});

		socket
			// user-events

			.on('disconnect', () => {
				handleSocketDisconnect(socket);
			})
			.on('handleUpdatedPlayerNote', data => {
				handleUpdatedPlayerNote(socket, data);
			})
			.on('updateModAction', data => {
				if (authenticated && isAEM) {
					handleModerationAction(socket, passport, data, false, modUserNames, editorUserNames.concat(adminUserNames));
				}
			})
			.on('addNewClaim', data => {
				const game = findGame(data);
				if (authenticated && ensureInGame(passport, game)) {
					handleAddNewClaim(passport, game, data);
				}
			})
			.on('updateGameWhitelist', data => {
				const game = findGame(data);
				if (authenticated && ensureInGame(passport, game)) {
					handleUpdateWhitelist(passport, game, data);
				}
			})
			.on('updateTruncateGame', data => {
				handleUpdatedTruncateGame(data);
			})
			.on('addNewGameChat', data => {
				if (authenticated) {
					handleAddNewGameChat(socket, passport, data, modUserNames, editorUserNames, adminUserNames);
				}
			})
			.on('updateReportGame', data => {
				try {
					handleUpdatedReportGame(socket, data);
				} catch (e) {
					console.log(e, 'err in player report');
				}
			})
			.on('addNewGame', data => {
				if (authenticated) {
					handleAddNewGame(socket, passport, data);
				}
			})
			.on('updateGameSettings', data => {
				if (authenticated) {
					handleUpdatedGameSettings(socket, passport, data);
				}
			})

			.on('addNewGeneralChat', data => {
				if (authenticated) {
					handleNewGeneralChat(socket, passport, data, modUserNames, editorUserNames, adminUserNames);
				}
			})
			.on('leaveGame', data => {
				const game = findGame(data);

				if (io.sockets.adapter.rooms[game.general.uid] && socket) {
					socket.leave(game.general.uid);
				}

				if (authenticated && game) {
					handleUserLeaveGame(socket, game, data, passport);
				}
			})
			.on('updateSeatedUser', data => {
				if (authenticated) {
					updateSeatedUser(socket, passport, data);
				}
			})
			.on('playerReport', data => {
				if (authenticated) {
					handlePlayerReport(passport, data);
				}
			})
			.on('playerReportDismiss', () => {
				if (authenticated && isAEM) {
					handlePlayerReportDismiss();
				}
			})
			.on('updateRemake', data => {
				const game = findGame(data);
				if (authenticated && ensureInGame(passport, game)) {
					handleUpdatedRemakeGame(passport, game, data);
				}
			})
			.on('updateBio', data => {
				if (authenticated) {
					handleUpdatedBio(socket, passport, data);
				}
			})
			// user-requests

			.on('getPlayerNotes', data => {
				sendPlayerNotes(socket, data);
			})
			.on('getGameList', () => {
				sendGameList(socket);
			})
			.on('getGameInfo', uid => {
				sendGameInfo(socket, uid);
			})
			.on('getUserList', () => {
				sendUserList(socket);
			})
			.on('getGeneralChats', () => {
				sendGeneralChats(socket);
			})
			.on('getUserGameSettings', () => {
				sendUserGameSettings(socket);
			})
			.on('selectedChancellorVoteOnVeto', data => {
				const game = findGame(data);
				if (authenticated && ensureInGame(passport, game)) {
					selectChancellorVoteOnVeto(passport, game, data);
				}
			})
			.on('getModInfo', count => {
				if (authenticated && isAEM) {
					sendModInfo(socket, count);
				}
			})
			.on('subscribeModChat', uid => {
				if (authenticated && isAEM) {
					const game = findGame({ uid });
					if (game && game.private && game.private.seatedPlayers) {
						const players = game.private.seatedPlayers.map(player => player.userName);
						Account.find({ staffRole: { $exists: true } }).then(accounts => {
							const hasAEM = accounts.some(acc => {
								return acc.staffRole && acc.staffRole.length > 0 && acc.staffRole !== 'contributor' && players.includes(acc.username);
							});
							if (!hasAEM) handleSubscribeModChat(socket, passport, game);
						});
					}
				}
			})
			.on('getUserReports', () => {
				if (authenticated && isAEM) {
					sendUserReports(socket);
				}
			})
			.on('updateUserStatus', (type, gameId) => {
				const game = findGame({ uid: gameId });
				if (authenticated && ensureInGame(passport, game)) {
					updateUserStatus(passport, game);
				}
			})
			.on('getReplayGameChats', uid => {
				sendReplayGameChats(socket, uid);
			})
			// election

			.on('presidentSelectedChancellor', data => {
				const game = findGame(data);
				if (authenticated && ensureInGame(passport, game)) {
					selectChancellor(socket, passport, game, data);
				}
			})
			.on('selectedVoting', data => {
				const game = findGame(data);
				if (authenticated && ensureInGame(passport, game)) {
					selectVoting(passport, game, data);
				}
			})
			.on('selectedPresidentPolicy', data => {
				const game = findGame(data);
				if (authenticated && ensureInGame(passport, game)) {
					selectPresidentPolicy(passport, game, data);
				}
			})
			.on('selectedChancellorPolicy', data => {
				const game = findGame(data);
				if (authenticated && ensureInGame(passport, game)) {
					selectChancellorPolicy(passport, game, data);
				}
			})
			.on('selectedPresidentVoteOnVeto', data => {
				const game = findGame(data);
				if (authenticated && ensureInGame(passport, game)) {
					selectPresidentVoteOnVeto(passport, game, data);
				}
			})
			// policy-powers
			.on('selectPartyMembershipInvestigate', data => {
				const game = findGame(data);
				if (authenticated && ensureInGame(passport, game)) {
					selectPartyMembershipInvestigate(passport, game, data);
				}
			})
			.on('selectedPolicies', data => {
				const game = findGame(data);
				if (authenticated && ensureInGame(passport, game)) {
					selectPolicies(passport, game);
				}
			})
			.on('selectedPlayerToExecute', data => {
				const game = findGame(data);
				if (authenticated && ensureInGame(passport, game)) {
					selectPlayerToExecute(passport, game, data);
				}
			})
			.on('selectedSpecialElection', data => {
				const game = findGame(data);
				if (authenticated && ensureInGame(passport, game)) {
					selectSpecialElection(passport, game, data);
				}
			});
	});
};
