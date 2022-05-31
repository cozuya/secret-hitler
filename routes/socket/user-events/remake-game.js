const { gameCreationDisabled, games, userList } = require('../models');
const { sendInProgressGameUpdate } = require('../util.js');
const _ = require('lodash');
const { chatReplacements } = require('../chatReplacements');
const { saveAndDeleteGame } = require('../game/end-game');
const { sendGameList, sendGameInfo } = require('../user-requests');

const { updateSeatedUser } = require('./join-game');
const { checkStartConditions } = require('./leave-game');

/**
 * @param {object} passport - socket authentication.
 * @param {object} game - target game.
 * @param {object} data - from socket emit.
 * @param {object} socket - socket
 */
module.exports.handleUpdatedRemakeGame = (passport, game, data, socket) => {
	if (game.general.isRemade) {
		return; // Games can only be remade once.
	}

	if (game.gameState.isGameFrozen) {
		if (socket) {
			socket.emit('sendAlert', 'A staff member has prevented this game from proceeding. Please wait.');
		}
		return;
	}

	const remakeText = game.general.isTourny ? 'cancel' : 'remake';
	const { remakeData, publicPlayersState } = game;
	if (!remakeData) return;
	const playerIndex = remakeData.findIndex(player => player.userName === passport.user);
	const realPlayerIndex = publicPlayersState.findIndex(player => player.userName === passport.user);
	const player = remakeData[playerIndex];
	let chat;
	const minimumRemakeVoteCount =
		(game.customGameSettings.fascistCount && game.general.playerCount - game.customGameSettings.fascistCount) || Math.floor(game.general.playerCount / 2) + 2;
	if (game && game.general && game.general.private && !game.general.privateAnonymousRemakes) {
		chat = {
			timestamp: new Date(),
			gameChat: true,
			chat: [
				{
					text: 'Player '
				},
				{
					text: `${passport.user} {${realPlayerIndex + 1}} `,
					type: 'player'
				}
			]
		};
	} else {
		chat = {
			timestamp: new Date(),
			gameChat: true,
			chat: [
				{
					text: 'A player'
				}
			]
		};
	}

	const makeNewGame = () => {
		if (gameCreationDisabled.status) {
			game.chats.push({
				gameChat: true,
				timestamp: new Date(),
				chat: [
					{
						text: 'Game remake aborted, game creation is currently disabled.',
						type: 'hitler'
					}
				]
			});
			sendInProgressGameUpdate(game);
			return;
		}

		const _game = Object.assign({}, game);
		delete _game.private;
		const newGame = _.cloneDeep(_game);
		const remakePlayerNames = remakeData.filter(player => player.isRemaking).map(player => player.userName);
		const remakePlayerSocketIDs = Object.keys(io.sockets.sockets).filter(
			socketId =>
				io.sockets.sockets[socketId].handshake.session.passport && remakePlayerNames.includes(io.sockets.sockets[socketId].handshake.session.passport.user)
		);
		sendInProgressGameUpdate(game);

		newGame.gameState = {
			previousElectedGovernment: [],
			undrawnPolicyCount: 17,
			discardedPolicyCount: 0,
			presidentIndex: -1,
			isCompleted: false,
			timeCompleted: undefined
		};

		newGame.chats = [];
		if (newGame.customGameSettings.enabled) {
			let chat = {
				timestamp: new Date(),
				gameChat: true,
				chat: [
					{
						text: 'There will be '
					},
					{
						text: `${newGame.customGameSettings.deckState.lib - newGame.customGameSettings.trackState.lib} liberal`,
						type: 'liberal'
					},
					{
						text: ' and '
					},
					{
						text: `${newGame.customGameSettings.deckState.fas - newGame.customGameSettings.trackState.fas} fascist`,
						type: 'fascist'
					},
					{
						text: ' policies in the deck.'
					}
				]
			};
			const t = chat.timestamp.getMilliseconds();
			newGame.chats.push(chat);
			chat = {
				timestamp: new Date(),
				gameChat: true,
				chat: [
					{
						text: 'The game will start with '
					},
					{
						text: `${newGame.customGameSettings.trackState.lib} liberal`,
						type: 'liberal'
					},
					{
						text: ' and '
					},
					{
						text: `${newGame.customGameSettings.trackState.fas} fascist`,
						type: 'fascist'
					},
					{
						text: ' policies.'
					}
				]
			};
			chat.timestamp.setMilliseconds(t + 1);
			newGame.chats.push(chat);
		}
		newGame.general.isRemade = false;
		newGame.general.isRemaking = false;
		newGame.general.isRecorded = false;
		newGame.summarySaved = false;
		if (game.general.uid.indexOf('Remake') === -1) {
			newGame.general.uid = `${game.general.uid}Remake1`;
		} else {
			newGame.general.uid = `${game.general.uid.split('Remake')[0]}Remake${parseInt(game.general.uid.split('Remake')[1]) + 1}`;
		}
		newGame.general.electionCount = 0;
		newGame.timeCreated = Date.now();
		newGame.general.lastModPing = 0;
		newGame.general.chatReplTime = Array(chatReplacements.length + 1).fill(0);

		newGame.publicPlayersState = game.publicPlayersState
			.filter(player =>
				game.remakeData
					.filter(rmkPlayer => rmkPlayer.isRemaking)
					.map(rmkPlayer => rmkPlayer.userName)
					.some(rmkPlayer => rmkPlayer === player.userName)
			)
			.map(player => ({
				userName: player.userName,
				customCardback: player.customCardback,
				customCardbackUid: player.customCardbackUid,
				previousSeasonAward: player.previousSeasonAward,
				connected: player.connected,
				isRemakeVoting: false,
				pingTime: undefined,
				cardStatus: {
					cardDisplayed: false,
					isFlipped: false,
					cardFront: 'secretrole',
					cardBack: {}
				}
			}));
		newGame.remakeData = [];
		newGame.playersState = [];
		newGame.cardFlingerState = [];
		newGame.guesses = {};
		newGame.merlinGuesses = {};
		newGame.trackState = {
			liberalPolicyCount: 0,
			fascistPolicyCount: 0,
			electionTrackerCount: 0,
			enactedPolicies: []
		};
		newGame.private = {
			reports: {},
			unSeatedGameChats: [],
			commandChats: {},
			replayGameChats: [],
			lock: {},
			votesPeeked: false,
			invIndex: -1,
			privatePassword: game.private.privatePassword,
			hiddenInfoChat: [],
			hiddenInfoSubscriptions: [],
			hiddenInfoShouldNotify: true,
			gameCreatorName: game.private.gameCreatorName,
			gameCreatorBlacklist: game.private.gameCreatorBlacklist
		};

		game.publicPlayersState.forEach((player, i) => {
			if (game.private.seatedPlayers && game.private.seatedPlayers[i] && game.private.seatedPlayers[i].role) {
				player.cardStatus.cardFront = 'secretrole';
				player.cardStatus.cardBack = game.private.seatedPlayers[i].role;
				player.cardStatus.cardDisplayed = true;
				player.cardStatus.isFlipped = true;
			}
		});

		game.general.status = 'Game is being remade..';
		if (!game.summarySaved) {
			const summary = game.private.summary.publish();
			if (summary && summary.toObject() && game.general.uid !== 'devgame' && !game.general.private) {
				summary.save();
				game.summarySaved = true;
			}
		}
		sendInProgressGameUpdate(game);

		setTimeout(() => {
			game.publicPlayersState.forEach(player => {
				if (remakePlayerNames.includes(player.userName)) player.leftGame = true;
			});

			if (game.publicPlayersState.filter(publicPlayer => publicPlayer.leftGame).length === game.general.playerCount) {
				saveAndDeleteGame(game.general.uid);
			} else {
				sendInProgressGameUpdate(game);
			}

			games[newGame.general.uid] = newGame;
			sendGameList();

			let creatorRemade = false;
			remakePlayerSocketIDs.forEach((id, index) => {
				if (io.sockets.sockets[id]) {
					io.sockets.sockets[id].leave(game.general.uid);
					sendGameInfo(io.sockets.sockets[id], newGame.general.uid);
					if (
						io.sockets.sockets[id] &&
						io.sockets.sockets[id].handshake &&
						io.sockets.sockets[id].handshake.session &&
						io.sockets.sockets[id].handshake.session.passport
					) {
						updateSeatedUser(io.sockets.sockets[id], io.sockets.sockets[id].handshake.session.passport, { uid: newGame.general.uid });
						if (io.sockets.sockets[id].handshake.session.passport.user === newGame.private.gameCreatorName) creatorRemade = true;
					}
				}
			});
			if (creatorRemade && newGame.private.gameCreatorBlacklist != null) {
				const creator = userList.find(user => user.userName === newGame.private.gameCreatorName);
				if (creator) newGame.private.gameCreatorBlacklist = creator.blacklist;
			} else newGame.private.gameCreatorBlacklist = null;
			checkStartConditions(newGame);
		}, 3000);
	};

	/**
	 * @param {string} firstTableUid - the UID of the first tournament table
	 */
	const cancellTourny = firstTableUid => {
		const secondTableUid =
			firstTableUid.charAt(firstTableUid.length - 1) === 'A'
				? `${firstTableUid.slice(0, firstTableUid.length - 1)}B`
				: `${firstTableUid.slice(0, firstTableUid.length - 1)}A`;
		const secondTable = games.find(game => game.general.uid === secondTableUid);

		if (secondTable) {
			secondTable.general.tournyInfo.isCancelled = true;
			secondTable.chats.push({
				gameChat: true,
				timestamp: new Date(),
				chat: [
					{
						text: 'Due to the other tournament table voting for cancellation, this tournament has been cancelled.',
						type: 'hitler'
					}
				]
			});
			secondTable.general.status = 'Tournament has been cancelled.';
			sendInProgressGameUpdate(secondTable);
		}
	};

	if (!game || !player || !game.remakeData) {
		return;
	}

	if (data.remakeStatus && Date.now() > player.remakeTime + 7000) {
		player.isRemaking = true;
		player.timesVoted++;
		player.remakeTime = Date.now();

		const remakePlayerCount = remakeData.filter(player => player.isRemaking).length;
		chat.chat.push({
			text: ` has voted to ${remakeText} this ${game.general.isTourny ? 'tournament.' : 'game.'} (${remakePlayerCount}/${minimumRemakeVoteCount})`
		});

		if (!game.general.isRemaking && publicPlayersState.length > 3 && remakePlayerCount >= minimumRemakeVoteCount) {
			game.general.isRemaking = true;
			game.general.remakeCount = 5;

			game.private.remakeTimer = setInterval(() => {
				if (game.general.remakeCount !== 0) {
					game.general.status = `Game is ${game.general.isTourny ? 'cancelled ' : 'remade'} in ${game.general.remakeCount} ${
						game.general.remakeCount === 1 ? 'second' : 'seconds'
					}.`;
					game.general.remakeCount--;
				} else {
					clearInterval(game.private.remakeTimer);
					game.general.status = `Game has been ${game.general.isTourny ? 'cancelled' : 'remade'}.`;
					game.general.isRemade = true;

					const remainingPoliciesChat = {
						isRemainingPolicies: true,
						timestamp: new Date(),
						chat: [
							{
								text: 'The remaining policies are '
							},
							{
								policies: game.private.policies.map(policyName => (policyName === 'liberal' ? 'b' : 'r'))
							},
							{
								text: '.'
							}
						]
					};

					game.private.unSeatedGameChats.push(remainingPoliciesChat);
					game.private.seatedPlayers.forEach(player => {
						player.gameChats.push(remainingPoliciesChat);
					});

					if (game.general.isTourny) {
						cancellTourny(game.general.uid);
					} else {
						makeNewGame();
					}
				}
				sendInProgressGameUpdate(game);
			}, 1000)[Symbol.toPrimitive]();
		}
	} else if (!data.remakeStatus && Date.now() > player.remakeTime + 2000) {
		player.isRemaking = false;
		player.remakeTime = Date.now();

		const remakePlayerCount = remakeData.filter(player => player.isRemaking).length;

		if (game.general.isRemaking && remakePlayerCount < minimumRemakeVoteCount) {
			game.general.isRemaking = false;
			game.general.status = 'Game remaking has been cancelled.';
			clearInterval(game.private.remakeTimer);
		}
		chat.chat.push({
			text: ` has rescinded their vote to ${
				game.general.isTourny ? 'cancel this tournament.' : 'remake this game.'
			} (${remakePlayerCount}/${minimumRemakeVoteCount})`
		});
	} else {
		return;
	}
	socket.emit('updateRemakeVoting', player.isRemaking);
	game.chats.push(chat);
	sendInProgressGameUpdate(game);
};
