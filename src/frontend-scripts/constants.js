const cn = require('classnames');

module.exports.MODERATORS = ['sethe', 'maki2', 'Crazyuncle', 'nemonorm', 'Anna1999', 'Tenebrae', 'jazz', 'Max', 'Faaiz1999', 'DumbBullDoor'];

const ADMINS = module.exports.ADMINS = ['coz', 'Stine', 'hhh'];

const CONTRIBUTORS = module.exports.CONTRIBUTORS = ['jbasrai', 'sethe'];

// const NATEKILLER = 'Banana';

module.exports.PLAYERCOLORS = (user) => cn({
	// natekiller: user.userName === NATEKILLER,
	admin: ADMINS.includes(user.userName),
	contributer: CONTRIBUTORS.includes(user.userName),
	experienced: user.wins + user.losses > 50,
	veryexperienced: user.wins + user.losses > 100,
	veryveryexperienced: user.wins + user.losses > 200,
	superexperienced: user.wins + user.losses > 300,
	supersuperexperienced: user.wins + user.losses > 500,
	sortaonfire: user.wins / (user.wins + user.losses) > .55,
	onfire: user.wins / (user.wins + user.losses) > .6,
	veryonfire: user.wins / (user.wins + user.losses) > .65,
});
