let generalChatCount = 0;

const { games, userList, generalChats, accountCreationDisabled, ipbansNotEnforced, gameCreationDisabled } = require('./models'),
	{ sendGameList, sendGeneralChats, sendUserList, updateUserStatus } = require('./user-requests'),
	Account = require('../../models/account'),
	Generalchats = require('../../models/generalchats'),
	ModAction = require('../../models/modAction'),
	PlayerReport = require('../../models/playerReport'),
	BannedIP = require('../../models/bannedIP'),
	Profile = require('../../models/profile/index'),
	startGame = require('./game/start-game.js'),
	{ secureGame } = require('./util.js'),
	crypto = require('crypto'),
	https = require('https'),
	{ sendInProgressGameUpdate } = require('./util.js'),
	version = require('../../version'),
	{ PLAYERCOLORS, MODERATORS, ADMINS, EDITORS } = require('../../src/frontend-scripts/constants'),
	displayWaitingForPlayers = game => {
		const includedPlayerCounts = [5, 6, 7, 8, 9, 10].filter(value => !game.general.excludedPlayerCount.includes(value));

		for (value of includedPlayerCounts) {
			if (value > game.publicPlayersState.length) {
				const count = value - game.publicPlayersState.length;
				return count === 1 ? `Waiting for ${count} more player..` : `Waiting for ${count} more players..`;
			}
		}
	};

const startCountdown = game => {
	if (game.gameState.isStarted) {
		return;
	}
	game.gameState.isStarted = true;
	let startGamePause = 20;
	const countDown = setInterval(() => {
		if (game.gameState.cancellStart) {
			game.gameState.cancellStart = false;
			game.gameState.isStarted = false;
			clearInterval(countDown);
		} else if (startGamePause === 4 || game.publicPlayersState.length === game.general.maxPlayersCount) {
			clearInterval(countDown);
			startGame(game);
		} else {
			game.general.status = `Game starts in ${startGamePause} second${startGamePause === 1 ? '' : 's'}.`;
			io.in(game.general.uid).emit('gameUpdate', secureGame(game));
		}
		startGamePause--;
	}, 1000);
};

const checkStartConditions = game => {
	if (game.gameState.isTracksFlipped) {
		return;
	}
	if (
		game.gameState.isStarted &&
		(game.publicPlayersState.length < game.general.minPlayersCount || game.general.excludedPlayerCount.includes(game.publicPlayersState.length))
	) {
		game.gameState.cancellStart = true;
		game.general.status = displayWaitingForPlayers(game);
	} else if (
		!game.gameState.isStarted &&
		game.publicPlayersState.length >= game.general.minPlayersCount &&
		!game.general.excludedPlayerCount.includes(game.publicPlayersState.length)
	) {
		startCountdown(game);
	} else if (!game.gameState.isStarted) {
		game.general.status = displayWaitingForPlayers(game);
	}
};

const handleSocketDisconnect = socket => {
		const { passport } = socket.handshake.session;

		if (passport && Object.keys(passport).length) {
			const userIndex = userList.findIndex(user => user.userName === passport.user),
				gamez = games.filter(game => game.publicPlayersState.find(player => player.userName === passport.user)),
				game = games.find(game => game.publicPlayersState.find(player => player.userName === passport.user));

			if (gamez.length && gamez.length > 1) {
				console.log('player in more than publicplayersstate');
			}

			socket.emit('manualDisconnection');
			if (userIndex !== -1) {
				userList.splice(userIndex, 1);
			}
			if (game) {
				const { gameState, publicPlayersState } = game,
					playerIndex = publicPlayersState.findIndex(player => player.userName === passport.user);

				if (!gameState.isStarted && publicPlayersState.length === 1 && gamez.length && gamez.length < 2) {
					games.splice(games.indexOf(game), 1);
				} else if (!gameState.isTracksFlipped && playerIndex > -1) {
					publicPlayersState.splice(playerIndex, 1);
					checkStartConditions(game);
					io.sockets.in(game.uid).emit('gameUpdate', game);
				} else if (
					gameState.isCompleted &&
					game.publicPlayersState.filter(player => !player.connected || player.leftGame).length === game.general.playerCount - 1
				) {
					games.splice(games.indexOf(game), 1);
				} else if (gameState.isTracksFlipped) {
					publicPlayersState[playerIndex].connected = false;
					sendInProgressGameUpdate(game);
				}
				sendGameList();
			}
		}
		sendUserList();
	},
	crashReport = JSON.stringify({
		content: `${process.env.DISCORDADMINPING} the site just crashed or reset.`
	}),
	crashOptions = {
		hostname: 'discordapp.com',
		path: process.env.DISCORDCRASHURL,
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Content-Length': Buffer.byteLength(crashReport)
		}
	};

