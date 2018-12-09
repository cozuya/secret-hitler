const { CURRENTSEASONNUMBER } = require('../../src/frontend-scripts/constants');
const Account = require('../../models/account');
const ModAction = require('../../models/modAction');
const BannedIP = require('../../models/bannedIP');

const fs = require('fs');
let emotes = [];
fs.readdirSync('public/images/emotes', { withFileTypes: true }).forEach(file => {
	if (file.name.endsWith('.png')) emotes[emotes.length] = file.name.substring(0, file.name.length - 4);
});

module.exports.emoteList = emotes;

const games = {};
module.exports.games = games;
module.exports.userList = [];
module.exports.generalChats = {
	sticky: '',
	list: []
};
module.exports.accountCreationDisabled = { status: false };
module.exports.ipbansNotEnforced = { status: false };
module.exports.gameCreationDisabled = { status: false };
module.exports.limitNewPlayers = { status: false };
module.exports.newStaff = {
	modUserNames: [],
	editorUserNames: []
};

const staffList = [];
Account.find({ staffRole: { $exists: true } }).then(accounts => {
	accounts.forEach(user => (staffList[user.username] = user.staffRole));
});

module.exports.getPowerFromRole = role => {
	if (role === 'admin') return 3;
	if (role === 'editor') return 2;
	if (role === 'moderator') return 1;
	if (role === 'altmod') return 0; // Report AEM delays will check for >= 0
	if (role === 'contributor') return -1;
	return -1;
};

module.exports.getPowerFromName = name => {
	if (module.exports.newStaff.editorUserNames.includes(name)) return getPowerFromRole('editor');
	if (module.exports.newStaff.modUserNames.includes(name)) return getPowerFromRole('moderator');

	const user = module.exports.userList.find(user => user.userName === name);
	if (user) return getPowerFromRole(user.staffRole);
	else if (staffList[name]) return getPowerFromRole(staffList[name]);
	else return -1;
};

