const cn = require('classnames');

export const TOU_CHANGES = [
	{
		changeVer: '1.4',
		changeDesc:
			'Adds specified punishment template for most rule violations\nUpdates rules regarding spoilers for TV shows, movies etc.\nUpdates rules regarding room titles\nUpdates rules on misclicks\nAll rules are listed in detail in the Terms of Use (linked below)'
	},
	{
		changeVer: '1.3',
		changeDesc:
			'Adds specified punishments for ragequits and multi-accounting/colluding.\nRevises rules regarding sub-optimal play.\nSpecifies rules regarding unfair outside influences on games (blacklist threats, report threats, etc.).\nAdds rules regarding spoilers for TV shows, movies, etc.\nAdds general punishment timeline and protocol.\nAdds AFK policy and its specific punishments.\n'
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
	},
	{
		changeVer: '0.0',
		changeDesc:
			"Play as your role and try to win\nNo unfair influence: don't make promises as one role you wouldn't be able to keep as the other role\nDo not cheat\nNo hate speech or abusive/sexist/racist/discriminating language\nRespect other people\nNo attempts to harm the site, be it through hacking, ddosing, or any other malicious activity\nDo not attempt to circumvent rules or punishments\n"
	}
];

export const CURRENTSEASONNUMBER = 10;

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
			veteran: user.staffRole === 'veteran',
			cbell: user.userName === 'cbell' && user.staffRole === 'editor',
			max: user.userName === 'Max' && user.staffRole === 'editor',
			moira: user.userName === 'moira' && user.staffRole === 'editor'
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
		nigger: ['nigga', 'nibba', 'nignog', 'n1bba', 'ni99a', 'n199a', 'nignug', 'bigga', 'nigg', 'niggre', 'n1gger'],
		retard: ['libtard', 'retard', 'tard', 'ret4rd', 't4rd', 'retrd'],
		faggot: ['fag', 'f4gg0t', 'f4ggot', 'fagg0t', 'f4g'],
		cunt: ['kunt'],
		'Nazi Terms': ['1488', '卍', 'swastika']
	};
	const exceptions = [/(i|o)f (a|4) g/gi, /underclaim on gov/gi, /bastard/gi, /big ga/gi, /among/gi, /mongod/gi, /mongolia/gi, /off again/gi, /pokemon game/gi]; // This list for all exceptions to bypass swear filter
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
