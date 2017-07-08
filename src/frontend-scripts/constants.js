const cn = require('classnames');

module.exports.MODERATORS = ['sethe', 'maki2', 'Crazyuncle', 'nemonorm', 'Anna1999', 'Tenebrae', 'jazz', 'Max', 'Faaiz1999', 'DumbBullDoor'];

const ADMINS = module.exports.ADMINS = ['coz', 'Stine'];

const CONTRIBUTORS = module.exports.CONTRIBUTORS = ['jbasrai', 'sethe'];

// const NATEKILLER = 'Banana';

module.exports.PLAYERCOLORS = user => cn({
	// natekiller: user.userName === NATEKILLER,
	admin: ADMINS.includes(user.userName),
	contributer: CONTRIBUTORS.includes(user.userName),
	experienced1: user.wins + user.losses > 50,
	experienced2: user.wins + user.losses > 100,
	experienced3: user.wins + user.losses > 200,
	experienced4: user.wins + user.losses > 300,
	experienced5: user.wins + user.losses > 500,
	onfire1: user.wins / (user.wins + user.losses) > 0.52,
	onfire2: user.wins / (user.wins + user.losses) > 0.54,
	onfire3: user.wins / (user.wins + user.losses) > 0.56,
	onfire4: user.wins / (user.wins + user.losses) > 0.58,
	onfire5: user.wins / (user.wins + user.losses) > 0.6,
	onfire6: user.wins / (user.wins + user.losses) > 0.62,
	onfire7: user.wins / (user.wins + user.losses) > 0.64,
	onfire8: user.wins / (user.wins + user.losses) > 0.66,
	onfire9: user.wins / (user.wins + user.losses) > 0.68,
	onfire10: user.wins / (user.wins + user.losses) > 0.7
});
