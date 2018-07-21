const { CURRENTSEASONNUMBER } = require('../../src/frontend-scripts/constants');
const Account = require('../../models/account');

module.exports.games = [];
module.exports.userList = [];
module.exports.generalChats = {
	sticky: '',
	list: []
};
module.exports.accountCreationDisabled = { status: false };
module.exports.ipbansNotEnforced = { status: false };
module.exports.gameCreationDisabled = { status: false };
module.exports.currentSeasonNumber = CURRENTSEASONNUMBER;

const AEM_ALTS = ['bell', 'BigbyWolf', 'Picangel', 'birdy', 'Grim', 'TermsOfUse'];

const staffList = [];
Account.find({ staffRole: { $exists: true } }).then(accounts => {
	accounts.forEach(user => (staffList[user.username] = user.staffRole));
});
module.exports.staffList = staffList;

module.exports.getPrefixFromRole = (role, modView) => {
	// Shown almost everywhere
	if (role === 'admin') return '{A}';
	if (role === 'editor') return '{E}';
	if (role === 'moderator') return '{M}';
	if (!modView) return null;

	// Shown in user list in mod view
	if (role === 'altmod') return '{M*}';
	if (role === 'contributor') return '{C*}';
	return null;
};

module.exports.getPowerFromRole = role => {
	if (role === 'admin') return 3;
	if (role === 'editor') return 2;
	if (role === 'moderator') return 1;
	if (role === 'altmod') return 0; // Report AEM delays will check for >= 0
	if (role === 'contributor') return -1;
	return -1;
};

module.exports.getRoleFromName = name => {
	if (AEM_ALTS.includes(name)) return 'altmod';
	const user = module.exports.userList.find(user => user.userName === name);
	if (user) return user.staffRole;
	else return staffList[name];
};

// Convenience function.
module.exports.getPowerFromName = name => {
	return getPowerFromRole(getRoleFromName(name));
};

// set of profiles, no duplicate usernames
/**
 * @return // todo
 */
module.exports.profiles = (() => {
	const profiles = [];
	const MAX_SIZE = 100;
	const get = username => profiles.find(p => p._id === username);
	const remove = username => {
		const i = profiles.findIndex(p => p._id === username);
		if (i > -1) return profiles.splice(i, 1)[0];
	};
	const push = profile => {
		if (!profile) return profile;
		remove(profile._id);
		profiles.unshift(profile);
		profiles.splice(MAX_SIZE);
		return profile;
	};

	return { get, push };
})();

module.exports.formattedUserList = () => {
	const prune = value => {
		// Converts things like zero and null to undefined to remove it from the sent data.
		return value ? value : undefined;
	};

	return module.exports.userList.map(user => ({
		userName: user.userName,
		wins: prune(user.wins),
		losses: prune(user.losses),
		rainbowWins: prune(user.rainbowWins),
		rainbowLosses: prune(user.rainbowLosses),
		isPrivate: prune(user.isPrivate),
		staffDisableVisibleElo: prune(user.staffDisableVisibleElo),
		staffDisableStaffColor: prune(user.staffDisableStaffColor),

		// Tournaments are disabled, no point sending this.
		// tournyWins: user.tournyWins,

		// Blacklists are sent in the sendUserGameSettings event.
		// blacklist: user.blacklist,
		customCardback: user.customCardback,
		customCardbackUid: user.customCardbackUid,
		eloOverall: user.eloOverall ? Math.floor(user.eloOverall) : undefined,
		eloSeason: user.eloSeason ? Math.floor(user.eloSeason) : undefined,
		status: user.status && user.status.type && user.status.type != 'none' ? user.status : undefined,
		winsSeason2: prune(user.winsSeason2),
		lossesSeason2: prune(user.lossesSeason2),
		rainbowWinsSeason2: prune(user.rainbowWinsSeason2),
		rainbowLossesSeason2: prune(user.rainbowLossesSeason2),
		winsSeason3: prune(user.winsSeason3),
		lossesSeason3: prune(user.lossesSeason3),
		rainbowWinsSeason3: prune(user.rainbowWinsSeason3),
		rainbowLossesSeason3: prune(user.rainbowLossesSeason3),
		previousSeasonAward: user.previousSeasonAward,
		timeLastGameCreated: user.timeLastGameCreated,
		staffRole: prune(user.staffRole)
		// oldData: user
	}));
};

const userListEmitter = {
	state: 0,
	send: false,
	timer: setInterval(() => {
		// 0.01s delay per user (1s per 100), always delay
		if (!userListEmitter.send) {
			userListEmitter.state = module.exports.userList.length / 10;
			return;
		}
		if (userListEmitter.state > 0) userListEmitter.state--;
		else {
			userListEmitter.send = false;
			io.sockets.emit('userList', {
				list: module.exports.formattedUserList()
			});
		}
	}, 100)
};

module.exports.userListEmitter = userListEmitter;

module.exports.formattedGameList = () => {
	return module.exports.games.map(game => ({
		name: game.general.name,
		flag: game.general.flag,
		userNames: game.publicPlayersState.map(val => val.userName),
		customCardback: game.publicPlayersState.map(val => val.customCardback),
		customCardbackUid: game.publicPlayersState.map(val => val.customCardbackUid),
		gameStatus: game.gameState.isCompleted ? game.gameState.isCompleted : game.gameState.isTracksFlipped ? 'isStarted' : 'notStarted',
		seatedCount: game.publicPlayersState.length,
		gameCreatorName: game.general.gameCreatorName,
		minPlayersCount: game.general.minPlayersCount,
		maxPlayersCount: game.general.maxPlayersCount || game.general.minPlayersCount,
		excludedPlayerCount: game.general.excludedPlayerCount,
		casualGame: game.general.casualGame || undefined,
		eloMinimum: game.general.eloMinimum || undefined,
		isVerifiedOnly: game.general.isVerifiedOnly || undefined,
		isTourny: game.general.isTourny || undefined,
		timedMode: game.general.timedMode || undefined,
		tournyStatus: (() => {
			if (game.general.isTourny) {
				if (game.general.tournyInfo.queuedPlayers && game.general.tournyInfo.queuedPlayers.length) {
					return {
						queuedPlayers: game.general.tournyInfo.queuedPlayers.length
					};
				}
			}
			return undefined;
		})(),
		experiencedMode: game.general.experiencedMode || undefined,
		disableChat: game.general.disableChat || undefined,
		disableGamechat: game.general.disableGamechat || undefined,
		blindMode: game.general.blindMode || undefined,
		enactedLiberalPolicyCount: game.trackState.liberalPolicyCount,
		enactedFascistPolicyCount: game.trackState.fascistPolicyCount,
		electionCount: game.general.electionCount,
		rebalance6p: game.general.rebalance6p || undefined,
		rebalance7p: game.general.rebalance7p || undefined,
		rebalance9p: game.general.rerebalance9p || undefined,
		privateOnly: game.general.privateOnly || undefined,
		private: game.general.private || undefined,
		uid: game.general.uid,
		rainbowgame: game.general.rainbowgame || undefined
	}));
};

const gameListEmitter = {
	state: 0,
	send: false,
	timer: setInterval(() => {
		// 3 second delay, instant send
		if (gameListEmitter.state > 0) gameListEmitter.state--;
		else {
			if (!gameListEmitter.send) return;
			gameListEmitter.send = false;
			io.sockets.emit('gameList', module.exports.formattedGameList());
			gameListEmitter.state = 30;
		}
	}, 100)
};

module.exports.gameListEmitter = gameListEmitter;

module.exports.AEM = Account.find({ staffRole: { $exists: true } });
