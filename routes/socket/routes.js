const {
	handleUpdatedTruncateGame,
	handleUpdatedReportGame,
	handleAddNewGame,
	handleAddNewGameChat,
	handleNewGeneralChat,
	handleUpdatedGameSettings,
	handleSocketDisconnect,
	handleUserLeaveGame,
	updateSeatedUser,
	handleUpdateWhitelist,
	handleAddNewClaim,
	handleUpdatedBio,
	handleUpdatedRemakeGame,
	handleHasSeenNewPlayerModal,
	handleFlappyEvent,
	handleUpdatedTheme,
} = require('./user-events');
const {
	handleSubscribeModChat,
	handleGameFreeze,
	handleModPeekVotes,
	handleModerationAction,
	handlePlayerReport,
	handlePlayerReportDismiss,
} = require('./user-events-moderation');
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
	sendSignups,
	sendAllSignups,
	sendPrivateSignups,
	updateUserStatus,
} = require('./user-requests');
const {
	selectVoting,
	selectPresidentPolicy,
	selectChancellorPolicy,
	selectChancellorVoteOnVeto,
	selectPresidentVoteOnVeto,
} = require('./game/election');
const { selectChancellor } = require('./game/election-util');
const {
	selectSpecialElection,
	selectPartyMembershipInvestigate,
	selectPolicies,
	selectPlayerToExecute,
	selectPartyMembershipInvestigateReverse,
	selectOnePolicy,
	selectBurnCard,
} = require('./game/policy-powers');
const {
	emoteList,
	testIP,
	pushUserlistAsync,
	getRangeUserlistAsync,
	getGamesAsync,
	scanGamesAsync,
	spliceUserFromUserList,
} = require('./models');
const Account = require('../../models/account');
const { TOU_CHANGES } = require('../../src/frontend-scripts/node-constants.js');
const version = require('../../version');
const { formatUserforUserlist, sendInProgressGameUpdate } = require('./util');

let modUserNames = [];
let editorUserNames = [];
let adminUserNames = [];

// redis todo redo this
// const gamesGarbageCollector = () => {
// 	const currentTime = new Date();

// 	Object.keys(games).forEach(gameName => {
// 		let toDelete = false;
// 		const currentGame = games[gameName];
// 		const createdTimer =
// 			currentGame &&
// 			currentGame.general &&
// 			currentGame.general.timeCreated &&
// 			currentGame.gameState &&
// 			!currentGame.gameState.isStarted &&
// 			new Date(currentGame.general.timeCreated.getTime() + 600000);
// 		const completedTimer =
// 			currentGame &&
// 			currentGame.general &&
// 			currentGame.general.timeStarted &&
// 			currentGame.gameState &&
// 			currentGame.gameState.isCompleted &&
// 			new Date(games[gameName].general.timeStarted + 0);

// 		// To come maybe later
// 		// const modDeleteTimer = games[gameName].general.modDeleteDelay && new Date(games[gameName].general.modDeleteDelay.getTime() + 900000);

// 		// DEBUG
// 		// console.log(
// 		// 	'Name: ',
// 		// 	gameName,
// 		// 	// '\nDelay: ',
// 		// 	// games[gameName].general.modDeleteDelay,
// 		// 	'\nCurrent Time: ',
// 		// 	currentTime,
// 		// 	// '\nDelay Timer: ',
// 		// 	// modDeleteTimer,
// 		// 	'\nCompleted Timer: ',
// 		// 	completedTimer,
// 		// 	'\nCreated Timer: ',
// 		// 	createdTimer
// 		// );

// 		if (games[gameName] && createdTimer && createdTimer < currentTime) {
// 			// console.log('Created Timer Expired. Deleting... ');
// 			toDelete = true;
// 		}
// 		if (games[gameName] && !games[gameName].general.modDeleteDelay && completedTimer && completedTimer < currentTime) {
// 			// console.log('Completed Game Timer Expired. Deleting... ');
// 			toDelete = true;
// 		}
// 		// if (games[gameName] && modDeleteTimer && modDeleteTimer < currentTime) {
// 		// console.log('Mod Delete Delay Timer Expired. Deleting... ');
// 		// toDelete = true;
// 		// }

