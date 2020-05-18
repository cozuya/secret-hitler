const { promisify } = require('util');
const redis = require('redis');

const { CURRENTSEASONNUMBER } = require('../../src/frontend-scripts/node-constants');
const Account = require('../../models/account');
const ModAction = require('../../models/modAction');
const BannedIP = require('../../models/bannedIP');

const games = redis.createClient({
	db: 1,
	prefix: 'game-',
});

module.exports.getGamesAsync = promisify(games.get).bind(games);
const setGame = promisify(games.set).bind(games);
const setGameAsync = (game) => game && typeof game === 'object' && setGame(game.general.uid, JSON.stringify(game));
module.exports.setGameAsync = setGameAsync;
const deleteGame = promisify(games.del).bind(games);
const deleteGameAsync = (uid) => {
	io.in(uid).clients((err, clients) => {
		if (err) {
			console.log(err, 'err in deletegame');
			return;
		}

		clients.forEach((client) => {
			io.of('/').adapter.remoteJoin(client, 'sidebarInfoSubscription');
			io.of('/').adapter.remoteJoin(client, 'gameListInfoSubscription');
			io.of('/').adapter.remoteLeave(client, uid);
		});
	});

	return deleteGame(uid);
};
module.exports.deleteGameAsync = deleteGameAsync;
module.exports.scanGamesAsync = promisify(games.scan).bind(games);
module.exports.pushGameChatsAsync = (game, chat) => {
	game.chats.push(chat);

	return setGameAsync(game);
};

// const gameChats = redis.createClient({
// 	db: 2,
// });

// module.exports.getRangeGameChatsAsync = promisify(gameChats.lrange).bind(gameChats);
// module.exports.deleteGameChatsAsync = promisify(gameChats.del).bind(gameChats);
// const pushGameChats = promisify(gameChats.rpush).bind(gameChats);
// module.exports.pushGameChatAsync = (uid, chat) => pushGameChats(uid, JSON.stringify(chat));

const userList = redis.createClient({
	db: 3,
});

const getRangeUserlistAsync = promisify(userList.lrange).bind(userList);
module.exports.getRangeUserlistAsync = getRangeUserlistAsync;
module.exports.setUserInListAsync = promisify(userList.lset).bind(userList);
module.exports.setNewUserInListAsync = promisify(userList.rpush).bind(userList);
module.exports.pushUserlistAsync = promisify(userList.rpush).bind(userList);
module.exports.spliceUserFromUserList = async (userName) => {
	const list = await getRangeUserlistAsync('userList', 0, -1);
	const userL = list.map(JSON.parse);
	const userInList = userL.find((user) => user.userName === userName);

	if (userInList) {
		await userList.lrem('userList', 0, JSON.stringify(userInList));
	}
};

const generalChats = redis.createClient({
	db: 4,
});

module.exports.getGeneralChatsAsync = promisify(generalChats.get).bind(generalChats);
module.exports.getRangeGeneralChatsAsync = promisify(generalChats.lrange).bind(generalChats);
module.exports.setGeneralChatsAsync = promisify(generalChats.set).bind(generalChats); // set sticky
module.exports.pushGeneralChatsAsync = promisify(generalChats.lpush).bind(generalChats);
module.exports.trimGeneralChatsAsync = promisify(generalChats.ltrim).bind(generalChats);

const serverSettings = redis.createClient({
	db: 5,
});

const getServerSettingAsync = promisify(serverSettings.get).bind(serverSettings);

module.exports.getServerSettingAsync = getServerSettingAsync;
module.exports.setServerSettingAsync = promisify(serverSettings.set).bind(serverSettings);

// module.exports.accountCreationDisabled = { status: false };
// module.exports.bypassVPNCheck = { status: false };
// module.exports.ipbansNotEnforced = { status: false };
// module.exports.gameCreationDisabled = { status: false };
// module.exports.limitNewPlayers = { status: false };

if (process.env.NODE_ENV === 'development') {
	(async () => {
		await games.flushdb();
		await userList.flushdb();
	})();
}

const fs = require('fs');
const emotes = [];