if (process.env.NODE_ENV) {
	console.log('Hello, World!');
	const crashReq = https.request(crashOptions);

	crashReq.end(crashReport);
}

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
		checkStartConditions(game);
		updateUserStatus(data.userName, game.general.rainbowgame ? 'rainbow' : 'playing', data.uid);
		io.sockets.in(data.uid).emit('gameUpdate', secureGame(game));
		sendGameList();
	}
};

module.exports.handleAddNewGame = (socket, data) => {
	if (socket.handshake.session.passport && !gameCreationDisabled.status) {
		// seems ridiculous to do this i.e. how can someone who's not logged in fire this function at all but here I go crashing again..
		const username = socket.handshake.session.passport.user;

		Account.findOne({ username }).then(account => {
			data.private = {
				reports: {},
				unSeatedGameChats: [],
				lock: {}
			};

			if (data.general.private) {
				data.private.privatePassword = data.general.private;
				data.general.private = true;
			}

			if (data.general.rainbowgame) {
				data.general.rainbowgame = Boolean(account.wins + account.losses > 49);
			}
			data.general.timeCreated = new Date().getTime();
			updateUserStatus(username, data.general.rainbowgame ? 'rainbow' : 'playing', data.general.uid);
			games.push(data);
			sendGameList();
			socket.join(data.general.uid);
			socket.emit('gameUpdate', data);
		});
	}
};

module.exports.handleAddNewClaim = data => {
	const game = games.find(el => el.general.uid === data.uid);

	if (!game || !game.private || !game.private.summary) {
		return;
	}

	const playerIndex = game.publicPlayersState.findIndex(player => player.userName === data.userName),
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
	if (game.private.seatedPlayers[playerIndex]) {
		game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim = '';
	}
	sendInProgressGameUpdate(game);
};

