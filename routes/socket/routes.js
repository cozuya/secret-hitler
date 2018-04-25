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
	handleUpdatedPlayerNote
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
const gamesGarbageCollector = () => {
	const currentTime = new Date().getTime();
	const toRemoveIndexes = games
		.filter(
			game =>
				(game.general.timeStarted && game.general.timeStarted + 4200000 < currentTime) ||
				(game.general.timeCreated && game.general.timeCreated + 600000 < currentTime && game.general.private && game.publicPlayersState.length < 5)
		)
		.map(game => games.indexOf(game))
		.reverse();

	games.forEach((game, index) => {
		if (toRemoveIndexes.includes(index)) {
			games.splice(index, 1);
		}
	});
	sendGameList();
};

const ensureAuthenticated = socket => {
	if (socket.handshake && socket.handshake.session) {
		const { passport } = socket.handshake.session;
		if (passport && passport.user && Object.keys(passport).length) {
			return true;
		}
	}
	return false;
};

const ensureIngame = (passport, uid) => {
	const game = games.find(el => el.general.uid === uid);
	if (game) {
		const player = game.publicPlayersState.find(player => player.userName === passport.user);
		if (player) {
			return true;
		}
	}
	return false;
};

module.exports = () => {
	setInterval(gamesGarbageCollector, 100000);

	io.on('connection', socket => {
		checkUserStatus(socket);

		// defensively check if game exists
		socket.use((packet, next) => {
			const data = packet[1];
			const uid = data && data.uid;
			const isGameFound = uid && games.find(g => g.general.uid === uid);

			if (!uid || isGameFound) {
				return next();
			} else {
				socket.emit('gameUpdate', {});
			}
		});

		const { passport } = socket.handshake.session;
		const authenticated = ensureAuthenticated(socket);

		socket
			// user-events

			.on('disconnect', () => {
				handleSocketDisconnect(socket);
			})
			.on('handleUpdatedPlayerNote', data => {
				handleUpdatedPlayerNote(socket, data);
			})
			.on('updateModAction', data => {
				if (authenticated) {
					handleModerationAction(socket, data);
				}
			})
			.on('addNewClaim', data => {
				if (authenticated && ensureIngame(passport, data.uid)) {
					handleAddNewClaim(passport, data);
				}
			})
			.on('updateGameWhitelist', data => {
				if (authenticated && ensureIngame(passport, data.uid)) {
					handleUpdateWhitelist(passport, data);
				}
			})
			.on('updateTruncateGame', data => {
				handleUpdatedTruncateGame(data);
			})
			.on('addNewGameChat', data => {
				if (authenticated) {
					handleAddNewGameChat(socket, passport, data);
				}
			})
			.on('updateReportGame', data => {
				handleUpdatedReportGame(socket, data);
			})
			.on('addNewGame', data => {
				if (authenticated) {
					handleAddNewGame(socket, passport, data);
				}
			})
			.on('updateGameSettings', data => {
				if (authenticated) {
					handleUpdatedGameSettings(socket, data);
				}
			})
			.on('addNewGeneralChat', data => {
				if (authenticated) {
					handleNewGeneralChat(socket, data);
				}
			})
			.on('leaveGame', data => {
				if (authenticated && ensureIngame(passport, data.uid)) {
					handleUserLeaveGame(socket, passport, data);
				}
			})
			.on('updateSeatedUser', data => {
				if (authenticated) {
					updateSeatedUser(socket, passport, data);
				}
			})
			.on('playerReport', data => {
				handlePlayerReport(data);
			})
			.on('playerReportDismiss', () => {
				handlePlayerReportDismiss();
			})
			.on('updateRemake', data => {
				handleUpdatedRemakeGame(data);
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
				selectChancellorVoteOnVeto(data);
			})
			.on('getModInfo', count => {
				sendModInfo(socket, count);
			})
			.on('getUserReports', () => {
				sendUserReports(socket);
			})
			.on('updateUserStatus', (type, gameId) => {
				if (socket.handshake.session.passport && socket.handshake.session.passport.user) {
					updateUserStatus(socket.handshake.session.passport.user, type, gameId);
				}
			})
			.on('getReplayGameChats', uid => {
				sendReplayGameChats(socket, uid);
			})
			// election

			.on('presidentSelectedChancellor', data => {
				selectChancellor(socket, data);
			})
			.on('selectedVoting', data => {
				selectVoting(socket, data);
			})
			.on('selectedPresidentPolicy', data => {
				selectPresidentPolicy(data);
			})
			.on('selectedChancellorPolicy', data => {
				selectChancellorPolicy(data);
			})
			.on('selectedPresidentVoteOnVeto', data => {
				selectPresidentVoteOnVeto(data);
			})
			// policy-powers
			.on('selectPartyMembershipInvestigate', data => {
				selectPartyMembershipInvestigate(data);
			})
			.on('selectedPolicies', data => {
				selectPolicies(data);
			})
			.on('selectedPlayerToExecute', data => {
				selectPlayerToExecute(data);
			})
			.on('selectedSpecialElection', data => {
				selectSpecialElection(data);
			});
	});
};
