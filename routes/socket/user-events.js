let generalChatCount = 0;

const { games, userList, generalChats } = require('./models'),
	{ sendGameList, sendGeneralChats, sendUserList, updateUserStatus } = require('./user-requests'),
	Account = require('../../models/account'),
	Generalchats = require('../../models/generalchats'),
	ModAction = require('../../models/modAction'),
	PlayerReport = require('../../models/playerReport'),
	BannedIP = require('../../models/bannedIP'),
	startGame = require('./game/start-game.js'),
	{ secureGame } = require('./util.js'),
	crypto = require('crypto'),
	{ sendInProgressGameUpdate } = require('./util.js'),
	version = require('../../version'),
	{ PLAYERCOLORS, MODERATORS, ADMINS } = require('../../src/frontend-scripts/constants'),
	handleSocketDisconnect = socket => {
		const { passport } = socket.handshake.session;

		if (passport && Object.keys(passport).length) {
			const userIndex = userList.findIndex(user => user.userName === passport.user),
				game = games.find(game => game.publicPlayersState.find(player => player.userName === passport.user));

			socket.emit('manualDisconnection');
			if (userIndex !== -1) {
				userList.splice(userIndex, 1);
			}

			if (game) {
				const { gameState, publicPlayersState } = game,
					playerIndex = publicPlayersState.findIndex(player => player.userName === passport.user);

				if (gameState.isTracksFlipped && !gameState.isCompleted) {
					publicPlayersState[playerIndex].connected = false;
					sendInProgressGameUpdate(game);
				} else if (gameState.isStarted && !gameState.isCompleted) {
					publicPlayersState[playerIndex].connected = false;
					io.in(game.uid).emit('gameUpdate', game);
				} else if (
					gameState.isCompleted &&
					game.publicPlayersState.filter(player => !player.connected || player.leftGame).length === game.general.playerCount - 1
				) {
					games.splice(games.indexOf(game), 1);
				} else if (publicPlayersState.length === 1) {
					games.splice(games.indexOf(game), 1);
				} else if (!gameState.isStarted && playerIndex > -1) {
					publicPlayersState.splice(playerIndex, 1);
					io.sockets.in(game.uid).emit('gameUpdate', game);
				} else if (gameState.isCompleted) {
					publicPlayersState[playerIndex].leftGame = true;
					sendInProgressGameUpdate(game);
				}
				sendGameList();
			}
		}

		sendUserList();
	};

module.exports.updateSeatedUser = (socket, data) => {
	const game = games.find(el => el.general.uid === data.uid);

	// prevents race condition between 1) taking a seat and 2) the game starting
	if (game && game.gameState.isTracksFlipped) {
		return;
	}

	if (
		game &&
		game.publicPlayersState.length < game.general.maxPlayersCount &&
		!game.publicPlayersState.find(player => player.userName === data.userName) &&
		(!game.general.private ||
			((game.general.private && data.password === game.private.privatePassword) ||
				(game.general.private && game.general.whitelistedPlayers.includes(data.userName))))
	) {
		const { publicPlayersState } = game;
		let countDown;

		publicPlayersState.push({
			userName: data.userName,
			connected: true,
			isDead: false,
			customCardback: data.customCardback,
			customCardbackUid: data.customCardbackUid,
			cardStatus: {
				cardDisplayed: false,
				isFlipped: false,
				cardFront: 'secretrole',
				cardBack: {}
			}
		});

		socket.emit('updateSeatForUser', true);

		if (publicPlayersState.length === game.general.maxPlayersCount && !game.gameState.isStarted) {
			// sloppy but not trivial to get around
			game.gameState.isStarted = true;
			startGame(game);
		} else if (game.general.excludedPlayerCount.includes(publicPlayersState.length)) {
			clearInterval(countDown);
			game.gameState.cancellStart = true;
			game.general.status = 'Waiting for more players..';
		} else if (
			publicPlayersState.length === game.general.minPlayersCount ||
			(publicPlayersState.length > game.general.minPlayersCount &&
				!game.general.excludedPlayerCount.includes(publicPlayersState.length) &&
				!game.gameState.isStarted)
		) {
			let startGamePause = 20;

			game.gameState.isStarted = true;
			countDown = setInterval(() => {
				if (game.gameState.cancellStart) {
					game.gameState.cancellStart = false;
					game.gameState.isStarted = false;
					clearInterval(countDown);
				} else if (startGamePause === 4) {
					clearInterval(countDown);
					startGame(game);
				} else {
					game.general.status = `Game starts in ${startGamePause} second${startGamePause === 1 ? '' : 's'}.`;
					io.in(game.general.uid).emit('gameUpdate', secureGame(game));
				}
				startGamePause--;
			}, 1000);
		} else if (!game.gameState.isStarted) {
			const count = game.general.minPlayersCount - publicPlayersState.length;

			game.general.status = count === 1 ? `Waiting for ${count} more player..` : `Waiting for ${count} more players..`;
		}

		updateUserStatus(data.userName, game.general.rainbowgame ? 'rainbow' : 'playing', data.uid);
		io.sockets.in(data.uid).emit('gameUpdate', secureGame(game));
		sendGameList();
	}
};

