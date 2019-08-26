const cn = require('classnames');

export const TOU_CHANGES = [
	{
		changeVer: '1.3',
		changeDesc: 'Adds specified punishments for ragequits and multi-accounting/colluding.\nRevises rules regarding sub-optimal play.\nSpecifies rules regarding unfair outside influences on games (blacklist threats, report threats, etc.).\nAdds rules regarding spoilers for TV shows, movies, etc.\nAdds general punishment timeline and protocol.\nAdds AFK policy and its specific punishments.\n'
	},
	{
		changeVer: '1.2',
		changeDesc: 'Terms of Use now states that explicitly forbidden words may result in action without reports.'
	},
	{
		changeVer: '1.1',
		changeDesc:
			'Lying as liberal is allowed if you can prove it helps your team.\nFollowing players to comment on their games or talking about a no-chat game is now explicitly forbidden.\nMinor wording changes to forbidden language and card-backs.'
	},
	{
		changeVer: '1.0',
		changeDesc: 'Terms of Use fully rewritten to be more clear.'
	}
];

export const CURRENTSEASONNUMBER = 7;

const ALPHANUMERIC = [...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'];
const SYMBOLS = [...' -_=+!"£$%^&*()\\/.,<>?#~\'@;:[]{}'];
const LATIN_EXT_A = [...'ĀāĂăĄąĆćĈĉĊċČčĎďĐđĒēĔĕĖėĘęĚěĜĝĞğĠġĢģĤĥĦħĨĩĪīĬĭĮįİıĲĳĴĵĶķĸĹĺĻļĽľĿŀŁłŃńŅņŇňŉŊŋŌōŎŏŐőŒœŔŕŖŗŘřŚśŜŝŞşŠšŢţŤťŦŧŨũŪūŬŭŮůŰűŲųŴŵŶŷŸŹźŻżŽžſ'];

const ALLCHARS = [...ALPHANUMERIC, ...SYMBOLS, ...LATIN_EXT_A];

export const LEGALCHARACTERS = text => {
	const arr = [...text];
	const pass = arr.every(c => ALLCHARS.includes(c));
	return pass;
};

/**
 * @param {object} user - user from userlist.
 * @param {boolean} isSeasonal - whether or not to display seasonal colors.
 * @param {string} defaultClass - the default class
 * @param {boolean} eloDisabled - true if elo is off
 * @return {string} list of classes for colors.
 */
export const PLAYERCOLORS = (user, isSeasonal, defaultClass, eloDisabled) => {
	if (Boolean(user.staffRole && user.staffRole.length && user.staffRole !== 'trialmod' && user.staffRole !== 'altmod') && !user.staffDisableStaffColor) {
		return cn(defaultClass, {
			admin: user.staffRole === 'admin',
			moderatorcolor: user.staffRole === 'moderator',
			editorcolor: user.staffRole === 'editor',
			cbell: user.userName === 'cbell',
			jdudle3: user.userName === 'jdudle3',
			max: user.userName === 'Max',
			thejuststopo: user.userName === 'TheJustStopO',
			moira: user.userName === 'moira'
		});
	} else if (
		user.isContributor &&
		(!(user.staffRole && user.staffRole.length && user.staffRole !== 'trialmod' && user.staffRole !== 'altmod') || user.staffDisableStaffColor)
	) {
		return cn(defaultClass, 'contributor');
	} else {
		const w = isSeasonal ? user.winsSeason : user.wins;
		const l = isSeasonal ? user.lossesSeason : user.losses;
		const elo = isSeasonal ? user.eloSeason : user.eloOverall;
		let grade;
		if (elo < 1500) {
			grade = 0;
		} else if (elo > 2000) {
			grade = 500 / 5;
		} else {
			grade = (elo - 1500) / 5;
		}
		const gradeObj = {};
		gradeObj['elo' + grade.toFixed(0)] = true;

		return w + l >= 50
			? eloDisabled
				? cn(defaultClass, {
					experienced1: w + l > 49,
					experienced2: w + l > 99,
					experienced3: w + l > 199,
					experienced4: w + l > 299,
					experienced5: w + l > 499,
					onfire1: w / (w + l) > 0.52,
					onfire2: w / (w + l) > 0.54,
					onfire3: w / (w + l) > 0.56,
					onfire4: w / (w + l) > 0.58,
					onfire5: w / (w + l) > 0.6,
					onfire6: w / (w + l) > 0.62,
					onfire7: w / (w + l) > 0.64,
					onfire8: w / (w + l) > 0.66,
					onfire9: w / (w + l) > 0.68,
					onfire10: w / (w + l) > 0.7
				})
				: cn(defaultClass, gradeObj)
			: defaultClass;
	}
};

export const getBadWord = text => {
	const badWords = {
		// List of all blacklisted words and their variations.
		nigger: ['nigga', 'nibba', 'nignog', 'n1bba', 'ni99a', 'n199a', 'nignug', 'bigga'],
		kike: ['k1ke', 'kik3', 'k1k3'],
		retard: ['autist', 'libtard', 'retard', 'tard'],
		faggot: ['fag', 'f4gg0t', 'f4ggot', 'fagg0t', 'f4g'],
		mongoloid: ['mong', 'm0ng'],
		cunt: ['kunt'],
		'Nazi Terms': ['1488', '卍', 'swastika']
	};
	const exceptions = [/(i|o)f (a|4) g/gi, /underclaim on gov/gi, /big ga(e|m|y)/gi, /among/gi, /mongodb/gi, /mongolia/gi]; // This list for all exceptions to bypass swear filter
	let foundWord = [null, null]; // Future found bad word, in format of: [blacklisted word, variation]

	// let ec = 0; //for future use in auto reporting
	let exceptedText = text;
	for (let exception of exceptions) {
		while (exceptedText.search(exception) > -1) {
			exceptedText = exceptedText.replace(exception, '');
			// ec++;
		}
	}

	const flatText = exceptedText.replace(/\W/gi, '').toLowerCase();
	Object.keys(badWords).forEach(key => {
		if (flatText.includes(key)) {
			// True if spaceless text contains blacklisted word.
			foundWord = [key, key];
		} else {
			badWords[key].forEach(word => {
				if (flatText.includes(word)) {
					// True if spaceless text contains variation of blacklisted word.
					foundWord = [key, word];
				}
			});
		}
	});

	// This version only detects words if they are whole and have whitespace at either end.
	/* Object.keys(badWords).forEach(key => {
		if (new RegExp(`(^|\\s)${key}s?(\\s|$)`, 'i').test(text.toLowerCase())) {
			foundWord = [key, key];
		}
		else badWords[key].forEach(word => {
			if (new RegExp(`(^|\\s)${word}s?(\\s|$)`, 'i').test(text.toLowerCase())) {
				foundWord = [key, word];
			}
		});
	});*/
	return foundWord;
};