module.exports.handleAddNewGameChat = (socket, data) => {
	const { passport } = socket.handshake.session;

	if (!passport || !passport.user || passport.user !== data.userName || data.chat.length > 300 || !data.chat.trim().length) {
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
	if (!passport || !passport.user || passport.user !== data.userName || data.chat.length > 300 || !data.chat.trim().length) {
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
		isSuperMod = passport.user ? EDITORS.includes(passport.user) || ADMINS.includes(passport.user) : false,
		affectedSocketId = Object.keys(io.sockets.sockets).find(
			socketId => io.sockets.sockets[socketId].handshake.session.passport && io.sockets.sockets[socketId].handshake.session.passport.user === data.userName
		);

	if (passport && (MODERATORS.includes(passport.user) || ADMINS.includes(passport.user) || EDITORS.includes(passport.user))) {
		const modaction = new ModAction({
				date: new Date(),
				modUserName: passport.user,
				userActedOn: data.userName,
				modNotes: data.comment,
				ip: data.ip,
				actionTaken: data.action
			}),
			logOutUser = username => {
				const bannedUserlistIndex = userList.findIndex(user => user.userName === data.userName);

				if (io.sockets.sockets[affectedSocketId]) {
					io.sockets.sockets[affectedSocketId].emit('manualDisconnection');
				}

				if (bannedUserlistIndex >= 0) {
					userList.splice(bannedUserlistIndex, 1);
				}
			},
			banAccount = username => {
				if (!ADMINS.includes(username) && (!MODERATORS.includes(username) || !EDITORS.includes(username) || isSuperMod)) {
					Account.findOne({ username })
						.then(account => {
							if (account) {
								account.hash = crypto.randomBytes(20).toString('hex');
								account.salt = crypto.randomBytes(20).toString('hex');
								account.isBanned = true;
								account.save(() => {
									const bannedAccountGeneralChats = generalChats.filter(chat => chat.userName === username);

									bannedAccountGeneralChats.reverse().forEach(chat => {
										generalChats.splice(generalChats.indexOf(chat), 1);
									});
									logOutUser(username);
									io.sockets.emit('generalChats', generalChats);
								});
							}
						})
						.catch(err => {
							console.log(err, 'ban user err');
						});
				}
			};

		modaction.save();
		switch (data.action) {
			case 'deleteUser':
				if (isSuperMod) {
					Account.findOne({ username: data.userName }).remove(() => {
						if (io.sockets.sockets[affectedSocketId]) {
							io.sockets.sockets[affectedSocketId].emit('manualDisconnection');
						}
					});
				}
				break;
			case 'ban':
				banAccount(data.userName);
				break;
			case 'broadcast':
				const discordBroadcastBody = JSON.stringify({
						content: `Text: ${data.comment}\nMod: ${passport.user}`
					}),
					discordBroadcastOptions = {
						hostname: 'discordapp.com',
						path: process.env.DISCORDBROADCASTURL,
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'Content-Length': Buffer.byteLength(discordBroadcastBody)
						}
					},
					broadcastReq = https.request(discordBroadcastOptions);

				broadcastReq.end(discordBroadcastBody);
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

				if (isSuperMod) {
					ipban.save(() => {
						banAccount(data.userName);
					});
				}
				break;
			case 'timeOut':
				const timeout = new BannedIP({
					bannedDate: new Date(),
					type: 'small',
					ip: data.ip
				});
				timeout.save(() => {
					logOutUser(data.userName);
				});
				break;
			case 'clearGenchat':
				generalChats.fill({});

				io.sockets.emit('generalChats', generalChats);
				break;
			case 'deleteProfile':
				if (isSuperMod) {
					Profile.findOne({ _id: data.userName })
						.remove(() => {
							if (io.sockets.sockets[affectedSocketId]) {
								io.sockets.sockets[affectedSocketId].emit('manualDisconnection');
							}
						})
						.catch(err => {
							console.log(err);
						});
				}
				break;
			// case 'renamePlayer':
			// 	Account.findOne({ username: data.userName })
			// 		.then(account => {
			// 			account.username = data.modNotes;
			// 			account.save(() => {
			// 				Profile.findOne({ _id: data.userName })
			// 					.then(profile => {
			// 						profile._id = data.modNotes;
			// 						profile.save(() => {
			// 							if (io.sockets.sockets[affectedSocketId]) {
			// 								io.sockets.sockets[affectedSocketId].emit('manualDisconnection');
			// 							}
			// 						});
			// 					})
			// 					.catch(err => {
			// 						console.log(err);
			// 					});
			// 			});
			// 		})
			// 		.catch(err => {
			// 			console.log(err);
			// 		});
			case 'ipbanlarge':
				const ipbanl = new BannedIP({
					bannedDate: new Date(),
					type: 'big',
					ip: data.ip
				});

				if (isSuperMod) {
					ipbanl.save(() => {
						banAccount(data.userName);
					});
				}
				break;
			case 'deleteCardback':
				Account.findOne({ username: data.userName })
					.then(account => {
						if (account) {
							account.gameSettings.customCardback = '';

							account.save(() => {
								if (io.sockets.sockets[affectedSocketId]) {
									io.sockets.sockets[affectedSocketId].emit('manualDisconnection');
								}
							});
						}
					})
					.catch(err => {
						console.log(err);
					});
				break;
			case 'disableAccountCreation':
				accountCreationDisabled.status = true;
				break;
			case 'enableAccountCreation':
				accountCreationDisabled.status = false;
				break;
			case 'disableIpbans':
				ipbansNotEnforced.status = true;
				break;
			case 'enableIpbans':
				ipbansNotEnforced.status = false;
				break;
			case 'disableGameCreation':
				gameCreationDisabled.status = true;
				break;
			case 'enableGameCreation':
				gameCreationDisabled.status = false;
				break;
			case 'resetServer':
				if (isSuperMod) {
					console.log('server crashing manually via mod action');
					crashServer();
				}
				break;
			default:
				if (data.userName.substr(0, 7) === 'DELGAME') {
					const game = games.find(el => el.general.uid === data.userName.slice(7));

					if (game) {
						games.splice(games.indexOf(game), 1);
						sendGameList();
					}
				} else {
					const setType = /setRWins/.test(data.action)
							? 'rainbowWins'
							: /setRLosses/.test(data.action) ? 'rainbowLosses' : /setWins/.test(data.action) ? 'wins' : 'losses',
						number =
							setType === 'wins'
								? data.action.substr(7)
								: setType === 'losses' ? data.action.substr(9) : setType === 'rainbowWins' ? data.action.substr(8) : data.action.substr(10),
						isPlusOrMinus = number.charAt(0) === '+' || number.charAt(0) === '-';

					if (!isNaN(parseInt(number))) {
						Account.findOne({ username: data.userName })
							.then(account => {
								if (account) {
									account[setType] = isPlusOrMinus ? account[setType] + parseInt(number) : parseInt(number);
									account.save();
								}
							})
							.catch(err => {
								console.log(err, 'set wins/losses error');
							});
					}
				}
		}
	}
};

module.exports.handlePlayerReport = data => {
	const mods = MODERATORS.concat(ADMINS),
		playerReport = new PlayerReport({
			date: new Date(),
			gameUid: data.uid,
			reportingPlayer: data.userName,
			reportedPlayer: data.reportedPlayer,
			reason: data.reason,
			comment: data.comment
		}),
		body = JSON.stringify({
			content: `Game UID: ${data.uid.substr(0, 6)}\nReported player: ${data.reportedPlayer}\nReason: ${data.reason}\nComment: ${data.comment}`
		}),
		options = {
			hostname: 'discordapp.com',
			path: process.env.DISCORDURL,
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': Buffer.byteLength(body)
			}
		};

	playerReport.save(() => {
		Account.find({ username: mods }).then(accounts => {
			accounts.forEach(account => {
				const onlineSocketId = Object.keys(io.sockets.sockets).find(
					socketId =>
						io.sockets.sockets[socketId].handshake.session.passport && io.sockets.sockets[socketId].handshake.session.passport.user === account.username
				);

				account.gameSettings.newReport = true;

				if (onlineSocketId) {
					io.sockets.sockets[onlineSocketId].emit('reportUpdate', true);
				}
				account.save();
			});
		});

		try {
			const req = https.request(options);
			req.end(body);
		} catch (error) {
			console.log(err, 'Caught exception in player request https request to discord server');
		}
	});
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
	});
};