module.exports.handleAddNewGame = (socket, data) => {
	if (socket.handshake.session.passport) {
		// seems ridiculous to do this i.e. how can someone who's not logged in fire this function at all but here I go crashing again..
		const username = socket.handshake.session.passport.user;

		data.private = {
			reports: {},
			unSeatedGameChats: [],
			lock: {}
		};

		if (data.general.private) {
			data.private.privatePassword = data.general.private;
			data.general.private = true;
		}

		data.general.timeCreated = new Date().getTime();
		updateUserStatus(username, data.general.rainbowgame ? 'rainbow' : 'playing', data.general.uid);
		games.push(data);
		sendGameList();
		socket.join(data.general.uid);
	}
};

module.exports.handleAddNewClaim = data => {
	const game = games.find(el => el.general.uid === data.uid),
		playerIndex = game.publicPlayersState.findIndex(player => player.userName === data.userName),
		chat = (() => {
			let text;

			switch (data.claim) {
				case 'wasPresident':
					text = [
						{
							text: 'President '
						},
						{
							text: `${data.userName} {${playerIndex + 1}} `,
							type: 'player'
						}
					];
					switch (data.claimState) {
						case 'threefascist':
							game.private.summary = game.private.summary.updateLog(
								{
									presidentClaim: { reds: 3, blues: 0 }
								},
								{ presidentId: playerIndex }
							);

							text.push(
								{
									text: 'claims '
								},
								{
									text: 'RRR',
									type: 'fascist'
								},
								{
									text: '.'
								}
							);

							return text;
						case 'twofascistoneliberal':
							game.private.summary = game.private.summary.updateLog(
								{
									presidentClaim: { reds: 2, blues: 1 }
								},
								{ presidentId: playerIndex }
							);

							text.push(
								{
									text: 'claims '
								},
								{
									text: 'RR',
									type: 'fascist'
								},
								{
									text: 'B',
									type: 'liberal'
								},
								{
									text: '.'
								}
							);

							return text;
						case 'twoliberalonefascist':
							game.private.summary = game.private.summary.updateLog(
								{
									presidentClaim: { reds: 1, blues: 2 }
								},
								{ presidentId: playerIndex }
							);

							text.push(
								{
									text: 'claims '
								},
								{
									text: 'R',
									type: 'fascist'
								},
								{
									text: 'BB',
									type: 'liberal'
								},
								{
									text: '.'
								}
							);

							return text;
						case 'threeliberal':
							game.private.summary = game.private.summary.updateLog(
								{
									presidentClaim: { reds: 0, blues: 3 }
								},
								{ presidentId: playerIndex }
							);

							text.push(
								{
									text: 'claims '
								},
								{
									text: 'BBB',
									type: 'liberal'
								},
								{
									text: '.'
								}
							);

							return text;
					}

				case 'wasChancellor':
					text = [
						{
							text: 'Chancellor '
						},
						{
							text: `${data.userName} {${playerIndex + 1}} `,
							type: 'player'
						}
					];
					switch (data.claimState) {
						case 'twofascist':
							game.private.summary = game.private.summary.updateLog(
								{
									chancellorClaim: { reds: 2, blues: 0 }
								},
								{ chancellorId: playerIndex }
							);

							text.push(
								{
									text: 'claims '
								},
								{
									text: 'RR',
									type: 'fascist'
								},
								{
									text: '.'
								}
							);

							return text;
						case 'onefascistoneliberal':
							game.private.summary = game.private.summary.updateLog(
								{
									chancellorClaim: { reds: 1, blues: 1 }
								},
								{ chancellorId: playerIndex }
							);

							text.push(
								{
									text: 'claims '
								},
								{
									text: 'R',
									type: 'fascist'
								},
								{
									text: 'B',
									type: 'liberal'
								},
								{
									text: '.'
								}
							);

							return text;
						case 'twoliberal':
							game.private.summary = game.private.summary.updateLog(
								{
									chancellorClaim: { reds: 0, blues: 2 }
								},
								{ chancellorId: playerIndex }
							);

							text.push(
								{
									text: 'claims '
								},
								{
									text: 'BB',
									type: 'liberal'
								},
								{
									text: '.'
								}
							);

							return text;
					}
				case 'didPolicyPeek':
					text = [
						{
							text: 'President '
						},
						{
							text: `${data.userName} {${playerIndex + 1}} `,
							type: 'player'
						}
					];
					switch (data.claimState) {
						case 'threefascist':
							game.private.summary = game.private.summary.updateLog(
								{
									policyPeekClaim: { reds: 3, blues: 0 }
								},
								{ presidentId: playerIndex }
							);

							text.push(
								{
									text: 'claims to have peeked at '
								},
								{
									text: 'RRR',
									type: 'fascist'
								},
								{
									text: '.'
								}
							);

							return text;
						case 'twofascistoneliberal':
							game.private.summary = game.private.summary.updateLog(
								{
									policyPeekClaim: { reds: 2, blues: 1 }
								},
								{ presidentId: playerIndex }
							);

							text.push(
								{
									text: 'claims to have peeked at '
								},
								{
									text: 'RR',
									type: 'fascist'
								},
								{
									text: 'B',
									type: 'liberal'
								},
								{
									text: '.'
								}
							);

							return text;
						case 'twoliberalonefascist':
							game.private.summary = game.private.summary.updateLog(
								{
									policyPeekClaim: { reds: 1, blues: 2 }
								},
								{ presidentId: playerIndex }
							);

							text.push(
								{
									text: 'claims to have peeked at '
								},
								{
									text: 'R',
									type: 'fascist'
								},
								{
									text: 'BB',
									type: 'liberal'
								},
								{
									text: '.'
								}
							);

							return text;
						case 'threeliberal':
							game.private.summary = game.private.summary.updateLog(
								{
									policyPeekClaim: { reds: 0, blues: 3 }
								},
								{ presidentId: playerIndex }
							);

							text.push(
								{
									text: 'claims to have peeked at '
								},
								{
									text: 'BBB',
									type: 'liberal'
								},
								{
									text: '.'
								}
							);

							return text;
					}
				case 'didInvestigateLoyalty':
					text = [
						{
							text: 'President '
						},
						{
							text: `${data.userName} {${playerIndex + 1}} `,
							type: 'player'
						},
						{
							text: 'claims to see a party membership of the '
						}
					];

					game.private.summary = game.private.summary.updateLog(
						{
							investigationClaim: data.claimState
						},
						{ presidentId: playerIndex }
					);
					switch (data.claimState) {
						case 'fascist':
							text.push(
								{
									text: 'fascist ',
									type: 'fascist'
								},
								{
									text: 'team.'
								}
							);

							return text;
						case 'liberal':
							text.push(
								{
									text: 'liberal ',
									type: 'liberal'
								},
								{
									text: 'team.'
								}
							);

							return text;
					}
			}
		})();

	data.chat = chat;
	data.isClaim = true;
	data.timestamp = new Date();

	game.chats.push(data);
	game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim = '';
	sendInProgressGameUpdate(game);
};

