const {handleUpdatedTruncateGame, handleUpdatedReportGame, handleAddNewGame, handleAddNewGameChat, handleNewGeneralChat, handleUpdatedGameSettings, handleSocketDisconnect, handleUserLeaveGame, checkUserStatus, updateSeatedUser} = require('./user-events'),
	{sendGameInfo, sendUserGameSettings, sendGameList, sendGeneralChats, sendUserList} = require('./user-requests'),
	{selectChancellor, selectVoting, selectPresidentPolicy, selectChancellorPolicy} = require('./game/election.js'),
	{selectPartyMembershipInvestigate, selectPolicies, selectPlayerToExecute} = require('./game/policy-powers.js');

module.exports = () => {
	io.on('connection', socket => {
		checkUserStatus(socket);

		socket

		// user-events

		.on('disconnect', () => {
			handleSocketDisconnect(socket);
		}).on('updateTruncateGame', data => {
			handleUpdatedTruncateGame(data);
		}).on('addNewGameChat', data => {
			handleAddNewGameChat(data);
		}).on('updateReportGame', data => {
			handleUpdatedReportGame(socket, data);
		}).on('addNewGame', data => {
			handleAddNewGame(socket, data);
		}).on('updateGameSettings', data => {
			handleUpdatedGameSettings(socket, data);
		}).on('addNewGeneralChat', data => {
			handleNewGeneralChat(data);
		}).on('leaveGame', data => {
			handleUserLeaveGame(socket, data);
		}).on('updateSeatedUser', data => {
			updateSeatedUser(data);
		})
		// user-requests

		.on('getGameList', () => {
			sendGameList(socket);
		}).on('getGameInfo', uid => {
			sendGameInfo(socket, uid);
		}).on('getUserList', () => {
			sendUserList(socket);
		}).on('getGeneralChats', () => {
			sendGeneralChats(socket);
		}).on('getUserGameSettings', data => {
			sendUserGameSettings(socket, data);
		})

		// election

		.on('presidentSelectedChancellor', data => {
			selectChancellor(data);
		})
		.on('selectedVoting', data => {
			selectVoting(data);
		})
		.on('selectedPresidentPolicy', data => {
			selectPresidentPolicy(data);
		})
		.on('selectedChancellorPolicy', data => {
			selectChancellorPolicy(data);
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
		});
	});
};