const Account = require('../../models/account');
const moment = require('moment');

const gameTypeCount = 500;

const ELO_BADGES = [
	// ELO to badge
	[1800, 'elo1800'],
	[1900, 'elo1900'],
	[2000, 'elo2000'],
	[2100, 'elo2100'],
	[2200, 'elo2200'],
	[2300, 'elo2300']
];

const XP_BADGES = [
	// XP to badge
	[50, 'xp50'],
	[100, 'xp100'],
	[500, 'xp500'],
	[1000, 'xp1000'],
	[2500, 'xp2500'],
	[5000, 'xp5000'],
	[7500, 'xp7500'],
	[10000, 'xp10000'],
	[15000, 'xp15000']
];

const ACCOUNT_AGE_BADGES = [
	// Account age (in years) to badge
	[1, 'birthday1'],
	[2, 'birthday2'],
	[3, 'birthday3'],
	[4, 'birthday4'],
	[5, 'birthday5']
];

const GAMES_PLAYED_BADGES = [
	// number of ranked + practice games played
	[100, 'games100'],
	[200, 'games200'],
	[500, 'games500'],
	[1000, 'games1000'],
	[2000, 'games2000'],
	[3000, 'games3000'],
	[5000, 'games5000']
];

const GAMES_WON_BADGES = [
	// number of ranked + practice games won
	[100, 'won100'],
	[200, 'won200'],
	[500, 'won500'],
	[1000, 'won1000'],
	[2000, 'won2000']
];

const CUSTOM_GAME_BADGES = [
	// Number of custom games played to badge
	[gameTypeCount, 'customPlayer'],
	[2 * gameTypeCount, 'customPro']
];

const SILENT_GAME_BADGES = [
	// Number of silent games played to badge
	[gameTypeCount, 'silentPlayer'],
	[2 * gameTypeCount, 'silentPro']
];

const EMOTE_GAME_BADGES = [
	// Number of emote games played to badge
	[gameTypeCount, 'emotePlayer'],
	[2 * gameTypeCount, 'emotePro']
];

/**
 * Award a badge to a user (by object)
 *
 * @param {*} user
 * @param {*} badgeId
 * @param {*} badgeText
 * @param {*} badgeTitle
 */
module.exports.awardBadgePrequeried = awardBadgePrequeried = (user, badgeId, badgeText, badgeTitle) => {
	if (user.badges.filter(badge => badge.id === badgeId).length === 0) {
		user.badges.push({
			id: badgeId,
			text: badgeText,
			title: badgeTitle,
			dateAwarded: new Date()
		});
		user.gameSettings.hasUnseenBadge = true;
	}
};

module.exports.removeBadge = (user, badgeId) => {
	user.badges.splice(
		user.badges.findIndex(x => x.id === badgeId),
		1
	);
};

/**
 * Award a badge to a user (by username)
 *
 * @param {*} username
 * @param {*} badgeId
 * @param {*} badgeText
 * @param {*} badgeTitle
 */
module.exports.awardBadge = (username, badgeId, badgeText, badgeTitle) => {
	Account.findOne({ username }).then(user => {
		awardBadgePrequeried(user, badgeId, badgeText, badgeTitle);
	});
};

/**
 * Checks the user for all deserved ELO badges
 *
 * @param {*} user user object
 * @param {*} gameJustPlayed the UID of the game this user just played, if this is being called in end-game
 */
module.exports.checkBadgesELO = (user, gameJustPlayed = '') => {
	if (!user.eloOverall) {
		return;
	}

	for (const badge of ELO_BADGES) {
		const [elo, badgeId] = badge;

		if (user.eloOverall >= elo) {
			awardBadgePrequeried(user, badgeId, gameJustPlayed ? `You reached ${elo} ELO in the game ${gameJustPlayed}.` : ``, `You reached ${elo} ELO!`);
		}
	}
};

/**
 * Checks the user for all deserved XP badges
 *
 * @param {*} user user object
 * @param {*} gameJustPlayed the UID of the game this user just played, if this is being called in end-game
 */
module.exports.checkBadgesXP = (user, gameJustPlayed = '') => {
	if (!user.xpOverall) {
		return;
	}

	for (const badge of XP_BADGES) {
		const [xp, badgeId] = badge;

		if (user.xpOverall >= xp) {
			awardBadgePrequeried(user, badgeId, gameJustPlayed ? `You reached ${xp} XP in the game ${gameJustPlayed}.` : ``, `You reached ${xp} XP!`);
		}
	}
};