module.exports.handleAddNewGameChat = (socket, data) => {
	const { passport } = socket.handshake.session;

	if (!passport || !passport.user || passport.user !== data.userName || data.chat.length > 300) {
		return;
	}

	const game = games.find(el => el.general.uid === data.uid),
		player = game.publicPlayersState.find(player => player.userName === passport.user);

	if ((player && player.isDead && !game.gameState.isCompleted) || (player && player.leftGame)) {
		return;
	}

	data.timestamp = new Date();
	game.chats.push(data);

	if (game.gameState.isTracksFlipped) {
		sendInProgressGameUpdate(game);
	} else {
		io.in(data.uid).emit('gameUpdate', secureGame(game));
	}
};

module.exports.handleUpdateWhitelist = data => {
	const game = games.find(el => el.general.uid === data.uid);

	game.general.whitelistedPlayers = data.whitelistPlayers;
	io.in(data.uid).emit('gameUpdate', secureGame(game));
};

module.exports.handleNewGeneralChat = (socket, data) => {
	const { passport } = socket.handshake.session;

	// Check that they are who they say they are.  Should this do, uh, whatever
	// the ws equivalent of a 401 unauth is?
	if (!passport || !passport.user || passport.user !== data.userName || data.chat.length > 300) {
		return;
	}

	if (generalChatCount === 100) {
		const chats = new Generalchats({ chats: generalChats });

		chats.save(() => {
			generalChatCount = 0;
		});
	}

	const user = userList.find(u => data.userName === u.userName),
		color = user && user.wins + user.losses > 49 ? PLAYERCOLORS(user) : '';

	generalChatCount++;
	data.time = new Date();
	data.color = color;
	generalChats.push(data);

	if (generalChats.length > 99) {
		generalChats.shift();
	}
	io.sockets.emit('generalChats', generalChats);
};

