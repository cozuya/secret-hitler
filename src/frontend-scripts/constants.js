const cn = require('classnames');

const MODERATORS = (module.exports.MODERATORS = [
	'cayseron',
	'Idrissa',
	'jdudle3',
	'JerMej1s',
	'MrEth3real',
	'Number5',
	'Ophxlia',
	'RavenCaps',
	'Rose',
	'safi',
	'TheJustStopO',
	'Wilmeister'
]);

const EDITORS = (module.exports.EDITORS = ['cbell', 'Faaiz1999', 'Invidia', 'Max']);

const ADMINS = (module.exports.ADMINS = ['coz', 'Stine']);

const CONTRIBUTORS = (module.exports.CONTRIBUTORS = [
	'conundrum',
	'DFinn',
	'goonbee',
	'Invidia',
	'jbasrai',
	'JerMej1s',
	'LordVader',
	'sethe',
	'Skyrra',
	'veggiemanz',
	'voldemort',
	'Wi1son'
]);

const CURRENTSEASONNUMBER = 1;

module.exports.CURRENTSEASONNUMBER = CURRENTSEASONNUMBER;

/**
 * @param {object} user - user from userlist.
 * @param {boolean} isSeasonal - whether or not to display seasonal colors.
 * @return {string} list of classes for colors.
 */
module.exports.PLAYERCOLORS = (user, isSeasonal) => {
	const w = isSeasonal ? user[`winsSeason${CURRENTSEASONNUMBER}`] : user.wins;
	const l = isSeasonal ? user[`lossesSeason${CURRENTSEASONNUMBER}`] : user.losses;

	return cn({
		admin: ADMINS.includes(user.userName),
		moderatorcolor: MODERATORS.includes(user.userName),
		editorcolor: EDITORS.includes(user.userName),
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
		onfire10: w / (w + l) > 0.7,
		contributer: CONTRIBUTORS.includes(user.userName),
		cbell: user.userName === 'cbell',
		dfinn: user.userName === 'DFinn',
		faaiz: user.userName === 'Faaiz1999',
		invidia: user.userName === 'Invidia',
		max: user.userName === 'Max'
	});
};
