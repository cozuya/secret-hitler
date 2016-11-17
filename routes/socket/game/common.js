const {sendInProgressGameUpdate} = require('../util.js'),
	{sendGameList} = require('../user-requests.js'),
	_ = require('lodash');

module.exports.startElection = (game, specialElectionPresidentIndex) => {
	const ineligableIndexes = game.publicPlayersState.filter(player => player.isDead).map(player => game.publicPlayersState.indexOf(player)),
		{experiencedMode} = game.general;

	if (process.env.NODE_ENV === 'development' && game.trackState.fascistPolicyCount >= 1 || game.trackState.fascistPolicyCount >= 5) {
		game.gameState.isVetoEnabled = true;
	}

	game.gameState.presidentIndex = (() => {
		const findNext = index => index + 1 === game.general.playerCount ? 0 : index + 1,
			{presidentIndex} = game.gameState;

		let index = presidentIndex,
			{specialElectionFormerPresidentIndex} = game.gameState,
			notDeadPresident = false;

		if (!specialElectionPresidentIndex && (specialElectionFormerPresidentIndex || specialElectionFormerPresidentIndex === 0)) {
			index = specialElectionFormerPresidentIndex;
			game.gameState.specialElectionFormerPresidentIndex = null; // let copies by reference?!
		}

		if (specialElectionPresidentIndex || specialElectionPresidentIndex === 0) {
			return specialElectionPresidentIndex;
		}

		while (!notDeadPresident) {
			index = findNext(index);

			if (!ineligableIndexes.includes(index)) {
				notDeadPresident = true;
			}
		}

		return index;
	})();

	const {seatedPlayers} = game.private,
		{presidentIndex, previousElectedGovernment} = game.gameState,
		pendingPresidentPlayer = seatedPlayers[presidentIndex];

	game.general.electionCount++;
	sendGameList();
	game.general.status = `Election #${game.general.electionCount}: president to select chancellor.`;
	if (!experiencedMode) {
		pendingPresidentPlayer.gameChats.push({
			gameChat: true,
			timestamp: new Date(),
			chat: [{
				text: 'You are president and must select a chancellor.'
			}]
		});
	}

	// todo-release if spec election fails, next president shows the prev government with notification blink (but is not clickable).

	pendingPresidentPlayer.playersState.filter((player, index) =>
		!seatedPlayers[index].isDead &&
		((specialElectionPresidentIndex && index !== presidentIndex) ||
				index !== presidentIndex &&
				(game.general.livingPlayerCount > 5 ? !previousElectedGovernment.includes(index) : previousElectedGovernment[1] !== index)))
		.forEach(player => {
			player.notificationStatus = 'notification';
		});

	game.publicPlayersState.forEach(player => {
		player.cardStatus.cardDisplayed = false;
		player.governmentStatus = '';
	});

	game.publicPlayersState[presidentIndex].governmentStatus = 'isPendingPresident';
	game.publicPlayersState[presidentIndex].isLoader = true;
	game.gameState.phase = 'selectingChancellor';
	game.gameState.clickActionInfo = specialElectionPresidentIndex ?
		[pendingPresidentPlayer.userName, seatedPlayers.filter((player, index) => !player.isDead && index !== presidentIndex).map(el => seatedPlayers.indexOf(el))] :
		game.general.livingPlayerCount > 5 ?
		[pendingPresidentPlayer.userName, seatedPlayers.filter((player, index) => !player.isDead && index !== presidentIndex && !previousElectedGovernment.includes(index)).map(el => seatedPlayers.indexOf(el))] :
		[pendingPresidentPlayer.userName, seatedPlayers.filter((player, index) => !player.isDead && index !== presidentIndex && previousElectedGovernment[1] !== index).map(el => seatedPlayers.indexOf(el))];
	sendInProgressGameUpdate(game);
};

module.exports.shufflePolicies = game => {
	const count = _.countBy(game.private.policies);

	console.log(game.private.policies, 'p1');
	console.log(count);

	game.private.policies = game.private.policies.concat(_.shuffle(_.range(1, 12 - (count.fascist + game.trackState.fascistPolicyCount) || 0)).map(num => 'fascist').concat(_.range(1, 7 - (count.liberal + game.trackState.liberalPolicyCount) || 0)).map(num => 'liberal'));
	game.gameState.undrawnPolicyCount = game.private.policies.length;
	console.log(game.private.policies);
	console.log(game.private.policies.length);
};