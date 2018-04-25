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

const findGame = (data) => {
	if (games && data && data.uid) {
		return games.find(el => el.general.uid === data.uid);
	}
};

const ensureInGame = (passport, game) => {
	if (game && game.publicPlayersState && game.gameState && passport && passport.user) {
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
			const isGameFound = uid && findGame(data);

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
					handleModerationAction(socket, passport, data);
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
					handleNewGeneralChat(socket, passport, data);
				}
			})
			.on('leaveGame', data => {
				const game = findGame(data);
				if (authenticated && ensureInGame(passport, game)) {
					handleUserLeaveGame(socket, passport, game, data);
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
				handlePlayerReportDismiss();
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
					selectChancellorVoteOnVeto(game, data);
				}
			})
			.on('getModInfo', count => { // I cant tell if this needs to be secure or not
				sendModInfo(socket, count);
			})
			.on('getUserReports', () => { // This one too
				sendUserReports(socket);
			})
			.on('updateUserStatus', (type, gameId) => {
				const game = findGame({uid: gameId});
				if (authenticated && ensureInGame(passport, game)) {
					updateUserStatus(passport, game, type);
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
					selectPolicies(passport, game, data);
				}
			})
			.on('selectedPlayerToExecute', data => {
				const game = findGame(data);
				if (authenticated && ensureInGame(passport, game)) {
					selectPlayerToExecute(data);
				}
			})
			.on('selectedSpecialElection', data => {
				selectSpecialElection(data);
			});
	});
};
