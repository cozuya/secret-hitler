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

		socket
			// user-events

			.on('disconnect', () => {
				handleSocketDisconnect(socket);
			})
			.on('handleUpdatedPlayerNote', data => {
				handleUpdatedPlayerNote(socket, data);
			})
			.on('updateModAction', data => {
				handleModerationAction(socket, data);
			})
			.on('addNewClaim', data => {
				handleAddNewClaim(data);
			})
			.on('updateGameWhitelist', data => {
				handleUpdateWhitelist(data);
			})
			.on('updateTruncateGame', data => {
				handleUpdatedTruncateGame(data);
			})
			.on('addNewGameChat', data => {
				handleAddNewGameChat(socket, data);
			})
			.on('updateReportGame', data => {
				handleUpdatedReportGame(socket, data);
			})
			.on('addNewGame', data => {
				handleAddNewGame(socket, data);
			})
			.on('updateGameSettings', data => {
				handleUpdatedGameSettings(socket, data);
			})
			.on('addNewGeneralChat', data => {
				handleNewGeneralChat(socket, data);
			})
			.on('leaveGame', data => {
				handleUserLeaveGame(socket, data);
			})
			.on('updateSeatedUser', data => {
				updateSeatedUser(socket, data);
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
				handleUpdatedBio(socket, data);
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
			.on('getUserGameSettings', data => {
				sendUserGameSettings(socket, data);
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
			.on('updateUserStatus', (username, type, gameId) => {
				updateUserStatus(username, type, gameId);
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
