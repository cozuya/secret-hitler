const cn = require('classnames');

const MODERATORS = (module.exports.MODERATORS = [
	'littlebird',
	'Hexicube',
	'RavenCaps',
	'JerMej1s',
	'jdudle3',
	'Rose',
	'Number5',
	'Ophxlia',
	'Idrissa',
	'cayseron',
	'safi',
	'Wilmeister',
	'MrEth3real'
]);

module.exports.TRIALMODS = ['ZeroCool', 'neffni', 'waluigiwaro', 'benjamin172'];

const EDITORS = (module.exports.EDITORS = ['Max', 'cbell', 'Invidia', 'TheJustStopO']);
const ADMINS = (module.exports.ADMINS = ['coz', 'Stine']);
const CONTRIBUTORS = (module.exports.CONTRIBUTORS = [
	'banc',
	'HREmperor',
	'Royal2000H',
	'OuchYouHitMe',
	'Auengun',
	'Skyrra',
	'jbasrai',
	'sethe',
	'bot',
	'veggiemanz',
	'DFinn',
	'conundrum',
	'JerMej1s',
	'Invidia',
	'Wi1son',
	'LordVader',
	'voldemort',
	'goonbee'
]);

const CURRENTSEASONNUMBER = 2;

module.exports.CURRENTSEASONNUMBER = CURRENTSEASONNUMBER;

/**
 * @param {object} user - user from userlist.
 * @param {boolean} isSeasonal - whether or not to display seasonal colors.
 * @param {string} defaultClass - the default class
 * @return {string} list of classes for colors.
 */
module.exports.PLAYERCOLORS = (user, isSeasonal, defaultClass) => {
	if (MODERATORS.includes(user.userName) || ADMINS.includes(user.userName) || EDITORS.includes(user.userName) || CONTRIBUTORS.includes(user.userName)) {
		return cn(defaultClass, {
			admin: ADMINS.includes(user.userName),
			moderatorcolor: MODERATORS.includes(user.userName),
			editorcolor: EDITORS.includes(user.userName),
			contributer: CONTRIBUTORS.includes(user.userName),
			cbell: user.userName === 'cbell',
			max: user.userName === 'Max',
			dfinn: user.userName === 'DFinn',
			faaiz: user.userName === 'Faaiz1999',
			invidia: user.userName === 'Invidia',
			thejuststopo: user.userName === 'TheJustStopO'
		});
	} else {
		const w = isSeasonal ? user[`winsSeason${CURRENTSEASONNUMBER}`] : user.wins;
		const l = isSeasonal ? user[`lossesSeason${CURRENTSEASONNUMBER}`] : user.losses;

		if (w + l >= 50) {
			return cn(defaultClass, {
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
			});
		} else {
			return defaultClass;
		}
	}
};