module.exports.handleUpdatedGameSettings = (socket, data) => {
	if (!socket.handshake.session.passport) {
		// yes, even THIS crashed the game once.
		return;
	}

	Account.findOne({ username: socket.handshake.session.passport.user })
		.then(account => {
			for (const setting in data) {
				account.gameSettings[setting] = data[setting];
			}

			account.save(() => {
				socket.emit('gameSettings', account.gameSettings);
			});
		})
		.catch(err => {
			console.log(err);
		});
};

module.exports.handleModerationAction = (socket, data) => {
	const { passport } = socket.handshake.session,
		affectedSocketId = Object.keys(io.sockets.sockets).find(
			socketId => io.sockets.sockets[socketId].handshake.session.passport && io.sockets.sockets[socketId].handshake.session.passport.user === data.userName
		);

	if (passport && (MODERATORS.includes(passport.user) || ADMINS.includes(passport.user))) {
		const modaction = new ModAction({
				date: new Date(),
				modUserName: passport.user,
				userActedOn: data.userName,
				modNotes: data.comment,
				ip: data.ip,
				actionTaken: data.action
			}),
			banAccount = username => {
				Account.findOne({ username })
					.then(account => {
						if (account) {
							account.hash = crypto.randomBytes(20).toString('hex');
							account.salt = crypto.randomBytes(20).toString('hex');
							account.isBanned = true;
							account.save(() => {
								if (io.sockets.sockets[affectedSocketId]) {
									io.sockets.sockets[affectedSocketId].emit('manualDisconnection');
								}
							});
						}
					})
					.catch(err => {
						console.log(err, 'ban user err');
					});
			};

		modaction.save();
		switch (data.action) {
			case 'deleteUser':
				Account.findOne({ username: data.userName }).remove(() => {
					if (io.sockets.sockets[affectedSocketId]) {
						io.sockets.sockets[affectedSocketId].emit('manualDisconnection');
					}
				});
				break;
			case 'ban':
				banAccount(data.userName);
				break;
			case 'broadcast':
				games.forEach(game => {
					game.chats.push({
						chat: `(${data.modName}) ${data.comment}`,
						isBroadcast: true,
						timestamp: new Date()
					});
				});
				generalChats.push({
					userName: `BROADCAST (${data.modName})`,
					time: new Date(),
					chat: data.comment,
					isBroadcast: true
				});
				io.sockets.emit('generalChats', generalChats);
				break;
			case 'ipban':
				const ipban = new BannedIP({
					bannedDate: new Date(),
					type: 'small',
					ip: data.ip
				});

				banAccount(data.userName);
				ipban.save();
				break;
			case 'ipbanlarge':
				const ipbanl = new BannedIP({
					bannedDate: new Date(),
					type: 'big',
					ip: data.ip
				});

				banAccount(data.userName);
				ipbanl.save();
				break;
			case 'deleteCardback':
				Account.findOne({ username: data.userName })
					.then(account => {
						account.gameSettings.customCardback = '';

						account.save(() => {
							if (io.sockets.sockets[affectedSocketId]) {
								io.sockets.sockets[affectedSocketId].emit('manualDisconnection');
							}
						});
					})
					.catch(err => {
						console.log(err);
					});
				break;
			default:
				const setType = /setWins/.test(data.action) ? 'wins' : 'losses',
					number = setType === 'wins' ? parseInt(data.action.substr(7)) : parseInt(data.action.substr(9));

				if (!isNaN(number)) {
					Account.findOne({ username: data.userName }).then(account => {
						account[setType] = number;
						account.save();
					});
				}
		}
	}
};

