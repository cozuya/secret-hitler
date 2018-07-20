const data = ['userlist', { list: [] }]; // Paste list here from network monitor
console.log(JSON.stringify(data[1].list).length);

const prune = value => {
	// Converts things like zero and null to undefined to remove it from the sent data.
	return value ? value : undefined;
};

const reduce = list => {
	return JSON.parse(
		JSON.stringify(
			list.map(user => ({
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
			}))
		)
	);
};

const list = reduce(data[1].list);
console.log(JSON.stringify(list).length);

const counts = {};
list.forEach(user => {
	if (user.isPrivate || user.wins + user.losses < 10) {
		Object.keys(user).forEach(key => {
			if (key !== undefined) counts[key] = counts[key] ? counts[key] + 1 : 1;
		});
	}
	//counts[amt] = counts[amt] ? (counts[amt]+1) : 1;
});

Object.keys(counts).forEach(key => console.log(`${key}: ${counts[key]}`));

list.forEach((user, index) => {
	if (user.isPrivate || user.wins + user.losses < 10) {
		if (user.isPrivate) {
			// We REALLY don't care about sending private user data
			list[index] = { userName: user.userName, isPrivate: true, status: user.status };
		} else {
			// Additional pruning - Quite a few users are private or new
			delete user.winsSeason3;
			delete user.lossesSeason3;
			delete user.eloOverall;
			delete user.eloSeason;
		}
	}
});
console.log(JSON.stringify(list).length);
