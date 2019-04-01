const cn = require('classnames');

export const TOU_CHANGES = [
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

export const CURRENTSEASONNUMBER = 6;

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
 * @param {object} user - user to randomize
 * @return {object} newUser - user with mutated ELO
 */
export const randomizeELO = user => {
	let newUser = Object.assign({}, user);
	let elo = user.eloOverall;
	let season = user.eloSeason;
	const username = user.userName;
	const letterVals = {
		a: 1.9887788538147219,
		A: 0.8158310457874588,
		b: 0.9665740820456215,
		B: 0.9948891568880649,
		c: 1.8906402131135183,
		C: 0.3451979965245744,
		d: 1.8816980998895918,
		D: 0.4929219937636824,
		e: 0.6422625479564738,
		E: 0.4561773352775388,
		f: 0.0244674634849324,
		F: 1.5887681295769488,
		g: 1.9928401598196067,
		G: 0.9845932367729444,
		h: 0.7157330231459218,
		H: 1.3105795435915095,
		i: 1.9890404075274512,
		I: 0.0268790103940426,
		j: 0.3086007202698659,
		J: 0.6835109753294145,
		k: 0.7298188260455363,
		K: 0.0677855534293467,
		l: 0.9568699696719045,
		L: 0.0334326971066516,
		m: 0.2573494819562235,
		M: 1.8749384277896064,
		n: 0.2328771626838137,
		N: 0.5174510510210144,
		o: 1.1486518128119292,
		O: 0.1617646561563583,
		p: 1.7037111620261864,
		P: 1.6485132605449293,
		q: 0.8984974336404106,
		Q: 1.6709072930475344,
		r: 1.9890496468100499,
		R: 1.6238691151955371,
		s: 1.9893701540334227,
		S: 0.6588453524122801,
		t: 1.8627100804061003,
		T: 0.4871107360752749,
		u: 1.9997573832139288,
		U: 1.4179597291502781,
		v: 1.0723984241853224,
		V: 1.9921325214114067,
		w: 1.2068019718818639,
		W: 0.3025930330256545,
		x: 0.1157833406759762,
		X: 0.6924568813028698,
		y: 1.9480507868163195,
		Y: 0.2090625459392441,
		z: 0.7836533369255414,
		Z: 0.3174425164231862,
		0: 0.9529951889616093,
		1: 0.7309439947970398,
		2: 0.9223224689026184,
		3: 0.7922084820385624,
		4: 0.2376301764105444,
		5: 0.5261934359003089,
		6: 0.6846426692226995,
		7: 0.5695868006458793,
		8: 0.7878080721638494,
		9: 0.6209907398163323
	};
	let nameVal = 0;
	for (let l of username) {
		nameVal += letterVals[l];
	}
	nameVal /= username.length;

	if (user.staffRole) {
		elo = 75;
		season = 50;
	} else if (elo > 1800 || season > 1850) {
		elo = -75;
		season = -50;
	} else {
		elo = 0;
		season = 0;
	}

	elo += Math.round(1450 + 300 * nameVal);
	season = 1600;

	return Object.assign(newUser, {
		eloOverall: elo,
		eloSeason: season
	});
};

/**
 * @param {object} user - user from userlist.
 * @param {boolean} isSeasonal - whether or not to display seasonal colors.
 * @param {string} defaultClass - the default class
 * @param {boolean} eloDisabled - true if elo is off
 * @return {string} list of classes for colors.
 */
export const PLAYERCOLORS = (user, isSeasonal, defaultClass, eloDisabled) => {
	const now = new Date();
	const isAprilFools = now.getDate() === 1 && now.getMonth() === 3 && now.getFullYear() === 2019;
	if (isAprilFools) {
		user = randomizeELO(user);
	}
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
		nigger: ['nigga', 'nibba', 'nignog', 'n1bba', 'ni99a', 'n199a', 'nignug', 'bigga'],
		kike: ['k1ke', 'kik3', 'k1k3'],
		retard: ['autist', 'libtard', 'retard', 'tard'],
		faggot: ['fag', 'f4gg0t', 'f4ggot', 'fagg0t'],
		mongoloid: ['mong'],
		cunt: ['kunt'],
		'Nazi Terms': ['1488', '卍', 'swastika']
	};
	let foundWord = [null, null];

	// This version will detect words with spaces in them, but may have false positives (such as "mongolia" for "mong").
	const flatText = text.toLowerCase().replace(/\s/gi, '');
	Object.keys(badWords).forEach(key => {
		if (flatText.includes(key)) {
			foundWord = [key, key];
		} else {
			badWords[key].forEach(word => {
				if (flatText.includes(word)) {
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
