const { userList, generalChats, newStaff, emoteList, setLastGenchatModPingAsync, getLastGenchatModPingAsync, getPrivateChatTruncate } = require('../models');
const { selectVoting } = require('../game/election.js');
const { selectChancellor } = require('../game/election-util.js');
const Account = require('../../../models/account');
const { secureGame } = require('../util.js');
const { sendInProgressGameUpdate, sendPlayerChatUpdate } = require('../util.js');
const { makeReport } = require('../report.js');
const { chatReplacements } = require('../chatReplacements');

const generalChatReplTime = Array(chatReplacements.length + 1).fill(0);

/**
 * @param {object} socket - socket reference.
 * @param {object} passport - socket authentication.
 * @param {object} data - from socket emit.
 * @param {object} game - target game
 * @param {array} modUserNames - list of mods
 * @param {array} editorUserNames - list of editors
 * @param {array} adminUserNames - list of admins
 * @param {function} addNewClaim - links to handleAddNewClaim
 * @param {boolean} isTourneyMod - self explain
 */
module.exports.handleAddNewGameChat = async (socket, passport, data, game, modUserNames, editorUserNames, adminUserNames, addNewClaim, isTourneyMod) => {
	// Authentication Assured in routes.js
	if (!game || !game.general || !data.chat) return;
	const chat = data.chat.trim();
	const staffUserNames = [...modUserNames, ...editorUserNames, ...adminUserNames];
	const playerIndex = game.publicPlayersState.findIndex(player => player.userName === passport.user);

	if (chat.length > 300 || !chat.length || /^(\*|(\*|~|_){2,4})$/i.exec(data.chat)) {
		return;
	}

	const { publicPlayersState } = game;
	const player = publicPlayersState.find(player => player.userName === passport.user);

	const user = userList.find(u => passport.user === u.userName);

	if (!user || !user.userName) {
		return;
	}
	const AEM = staffUserNames.includes(passport.user) || newStaff.modUserNames.includes(passport.user) || newStaff.editorUserNames.includes(passport.user);

	// if (!AEM && game.general.disableChat) return;
	if (!((AEM || (isTourneyMod && game.general.unlistedGame)) && playerIndex === -1)) {
		if (game.gameState.isStarted && !game.gameState.isCompleted && game.general.disableObserver && playerIndex === -1) {
			return;
		}
		if ((!game.gameState.isStarted || game.gameState.isCompleted) && game.general.disableObserverLobby && playerIndex === -1) {
			return;
		}
	}

	data.userName = passport.user;

	if (
		game &&
		game.private &&
		game.private.seatedPlayers &&
		game.private.seatedPlayers[playerIndex] &&
		game.private.seatedPlayers[playerIndex].playersState &&
		game.private.seatedPlayers[playerIndex].playersState[playerIndex] &&
		game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim
	) {
		if (/^[RB]{2,3}$/i.exec(chat)) {
			const formattedChat = chat
				.toLowerCase()
				.split('')
				.sort()
				.reverse()
				.join('');

			// console.log(chat, ' - ', formattedChat, ' - ', game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim);

			if (chat.length === 3 && 0 <= playerIndex <= 9 && game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim === 'wasPresident') {
				const claimData = {
					userName: user.userName,
					claimState: formattedChat,
					claim: game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim,
					uid: data.uid
				};
				if (addNewClaim(socket, passport, game, claimData)) return;
			}

			if (chat.length === 2 && 0 <= playerIndex <= 9 && game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim === 'wasChancellor') {
				const claimData = {
					userName: user.userName,
					claimState: formattedChat,
					claim: game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim,
					uid: data.uid
				};
				if (addNewClaim(socket, passport, game, claimData)) return;
			}

			if (chat.length === 3 && 0 <= playerIndex <= 9 && game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim === 'didPolicyPeek') {
				const claimData = {
					userName: user.userName,
					claimState: chat,
					claim: game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim,
					uid: data.uid
				};
				if (addNewClaim(socket, passport, game, claimData)) return;
			}
		}

		if (/^(b|blue|l|lib|liberal)$/i.exec(chat)) {
			// console.log(chat, ' - ', 'liberal', ' - ', game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim);
			if (
				0 <= playerIndex <= 9 &&
				(game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim === 'didSinglePolicyPeek' ||
					game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim === 'didInvestigateLoyalty')
			) {
				const claimData = {
					userName: user.userName,
					claimState: 'liberal',
					claim: game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim,
					uid: data.uid
				};
				if (addNewClaim(socket, passport, game, claimData)) return;
			}
		}

		if (/^(r|red|fas|f|fasc|fascist)$/i.exec(chat)) {
			// console.log(chat, ' - ', 'fascist', ' - ', game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim);
			if (
				0 <= playerIndex <= 9 &&
				(game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim === 'didSinglePolicyPeek' ||
					game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim === 'didInvestigateLoyalty')
			) {
				const claimData = {
					userName: user.userName,
					claimState: 'fascist',
					claim: game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim,
					uid: data.uid
				};
				if (addNewClaim(socket, passport, game, claimData)) return;
			}
		}
	}

	if (player && ((player.isDead && !game.gameState.isCompleted) || player.leftGame)) {
		return;
	}

	if (!(AEM || (isTourneyMod && game.general.unlistedGame))) {
		if (!player) {
			if (game.general.private && !game.general.whitelistedPlayers.includes(passport.user)) {
				return;
			}
			if (user.wins + user.losses < 10) {
				return;
			}
			if (game.gameState.isStarted && !game.gameState.isCompleted && game.general.disableObserver) {
				return;
			}
			if ((!game.gameState.isStarted || game.gameState.isCompleted) && game.general.disableObserverLobby) {
				return;
			}
		}
	}

	const { gameState } = game;

	if (
		player &&
		(gameState.phase === 'presidentSelectingPolicy' || gameState.phase === 'chancellorSelectingPolicy') &&
		(publicPlayersState.find(play => play.userName === player.userName).governmentStatus === 'isPresident' ||
			publicPlayersState.find(play => play.userName === player.userName).governmentStatus === 'isChancellor')
	) {
		return;
	}

	data.timestamp = new Date();
	if (AEM) {
		const { blindMode, replacementNames } = game.general;

		const aemRigdeck = /^\/forcerigdeck (.*)$/i.exec(chat);
		if (aemRigdeck) {
			if (game && game.private) {
				const deck = aemRigdeck[0].split(' ')[1];
				if (/^([RB]{1,27})$/i.exec(deck)) {
					if (deck.length > 27 || deck.length === 0) {
						socket.emit('sendAlert', 'This deck is too big (or too small).');
						return;
					}

					const changedChat = [
						{
							text: 'An AEM member has changed the deck to '
						}
					];

					for (card of deck) {
						card = card.toUpperCase();
						if (card === 'R' || card === 'B') {
							changedChat.push({
								text: card,
								type: `${card === 'R' ? 'fascist' : 'liberal'}`
							});
						}
					}

					changedChat.push({
						text: '.'
					});

					game.chats.push({
						gameChat: true,
						timestamp: new Date(),
						chat: changedChat
					});

					sendPlayerChatUpdate(game, data);
					sendInProgressGameUpdate(game, false);
				} else {
					socket.emit('sendAlert', 'This is not a valid deck.');
					return;
				}
			} else {
				socket.emit('sendAlert', 'The game has not started yet.');
			}
			return;
		}

		const aemRigrole = /^\/forcerigrole ([0-9]{1,2}) (.*)$/i.exec(chat);
		if (aemRigrole) {
			if (game && game.private) {
				const player = aemRigrole[0].split(' ')[1];
				const role = aemRigrole[0].split(' ')[2];
				if (/^(hitler|fascist|liberal)$/i.exec(role) && parseInt(player, 10) < publicPlayersState.length + 1 && parseInt(player, 10) > 0) {
					const changedChat = [
						{
							text: 'An AEM member has changed the role of player '
						}
					];

					changedChat.push({
						text: `${publicPlayersState[player - 1].userName} (${player})`,
						type: 'player'
					});

					changedChat.push({
						text: ' to '
					});

					changedChat.push({
						text: role,
						type: role
					});

					changedChat.push({
						text: '.'
					});

					game.chats.push({
						gameChat: true,
						timestamp: new Date(),
						chat: changedChat
					});

					sendPlayerChatUpdate(game, data);
					sendInProgressGameUpdate(game, false);
				} else {
					socket.emit('sendAlert', 'This is not a valid command.');
					return;
				}
			} else {
				socket.emit('sendAlert', 'The game has not started yet.');
			}
			return;
		}

		const aemForce = /^\/forcevote (\d{1,2}) (ya|ja|nein|yes|no|true|false)$/i.exec(chat);
		if (aemForce) {
			if (player) {
				socket.emit('sendAlert', 'You cannot force a vote whilst playing.');
				return;
			}
			if (game.general.isRemade) {
				socket.emit('sendAlert', 'This game has been remade.');
				return;
			}
			const affectedPlayerNumber = parseInt(aemForce[1]) - 1;
			const voteString = aemForce[2].toLowerCase();
			if (game && game.private && game.private.seatedPlayers) {
				const affectedPlayer = game.private.seatedPlayers[affectedPlayerNumber];
				if (!affectedPlayer) {
					socket.emit('sendAlert', `There is no seat {${affectedPlayerNumber + 1}}.`);
					return;
				}
				let vote = false;
				if (voteString == 'ya' || voteString == 'ja' || voteString == 'yes' || voteString == 'true') vote = true;

				if (affectedPlayer.voteStatus.hasVoted) {
					socket.emit(
						'sendAlert',
						`${affectedPlayer.userName} {${affectedPlayerNumber + 1}} has already voted.\nThey were voting: ${
							affectedPlayer.voteStatus.didVoteYes ? 'ja' : 'nein'
						}\nYou have set them to vote: ${vote ? 'ja' : 'nein'}
						`
					);
				}

				game.chats.push({
					gameChat: true,
					timestamp: new Date(),
					chat: [
						{
							text: 'An AEM member has forced '
						},
						{
							text: blindMode
								? `${replacementNames[affectedPlayerNumber]} {${affectedPlayerNumber + 1}} `
								: `${affectedPlayer.userName} {${affectedPlayerNumber + 1}}`,
							type: 'player'
						},
						{
							text: ' to vote.'
						}
					]
				});

				const modOnlyChat = {
					timestamp: new Date(),
					gameChat: true,
					chat: [
						{
							text: `${passport.user}`,
							type: 'player'
						},
						{
							text: ' has forced '
						},
						{
							text: `${affectedPlayer.userName} {${affectedPlayerNumber + 1}}`,
							type: 'player'
						},
						{
							text: ' to vote '
						},
						{
							text: `${vote ? 'ja' : 'nein'}`,
							type: 'player'
						},
						{
							text: ', '
						},
						{
							text: `${affectedPlayer.userName}`,
							type: 'player'
						},
						{
							text: `${affectedPlayer.voteStatus.hasVoted ? ' had originally voted ' : ' had not voted.'}`
						},
						{
							text: `${affectedPlayer.voteStatus.hasVoted ? (affectedPlayer.voteStatus.didVoteYes ? ' ja' : ' nein') : ''}`,
							type: 'player'
						}
					]
				};
				game.private.hiddenInfoChat.push(modOnlyChat);

				selectVoting({ user: affectedPlayer.userName }, game, { vote }, null, true);
				sendPlayerChatUpdate(game, data);
				sendInProgressGameUpdate(game, false);
			} else {
				socket.emit('sendAlert', 'The game has not started yet.');
			}
			return;
		}

		const aemSkip = /^\/forceskip (\d{1,2})$/i.exec(chat);
		if (aemSkip) {
			if (player) {
				socket.emit('sendAlert', 'You cannot force skip a government whilst playing.');
				return;
			}
			if (game.general.isRemade) {
				socket.emit('sendAlert', 'This game has been remade.');
				return;
			}
			const affectedPlayerNumber = parseInt(aemSkip[1]) - 1;
			if (game && game.private && game.private.seatedPlayers) {
				const affectedPlayer = game.private.seatedPlayers[affectedPlayerNumber];
				if (!affectedPlayer) {
					socket.emit('sendAlert', `There is no seat ${affectedPlayerNumber + 1}.`);
					return;
				}
				if (affectedPlayerNumber !== game.gameState.presidentIndex) {
					socket.emit('sendAlert', `The player in seat ${affectedPlayerNumber + 1} is not president.`);
					return;
				}
				let chancellor = -1;
				const currentPlayers = [];
				for (let i = 0; i < game.private.seatedPlayers.length; i++) {
					currentPlayers[i] = !(
						game.private.seatedPlayers[i].isDead ||
						(i === game.gameState.previousElectedGovernment[0] && game.general.livingPlayerCount > 5) ||
						i === game.gameState.previousElectedGovernment[1]
					);
				}
				currentPlayers[affectedPlayerNumber] = false;
				let counter = affectedPlayerNumber + 1;
				while (chancellor === -1) {
					if (counter >= currentPlayers.length) {
						counter = 0;
					}
					if (currentPlayers[counter]) {
						chancellor = counter;
					}
					counter++;
				}

				game.chats.push({
					gameChat: true,
					timestamp: new Date(),
					chat: [
						{
							text: 'An AEM member has force skipped the government with '
						},
						{
							text: blindMode
								? `${replacementNames[affectedPlayerNumber]} {${affectedPlayerNumber + 1}} `
								: `${affectedPlayer.userName} {${affectedPlayerNumber + 1}}`,
							type: 'player'
						},
						{
							text: ' as president.'
						}
					]
				});
				selectChancellor(null, { user: affectedPlayer.userName }, game, { chancellorIndex: chancellor }, true);
				setTimeout(() => {
					for (const p of game.private.seatedPlayers.filter(player => !player.isDead)) {
						selectVoting({ user: p.userName }, game, { vote: false }, null, true);
					}
				}, 1000);
				sendPlayerChatUpdate(game, data);
				sendInProgressGameUpdate(game, false);
			} else {
				socket.emit('sendAlert', 'The game has not started yet.');
			}
			return;
		}

		const aemPick = /^\/forcepick (\d{1,2}) (\d{1,2})$/i.exec(chat);
		if (aemPick) {
			if (player) {
				socket.emit('sendAlert', 'You cannot force a pick whilst playing.');
				return;
			}
			if (game.general.isRemade) {
				socket.emit('sendAlert', 'This game has been remade.');
				return;
			}
			const affectedPlayerNumber = parseInt(aemPick[1]) - 1;
			const chancellorPick = aemPick[2];
			if (game && game.private && game.private.seatedPlayers) {
				const affectedPlayer = game.private.seatedPlayers[affectedPlayerNumber];
				const affectedChancellor = game.private.seatedPlayers[chancellorPick - 1];
				if (!affectedPlayer) {
					socket.emit('sendAlert', `There is no seat ${affectedPlayerNumber + 1}.`);
					return;
				}
				if (!affectedChancellor) {
					socket.emit('sendAlert', `There is no seat ${chancellorPick}.`);
					return;
				}
				if (affectedPlayerNumber !== game.gameState.presidentIndex) {
					socket.emit('sendAlert', `The player in seat ${affectedPlayerNumber + 1} is not president.`);
					return;
				}
				if (
					game.publicPlayersState[chancellorPick - 1].isDead ||
					chancellorPick - 1 === affectedPlayerNumber ||
					chancellorPick - 1 === game.gameState.previousElectedGovernment[1] ||
					(chancellorPick - 1 === game.gameState.previousElectedGovernment[0] && game.general.livingPlayerCount > 5)
				) {
					socket.emit('sendAlert', `The player in seat ${chancellorPick} is not a valid chancellor. (Dead or TL)`);
					return;
				}

				game.chats.push({
					gameChat: true,
					timestamp: new Date(),
					chat: [
						{
							text: 'An AEM member has forced '
						},
						{
							text: blindMode
								? `${replacementNames[affectedPlayerNumber]} {${affectedPlayerNumber + 1}} `
								: `${affectedPlayer.userName} {${affectedPlayerNumber + 1}}`,
							type: 'player'
						},
						{
							text: ' to pick '
						},
						{
							text: blindMode ? `${replacementNames[chancellorPick - 1]} {${chancellorPick}} ` : `${affectedChancellor.userName} {${chancellorPick}}`,
							type: 'player'
						},
						{
							text: ' as chancellor.'
						}
					]
				});
				selectChancellor(null, { user: affectedPlayer.userName }, game, { chancellorIndex: chancellorPick - 1 }, true);
				sendPlayerChatUpdate(game, data);
				sendInProgressGameUpdate(game, false);
			} else {
				socket.emit('sendAlert', 'The game has not started yet.');
			}
			return;
		}

		const aemPing = /^\/forceping (\d{1,2})$/i.exec(chat);
		if (aemPing) {
			if (player) {
				socket.emit('sendAlert', 'You cannot force a ping whilst playing.');
				return;
			}
			if (game.general.isRemade) {
				socket.emit('sendAlert', 'This game has been remade.');
				return;
			}
			const affectedPlayerNumber = parseInt(aemPing[1]) - 1;
			if (game && game.private && game.private.seatedPlayers) {
				const affectedPlayer = game.private.seatedPlayers[affectedPlayerNumber];
				if (!affectedPlayer) {
					socket.emit('sendAlert', `There is no seat ${affectedPlayerNumber + 1}.`);
					return;
				}

				game.chats.push({
					gameChat: true,
					timestamp: new Date(),
					chat: [
						{
							text: 'An AEM member has pinged '
						},
						{
							text: blindMode
								? `${replacementNames[affectedPlayerNumber]} {${affectedPlayerNumber + 1}} `
								: `${affectedPlayer.userName} {${affectedPlayerNumber + 1}}`,
							type: 'player'
						},
						{
							text: '.'
						}
					]
				});

				try {
					const affectedSocketId = Object.keys(io.sockets.sockets).find(
						socketId =>
							io.sockets.sockets[socketId].handshake.session.passport &&
							io.sockets.sockets[socketId].handshake.session.passport.user === game.publicPlayersState[affectedPlayerNumber].userName
					);
					if (!io.sockets.sockets[affectedSocketId]) {
						socket.emit('sendAlert', 'Unable to send ping.');
						return;
					}
					io.sockets.sockets[affectedSocketId].emit('pingPlayer', 'Secret Hitler IO: A moderator has pinged you.');
				} catch (e) {
					console.log(e, 'caught exception in ping chat');
				}
				sendPlayerChatUpdate(game, data);
				sendInProgressGameUpdate(game, false);
			} else {
				socket.emit('sendAlert', 'The game has not started yet.');
				return;
			}
			return;
		}
	}

	const pingMods = /^@(mod|moderator|editor|aem|mods) (.*)$/i.exec(chat);

	if (pingMods && player) {
		if (!game.lastModPing || Date.now() > game.lastModPing + 180000) {
			Account.find({ username: { $in: game.publicPlayersState.map(player => player.userName) } }).then(accounts => {
				const staffInGame = accounts
					.filter(
						account =>
							account.staffRole === 'altmod' ||
							account.staffRole === 'moderator' ||
							account.staffRole === 'editor' ||
							account.staffRole === 'admin' ||
							account.staffRole === 'trialmod'
					)
					.map(account => account.username);
				if (staffInGame.length !== 0) {
					socket.emit(
						'sendAlert',
						`An account used by a moderator or a trial moderator is in this game. Please use the report function in this game and make sure to not out crucial information or just DM another moderator.`
					);
					game.lastModPing = Date.now(); // prevent overquerying
				} else {
					// send mod ping
					game.lastModPing = Date.now();
					sendInProgressGameUpdate(game, false);
					makeReport(
						{
							player: passport.user,
							situation: `"${pingMods[2]}".`,
							election: game.general.electionCount,
							title: game.general.name,
							uid: game.general.uid,
							gameType: game.general.casualGame ? 'Casual' : game.general.practiceGame ? 'Practice' : 'Ranked'
						},
						game,
						'ping'
					);
				}
			});
		} else {
			socket.emit('sendAlert', `You can't ping mods for another ${(game.lastModPing + 180000 - Date.now()) / 1000} seconds.`);
		}
		return;
	}

	for (repl of chatReplacements) {
		const replace = repl.regex.exec(chat);
		if (replace) {
			if (AEM) {
				if (game.general.chatReplTime[repl.id] === 0 || Date.now() > game.general.chatReplTime[repl.id] + repl.aemCooldown * 1000) {
					data.chat = repl.replacement;
					game.general.chatReplTime[repl.id] = game.general.chatReplTime[0] = Date.now();
				} else {
					socket.emit(
						'sendAlert',
						`You can do this command again in ${((game.general.chatReplTime[repl.id] + repl.aemCooldown * 1000 - Date.now()) / 1000).toFixed(2)} seconds.`
					);
					return;
				}
			} else if (user.wins + user.losses > repl.normalGames) {
				if (
					Date.now() > game.general.chatReplTime[0] + 30000 &&
					(game.general.chatReplTime[repl.id] === 0 || Date.now() > game.general.chatReplTime[repl.id] + repl.normalCooldown * 1000)
				) {
					data.chat = repl.replacement;
					game.general.chatReplTime[repl.id] = game.general.chatReplTime[0] = Date.now();
				} else {
					socket.emit(
						'sendAlert',
						`You can't do this right now, try again in ${Math.max(
							(game.general.chatReplTime[0] + 30000 - Date.now()) / 1000,
							(game.general.chatReplTime[repl.id] + repl.normalCooldown * 1000 - Date.now()) / 1000
						).toFixed(2)} seconds.`
					);
					return;
				}
			}
		}
	}

	const pinged = /^Ping(\d{1,2})/i.exec(chat);

	if (
		pinged &&
		player &&
		game.gameState.isStarted &&
		parseInt(pinged[1]) <= game.publicPlayersState.length &&
		(!player.pingTime || Date.now() - player.pingTime > 180000)
	) {
		try {
			const affectedPlayerNumber = parseInt(pinged[1]) - 1;
			const affectedSocketId = Object.keys(io.sockets.sockets).find(
				socketId =>
					io.sockets.sockets[socketId].handshake.session.passport &&
					io.sockets.sockets[socketId].handshake.session.passport.user === game.publicPlayersState[affectedPlayerNumber].userName
			);

			player.pingTime = Date.now();
			if (!io.sockets.sockets[affectedSocketId]) {
				return;
			}
			io.sockets.sockets[affectedSocketId].emit(
				'pingPlayer',
				game.general.blindMode || game.general.playerChats === 'disabled'
					? 'Secret Hitler IO: A player has pinged you.'
					: `Secret Hitler IO: Player ${data.userName} just pinged you.`
			);

			if (game.general.playerChats === 'disabled') {
				game.private.seatedPlayers
					.find(x => x.userName === player.userName)
					.gameChats.push({
						timestamp: new Date(),
						gameChat: true,
						chat: [
							{ text: `${game.general.blindMode ? '' : publicPlayersState[affectedPlayerNumber].userName} {${affectedPlayerNumber + 1}}`, type: 'player' },
							{ text: ' has been successfully pinged.' }
						]
					});
				game.private.hiddenInfoChat.push({
					timestamp: new Date(),
					gameChat: true,
					chat: [{ text: `${player.userName} has pinged ${game.publicPlayersState[affectedPlayerNumber].userName}.` }]
				});
			} else {
				game.chats.push({
					gameChat: true,
					userName: passport.user,
					timestamp: new Date(),
					chat: [
						{
							text: game.general.blindMode
								? `A player has pinged player number ${affectedPlayerNumber + 1}.`
								: `${passport.user} has pinged ${publicPlayersState[affectedPlayerNumber].userName} (${affectedPlayerNumber + 1}).`
						}
					],
					previousSeasonAward: user.previousSeasonAward,
					uid: data.uid,
					inProgress: game.gameState.isStarted
				});
			}

			sendInProgressGameUpdate(game);
		} catch (e) {
			console.log(e, 'caught exception in ping chat');
		}
	} else if (!pinged) {
		const lastMessage = game.chats
			.filter(chat => !chat.gameChat && typeof chat.chat === 'string' && chat.userName === user.userName)
			.reduce(
				(acc, cur) => {
					return acc.timestamp > cur.timestamp ? acc : cur;
				},
				{ timestamp: new Date(0) }
			);

		if (lastMessage.chat) {
			let leniency; // How much time (in seconds) must pass before allowing the message.
			if (lastMessage.chat.toLowerCase() === data.chat.toLowerCase()) leniency = 1.5;
			else leniency = 0.25;

			const timeSince = data.timestamp - lastMessage.timestamp;
			if (!AEM && timeSince < leniency * 1000) return; // Prior chat was too recent.
		}

		data.staffRole = (() => {
			if (modUserNames.includes(passport.user) || newStaff.modUserNames.includes(passport.user)) {
				return 'moderator';
			} else if (editorUserNames.includes(passport.user) || newStaff.editorUserNames.includes(passport.user)) {
				return 'editor';
			} else if (adminUserNames.includes(passport.user)) {
				return 'admin';
			}
		})();
		if (AEM && user.staffIncognito) {
			data.hiddenUsername = data.userName;
			data.staffRole = 'moderator';
			data.userName = 'Incognito';
		}

		// Attempts to cut down on overloading server resources
		const privateChatTruncate = await getPrivateChatTruncate(); // positive integer to represent the chats to truncate at or any falsy value to disable
		if (privateChatTruncate && game.general.private && game.chats.length >= privateChatTruncate) {
			game.chats = game.chats.slice(game.chats.length - privateChatTruncate, game.chats.length);
		}

		if (!game.gameState.isCompleted && game.gameState.isStarted) {
			if (game.general.playerChats === 'emotes' && !(AEM && playerIndex === -1)) {
				// emote games
				if (!emoteList || !data.chat) return;
				let newChatSplit = data.chat.toLowerCase().split(/(:[a-z]*?:)/g);
				const emotes = Object.keys(emoteList);

				// filter valid in-game :emotes: and numbers
				newChatSplit = newChatSplit.map(block => {
					if (block.length <= 2 || !block.startsWith(':') || !block.endsWith(':')) {
						return block.replace(/[^0-9]/g, '');
					}
					if (emotes.includes(block)) {
						return ` ${block} `;
					}
				});

				const newChat = newChatSplit.join('');
				if (!newChat.length) return;
				data.chat = newChat;
			} else if (game.general.playerChats === 'disabled' && !game.gameState.isCompleted && game.gameState.isStarted && playerIndex !== -1) {
				// silent games
				socket.emit('sendAlert', 'Player chats are disabled in this game.');
				return;
			}
		}

		game.chats.push(data);

		if (game.gameState.isTracksFlipped) {
			sendPlayerChatUpdate(game, data);
		} else {
			io.in(data.uid).emit('gameUpdate', secureGame(game));
		}
	}
};

