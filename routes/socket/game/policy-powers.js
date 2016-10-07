const {sendInProgressGameUpdate} = require('../util.js'),
	{games} = require('../models.js'),
	_ = require('lodash');

module.exports.policyPeek = game => {
	game.general.status = 'Waiting for President to peek at policies';
};

module.exports.investigateLoyalty = game => {
	const {seatedPlayers} = game.private,
		{presidentIndex} = game.gameState,
		president = seatedPlayers[game.gameState.presidentIndex];

	game.general.status = 'Waiting for President to investigate.';
	president.playersState.filter((player, i) => i !== presidentIndex && !seatedPlayers[i].isDead).forEach(player => {
		player.notificationStatus = 'notification';
	});
	game.publicPlayersState[presidentIndex].isLoader = true;
	game.gameState.clickActionInfo = [president.userName, seatedPlayers.filter((player, i) => i !== presidentIndex && !seatedPlayers[i].isDead).map((player, i) => i)];
	game.gameState.phase = 'selectingPolicyInvestigate';
	sendInProgressGameUpdate(game);
};

module.exports.selectPolicyInvestigate = data => {
	const game = games.find(el => el.general.uid === data.uid),
		{playerIndex} = data,
		{presidentIndex} = game.gameState,
		{seatedPlayers} = game.private,
		president = seatedPlayers[presidentIndex],
		playersTeam = game.private.seatedPlayers[playerIndex].role.team;

	president.playersState.forEach(player => {
		player.notificationStatus = '';
	});

	game.publicPlayersState[presidentIndex].isLoader = false;
	game.publicPlayersState[playerIndex].cardStatus = {
		cardDisplayed: true,
		cardFront: 'partymembership',
		cardBack: {}
	};

	sendInProgressGameUpdate(game);

	setTimeout(() => {
		president.playersState[playerIndex].cardStatus = {
			cardDisplayed: true,
			isFlipped: true,
			cardFront: 'partymembership',
			cardBack: {
				cardName: `membership-${playersTeam}`
			}
		}
		sendInProgressGameUpdate(game);
	}, 2000);

	setTimeout(() => {
		president.playersState[playerIndex].cardStatus.isFlipped = false;
		sendInProgressGameUpdate(game);
	}, 4000);

	setTimeout(() => {
		game.publicPlayersState[playerIndex].cardStatus.cardDisplayed = false;
		sendInProgressGameUpdate(game);
	}, 6000);
};