fs.readdirSync('public/images/emotes', { withFileTypes: true }).forEach((file) => {
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
	[10, 10], // 100
];

const numEmotes = emotes.length;
let sheetSize = [10, 10];
sizeMap.forEach((size) => {
	const space = size[0] * size[1];
	if (space >= numEmotes && space < sheetSize[0] * sheetSize[1]) sheetSize = size;
});

let curCell = 0;

emotes.forEach((emote) => {
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
	contributorUserNames: [],
};

const staffList = [];

Account.find({ staffRole: { $exists: true } }).then((accounts) => {
	accounts.forEach((user) => (staffList[user.username] = user.staffRole));
});

module.exports.getPowerFromRole = (role) => {
	if (role === 'admin') return 3;
	if (role === 'editor') return 2;
	if (role === 'moderator') return 1;
	if (role === 'altmod') return 0; // Report AEM delays will check for >= 0
	if (role === 'trialmod') return 0;
	if (role === 'contributor') return -1;
	return -1;
};

module.exports.getPowerFromName = (name) => {
	if (module.exports.newStaff.editorUserNames.includes(name)) return getPowerFromRole('editor');
	if (module.exports.newStaff.modUserNames.includes(name)) return getPowerFromRole('moderator');
	if (module.exports.newStaff.altmodUserNames.includes(name)) return getPowerFromRole('altmod');
	if (module.exports.newStaff.trialmodUserNames.includes(name)) return getPowerFromRole('trialmod');
	if (module.exports.newStaff.contributorUserNames.includes(name)) return getPowerFromRole('contributor');

	const user = module.exports.userList.find((user) => user.userName === name);
	if (user) return getPowerFromRole(user.staffRole);
	else if (staffList[name]) return getPowerFromRole(staffList[name]);
	else return -1;
};

module.exports.getPowerFromUser = (user) => {
	if (module.exports.newStaff.editorUserNames.includes(user.userName)) return getPowerFromRole('editor');
	if (module.exports.newStaff.modUserNames.includes(user.userName)) return getPowerFromRole('moderator');
	if (module.exports.newStaff.altmodUserNames.includes(user.userName)) return getPowerFromRole('altmod');
	if (module.exports.newStaff.trialmodUserNames.includes(user.userName)) return getPowerFromRole('trialmod');
	if (module.exports.newStaff.contributorUserNames.includes(user.userName)) return getPowerFromRole('contributor');
	return getPowerFromRole(user.staffRole);
};

// set of profiles, no duplicate usernames
module.exports.profiles = (() => {
	const profiles = [];
	const MAX_SIZE = 100;
	const get = (username) => profiles.find((p) => p._id === username);
	const remove = (username) => {
		const i = profiles.findIndex((p) => p._id === username);
		if (i > -1) return profiles.splice(i, 1)[0];
	};
	const push = (profile) => {
		if (!profile) return profile;
		remove(profile._id);
		profiles.unshift(profile);
		profiles.splice(MAX_SIZE);
		return profile;
	};

	return { get, push };
})();

module.exports.AEM = Account.find({ staffRole: { $exists: true, $ne: 'veteran' } });

const bypassKeys = [];

module.exports.verifyBypass = (key) => {
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
			actionTaken: 'bypassKeyUsed',
		}).save();
	}
};

module.exports.createNewBypass = () => {
	let key;
	do {
		key = `${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`.trim();
	} while (bypassKeys.indexOf(key) >= 0);
	bypassKeys.push(key);
	return key;
};

// There's a mountain of "new" type bans.
const unbanTime = new Date() - 64800000;
BannedIP.deleteMany({ type: 'new', bannedDate: { $lte: unbanTime } }, (err, r) => {
	if (err) {
		throw err;
	}
});
const banLength = {
	small: 18 * 60 * 60 * 1000, // 18 hours
	new: 18 * 60 * 60 * 1000, // 18 hours
	tiny: 1 * 60 * 60 * 1000, // 1 hour
	big: 7 * 24 * 60 * 60 * 1000, // 7 days
};
module.exports.testIP = async (IP, callback) => {
	const ipbansNotEnforced = JSON.parse(await getServerSettingAsync('ipbansNotEnforced'));

	if (!IP) {
		callback('Bad IP!');
	} else if (ipbansNotEnforced && ipbansNotEnforced.status) {
		callback(null);
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