// 		if (toDelete && currentGame.publicPlayersState) {
// 			for (let affectedPlayerNumber = 0; affectedPlayerNumber < currentGame.publicPlayersState.length; affectedPlayerNumber++) {
// 				const affectedSocketId = Object.keys(io.sockets.sockets).find(
// 					socketId =>
// 						io.sockets.sockets[socketId].handshake.session.passport &&
// 						io.sockets.sockets[socketId].handshake.session.passport.user === currentGame.publicPlayersState[affectedPlayerNumber].userName
// 				);
// 				if (!io.sockets.sockets[affectedSocketId]) {
// 					continue;
// 				}

// 				if (io.sockets.sockets && io.sockets.sockets[affectedSocketId]) {
// 					io.sockets.sockets[affectedSocketId].emit('toLobby');
// 					io.sockets.sockets[affectedSocketId].leave(gameName);
// 				}
// 			}
// 			delete games[gameName];
// 			sendGameList();
// 		}
// 	});
// };

const ensureAuthenticated = (socket) =>
	Boolean(
		socket.handshake &&
			socket.handshake.session &&
			socket.handshake.session.passport &&
			socket.handshake.session.passport.user
	);

const findGame = async (data = {}) => data.uid && JSON.parse(await getGamesAsync(data.uid));

const ensureInGame = (passport, game) =>
	Boolean(
		game &&
			game.publicPlayersState &&
			game.gameState &&
			passport &&
			passport.user &&
			game.publicPlayersState.find((player) => player.userName === passport.user)
	);

const gatherStaffUsernames = () => {
	Account.find({ staffRole: { $exists: true } })
		.then((accounts) => {
			modUserNames = accounts.filter((account) => account.staffRole === 'moderator').map((account) => account.username);
			editorUserNames = accounts.filter((account) => account.staffRole === 'editor').map((account) => account.username);
			adminUserNames = accounts.filter((account) => account.staffRole === 'admin').map((account) => account.username);
		})
		.catch((err) => {
			console.log(err, 'err in finding staffroles');
		});
};