module.exports.getPowerFromUser = user => {
	if (module.exports.newStaff.editorUserNames.includes(user.userName)) return getPowerFromRole('editor');
	if (module.exports.newStaff.modUserNames.includes(user.userName)) return getPowerFromRole('moderator');
	return getPowerFromRole(user.staffRole);
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
		winsSeason: prune(user[`winsSeason${CURRENTSEASONNUMBER}`]),
		lossesSeason: prune(user[`lossesSeason${CURRENTSEASONNUMBER}`]),
		rainbowWinsSeason: prune(user[`rainbowWinsSeason${CURRENTSEASONNUMBER}`]),
		rainbowLossesSeason: prune(user[`rainbowLossesSeason${CURRENTSEASONNUMBER}`]),
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
	return Object.keys(module.exports.games).map(gameName => ({
		name: games[gameName].general.name,
		flag: games[gameName].general.flag,
		userNames: games[gameName].publicPlayersState.map(val => val.userName),
		customCardback: games[gameName].publicPlayersState.map(val => val.customCardback),
		customCardbackUid: games[gameName].publicPlayersState.map(val => val.customCardbackUid),
		gameStatus: games[gameName].gameState.isCompleted
			? games[gameName].gameState.isCompleted
			: games[gameName].gameState.isTracksFlipped
				? 'isStarted'
				: 'notStarted',
		seatedCount: games[gameName].publicPlayersState.length,
		gameCreatorName: games[gameName].general.gameCreatorName,
		minPlayersCount: games[gameName].general.minPlayersCount,
		maxPlayersCount: games[gameName].general.maxPlayersCount || games[gameName].general.minPlayersCount,
		excludedPlayerCount: games[gameName].general.excludedPlayerCount,
		casualGame: games[gameName].general.casualGame || undefined,
		eloMinimum: games[gameName].general.eloMinimum || undefined,
		isVerifiedOnly: games[gameName].general.isVerifiedOnly || undefined,
		isTourny: games[gameName].general.isTourny || undefined,
		timedMode: games[gameName].general.timedMode || undefined,
		tournyStatus: (() => {
			if (games[gameName].general.isTourny) {
				if (games[gameName].general.tournyInfo.queuedPlayers && games[gameName].general.tournyInfo.queuedPlayers.length) {
					return {
						queuedPlayers: games[gameName].general.tournyInfo.queuedPlayers.length
					};
				}
			}
			return undefined;
		})(),
		experiencedMode: games[gameName].general.experiencedMode || undefined,
		disableChat: games[gameName].general.disableChat || undefined,
		disableGamechat: games[gameName].general.disableGamechat || undefined,
		blindMode: games[gameName].general.blindMode || undefined,
		enactedLiberalPolicyCount: games[gameName].trackState.liberalPolicyCount,
		enactedFascistPolicyCount: games[gameName].trackState.fascistPolicyCount,
		electionCount: games[gameName].general.electionCount,
		rebalance6p: games[gameName].general.rebalance6p || undefined,
		rebalance7p: games[gameName].general.rebalance7p || undefined,
		rebalance9p: games[gameName].general.rerebalance9p || undefined,
		privateOnly: games[gameName].general.privateOnly || undefined,
		private: games[gameName].general.private || undefined,
		uid: games[gameName].general.uid,
		rainbowgame: games[gameName].general.rainbowgame || undefined,
		isCustomGame: games[gameName].customGameSettings.enabled
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

const bypassKeys = [];

module.exports.verifyBypass = key => {
	return bypassKeys.indexOf(key) >= 0;
};

module.exports.consumeBypass = (key, user, ip) => {
	const idx = bypassKeys.indexOf(key);
	if (idx >= 0) {
		bypassKeys.splice(idx, 1);
		new ModAction({
			date: new Date(),
			modUserName: '',
			userActedOn: user,
			modNotes: `Bypass key used: ${key}`,
			ip: ip,
			actionTaken: 'bypassKeyUsed'
		}).save();
	}
};

module.exports.createNewBypass = () => {
	let key;
	do {
		key = `${Math.random()
			.toString(36)
			.substring(2)}${Math.random()
			.toString(36)
			.substring(2)}`.trim();
	} while (bypassKeys.indexOf(key) >= 0);
	bypassKeys.push(key);
	return key;
};

let banCache = null;
setInterval(() => {
	// Fetches the list of banned IPs every 5 seconds, to prevent hammering the DB on restarts as people log in.
	BannedIP.find({}, (err, ips) => {
		if (err) console.log(err);
		else banCache = ips;
	});
}, 5000);
// There's a mountain of "new" type bans.
const unbanTime = new Date() - 64800000;
BannedIP.deleteMany({ type: 'new', bannedDate: { $lte: unbanTime } }, (err, r) => {
	if (err) throw err;
	BannedIP.find({}, (err, ips) => {
		if (err) throw err;
		banCache = ips;
	});
});
const banLength = {
	small: 18 * 60 * 60 * 1000, // 18 hours
	new: 18 * 60 * 60 * 1000, // 18 hours
	tiny: 1 * 60 * 60 * 1000, // 1 hour
	big: 7 * 24 * 60 * 60 * 1000 // 7 days
};
module.exports.testIP = (IP, callback) => {
	if (!IP) callback('Bad IP!');
	else if (!banCache || !banCache.filter) callback('nocache');
	else {
		const ips = banCache.filter(i => i.ip == IP);
		let date;
		let unbannedTime;
		const ip = ips[ips.length - 1];

		if (ip) {
			date = new Date().getTime();
			unbannedTime = ip.bannedDate.getTime() + (banLength[ip.type] || banLength.big);
		}

		if (ip && unbannedTime > date && !module.exports.ipbansNotEnforced.status && process.env.NODE_ENV === 'production') {
			callback(ip.type);
		} else {
			callback(null);
		}
	}
};
