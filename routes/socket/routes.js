const {handleUpdatedTruncateGame, handleUpdatedReportGame, handleAddNewGame, handleAddNewGameChat, handleNewGeneralChat, handleUpdatedGameSettings, handleSocketDisconnect, handleUserLeaveGame, checkUserStatus} = require('./user-events'),
	{sendGameInfo, sendUserGameSettings, sendGameList, sendGeneralChats, sendUserList} = require('./user-requests'),
	{updateSeatedUser, updateSelectedElimination, updateUserNightActionEvent} = require('./game-core');

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

		// game-core

		.on('updateSeatedUser', data => {
			updateSeatedUser(socket, data);
		}).on('updateSelectedForElimination', data => {
			updateSelectedElimination(data);
		}).on('userNightActionEvent', data => {
			updateUserNightActionEvent(socket, data);
		});
	});
};