const {handleUpdatedTruncateGame, handleUpdatedReportGame, handleAddNewGame, handleAddNewGameChat, handleNewGeneralChat, handleUpdatedGameSettings, handleSocketDisconnect, handleUserLeaveGame, checkUserStatus, updateSeatedUser, handleUpdateWhitelist, handleAddNewClaim} = require('./user-events'),
	{sendGameInfo, sendUserGameSettings, sendGameList, sendGeneralChats, sendUserList} = require('./user-requests'),
	{selectChancellor, selectVoting, selectPresidentPolicy, selectChancellorPolicy, selectChancellorVoteOnVeto, selectPresidentVoteOnVeto} = require('./game/election.js'),
	{selectSpecialElection, selectPartyMembershipInvestigate, selectPolicies, selectPlayerToExecute} = require('./game/policy-powers.js'),
	{games} = require('./models');


module.exports = () => {
	io.on('connection', socket => {
		checkUserStatus(socket);

		// defensively check if game exists
		socket.use((packet, next) => {
			const data = packet[1],
				uid = data && data.uid,
				isGameFound = uid && games.find(g => g.general.uid === uid);

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
		}).on('addNewClaim', (data) => {
			handleAddNewClaim(data);
		}).on('updateGameWhitelist', data => {
			handleUpdateWhitelist(data);
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
			updateSeatedUser(socket, data);
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
		}).on('selectedChancellorVoteOnVeto', data => {
			selectChancellorVoteOnVeto(data);
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