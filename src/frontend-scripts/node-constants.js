const cn = require('classnames');

module.exports.TOU_CHANGES = [
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

module.exports.CURRENTSEASONNUMBER = 6;

const ALPHANUMERIC = [...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'];
const SYMBOLS = [...' -_=+!"£$%^&*()\\/.,<>?#~\'@;:[]{}'];
const LATIN_EXT_A = [...'ĀāĂăĄąĆćĈĉĊċČčĎďĐđĒēĔĕĖėĘęĚěĜĝĞğĠġĢģĤĥĦħĨĩĪīĬĭĮįİıĲĳĴĵĶķĸĹĺĻļĽľĿŀŁłŃńŅņŇňŉŊŋŌōŎŏŐőŒœŔŕŖŗŘřŚśŜŝŞşŠšŢţŤťŦŧŨũŪūŬŭŮůŰűŲųŴŵŶŷŸŹźŻżŽžſ'];

const ALLCHARS = [...ALPHANUMERIC, ...SYMBOLS, ...LATIN_EXT_A];

module.exports.LEGALCHARACTERS = text => {
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
module.exports.PLAYERCOLORS = (user, isSeasonal, defaultClass, eloDisabled) => {
	if (Boolean(user.staffRole && user.staffRole.length && user.staffRole !== 'trialmod' && user.staffRole !== 'altmod') && !user.staffDisableStaffColor) {
		return cn(defaultClass, {
			admin: user.staffRole === 'admin',
			moderatorcolor: user.staffRole === 'moderator',
			editorcolor: user.staffRole === 'editor',
			cbell: user.userName === 'cbell',
			jdudle3: user.userName === 'jdudle3',
			max: user.userName === 'Max',
			dfinn: user.userName === 'DFinn',
			faaiz: user.userName === 'Faaiz1999',
			invidia: user.userName === 'Invidia',
			thejuststopo: user.userName === 'TheJustStopO'
		});
	} else if (
		user.isContributor &&
		(!(user.staffRole && user.staffRole.length && user.staffRole !== 'trialmod' && user.staffRole !== 'altmod') || !user.staffDisableStaffColor)
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

module.exports.getBadWord = text => {
	const badWords = { //list of all blacklisted words and their variations.
		nigger: ['nigga', 'nibba', 'nignog', 'n1bba', 'ni99a', 'n199a', 'nignug', 'bigga'],
		kike: ['k1ke', 'kik3', 'k1k3'],
		retard: ['autist', 'libtard', 'retard', 'tard'],
		faggot: ['fag', 'f4gg0t', 'f4ggot', 'fagg0t', 'f4g'],
		mongoloid: ['mong', 'm0ng'],
		cunt: ['kunt'],
		'Nazi Terms': ['1488', '卍', 'swastika']
	};
	const exceptions = ['f a game', /*this detects both for "of a game", and "if a game"*/ 'among', 'mongodb', 'mongolia', 'if 4 g']; //this list for all exceptions to bypass swear filter
	let foundWord = [null, null]; //future found bad word, in format of: [blacklisted word, variation]
	// This version will detect words with spaces in them, but may have false positives (such as "mongolia" for "mong").
	let flatText = ""; //the future spaceless text.
	let spacesIndex = []; //the indexes of where the spaces would be in the spaceless text. for context in exceptions.
	for (var i = 0; i < text.length; i++) {
		if (" " === text[i]) {
			spacesIndex.push(flatText.length - 1); //add space to list
		} else {
			flatText += text[i]; //add char to text otherwise
		}
	}
	Object.keys(badWords).forEach(key => {
		if (flatText.includes(key)) { //true if spaceless text contains blacklisted word.
			foundWord = [key, key];
		} else {
			badWords[key].forEach(word => {
				if (flatText.includes(word)) { //true if spaceless text contains variation of blacklisted word.
					foundWord = [key, word];
				}
			});
		}
		//this should detect exceptions in the filter and rule out false positives based on the list of exceptions.

		let wIndex = flatText.indexOf(foundWord[1]); //the location of the blacklisted word found in flatText.
		for (let i = 0; i < exceptions.length; i++) { //passes through all exceptions

			if (text.toLowerCase().substr( //spacing weird to add notations and clarify what this long if statement does.
					wIndex + Math.max(0, spacesIndex.filter(index => index <= wIndex).length - 1), //substrings text to find the index where the bad word would be found by determining the number of missing spaces -1 (for 'among')
					exceptions[i].length + 1) //sets the length of the substring to be 1 longer than the exception string length to counteract the -1 for 'among'.
				.indexOf(exceptions[i]) > -1) { //if the exception is found within the substring,
				foundWord = [null, null]; //prevent the bad word from being detected.
			}
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
