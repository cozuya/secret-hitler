const _ = require('lodash'),
	{sendInProgressGameUpdate} = require('../util.js');

module.exports.startElection = (game) => {
	const {seatedPlayers} = game.private,
		{presidentIndex, previousElectedGovernment} = game.gameState,
		pendingPresidentPlayer = game.private.seatedPlayers[presidentIndex];

	if (game.general.livingPlayerCount < 6) {
		game.gameState.previousElectedGovernment = [previousElectedGovernment[0]];
	}

	game.general.electionCount++;
	game.general.status = `Election #${game.general.electionCount} begins`;
	pendingPresidentPlayer.gameChats.push({
		gameChat: true,
		timestamp: new Date(),
		chat: [{
			text: 'You are president and must select a chancellor.'
		}]
	});

	pendingPresidentPlayer.playersState.filter((player, index) => index !== presidentIndex && !game.gameState.previousElectedGovernment.includes(index)).forEach(player => {
		player.notificationStatus = 'notification';
	});

	game.publicPlayersState.forEach(player => {
		player.cardStatus.cardDisplayed = false;
		player.governmentStatus = '';
	});

	game.publicPlayersState[presidentIndex].governmentStatus = 'isPendingPresident';
	game.publicPlayersState[presidentIndex].isLoader = true;
	game.gameState.phase = 'selectingChancellor';
	game.gameState.clickActionInfo = [pendingPresidentPlayer.userName, _.without(_.range(0, seatedPlayers.length), presidentIndex, ...game.gameState.previousElectedGovernment)]; // todo-alpha bugged for 2nd and on election.  also does not account for dead players.
	sendInProgressGameUpdate(game);
};