/**
 * @param {object} socket - socket reference.
 * @param {object} passport - socket authentication.
 * @param {object} data - from socket emit.
 * @param {array} modUserNames - list of mods
 * @param {array} editorUserNames - list of editors
 * @param {array} adminUserNames - list of admins
 */
module.exports.handleNewGeneralChat = async (socket, passport, data, modUserNames, editorUserNames, adminUserNames) => {
	const user = userList.find(u => u.userName === passport.user);
	if (!user || user.isPrivate) return;

	if (!data.chat) return;
	const chat = (data.chat = data.chat.trim());
	if (data.chat.length > 300 || !data.chat.length || /^(\*|(\*|~|_){2,4})$/i.exec(data.chat)) return;

	const AEM = user.staffRole && user.staffRole !== 'altmod' && user.staffRole !== 'trialmod' && user.staffRole !== 'veteran';

	const curTime = new Date();
	const lastMessage = generalChats.list
		.filter(chat => chat.userName === user.userName)
		.reduce(
			(acc, cur) => {
				return acc.time > cur.time ? acc : cur;
			},
			{ time: new Date(0) }
		);

	const pingMods = /^@(mod|moderator|editor|aem|mods) (.*)$/i.exec(data.chat);

	if (pingMods) {
		try {
			const lastModPing = await getLastGenchatModPingAsync();
			if (!lastModPing || Date.now() > lastModPing + 180000) {
				makeReport(
					{
						player: passport.user,
						situation: `"${pingMods[2]}".`,
						homepage: true
					},
					null,
					'ping'
				);
				await setLastGenchatModPingAsync(Date.now());
			} else {
				socket.emit('sendAlert', `You can't ping mods for another ${(lastModPing + 180000 - Date.now()) / 1000} seconds.`);
			}
		} catch (err) {
			console.error(err);
		}
		return;
	}

	if (lastMessage.chat) {
		let leniency; // How much time (in seconds) must pass before allowing the message.
		if (lastMessage.chat.toLowerCase() === data.chat.toLowerCase()) leniency = 3;
		else leniency = 0.5;

		const timeSince = curTime - lastMessage.time;
		if (timeSince < leniency * 1000) return; // Prior chat was too recent.
	}

	for (repl of chatReplacements) {
		const replace = repl.regex.exec(chat);
		if (replace) {
			if (AEM) {
				if (generalChatReplTime[repl.id] === 0 || Date.now() > generalChatReplTime[repl.id] + repl.aemCooldown * 1000) {
					data.chat = repl.replacement;
					generalChatReplTime[repl.id] = generalChatReplTime[0] = Date.now();
				} else {
					socket.emit(
						'sendAlert',
						`You can do this command again in ${((generalChatReplTime[repl.id] + repl.aemCooldown * 1000 - Date.now()) / 1000).toFixed(2)} seconds.`
					);
					return;
				}
			} else if (user.wins + user.losses > repl.normalGames) {
				if (
					Date.now() > generalChatReplTime[0] + 30000 &&
					(generalChatReplTime[repl.id] === 0 || Date.now() > generalChatReplTime[repl.id] + repl.normalCooldown * 1000)
				) {
					data.chat = repl.replacement;
					generalChatReplTime[repl.id] = generalChatReplTime[0] = Date.now();
				} else {
					socket.emit(
						'sendAlert',
						`You can't do this right now, try again in ${Math.max(
							(generalChatReplTime[0] + 30000 - Date.now()) / 1000,
							(generalChatReplTime[repl.id] + repl.normalCooldown * 1000 - Date.now()) / 1000
						).toFixed(2)} seconds.`
					);
					return;
				}
			}
		}
	}

	if (user.wins + user.losses >= 10 || process.env.NODE_ENV !== 'production') {
		const getStaffRole = () => {
			if (modUserNames.includes(passport.user) || newStaff.modUserNames.includes(passport.user)) {
				return 'moderator';
			} else if (editorUserNames.includes(passport.user) || newStaff.editorUserNames.includes(passport.user)) {
				return 'editor';
			} else if (adminUserNames.includes(passport.user)) {
				return 'admin';
			}
			return '';
		};
		const newChat = {
			time: curTime,
			chat: data.chat,
			userName: passport.user,
			staffRole: getStaffRole()
		};
		const staffUserNames = [...modUserNames, ...editorUserNames, ...adminUserNames];
		const AEM = staffUserNames.includes(passport.user) || newStaff.modUserNames.includes(passport.user) || newStaff.editorUserNames.includes(passport.user);
		if (AEM && user.staffIncognito) {
			newChat.hiddenUsername = newChat.userName;
			newChat.staffRole = 'moderator';
			newChat.userName = 'Incognito';
		}
		generalChats.list.push(newChat);

		if (generalChats.list.length > 99) {
			generalChats.list.shift();
		}
		io.sockets.emit('generalChats', generalChats);
	}
};
