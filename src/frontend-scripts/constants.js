import cn from 'classnames';

export const ADMINS = ['coz'],
	CONTRIBUTORS = ['sethe'],
	PLAYERCOLORS = (user) => cn({
		admin: ADMINS.includes(user.userName),
		contributer: CONTRIBUTORS.includes(user.userName),
		experienced: user.wins + user.losses > 50,
		veryexperienced: user.wins + user.losses > 100,
		veryveryexperienced: user.wins + user.losses > 200,
		superexperienced: user.wins + user.losses > 300,
		sortaonfire: user.wins / (user.wins + user.losses) > .55,
		onfire: user.wins / (user.wins + user.losses) > .6,
		veryonfire: user.wins / (user.wins + user.losses) > .65,
	});