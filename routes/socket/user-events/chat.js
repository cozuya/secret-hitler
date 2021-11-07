const { userList, getLastGenchatModPingAsync, setLastGenchatModPingAsync, newStaff, generalChats } = require('../models');
const { makeReport } = require('../report.js');
const { chatReplacements } = require('../chatReplacements');
const { runCommand } = require('../commands');
const { sendInProgressGameUpdate, sendPlayerChatUpdate } = require('../util.js');
const { emoteList, getPrivateChatTruncate } = require('../models');
const { sendCommandChatsUpdate } = require('../util');

const generalChatReplTime = Array(chatReplacements.length + 1).fill(0);

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
	if (data.chat.length > 300 || !data.chat.length || /^(\*|[*~_]{2,4})$/i.exec(data.chat)) return;

	const AEM = user.staffRole && user.staffRole !== 'altmod' && user.staffRole !== 'trialmod' && user.staffRole !== 'veteran';

	const curTime = new Date();

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

	if (user.lastMessage) {
		let leniency; // How much time (in seconds) must pass before allowing the message.
		if (user.lastMessage.chat && user.lastMessage.chat.toLowerCase() === data.chat.toLowerCase()) leniency = 3;
		else leniency = 0.5;

		const timeSince = curTime - user.lastMessage.time;
		if (timeSince < leniency * 1000) return; // Prior chat was too recent.
	}

	for (const repl of chatReplacements) {
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
		user.lastMessage = newChat;

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

	if (chat.length > 300 || !chat.length || /^(\*|[*~_]{2,4})$/i.exec(data.chat)) {
		return;
	}

	const { publicPlayersState } = game;
	const player = publicPlayersState.find(player => player.userName === passport.user);

	const user = userList.find(u => passport.user === u.userName);

	if (!user || !user.userName) {
		return;
	}
	const AEM = staffUserNames.includes(passport.user) || newStaff.modUserNames.includes(passport.user) || newStaff.editorUserNames.includes(passport.user);

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

	if (user.lastMessage) {
		let leniency; // How much time (in seconds) must pass before allowing the message.
		if (user.lastMessage.chat && user.lastMessage.chat.toLowerCase() === data.chat.toLowerCase()) leniency = 1.5;
		else leniency = 0.25;

		const timeSince = data.timestamp - user.lastMessage.timestamp;
		if (!AEM && timeSince < leniency * 1000) return; // Prior chat was too recent.
	}

	// Prevents spamming commands
	user.lastMessage = { timestamp: Date.now() };

	if (chat[0] === '/') {
		runCommand(socket, passport, user, game, chat, AEM, Boolean(player));
		return;
	}

	const pingMods = /^@(mod|moderator|editor|aem|mods) (.*)$/i.exec(chat);

	if (pingMods) {
		runCommand(socket, passport, user, game, `/pingmod ${pingMods[2]}`, AEM, Boolean(player));
		return;
	}

	for (const repl of chatReplacements) {
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

	if (pinged && player && game.gameState.isStarted) {
		runCommand(socket, passport, user, game, `/ping ${pinged[1]}`, AEM, Boolean(player));
		return;
	}

	if (!(AEM || (isTourneyMod && game.general.unlisted))) {
		const cantUseChat =
			(game.gameState.isStarted &&
				!game.gameState.isCompleted &&
				((!player && game.general.disableObserver) || (player && game.general.playerChats === 'disabled'))) ||
			((!game.gameState.isStarted || game.gameState.isCompleted) && !player && game.general.disableObserverLobby);
		if (cantUseChat) {
			if (!game.private.commandChats[user.userName]) {
				game.private.commandChats[user.userName] = [];
			}
			const msg = player ? 'Chat is disabled in this game.' : 'Observer chat is disabled in this game.';

			game.private.commandChats[user.userName].push({
				gameChat: true,
				timestamp: Date.now(),
				chat: [
					{
						text: msg
					}
				]
			});
			sendInProgressGameUpdate(game);
			return;
		}
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
	if (game.general.private && game.chats.length >= 30) {
		game.chats = game.chats.slice(game.chats.length - 30, game.chats.length);
	}

	if (!game.gameState.isCompleted && game.gameState.isStarted) {
		if (game.general.playerChats === 'emotes' && !(AEM && playerIndex === -1)) {
			// emote games
			if (!emoteList || !data.chat) return;
			let newChatSplit = data.chat.toLowerCase().split(/(:[a-z]*?:)/g);
			const emotes = Object.keys(emoteList);
			// Attempts to cut down on overloading server resources
			const privateChatTruncate = await getPrivateChatTruncate(); // positive integer to represent the chats to truncate at or any falsy value to disable
			if (privateChatTruncate && game.general.private && game.chats.length >= privateChatTruncate) {
				game.chats = game.chats.slice(game.chats.length - privateChatTruncate, game.chats.length);
			}

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
		}
	}

	game.chats.push(data);
	user.lastMessage = data;

	if (game.gameState.isTracksFlipped) {
		sendPlayerChatUpdate(game, data);
	} else {
		sendCommandChatsUpdate(game);
	}
};