module.exports.handleUserLeaveGame = (socket, data) => {
	const game = games.find(el => el.general.uid === data.uid);

	if (io.sockets.adapter.rooms[data.uid]) {
		socket.leave(data.uid);
	}

	if (game) {
		if (data.isSeated) {
			if (game.gameState.isTracksFlipped) {
				const playerIndex = game.publicPlayersState.findIndex(player => player.userName === data.userName);
				if (playerIndex > -1) {
					// crash protection.  Presumably race condition or latency causes this to fire twice, causing crash?
					game.publicPlayersState[playerIndex].leftGame = true;
				}
				if (game.publicPlayersState.filter(publicPlayer => publicPlayer.leftGame).length === game.general.playerCount) {
					games.splice(games.indexOf(game), 1);
				}
			} else if (!game.gameState.isTracksFlipped && game.publicPlayersState.findIndex(player => player.userName === data.userName > -1)) {
				game.publicPlayersState.splice(game.publicPlayersState.findIndex(player => player.userName === data.userName), 1);
				checkStartConditions(game);
				io.sockets.in(data.uid).emit('gameUpdate', game);
			}
		}
		if (!game.publicPlayersState.length) {
			io.sockets.in(data.uid).emit('gameUpdate', {});
			games.splice(games.indexOf(game), 1);
		} else if (game.gameState.isTracksFlipped) {
			sendInProgressGameUpdate(game);
		}
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
