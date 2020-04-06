const { promisify } = require('util');
const redis = require('redis');

const { CURRENTSEASONNUMBER } = require('../../src/frontend-scripts/node-constants');
const Account = require('../../models/account');
const ModAction = require('../../models/modAction');
const BannedIP = require('../../models/bannedIP');

const games = redis.createClient({
	db: 1
});

module.exports.getGamesAsync = promisify(games.get).bind(games);
module.exports.setGameAsync = promisify(games.set).bind(games);
module.exports.deleteGameAsync = promisify(games.del).bind(games);
module.exports.scanGamesAsync = promisify(games.scan).bind(games);

const gameChats = redis.createClient({
	db: 2
});

module.exports.getGameChatsAsync = promisify(gameChats.get).bind(gameChats);
module.exports.setGameChatsAsync = promisify(gameChats.set).bind(gameChats); // shouldn't really ever be used
module.exports.deleteGameChatsAsync = promisify(gameChats.del).bind(gameChats);
module.exports.pushGameChatsAsync = promisify(gameChats.rpush).bind(gameChats);

const userList = redis.createClient({
	db: 3
});

module.exports.getUserlistAsync = promisify(userList.get).bind(userList);
module.exports.setUserlistAsync = promisify(userList.set).bind(userList); // shouldn't really ever be used
module.exports.pushUserlistAsync = promisify(userList.rpush).bind(userList);

// module.exports.userList = [];

const generalChats = redis.createClient({
	db: 4
});

module.exports.getGeneralAsync = promisify(generalChats.get).bind(generalChats);
module.exports.setGeneralAsync = promisify(generalChats.set).bind(generalChats); // shouldn't really ever be used
module.exports.pushGeneralAsync = promisify(generalChats.rpush).bind(generalChats);

const serverSettings = redis.createClient({
	db: 5
});

module.exports.getSettingAsync = promisify(serverSettings.get).bind(serverSettings);
module.exports.setSettingAsync = promisify(serverSettings.set).bind(serverSettings);

// module.exports.accountCreationDisabled = { status: false };
// module.exports.bypassVPNCheck = { status: false };
// module.exports.ipbansNotEnforced = { status: false };
// module.exports.gameCreationDisabled = { status: false };
// module.exports.limitNewPlayers = { status: false };

module.exports.generalChats = generalChats;
// module.exports.generalChats = {
// 	sticky: '',
// 	list: []
// };

const fs = require('fs');
const emotes = [];

fs.readdirSync('public/images/emotes', { withFileTypes: true }).forEach(file => {
	if (file.name.endsWith('.png')) emotes[emotes.length] = [file.name.substring(0, file.name.length - 4), file];
});

// Ordered list of sizes, used for good packing of images with a fixed size.
// It will also not go over 10 in a given dimension (making 10x10 the max), to avoid sizes like 23x1 (resorting 6x4 instead).
// If multiple options exist, it will pick the more square option, and prefers images to be wider instead of taller.
// Sizes below 20 are also not included, as we should always have at least that many emotes.
const sizeMap = [
	[5, 4], // 20
	[6, 4], // 24
	[5, 5], // 25
	[9, 3], // 27
	[7, 4], // 28
	[6, 5], // 30
	[8, 4], // 32
	[7, 5], // 35
	[6, 6], // 36
	[8, 5], // 40
	[7, 6], // 42
	[9, 5], // 45
	[8, 6], // 48
	[10, 5], // 50
	[9, 6], // 54
	[8, 7], // 56
	[10, 6], // 60
	[9, 7], // 63
	[8, 8], // 64
	[10, 7], // 70
	[9, 8], // 72
	[10, 8], // 80
	[9, 9], // 81
	[10, 9], // 90
	[10, 10] // 100
];

const numEmotes = emotes.length;
let sheetSize = [10, 10];
sizeMap.forEach(size => {
	const space = size[0] * size[1];
	if (space >= numEmotes && space < sheetSize[0] * sheetSize[1]) sheetSize = size;
});

let curCell = 0;

emotes.forEach(emote => {
	const thisCell = curCell;
	curCell++;
	const loc = [thisCell % sheetSize[0], Math.floor(thisCell / sheetSize[0])];
	emote[1] = loc;
});

module.exports.emoteList = emotes;

module.exports.newStaff = {
	modUserNames: [],
	editorUserNames: [],
	altmodUserNames: [],
	trialmodUserNames: [],
	contributorUserNames: []
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
	if (role === 'trialmod') return 0;
	if (role === 'contributor') return -1;
	return -1;
};

module.exports.getPowerFromName = name => {
	if (module.exports.newStaff.editorUserNames.includes(name)) return getPowerFromRole('editor');
	if (module.exports.newStaff.modUserNames.includes(name)) return getPowerFromRole('moderator');
	if (module.exports.newStaff.altmodUserNames.includes(name)) return getPowerFromRole('altmod');
	if (module.exports.newStaff.trialmodUserNames.includes(name)) return getPowerFromRole('trialmod');
	if (module.exports.newStaff.contributorUserNames.includes(name)) return getPowerFromRole('contributor');

	const user = module.exports.userList.find(user => user.userName === name);
	if (user) return getPowerFromRole(user.staffRole);
	else if (staffList[name]) return getPowerFromRole(staffList[name]);
	else return -1;
};