module.exports.handlePlayerReport = data => {
	const mods = MODERATORS.concat(ADMINS);
	console.log(data);

	Account.find({ username: mods }).then(accounts => {
		accounts.forEach(account => {
			const onlineSocketId = Object.keys(io.sockets.sockets).find(
				socketId => io.sockets.sockets[socketId].handshake.session.passport && io.sockets.sockets[socketId].handshake.session.passport.user === account.username
			);

			account.gameSettings.newReport = true;

			if (onlineSocketId) {
				io.sockets.sockets[onlineSocketId].emit('reportUpdate', true);
			}
			account.save();
		});

		// console.log(accounts);
	});

	// const playerReport = new PlayerReport({
	// 	date: new Date(),
	// 	modUserName: passport.user,
	// 	userActedOn: data.userName,
	// 	modNotes: data.comment,
	// 	ip: data.ip,
	// 	actionTaken: data.action
	// });
};

module.exports.handlePlayerReportDismiss = () => {
	const mods = MODERATORS.concat(ADMINS);

	Account.find({ username: mods }).then(accounts => {
		accounts.forEach(account => {
			const onlineSocketId = Object.keys(io.sockets.sockets).find(
				socketId => io.sockets.sockets[socketId].handshake.session.passport && io.sockets.sockets[socketId].handshake.session.passport.user === account.username
			);

			account.gameSettings.newReport = false;

			if (onlineSocketId) {
				io.sockets.sockets[onlineSocketId].emit('reportUpdate', false);
			}
			account.save();
		});

		// console.log(accounts);
	});
};

