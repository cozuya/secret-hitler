const {sendInProgressGameUpdate} = require('../util.js'),
	_ = require('lodash');

module.exports = game => {
	game.gameState.isStarted = true;
	game.private.seatedPlayers = game.seatedPlayers = _.shuffle(game.seatedPlayers);
	game.general.status = 'Dealing roles..';
	sendInProgressGameUpdate(game);

	const roles = _.range(0, 3).map((el) => {
		return {
			roleName: 'liberal',
			icon: el,
			team: 'liberal'
		};
	}).concat([{
			roleName: 'fascist',
			icon: 0,
			team: 'fascist'
		},
		{
			roleName: 'hitler',
			icon: 0,
			team: 'fascist'
		}]
	);

	if (game.seatedPlayers.length > 5) {
		roles = roles.concat([{
			roleName: 'liberal',
			icon: 4,
			team: 'liberal'
		}]);
	}

	if (game.seatedPlayers.length > 6) {
		roles = roles.concat([{
			roleName: 'fascist',
			icon: 1,
			team: 'fascist'
		}]);		
	}

	if (game.seatedPlayers.length > 7) {
		roles = roles.concat([{
			roleName: 'liberal',
			icon: 5,
			team: 'liberal'
		}]);
	}

	if (game.seatedPlayers.length > 8) {
		roles = roles.concat([{
			roleName: 'fascist',
			icon: 2,
			team: 'fascist'
		}]);		
	}

	if (game.seatedPlayers.length > 9) {
		roles = roles.concat([{
			roleName: 'liberal',
			icon: 4,
			team: 'liberal'
		}]);
	}
};