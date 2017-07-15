module.exports.games = [];
module.exports.userList = [];
module.exports.generalChats = [];

// set of profiles, no duplicate usernames
module.exports.profiles = (() => {
	const
		profiles = [],
		MAX_SIZE = 100,

		get = username => (
			profiles.find(p => p._id === username)
		),

		remove = username => {
			const i = profiles.findIndex(p => p._id === username);
			if (i > -1) return profiles.splice(i, 1)[0];
		},

		push = profile => {
			if (!profile) return profile;
			remove(profile._id);
			profiles.unshift(profile);
			profiles.splice(MAX_SIZE);
			return profile;
		};

	return { get, push };
})();