module.exports.getPowerFromUser = user => {
	if (module.exports.newStaff.editorUserNames.includes(user.userName)) return getPowerFromRole('editor');
	if (module.exports.newStaff.modUserNames.includes(user.userName)) return getPowerFromRole('moderator');
	if (module.exports.newStaff.altmodUserNames.includes(user.userName)) return getPowerFromRole('altmod');
	if (module.exports.newStaff.trialmodUserNames.includes(user.userName)) return getPowerFromRole('trialmod');
	if (module.exports.newStaff.contributorUserNames.includes(user.userName)) return getPowerFromRole('contributor');
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

// todo
// module.exports.formattedUserList = isAEM => {
// 	const prune = value => {
// 		// Converts things like zero and null to undefined to remove it from the sent data.
// 		return value ? value : undefined;
// 	};

// 	return module.exports.userList
// 		.map(user => ({
// 			userName: user.userName,
// 			wins: prune(user.wins),
// 			losses: prune(user.losses),
// 			rainbowWins: prune(user.rainbowWins),
// 			rainbowLosses: prune(user.rainbowLosses),
// 			isPrivate: prune(user.isPrivate),
// 			staffDisableVisibleElo: prune(user.staffDisableVisibleElo),
// 			staffDisableStaffColor: prune(user.staffDisableStaffColor),

// 			// Tournaments are disabled, no point sending this.
// 			// tournyWins: user.tournyWins,

// 			// Blacklists are sent in the sendUserGameSettings event.
// 			// blacklist: user.blacklist,
// 			customCardback: user.customCardback,
// 			customCardbackUid: user.customCardbackUid,
// 			eloOverall: user.eloOverall ? Math.floor(user.eloOverall) : undefined,
// 			eloSeason: user.eloSeason ? Math.floor(user.eloSeason) : undefined,
// 			status: user.status && user.status.type && user.status.type != 'none' ? user.status : undefined,
// 			winsSeason: prune(user[`winsSeason${CURRENTSEASONNUMBER}`]),
// 			lossesSeason: prune(user[`lossesSeason${CURRENTSEASONNUMBER}`]),
// 			rainbowWinsSeason: prune(user[`rainbowWinsSeason${CURRENTSEASONNUMBER}`]),
// 			rainbowLossesSeason: prune(user[`rainbowLossesSeason${CURRENTSEASONNUMBER}`]),
// 			previousSeasonAward: user.previousSeasonAward,
// 			specialTournamentStatus: user.specialTournamentStatus,
// 			timeLastGameCreated: user.timeLastGameCreated,
// 			staffRole: prune(user.staffRole),
// 			staffIncognito: prune(user.staffIncognito),
// 			isContributor: prune(user.isContributor)
// 			// oldData: user
// 		}))
// 		.filter(user => isAEM || !user.staffIncognito);
// };

// todo
// const userListEmitter = {
// 	state: 0,
// 	send: false,
// 	timer: setInterval(() => {
// 		// 0.01s delay per user (1s per 100), always delay
// 		if (!userListEmitter.send) {
// 			userListEmitter.state = module.exports.userList.length / 10;
// 			return;
// 		}
// 		if (userListEmitter.state > 0) userListEmitter.state--;
// 		else {
// 			userListEmitter.send = false;
// 			io.sockets.emit('fetchUser'); // , {
// 			// 	list: module.exports.formattedUserList()
// 			// });
// 		}
// 	}, 100)
// };

// module.exports.userListEmitter = userListEmitter;

module.exports.AEM = Account.find({ staffRole: { $exists: true, $ne: 'veteran' } });

// todo
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

// There's a mountain of "new" type bans.
const unbanTime = new Date() - 64800000;
BannedIP.deleteMany({ type: 'new', bannedDate: { $lte: unbanTime } }, (err, r) => {
	if (err) throw err;
});
const banLength = {
	small: 18 * 60 * 60 * 1000, // 18 hours
	new: 18 * 60 * 60 * 1000, // 18 hours
	tiny: 1 * 60 * 60 * 1000, // 1 hour
	big: 7 * 24 * 60 * 60 * 1000 // 7 days
};
module.exports.testIP = (IP, callback) => {
	if (!IP) {
		callback('Bad IP!');
		// todo
		// } else if (module.exports.ipbansNotEnforced.status) {
		// 	callback(null);
	} else {
		BannedIP.find({ ip: IP }, (err, ips) => {
			if (err) {
				callback(err);
			} else {
				let date;
				let unbannedTime;
				const ip = ips.sort((a, b) => b.bannedDate - a.bannedDate)[0];

				if (ip) {
					date = Date.now();
					unbannedTime = ip.bannedDate.getTime() + (banLength[ip.type] || banLength.big);
				}

				if (ip && unbannedTime > date) {
					if (process.env.NODE_ENV === 'production') {
						callback(ip.type, unbannedTime);
					} else {
						console.log(`IP ban ignored: ${IP} = ${ip.type}`);
						callback(null);
					}
				} else {
					callback(null);
				}
			}
		});
	}
};
