const { CURRENTSEASONNUMBER } = require('../../src/frontend-scripts/constants');

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

const userListEmitter = {
	state: 1,
	send: false,
	timer: setInterval(() => {
		if (userListEmitter.state > 0) userListEmitter.state--;
		else if (userListEmitter.send) {
			userListEmitter.send = false;
			userListEmitter.state = 9;
			io.sockets.emit('userList', {
				list: module.exports.userList
			});
		}
	}, 100)
};

module.exports.userListEmitter = userListEmitter;
