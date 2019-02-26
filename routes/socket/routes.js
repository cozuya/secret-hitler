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
	handleSubscribeModChat,
	handleModPeekVotes,
	handleUpdateTyping,
	handleHasSeenNewPlayerModal
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
const {
	selectSpecialElection,
	selectPartyMembershipInvestigate,
	selectPolicies,
	selectPlayerToExecute,
	selectPartyMembershipInvestigateReverse,
	selectOnePolicy,
	selectBurnCard
} = require('./game/policy-powers');
const { games, emoteList } = require('./models');
const Account = require('../../models/account');
const { TOU_CHANGES } = require('../../src/frontend-scripts/node-constants.js');
const version = require('../../version');

const gamesGarbageCollector = () => {
	const currentTime = Date.now();
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

module.exports = (modUserNames, editorUserNames, adminUserNames, altmodUserNames, trialmodUserNames, contributorUserNames) => {
	setInterval(gamesGarbageCollector, 100000);

	io.on('connection', socket => {
		checkUserStatus(socket, () => {
			socket.emit('version', { current: version });
			sendGeneralChats(socket);
			sendGameList(socket);

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
			let isTrial = false;

			if (authenticated && passport && passport.user) {
				Account.findOne({ username: passport.user }).then(account => {
					if (account.staffRole && account.staffRole.length > 0 && account.staffRole !== 'trialmod' && account.staffRole !== 'altmod') {
						isAEM = true;
					}
					if (account.staffRole && account.staffRole.length > 0 && account.staffRole === 'trialmod') isTrial = true;
				});
			}

			let isRestricted = true;

			const checkRestriction = account => {
				if (!account || !passport || !passport.user || !socket) return;
				const parseVer = ver => {
					let vals = ver.split('.');
					vals.forEach((v, i) => (vals[i] = parseInt(v)));
					return vals;
				};
				const firstVerNew = (v1, v2) => {
					for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
						if (!v2[i]) return true;
						if (!v1[i] || isNaN(v1[i]) || v1[i] < v2[i]) return false;
						if (v1[i] > v2[i]) return true;
					}
					return true;
				};

				if (account.touLastAgreed && account.touLastAgreed.length) {
					let changesSince = [];
					let myVer = parseVer(account.touLastAgreed);
					TOU_CHANGES.forEach(change => {
						if (!firstVerNew(myVer, parseVer(change.changeVer))) changesSince.push(change);
					});
					if (changesSince.length) {
						socket.emit('touChange', changesSince);
						return true;
					}
				} else {
					socket.emit('touChange', TOU_CHANGES);
					return true;
				}
				// implement other restrictions as needed
				return false;
			};

			// Instantly sends the userlist as soon as the websocket is created.
			// For some reason, sending the userlist before this happens actually doesn't work on the client. The event gets in, but is not used.
			socket.conn.on('upgrade', () => {
				sendUserList(socket);
				if (passport && passport.user && authenticated) {
					Account.findOne({ username: passport.user }).then(account => {
						isRestricted = checkRestriction(account);
					});
				}
				socket.emit('emoteList', emoteList);
			});

			// user-events
			socket.on('disconnect', () => {
				handleSocketDisconnect(socket);
			});

			socket.on('hasSeenNewPlayerModal', () => {
				if (authenticated) {
					handleHasSeenNewPlayerModal(socket);
				}
			});

			socket.on('updateTyping', data => {
				handleUpdateTyping(data);
			});

			socket.on('confirmTOU', () => {
				if (authenticated && isRestricted) {
					Account.findOne({ username: passport.user }).then(account => {
						account.touLastAgreed = TOU_CHANGES[0].changeVer;
						account.save();
						isRestricted = checkRestriction(account);
					});
				}
			});
			socket.on('handleUpdatedPlayerNote', data => {
				handleUpdatedPlayerNote(socket, data);
			});
			socket.on('updateModAction', data => {
				if (authenticated && isAEM) {
					handleModerationAction(socket, passport, data, false, modUserNames, editorUserNames.concat(adminUserNames));
				}
			});
			socket.on('addNewClaim', data => {
				const game = findGame(data);
				if (authenticated && ensureInGame(passport, game)) {
					handleAddNewClaim(passport, game, data);
				}
			});
			socket.on('updateGameWhitelist', data => {
				const game = findGame(data);
				if (authenticated && ensureInGame(passport, game)) {
					handleUpdateWhitelist(passport, game, data);
				}
			});
			socket.on('updateTruncateGame', data => {
				handleUpdatedTruncateGame(data);
			});
			socket.on('addNewGameChat', data => {
				if (isRestricted) return;
				if (authenticated) {
					handleAddNewGameChat(socket, passport, data, modUserNames, editorUserNames, adminUserNames, handleAddNewClaim);
				}
			});
			socket.on('updateReportGame', data => {
				try {
					handleUpdatedReportGame(socket, data);
				} catch (e) {
					console.log(e, 'err in player report');
				}
			});
			socket.on('addNewGame', data => {
				if (isRestricted) return;
				if (authenticated) {
					handleAddNewGame(socket, passport, data);
				}
			});
			socket.on('updateGameSettings', data => {
				if (authenticated) {
					handleUpdatedGameSettings(socket, passport, data);
				}
			});

			socket.on('addNewGeneralChat', data => {
				if (isRestricted) return;
				if (authenticated) {
					handleNewGeneralChat(socket, passport, data, modUserNames, editorUserNames, adminUserNames);
				}
			});
			socket.on('leaveGame', data => {
				const game = findGame(data);

				if (game && io.sockets.adapter.rooms[game.general.uid] && socket) {
					socket.leave(game.general.uid);
				}

				if (authenticated && game) {
					handleUserLeaveGame(socket, game, data, passport);
				}
			});
			socket.on('updateSeatedUser', data => {
				if (isRestricted) return;
				if (authenticated) {
					updateSeatedUser(socket, passport, data);
				}
			});
			socket.on('playerReport', data => {
				if (isRestricted || !data || !data.comment || data.comment.length > 140) return;
				if (authenticated) {
					handlePlayerReport(passport, data);
				}
			});
			socket.on('playerReportDismiss', () => {
				if (authenticated && isAEM) {
					handlePlayerReportDismiss();
				}
			});
			socket.on('updateRemake', data => {
				const game = findGame(data);
				if (authenticated && ensureInGame(passport, game)) {
					handleUpdatedRemakeGame(passport, game, data);
				}
			});
			socket.on('updateBio', data => {
				if (authenticated) {
					handleUpdatedBio(socket, passport, data);
				}
			});
			// user-requests

			socket.on('getPlayerNotes', data => {
				sendPlayerNotes(socket, data);
			});
			socket.on('getGameList', () => {
				sendGameList(socket);
			});
			socket.on('getGameInfo', uid => {
				sendGameInfo(socket, uid);
			});
			socket.on('getUserList', () => {
				sendUserList(socket);
			});
			socket.on('getGeneralChats', () => {
				sendGeneralChats(socket);
			});
			socket.on('getUserGameSettings', () => {
				sendUserGameSettings(socket);
			});
			socket.on('selectedChancellorVoteOnVeto', data => {
				if (isRestricted) return;
				const game = findGame(data);
				if (authenticated && ensureInGame(passport, game)) {
					selectChancellorVoteOnVeto(passport, game, data);
				}
			});
			socket.on('getModInfo', count => {
				if (authenticated && (isAEM || isTrial)) {
					sendModInfo(socket, count, isTrial && !isAEM);
				}
			});
			socket.on('subscribeModChat', uid => {
				if (authenticated && isAEM) {
					const game = findGame({ uid });
					if (game && game.private && game.private.seatedPlayers) {
						const players = game.private.seatedPlayers.map(player => player.userName);
						Account.find({ staffRole: { $exists: true } }).then(accounts => {
							const staff = accounts
								.filter(acc => {
									acc.staffRole && acc.staffRole.length > 0 && players.includes(acc.username);
								})
								.map(acc => acc.username);
							if (staff.length) {
								socket.emit('sendAlert', `AEM members are present: ${JSON.stringify(staff)}`);
								return;
							}
							handleSubscribeModChat(socket, passport, game);
						});
					} else socket.emit('sendAlert', 'Game is missing.');
				}
			});
			socket.on('modPeekVotes', data => {
				const uid = data.uid;
				if (authenticated && isAEM) {
					const game = findGame({ uid });
					if (game && game.private && game.private.seatedPlayers) {
						handleModPeekVotes(socket, passport, game, data.modName);
					}
				} else {
					socket.emit('sendAlert', 'Game is missing.');
				}
			});
			socket.on('getUserReports', () => {
				if (authenticated && (isAEM || isTrial)) {
					sendUserReports(socket);
				}
			});
			socket.on('updateUserStatus', (type, gameId) => {
				const game = findGame({ uid: gameId });
				if (authenticated && ensureInGame(passport, game)) {
					updateUserStatus(passport, game);
				}
			});
			socket.on('getReplayGameChats', uid => {
				sendReplayGameChats(socket, uid);
			});
			// election

			socket.on('presidentSelectedChancellor', data => {
				if (isRestricted) return;
				const game = findGame(data);
				if (authenticated && ensureInGame(passport, game)) {
					selectChancellor(socket, passport, game, data);
				}
			});
			socket.on('selectedVoting', data => {
				if (isRestricted) return;
				const game = findGame(data);
				if (authenticated && ensureInGame(passport, game)) {
					selectVoting(passport, game, data);
				}
			});
			socket.on('selectedPresidentPolicy', data => {
				if (isRestricted) return;
				const game = findGame(data);
				if (authenticated && ensureInGame(passport, game)) {
					selectPresidentPolicy(passport, game, data);
				}
			});
			socket.on('selectedChancellorPolicy', data => {
				if (isRestricted) return;
				const game = findGame(data);
				if (authenticated && ensureInGame(passport, game)) {
					selectChancellorPolicy(passport, game, data);
				}
			});
			socket.on('selectedPresidentVoteOnVeto', data => {
				if (isRestricted) return;
				const game = findGame(data);
				if (authenticated && ensureInGame(passport, game)) {
					selectPresidentVoteOnVeto(passport, game, data);
				}
			});
			// policy-powers
			socket.on('selectPartyMembershipInvestigate', data => {
				if (isRestricted) return;
				const game = findGame(data);
				if (authenticated && ensureInGame(passport, game)) {
					selectPartyMembershipInvestigate(passport, game, data);
				}
			});
			socket.on('selectPartyMembershipInvestigateReverse', data => {
				if (isRestricted) return;
				const game = findGame(data);
				if (authenticated && ensureInGame(passport, game)) {
					selectPartyMembershipInvestigateReverse(passport, game, data);
				}
			});
			socket.on('selectedPolicies', data => {
				if (isRestricted) return;
				const game = findGame(data);
				if (authenticated && ensureInGame(passport, game)) {
					if (game.private.lock.policyPeekAndDrop) selectOnePolicy(passport, game);
					else selectPolicies(passport, game);
				}
			});
			socket.on('selectedPresidentVoteOnBurn', data => {
				if (isRestricted) return;
				const game = findGame(data);
				if (authenticated && ensureInGame(passport, game)) {
					selectBurnCard(passport, game, data);
				}
			});
			socket.on('selectedPlayerToExecute', data => {
				if (isRestricted) return;
				const game = findGame(data);
				if (authenticated && ensureInGame(passport, game)) {
					selectPlayerToExecute(passport, game, data);
				}
			});
			socket.on('selectedSpecialElection', data => {
				if (isRestricted) return;
				const game = findGame(data);
				if (authenticated && ensureInGame(passport, game)) {
					selectSpecialElection(passport, game, data);
				}
			});
		});
	});
};
