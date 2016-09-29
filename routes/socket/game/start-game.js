const {sendInProgressGameUpdate} = require('../util.js'),
	_ = require('lodash');

module.exports = game => {
	game.gameState.isStarted = true;
	game.private.seatedPlayers = game.seatedPlayers = _.shuffle(game.seatedPlayers);
	game.general.status = 'Waiting for president to pick a chancellor';
	sendInProgressGameUpdate(game);
};