module.exports.socketRoutes = () => {
	// setInterval(gamesGarbageCollector, 30000);
	gatherStaffUsernames();

	io.on('connection', (socket) => {
		let isAEM;
		let isTrial;
		let isRestricted;
		const authenticated = ensureAuthenticated(socket);
		const { passport } = socket.handshake.session;

		const checkRestriction = (account) => {
			if (!account || !passport || !passport.user || !socket) return;
			const parseVer = (ver) => {
				const vals = ver.split('.');
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
				const changesSince = [];
				const myVer = parseVer(account.touLastAgreed);
				TOU_CHANGES.forEach((change) => {
					if (!firstVerNew(myVer, parseVer(change.changeVer))) changesSince.push(change);
				});
				if (changesSince.length) {
					socket.emit('touChange', changesSince);
					return true;
				}
			} else {
				socket.emit('touChange', [TOU_CHANGES[TOU_CHANGES.length - 1]]);
				return true;
			}
			const warnings = account.warnings.filter((warning) => !warning.acknowledged);
			if (warnings.length > 0) {
				const { moderator, acknowledged, ...firstWarning } = warnings[0]; // eslint-disable-line no-unused-vars
				socket.emit('warningPopup', firstWarning);
				return true;
			}
			// implement other restrictions as needed
			socket.emit('removeAllPopups');
			return false;
		};

		const intialConnectionSetup = async () => {
			if (passport && Object.keys(passport).length) {
				const { user } = passport;
				const { sockets } = io.sockets;
				const gu = await scanGamesAsync(0);
				const gameUids = gu[1];
				let game;
				console.log(gu, 'gu');

				for (let index = 0; index < gameUids.length; index++) {
					const g = JSON.parse(await getGamesAsync(gameUids[index]));

					if (g.publicPlayersState.find((player) => player.userName === user && !player.leftGame)) {
						game = g;
						break;
					}
				}

				console.log(game, 'g');
				if (!game) {
					socket.join('sidebarInfoSubscription');
					socket.join('gameListInfoSubscription');
					sendGeneralChats(socket);
					sendGameList(socket, isAEM);
				}

				const oldSocketID = Object.values(sockets).find(
					(sock) =>
						sock.handshake.session.passport &&
						Object.keys(sock.handshake.session.passport).length &&
						sock.handshake.session.passport.user === user &&
						sock.id !== socket.id
				);

				// if (oldSocketID && sockets[oldSocketID]) {
				if (oldSocketID) {
					const client = io.sockets.clients(oldSocketID);

					if (client) {
						io.sockets.clients(oldSocketID).emit('manualDisconnection');
						// io.of('/').adapter.remoteDisconnect(oldSocketID, true);
					}
				}

				const reconnectingUser = game && game.publicPlayersState.find((player) => player.userName === user);

				console.log(reconnectingUser, 'reconnectingUser');
				if (game && game.gameState.isStarted && !game.gameState.isCompleted && reconnectingUser) {
					reconnectingUser.connected = true;
					passport.gameUidUserIsSeatedIn = game.general.uid;
					socket.join(game.general.uid);
					socket.emit('updateSeatForUser');

					sendInProgressGameUpdate(game);
				}

				const logOutUser = () => {
					socket.emit('manualDisconnection');
					socket.disconnect(true);
					spliceUserFromUserList(user);
				};

				Account.findOne({ username: user }, (err, account) => {
					if (account) {
						if (account.isBanned || (account.isTimeout && new Date() < account.isTimeout)) {
							logOutUser(user);
						} else {
							testIP(account.lastConnectedIP, async (banType) => {
								if (banType && banType !== 'new' && !account.gameSettings.ignoreIPBans) {
									logOutUser(user);
								} else {
									socket.emit('gameSettings', account.gameSettings);
									const list = await getRangeUserlistAsync('userList', 0, -1);

									if (!Boolean(list.map(JSON.parse).find((listItem) => listItem.userName === user))) {
										await pushUserlistAsync('userList', JSON.stringify(formatUserforUserlist(passport, account)));
									}
									await sendUserList(socket);

									socket.emit('version', { current: version });

									// defensively check if game exists
									socket.use(async (packet, next) => {
										const data = packet[1];
										const uid = data && data.uid;

										const isGameFound = await findGame(data);

										if (!uid || isGameFound) {
											return next();
										} else {
											socket.emit('gameUpdate', {});
										}
									});

									isAEM = Boolean(
										account.staffRole &&
											account.staffRole.length > 0 &&
											account.staffRole !== 'trialmod' &&
											account.staffRole !== 'altmod' &&
											account.staffRole !== 'veteran'
									);
									isTrial = Boolean(
										account.staffRole && account.staffRole.length > 0 && account.staffRole === 'trialmod'
									);

									if (account.gameSettings.enableRightSidebarInGame) {
										socket.join('sidebarInfoSubscription');
										sendGeneralChats(socket);
									}
								}
							});
						}
					}
				});
			} else {
				sendUserList(socket);
				sendGameList(socket);
				sendGeneralChats(socket);
			}
		};

		intialConnectionSetup();

		if (passport && passport.user && authenticated) {
			Account.findOne({ username: passport.user }).then((account) => {
				isRestricted = checkRestriction(account);
			});
		}

		// Instantly sends the userlist as soon as the websocket is created.
		// For some reason, sending the userlist before this happens actually doesn't work on the client. The event gets in, but is not used.
		socket.conn.on('upgrade', () => {
			sendUserList(socket);
			socket.emit('emoteList', emoteList);
		});

		socket.on('receiveRestrictions', () => {
			Account.findOne({ username: passport.user }).then((account) => {
				// todo
				isRestricted = checkRestriction(account);
			});
		});

		socket.on('seeWarnings', (username) => {
			if (isAEM) {
				Account.findOne({ username: username }).then((account) => {
					if (account) {
						if (account.warnings && account.warnings.length > 0) {
							socket.emit('sendWarnings', { username, warnings: account.warnings });
						} else {
							socket.emit('sendAlert', "That user doesn't have any warnings.");
						}
					} else {
						socket.emit('sendAlert', "That user doesn't exist.");
					}
				});
			} else {
				socket.emit('sendAlert', "Are you sure you're supposed to be doing that?");
				console.log(passport.user, 'tried to receive warnings for', username);
			}
		});

		// user-events
		socket.on('disconnect', () => {
			handleSocketDisconnect(socket);
		});

		socket.on('flappyEvent', async (data) => {
			if (isRestricted) return;
			const game = await findGame(data);

			if (authenticated && ensureInGame(passport, game)) {
				handleFlappyEvent(data, game);
			}
		});

		socket.on('hasSeenNewPlayerModal', () => {
			if (authenticated) {
				handleHasSeenNewPlayerModal(socket);
			}
		});

		socket.on('getSignups', () => {
			if (authenticated && isAEM) {
				sendSignups(socket);
			}
		});

		socket.on('getAllSignups', () => {
			if (authenticated && isAEM) {
				sendAllSignups(socket);
			}
		});

		socket.on('getPrivateSignups', () => {
			if (authenticated && isAEM) {
				sendPrivateSignups(socket);
			}
		});

		socket.on('regatherAEMUsernames', () => {
			if (authenticated && isAEM) {
				gatherStaffUsernames();
			}
		});

		socket.on('confirmTOU', () => {
			if (authenticated && isRestricted) {
				Account.findOne({ username: passport.user }).then((account) => {
					account.touLastAgreed = TOU_CHANGES[0].changeVer;
					account.save();
					isRestricted = checkRestriction(account);
				});
			}
		});

		socket.on('acknowledgeWarning', () => {
			if (authenticated && isRestricted) {
				Account.findOne({ username: passport.user }).then((acc) => {
					acc.warnings[acc.warnings.findIndex((warning) => !warning.acknowledged)].acknowledged = true;
					acc.markModified('warnings');
					acc.save(() => (isRestricted = checkRestriction(acc)));
				});
			}
		});

		socket.on('handleUpdatedTheme', (data) => {
			handleUpdatedTheme(socket, passport, data);
		});

		socket.on('updateModAction', (data) => {
			if (authenticated && isAEM) {
				handleModerationAction(socket, passport, data, false, modUserNames, editorUserNames.concat(adminUserNames));
			}
		});
		socket.on('addNewClaim', async (data) => {
			const game = await findGame(data);

			if (authenticated && ensureInGame(passport, game)) {
				handleAddNewClaim(socket, passport, game, data);
			}
		});
		socket.on('updateGameWhitelist', async (data) => {
			const game = await findGame(data);

			if (authenticated && ensureInGame(passport, game)) {
				handleUpdateWhitelist(passport, game, data);
			}
		});
		socket.on('updateTruncateGame', (data) => {
			handleUpdatedTruncateGame(data);
		});
		socket.on('addNewGameChat', async (data) => {
			const game = await findGame(data);

			if (isRestricted) return;
			if (authenticated) {
				handleAddNewGameChat(
					socket,
					passport,
					data,
					game,
					modUserNames,
					editorUserNames,
					adminUserNames,
					handleAddNewClaim
				);
			}
		});
		socket.on('updateReportGame', (data) => {
			try {
				handleUpdatedReportGame(socket, data);
			} catch (e) {
				console.log(e, 'err in player report');
			}
		});
		socket.on('addNewGame', (data) => {
			if (isRestricted) return;
			if (authenticated) {
				handleAddNewGame(socket, passport, data);
			}
		});
		socket.on('updateGameSettings', (data) => {
			if (authenticated) {
				handleUpdatedGameSettings(socket, passport, data);
			}
		});

		socket.on('addNewGeneralChat', (data) => {
			if (isRestricted) return;
			if (authenticated) {
				handleNewGeneralChat(socket, passport, data, modUserNames, editorUserNames, adminUserNames);
			}
		});
		socket.on('leaveGame', async (data) => {
			const game = await findGame(data);

			if (game && io.sockets.adapter.rooms[game.general.uid] && socket) {
				socket.leave(game.general.uid);
			}

			if (authenticated && game) {
				handleUserLeaveGame(socket, game, data, passport);
			}
		});
		socket.on('updateSeatedUser', async (data) => {
			if (isRestricted) return;

			const game = await findGame(data);

			if (authenticated) {
				updateSeatedUser(game, socket, passport, data);
			}
		});
		socket.on('playerReport', (data) => {
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
		socket.on('updateRemake', async (data) => {
			const game = await findGame(data);

			if (authenticated && ensureInGame(passport, game)) {
				handleUpdatedRemakeGame(passport, game, data, socket);
			}
		});
		socket.on('updateBio', (data) => {
			if (authenticated) {
				handleUpdatedBio(socket, passport, data);
			}
		});
		// user-requests

		socket.on('getPlayerNotes', (data) => {
			sendPlayerNotes(socket, data);
		});
		socket.on('getGameList', () => {
			sendGameList(socket);
		});
		socket.on('getGameInfo', (uid) => {
			sendGameInfo(socket, uid);
		});
		socket.on('getUserGameSettings', () => {
			sendUserGameSettings(socket);
		});
		socket.on('selectedChancellorVoteOnVeto', async (data) => {
			if (isRestricted) return;

			const game = await findGame(data);

			if (authenticated && ensureInGame(passport, game)) {
				selectChancellorVoteOnVeto(passport, game, data);
			}
		});
		// redis todo
		// socket.on('getModInfo', count => {
		// 	if (authenticated && (isAEM || isTrial)) {
		// 		sendModInfo(games, socket, count, isTrial && !isAEM);
		// 	}
		// });
		socket.on('subscribeModChat', async (uid) => {
			if (authenticated && isAEM) {
				const game = await findGame(data);

				if (game && game.private && game.private.seatedPlayers) {
					const players = game.private.seatedPlayers.map((player) => player.userName);
					Account.find({ staffRole: { $exists: true, $ne: 'veteran' } }).then((accounts) => {
						const staff = accounts
							.filter((acc) => {
								acc.staffRole && acc.staffRole.length > 0 && players.includes(acc.username);
							})
							.map((acc) => acc.username);
						if (staff.length) {
							socket.emit('sendAlert', `AEM members are present: ${JSON.stringify(staff)}`);
							return;
						}
						handleSubscribeModChat(socket, passport, game);
					});
				} else {
					socket.emit('sendAlert', 'Game is missing.');
				}
			}
		});
		socket.on('modPeekVotes', async (data) => {
			if (authenticated && isAEM) {
				const game = await findGame(data);

				if (game && game.private && game.private.seatedPlayers) {
					handleModPeekVotes(socket, passport, game, data.modName);
				}
			} else {
				socket.emit('sendAlert', 'Game is missing.');
			}
		});
		socket.on('modFreezeGame', async (data) => {
			if (authenticated && isAEM) {
				const game = await findGame(data);

				if (game && game.private && game.private.seatedPlayers) {
					handleGameFreeze(socket, passport, game, data.modName);
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
			} else if (authenticated) {
				updateUserStatus(passport);
			}
		});
		socket.on('getReplayGameChats', (uid) => {
			sendReplayGameChats(socket, uid);
		});
		// election

		socket.on('presidentSelectedChancellor', async (data) => {
			if (isRestricted) return;

			const game = await findGame(data);

			if (authenticated && ensureInGame(passport, game)) {
				selectChancellor(socket, passport, game, data);
			}
		});
		socket.on('selectedVoting', async (data) => {
			if (isRestricted) return;

			const game = await findGame(data);

			if (authenticated && ensureInGame(passport, game)) {
				selectVoting(passport, game, data, socket);
			}
		});
		socket.on('selectedPresidentPolicy', async (data) => {
			if (isRestricted) return;

			const game = await findGame(data);

			if (authenticated && ensureInGame(passport, game)) {
				selectPresidentPolicy(passport, game, data, false, socket);
			}
		});
		socket.on('selectedChancellorPolicy', async (data) => {
			if (isRestricted) return;

			const game = await findGame(data);

			if (authenticated && ensureInGame(passport, game)) {
				selectChancellorPolicy(passport, game, data, false, socket);
			}
		});
		socket.on('selectedPresidentVoteOnVeto', async (data) => {
			if (isRestricted) return;

			const game = await findGame(data);

			if (authenticated && ensureInGame(passport, game)) {
				selectPresidentVoteOnVeto(passport, game, data, socket);
			}
		});
		// policy-powers
		socket.on('selectPartyMembershipInvestigate', async (data) => {
			if (isRestricted) return;

			const game = await findGame(data);

			if (authenticated && ensureInGame(passport, game)) {
				selectPartyMembershipInvestigate(passport, game, data, socket);
			}
		});
		socket.on('selectPartyMembershipInvestigateReverse', async (data) => {
			if (isRestricted) return;

			const game = await findGame(data);

			if (authenticated && ensureInGame(passport, game)) {
				selectPartyMembershipInvestigateReverse(passport, game, data, socket);
			}
		});
		socket.on('selectedPolicies', async (data) => {
			if (isRestricted) return;

			const game = await findGame(data);

			if (authenticated && ensureInGame(passport, game)) {
				if (game.private.lock.policyPeekAndDrop) selectOnePolicy(passport, game);
				else selectPolicies(passport, game, socket);
			}
		});
		socket.on('selectedPresidentVoteOnBurn', async (data) => {
			if (isRestricted) return;

			const game = await findGame(data);

			if (authenticated && ensureInGame(passport, game)) {
				selectBurnCard(passport, game, data, socket);
			}
		});
		socket.on('selectedPlayerToExecute', async (data) => {
			if (isRestricted) return;

			const game = await findGame(data);

			if (authenticated && ensureInGame(passport, game)) {
				selectPlayerToExecute(passport, game, data, socket);
			}
		});
		socket.on('selectedSpecialElection', async (data) => {
			if (isRestricted) return;

			const game = await findGame(data);

			if (authenticated && ensureInGame(passport, game)) {
				selectSpecialElection(passport, game, data, socket);
			}
		});
	});
};
