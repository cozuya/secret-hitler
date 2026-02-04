const { gameCreationDisabled, limitNewPlayers, userList, games } = require('../models');
const { LEGALCHARACTERS } = require('../../../src/frontend-scripts/node-constants');
const { generateCombination } = require('gfycat-style-urls');
const { chatReplacements } = require('../chatReplacements');
const Account = require('../../../models/account');
const Game = require('../../../models/game');
const { updateUserStatus, sendGameList } = require('../user-requests');
const { secureGame } = require('../util.js');

/**
 * @param {object} socket - user socket reference.
 * @param {object} passport - socket authentication.
 * @param {object} data - from socket emit.
 */
module.exports.handleAddNewGame = async (socket, passport, data) => {
	// Authentication Assured in routes.js
	if (gameCreationDisabled.status || (!data.privatePassword && limitNewPlayers.status)) {
		return;
	}

	const user = userList.find(obj => obj.userName === passport.user);
	const currentTime = new Date();

	if (!user || currentTime - user.timeLastGameCreated < 8000 || user.status.type !== 'none') {
		// Check if !user here in case of bug where user doesn't appear on userList
		return;
	}

	// Make sure it exists
	if (!data) return;

	// Normalize numeric-ish inputs and bail if they became NaN or are objects
	const toInt = v => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v);
	if (typeof data.minPlayersCount === 'object' || typeof data.maxPlayersCount === 'object') return;

	data.minPlayersCount = toInt(data.minPlayersCount);
	data.maxPlayersCount = toInt(data.maxPlayersCount);

	if ((data.minPlayersCount != null && !Number.isInteger(data.minPlayersCount)) || (data.maxPlayersCount != null && !Number.isInteger(data.maxPlayersCount)))
		return;

	// Clamp to sane bounds used later
	data.minPlayersCount = Math.max(5, Math.min(10, data.minPlayersCount ?? 5));
	data.maxPlayersCount = Math.max(5, Math.min(10, data.maxPlayersCount ?? 10));
	if (data.minPlayersCount > data.maxPlayersCount) return;

	if (data.minPlayersCount && typeof data.minPlayersCount === 'object') {
		return;
	}

	if (data.maxPlayersCount && typeof data.maxPlayersCount === 'object') {
		return;
	}

	let a;
	let playerCounts = [];

	if (data && data.excludedPlayerCount && !Array.isArray(data.excludedPlayerCount)) {
		return;
	}

	for (a = Math.max(data.minPlayersCount ?? 0, 5); a <= Math.min(10, data.maxPlayersCount ?? 999); a++) {
		// note: server expects excludedPlayerCounts (plural)
		if (Array.isArray(data?.excludedPlayerCounts)) {
			if (!data.excludedPlayerCounts.includes(a)) playerCounts.push(a);
		} else {
			playerCounts.push(a);
		}
	}

	if (playerCounts.length === 0) {
		// Someone is messing with the data, ignore it
		return;
	}

	const excludes = [];
	for (a = playerCounts[0]; a <= playerCounts[playerCounts.length - 1]; a++) {
		if (!playerCounts.includes(a)) excludes.push(a);
	}

	if (!data.gameName || data.gameName.length > 20 || !LEGALCHARACTERS(data.gameName)) {
		// Should be enforced on the client. Copy-pasting characters can get past the LEGALCHARACTERS client check.
		return;
	}

	if (data?.eloSliderValue) {
		if (user?.eloSeason < data?.eloSliderValue || user?.eloOverall < data?.eloSliderValue) {
			return;
		}

		data.eloSliderValue = parseInt(data.eloSliderValue);
		if (isNaN(data.eloSliderValue)) {
			return;
		}
	}

	if (data?.xpSliderValue) {
		if (typeof data.xpSliderValue !== 'string') {
			return;
		}

		if (user.xpOverall < data.xpSliderValue) {
			return;
		}

		data.xpSliderValue = parseInt(data.xpSliderValue);
		if (isNaN(data.xpSliderValue)) {
			return;
		}
	}

	if (data?.customGameSettings && data.customGameSettings.enabled) {
		// Strict shape & numeric guards for custom settings
		const s = data.customGameSettings;
		if (!s || typeof s !== 'object') return;
		if (!s.deckState || !s.trackState || typeof s.deckState !== 'object' || typeof s.trackState !== 'object') return;

		const num = v => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);

		// NOTE: fix a typo guard from earlier: 'fax' -> 'fas'
		if (s.deckState.fax != null && s.deckState.fas == null) s.deckState.fas = s.deckState.fax;

		s.deckState.lib = num(s.deckState.lib);
		s.deckState.fas = num(s.deckState.fas);
		s.trackState.lib = num(s.trackState.lib);
		s.trackState.fas = num(s.trackState.fas);
		s.fascistCount = num(s.fascistCount);
		s.hitlerZone = num(s.hitlerZone);
		s.vetoZone = num(s.vetoZone);

		if (
			!Number.isInteger(s.deckState.lib) ||
			!Number.isInteger(s.deckState.fas) ||
			!Number.isInteger(s.trackState.lib) ||
			!Number.isInteger(s.trackState.fas) ||
			!Number.isInteger(s.fascistCount) ||
			!Number.isInteger(s.hitlerZone) ||
			!Number.isInteger(s.vetoZone)
		)
			return;

		if (!data.customGameSettings.deckState || !data.customGameSettings.trackState) return;

		const validPowers = ['investigate', 'deckpeek', 'election', 'bullet', 'reverseinv', 'peekdrop'];
		if (!data.customGameSettings.powers || data.customGameSettings.powers.length != 5) return;
		for (let a = 0; a < 5; a++) {
			if (data.customGameSettings.powers[a] == '' || data.customGameSettings.powers[a] == 'null') data.customGameSettings.powers[a] = null;
			else if (data.customGameSettings.powers[a] && !validPowers.includes(data.customGameSettings.powers[a])) return;
		}

		if (typeof data.customGameSettings.hitlerZone === 'object' || !(data.customGameSettings.hitlerZone >= 1) || data.customGameSettings.hitlerZone > 5) return;
		if (
			!data.customGameSettings.vetoZone ||
			typeof data.customGameSettings.vetoZone === 'object' ||
			typeof data.customGameSettings.trackState.fas === 'object' ||
			data.customGameSettings.vetoZone <= data.customGameSettings.trackState.fas ||
			data.customGameSettings.vetoZone > 5
		) {
			return;
		}

		// Ensure that there is never a fas majority at the start.
		// Custom games should probably require a fixed player count, which will be in playerCounts[0] regardless.

		if (typeof data.customGameSettings.fascistCount === 'object') {
			return;
		}

		if (!(data.customGameSettings.fascistCount >= 1) || data.customGameSettings.fascistCount + 1 > playerCounts[0] / 2) return;
		if (
			typeof data.customGameSettings.trackState.lib === 'object' ||
			typeof data.customGameSettings.trackState.fas === 'object' ||
			typeof data.customGameSettings.deckState.lib === 'object' ||
			typeof data.customGameSettings.deckState.fax === 'object'
		) {
			return;
		}

		// Hard guard against object injection messing with numeric comparisons
		const { deckState, trackState } = data.customGameSettings;
		if (typeof deckState.lib !== 'number' || typeof deckState.fas !== 'number' || typeof trackState.lib !== 'number' || typeof trackState.fas !== 'number') {
			return;
		}

		// Ensure standard victory conditions can be met for both teams.
		if (!(data.customGameSettings.deckState.lib >= 5) || data.customGameSettings.deckState.lib > 8) return;
		if (!(data.customGameSettings.deckState.fas >= 5) || data.customGameSettings.deckState.fas > 19) return;

		// Roundabout way of checking for null/undefined but not 0.
		if (!(data.customGameSettings.trackState.lib >= 0) || data.customGameSettings.trackState.lib > 4) return;
		if (!(data.customGameSettings.trackState.fas >= 0) || data.customGameSettings.trackState.fas > 5) return;

		// Need at least 13 cards (11 on track plus two left-overs) to ensure that the deck does not run out.
		if (data.customGameSettings.deckState.lib + data.customGameSettings.deckState.fas < 13) return;

		if (
			!(data.customGameSettings.trackState.lib >= 0) ||
			data.customGameSettings.trackState.lib > 4 ||
			!(data.customGameSettings.trackState.fas >= 0) ||
			data.customGameSettings.trackState.fas > 5
		) {
			return;
		}

		data.casualGame = true; // Force this on if everything looks ok.
		playerCounts = [playerCounts[0]]; // Lock the game to a specific player count. Eventually there should be one set of settings per size.
	} else {
		data.customGameSettings = {
			enabled: false
		};
	}

	let uid = generateCombination(3, '', true);
	while (true) {
		const foundGame = await Game.findOne({ uid });
		if (foundGame) uid = generateCombination(3, '', true);
		else break;
	}

	if (typeof data.noTopdecking === 'object') {
		return;
	}

	const customGame = data.customGameSettings?.enabled; // ranked in order of precedent, higher up is the game mode if two are (somehow) selected
	const casualGame =
		(data.casualGame || (typeof data.timedMode === 'number' && data.timedMode < 30)
			? true
			: data.gameType === 'casual' || data.avalonSH || data.withPercival || data.monarchistSH || data.noTopdecking > 0) && !customGame;
	const practiceGame =
		!(typeof data.timedMode === 'number' && data.timedMode < 30) &&
		(data.gameType === 'practice' || data.playerChats === 'disabled') &&
		!casualGame &&
		!customGame;

	const newGame = {
		gameState: {
			previousElectedGovernment: [],
			undrawnPolicyCount: 17,
			discardedPolicyCount: 0,
			presidentIndex: -1
		},
		chats: [],
		general: {
			whitelistedPlayers: [],
			uid: data.isTourny ? `${generateCombination(3, '', true)}Tournament` : uid,
			name: user.isPrivate ? 'Private Game' : data.gameName ? data.gameName : 'New Game',
			flag: data.flag || 'none', // TODO: verify that the flag exists, or that an invalid flag does not cause issues
			minPlayersCount: playerCounts[0],
			excludedPlayerCount: excludes,
			maxPlayersCount: playerCounts[playerCounts.length - 1],
			status: `Waiting for ${playerCounts[0] - 1} more players..`,
			experiencedMode: data.experiencedMode,
			playerChats:
				data.playerChats === 'emotes' && ['casual', 'practice'].includes(data.gameType)
					? 'emotes'
					: data.playerChats === 'emotes'
					? 'enabled'
					: data.playerChats,
			isVerifiedOnly: data.isVerifiedOnly,
			disableObserverLobby: data.disableObserverLobby,
			disableObserver: data.disableObserverLobby || (data.disableObserver && !data.isTourny),
			isTourny: false,
			lastModPing: 0,
			chatReplTime: Array(chatReplacements.length + 1).fill(0),
			disableGamechat: data.disableGamechat,
			rainbowgame: user.isRainbowOverall ? data.rainbowgame : false,
			blindMode: data.blindMode,
			timedMode: typeof data.timedMode === 'number' && data.timedMode >= 2 && data.timedMode <= 6000 ? data.timedMode : false,
			flappyMode: data.flappyMode,
			flappyOnlyMode: data.flappyMode && data.flappyOnlyMode,
			casualGame,
			practiceGame,
			rebalance6p: data.rebalance6p,
			rebalance7p: data.rebalance7p,
			rebalance9p2f: data.rebalance9p2f,
			unlistedGame: data.unlistedGame && !data.privatePassword,
			private: user.isPrivate ? (data.privatePassword ? data.privatePassword : 'private') : !data.unlistedGame && data.privatePassword,
			privateAnonymousRemakes: data.privateAnonymousRemakes,
			privateOnly: user.isPrivate,
			electionCount: 0,
			isRemade: false,
			eloMinimum: data.eloSliderValue,
			xpMinimum: data.xpSliderValue,
			avalonSH: data.avalonSH ? { withPercival: Boolean(data.withPercival) } : null,
			monarchistSH: Boolean(data.monarchistSH),
			noTopdecking: data.noTopdecking
		},
		customGameSettings: data.customGameSettings,
		publicPlayersState: [],
		playersState: [],
		cardFlingerState: [],
		trackState: {
			liberalPolicyCount: 0,
			fascistPolicyCount: 0,
			electionTrackerCount: 0,
			enactedPolicies: [],
			consecutiveTopdecks: 0
		},
		guesses: {},
		merlinGuesses: {}
	};

	// oops its a hack
	if (newGame.general.practiceGame && newGame.general.casualGame) {
		newGame.general.practiceGame = false;
	}

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

	if (data.isTourny) {
		newGame.general.tournyInfo = {
			round: 0,
			queuedPlayers: [
				{
					userName: user.userName,
					customCardback: user.customCardback,
					customCardbackUid: user.customCardbackUid,
					tournyWins: user.tournyWins,
					connected: true,
					cardStatus: {
						cardDisplayed: false,
						isFlipped: false,
						cardFront: 'secretrole',
						cardBack: {}
					}
				}
			]
		};
	} else {
		newGame.publicPlayersState = [
			{
				userName: user.userName,
				customCardback: user.customCardback,
				customCardbackUid: user.customCardbackUid,
				previousSeasonAward: user.previousSeasonAward,
				specialTournamentStatus: user.specialTournamentStatus,
				tournyWins: user.tournyWins,
				connected: true,
				isPrivate: user.isPrivate,
				cardStatus: {
					cardDisplayed: false,
					isFlipped: false,
					cardFront: 'secretrole',
					cardBack: {}
				}
			}
		];
	}

	if (data.isTourny) {
		const { minPlayersCount } = newGame.general;

		newGame.general.minPlayersCount = newGame.general.maxPlayersCount = minPlayersCount === 1 ? 14 : minPlayersCount === 2 ? 16 : 18;
		newGame.general.status = `Waiting for ${newGame.general.minPlayersCount - 1} more players..`;
		newGame.chats.push({
			timestamp: new Date(),
			gameChat: true,
			chat: [
				{
					text: `${user.userName}`,
					type: 'player'
				},
				{
					text: ` (${data.general.tournyInfo.queuedPlayers.length}/${data.general.maxPlayersCount}) has entered the tournament queue.`
				}
			]
		});
	}

	user.timeLastGameCreated = currentTime;
	Account.findOne({ username: user.userName }).then(account => {
		newGame.private = {
			reports: {},
			unSeatedGameChats: [],
			commandChats: {},
			replayGameChats: [],
			lock: {},
			votesPeeked: false,
			remakeVotesPeeked: false,
			invIndex: -1,
			hiddenInfoChat: [],
			hiddenInfoSubscriptions: [],
			hiddenInfoShouldNotify: true,
			gameCreatorName: user.userName,
			gameCreatorBlacklist: user.blacklist
		};

		if (newGame.general.private) {
			newGame.private.privatePassword = newGame.general.private;
			newGame.general.private = true;
		}

		newGame.general.timeCreated = currentTime;
		updateUserStatus(passport, newGame);
		games[newGame.general.uid] = newGame;
		sendGameList();
		if (!newGame.general.unlistedGame) {
			io.sockets.emit('newGameAdded', {
				priv: newGame.general.private,
				pub: !newGame.general.private,
				timedMode: newGame.general.timedMode,
				rainbow: newGame.general.rainbowgame,
				standard: !newGame.general.rainbowgame,
				customgame: newGame.customGameSettings.enabled,
				casualgame: newGame.general.casualGame,
				creator: account.username
			});
		}
		socket.join(newGame.general.uid);
		socket.emit('updateSeatForUser');
		const cloneNewGame = Object.assign({}, newGame);
		delete cloneNewGame.private;
		socket.emit('gameUpdate', cloneNewGame);
		socket.emit('joinGameRedirect', newGame.general.uid);
	});
};

/**
 * @param {object} passport - socket authentication.
 * @param {object} game - target game.
 * @param {object} data - from socket emit.
 */
module.exports.handleUpdateWhitelist = (passport, game, data) => {
	const isPrivateSafe =
		!game.general.private ||
		(game.general.private && (data.password === game.private.privatePassword || game.general.whitelistedPlayers.includes(passport.user)));

	// Only update the whitelist if whitelistsed, has password, or is the creator
	if (isPrivateSafe || game.private.gameCreatorName === passport.user) {
		game.general.whitelistedPlayers = data.whitelistPlayers;
		io.in(data.uid).emit('gameUpdate', secureGame(game));
	}
};
