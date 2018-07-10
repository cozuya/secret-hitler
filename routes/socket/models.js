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
module.exports.newStaff = {
	modUserNames: [],
	editorUserNames: []
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
	return module.exports.userList.map(user => ({
		userName: user.userName,
		wins: user.wins,
		losses: user.losses,
		rainbowWins: user.rainbowWins,
		rainbowLosses: user.rainbowLosses,
		isPrivate: user.isPrivate,
		staffDisableVisibleElo: user.staffDisableVisibleElo,
		staffDisableStaffColor: user.staffDisableStaffColor,

		// Tournaments are disabled, no point sending this.
		// tournyWins: user.tournyWins,

		// Blacklists are sent in the sendUserGameSettings event.
		// blacklist: user.blacklist,
		customCardback: user.customCardback,
		customCardbackUid: user.customCardbackUid,
		eloOverall: user.eloOverall ? user.eloOverall.toFixed(0) : null,
		eloSeason: user.eloSeason ? user.eloSeason.toFixed(0) : null,
		status: user.status,
		winsSeason2: user.winsSeason2,
		lossesSeason2: user.lossesSeason2,
		rainbowWinsSeason2: user.rainbowWinsSeason2,
		rainbowLossesSeason2: user.rainbowLossesSeason2,
		winsSeason3: user.winsSeason3,
		lossesSeason3: user.lossesSeason3,
		rainbowWinsSeason3: user.rainbowWinsSeason3,
		rainbowLossesSeason3: user.rainbowLossesSeason3,
		previousSeasonAward: user.previousSeasonAward,
		timeLastGameCreated: user.timeLastGameCreated,
		staffRole: user.staffRole
		// oldData: user
	}));
};

const userListEmitter = {
	state: 1,
	send: false,
	timer: setInterval(() => {
		if (!userListEmitter.send) {
			userListEmitter.state = 9;
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

module.exports.AEM = Account.find({ staffRole: { $exists: true } });
