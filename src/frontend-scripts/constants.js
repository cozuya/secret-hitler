const cn = require('classnames');

const MODERATORS = (module.exports.MODERATORS = [
	'TheJustStopO',
	'FreeLaxative',
	'Number5',
	'Costley',
	'morewhales',
	'Ophxlia',
	'Idrissa',
	'cayseron',
	'Knownall',
	'safi',
	'snake69sus',
	'Ecoturtle',
	'maki2',
	'Moranki',
	'jazz'
]);

const EDITORS = (module.exports.EDITORS = ['Max', 'DFinn', 'cbell', 'Faaiz1999']);

const ADMINS = (module.exports.ADMINS = ['coz', 'Stine']);

const CONTRIBUTORS = (module.exports.CONTRIBUTORS = ['jbasrai', 'sethe', 'veggiemanz', 'DFinn', 'conundrum', 'MilkMan', 'Invidia', 'Wi1son']);

module.exports.PLAYERCOLORS = user =>
	cn({
		admin: ADMINS.includes(user.userName),
		moderatorcolor: MODERATORS.includes(user.userName),
		editorcolor: EDITORS.includes(user.userName),
		experienced1: user.wins + user.losses > 49,
		experienced2: user.wins + user.losses > 99,
		experienced3: user.wins + user.losses > 199,
		experienced4: user.wins + user.losses > 299,
		experienced5: user.wins + user.losses > 499,
		onfire1: user.wins / (user.wins + user.losses) > 0.52,
		onfire2: user.wins / (user.wins + user.losses) > 0.54,
		onfire3: user.wins / (user.wins + user.losses) > 0.56,
		onfire4: user.wins / (user.wins + user.losses) > 0.58,
		onfire5: user.wins / (user.wins + user.losses) > 0.6,
		onfire6: user.wins / (user.wins + user.losses) > 0.62,
		onfire7: user.wins / (user.wins + user.losses) > 0.64,
		onfire8: user.wins / (user.wins + user.losses) > 0.66,
		onfire9: user.wins / (user.wins + user.losses) > 0.68,
		onfire10: user.wins / (user.wins + user.losses) > 0.7,
		contributer: CONTRIBUTORS.includes(user.userName),
		cbell: user.userName === 'cbell',
		max: user.userName === 'Max',
		dfinn: user.userName === 'DFinn'
	});