/**
 * Checks the user for all deserved account age or other status badges
 *
 * @param {*} user user object
 * @param {*} save save the user afterwards?
 */
module.exports.checkBadgesAccount = (user, save = false) => {
	if (!user.created) {
		return;
	}

	for (const badge of ACCOUNT_AGE_BADGES) {
		const [years, badgeId] = badge;

		if (
			user.created <=
			moment()
				.utc()
				.subtract(years, 'years')
				.toDate()
		) {
			awardBadgePrequeried(
				user,
				badgeId,
				`Your account is now ${years} year${years === 1 ? '' : 's'} old!`,
				`Happy ${years}${years === 1 ? 'st' : years === 2 ? 'nd' : years === 3 ? 'rd' : 'th'} birthday!`
			);
		}
	}

	if (user.isContributor) {
		awardBadgePrequeried(user, 'contributor', 'Thank you for your contributions!', 'You contributed to the site!');
	}

	if (user.staffRole === 'veteran') {
		awardBadgePrequeried(user, 'veteran', 'Thank you for your service to the site!', 'You retired from AEM.');
	}

	if (user.staffRole === 'moderator') {
		awardBadgePrequeried(user, 'moderator', 'Thank you for your service to the site!', 'You are a Moderator!');
	}

	if (user.staffRole === 'editor') {
		awardBadgePrequeried(user, 'editor', 'Thank you for your service to the site!', 'You are an Editor!');
	}

	if (user.staffRole === 'admin') {
		awardBadgePrequeried(user, 'admin', 'Thank you for your service to the site!', 'You are an Admin!');
	}

	if (save) user.save();
};

/**
 * Checks the user for all deserved gameplay badges
 *
 * @param {*} user user object
 * @param {*} rankedOrPracticeGamesPlayed
 * @param {*} rankedOrPracticeGamesWon
 * @param {*} customGamesPlayed
 * @param {*} silentGamesPlayed
 * @param {*} emoteGamesPlayed
 * @param {*} gameJustPlayed the UID of the game this user just played, if this is being called in end-game
 */
module.exports.checkBadgesGamesPlayed = (
	user,
	rankedOrPracticeGamesPlayed,
	rankedOrPracticeGamesWon,
	customGamesPlayed,
	silentGamesPlayed,
	emoteGamesPlayed,
	gameJustPlayed = ''
) => {
	for (const badge of GAMES_PLAYED_BADGES) {
		const [gamesPlayed, badgeId] = badge;

		if (rankedOrPracticeGamesPlayed >= gamesPlayed) {
			awardBadgePrequeried(
				user,
				badgeId,
				gameJustPlayed ? `You reached ${gamesPlayed} games played in the game ${gameJustPlayed}.` : ``,
				`You reached ${gamesPlayed} games played!`
			);
		}
	}

	for (const badge of GAMES_WON_BADGES) {
		const [gamesPlayed, badgeId] = badge;

		if (rankedOrPracticeGamesWon >= gamesPlayed) {
			awardBadgePrequeried(
				user,
				badgeId,
				gameJustPlayed ? `You reached ${gamesPlayed} games won in the game ${gameJustPlayed}.` : ``,
				`You reached ${gamesPlayed} games won!`
			);
		}
	}

	for (const badge of CUSTOM_GAME_BADGES) {
		const [gamesPlayed, badgeId] = badge;

		if (customGamesPlayed >= gamesPlayed) {
			awardBadgePrequeried(
				user,
				badgeId,
				gameJustPlayed ? `You reached ${gamesPlayed} custom games played in the game ${gameJustPlayed}.` : ``,
				`You reached ${gamesPlayed} custom games played!`
			);
		}
	}

	for (const badge of SILENT_GAME_BADGES) {
		const [gamesPlayed, badgeId] = badge;

		if (silentGamesPlayed >= gamesPlayed) {
			awardBadgePrequeried(
				user,
				badgeId,
				gameJustPlayed ? `You reached ${gamesPlayed} silent games played in the game ${gameJustPlayed}.` : ``,
				`You reached ${gamesPlayed} silent games played!`
			);
		}
	}

	for (const badge of EMOTE_GAME_BADGES) {
		const [gamesPlayed, badgeId] = badge;

		if (emoteGamesPlayed >= gamesPlayed) {
			awardBadgePrequeried(
				user,
				badgeId,
				gameJustPlayed ? `You reached ${gamesPlayed} emote games played in the game ${gameJustPlayed}.` : ``,
				`You reached ${gamesPlayed} emote games played!`
			);
		}
	}
};