module.exports.handleUserLeaveGame = (socket, data) => {
	const game = games.find(el => el.general.uid === data.uid),
		{ badKarma } = false;

	if (badKarma) {
		if (game.private.reports[badKarma]) {
			game.private.reports[badKarma]++;
			if (game.private.reports[badKarma] === 4) {
				Account.findOne({ username: data.badKarma })
					.then(account => {
						if (account.wins + account.losses < 101) {
							let { karmaCount } = account;
							const unbannedTimeMap = {
								1: new Date().getTime() + 900000,
								2: new Date().getTime() + 7200000,
								3: new Date().getTime() + 28800000,
								4: new Date().getTime() + 31556952000
							};

							karmaCount = !karmaCount ? 1 : karmaCount + 1;
							account.karmaCount = karmaCount;
							account.gameSettings.unbanTime = unbannedTimeMap[karmaCount];
							account.save(() => {
								const bannedSocketId = Object.keys(io.sockets.sockets).find(
									socketId =>
										io.sockets.sockets[socketId].handshake.session.passport && io.sockets.sockets[socketId].handshake.session.passport.user === badKarma
								);

								if (io.sockets.sockets[bannedSocketId]) {
									io.sockets.sockets[bannedSocketId].emit('gameSettings', account.gameSettings);
								}
							});
						}
					})
					.catch(err => {
						console.log(err);
					});
			}
		} else {
			game.private.reports[badKarma] = 1;
		}
	}

	if (io.sockets.adapter.rooms[data.uid]) {
		socket.leave(data.uid);
	}

	if (game && game.gameState.isStarted && data.isSeated) {
		const playerIndex = game.publicPlayersState.findIndex(player => player.userName === data.userName);

		if (playerIndex > -1) {
			// crash protection.  Presumably race condition or latency causes this to fire twice, causing crash?
			game.publicPlayersState[playerIndex].leftGame = true;
		}

		if (game.publicPlayersState.filter(publicPlayer => publicPlayer.leftGame).length === game.general.playerCount) {
			games.splice(games.indexOf(game), 1);
		}
	}

	if (game && data.isSeated && !game.gameState.isStarted && game.publicPlayersState.findIndex(player => player.userName === data.userName > -1)) {
		game.publicPlayersState.splice(game.publicPlayersState.findIndex(player => player.userName === data.userName), 1);
		io.sockets.in(data.uid).emit('gameUpdate', game);
	}

	if (game && !game.publicPlayersState.length) {
		io.sockets.in(data.uid).emit('gameUpdate', {});
		games.splice(games.indexOf(game), 1);
	} else if (game && game.isTracksFlipped) {
		sendInProgressGameUpdate(game);
	}

	if (!data.toReplay) {
		updateUserStatus(data.userName, 'none', data.uid);
	}

	socket.emit('gameUpdate', {}, data.isSettings, data.toReplay);
	sendGameList();
};

module.exports.checkUserStatus = socket => {
	const { passport } = socket.handshake.session;

	if (passport && Object.keys(passport).length) {
		const { user } = passport,
			{ sockets } = io.sockets,
			game = games.find(game => game.publicPlayersState.find(player => player.userName === user && !player.leftGame)),
			oldSocketID = Object.keys(sockets).find(
				socketID =>
					sockets[socketID].handshake.session.passport &&
					Object.keys(sockets[socketID].handshake.session.passport).length &&
					(sockets[socketID].handshake.session.passport.user === user && socketID !== socket.id)
			);

		if (oldSocketID && sockets[oldSocketID]) {
			sockets[oldSocketID].emit('manualDisconnection');
			delete sockets[oldSocketID];
		}

		if (game && game.gameState.isStarted && !game.gameState.isCompleted) {
			game.publicPlayersState.find(player => player.userName === user).connected = true;
			socket.join(game.general.uid);
			socket.emit('updateSeatForUser', true);
			sendInProgressGameUpdate(game);
		}
	}

	socket.emit('version', { current: version });

	sendUserList();
	sendGeneralChats(socket);
	sendGameList(socket);
};

module.exports.handleOpenReplay = (socket, gameId) => {
	const { passport } = socket.handshake.session;

	if (passport) {
		const username = socket.handshake.session.passport.user;
		updateUserStatus(username, 'replay', gameId);
	}
};

module.exports.handleCloseReplay = socket => {
	const { passport } = socket.handshake.session;

	if (passport) {
		const username = socket.handshake.session.passport.user;
		updateUserStatus(username, 'none');
	}
};

module.exports.handleSocketDisconnect = handleSocketDisconnect;
