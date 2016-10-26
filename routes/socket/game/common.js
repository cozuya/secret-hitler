const {sendInProgressGameUpdate} = require('../util.js'),
	_ = require('lodash');

module.exports.startElection = (game, specialElectionPresidentIndex) => {
	const ineligableIndexes = (() => {
		const {specialElectionFormerPresidentIndex, previousElectedGovernment} = game.gameState;

		let toConcat = [];

		if (!specialElectionFormerPresidentIndex || specialElectionFormerPresidentIndex !== 0) {
			toConcat = previousElectedGovernment;
		}

		return game.publicPlayersState.filter(player => player.isDead).map(player => game.publicPlayersState.indexOf(player)).concat(toConcat);
	})();

	game.gameState.presidentIndex = (() => {
		const findNext = index => index > game.seatedPlayers.length ? 0 : index + 1,
			{presidentIndex} = game.gameState;

		let index = presidentIndex + 1,
			{specialElectionFormerPresidentIndex} = game.gameState,
			notDeadPresident = false;

		if (specialElectionFormerPresidentIndex || specialElectionFormerPresidentIndex === 0) {
			index = specialElectionFormerPresidentIndex + 1;
			specialElectionFormerPresidentIndex = null;
		}

		if (specialElectionPresidentIndex || specialElectionPresidentIndex === 0) {
			specialElectionFormerPresidentIndex = presidentIndex;
			return specialElectionPresidentIndex;
		}

		while (!notDeadPresident) {
			if (!ineligableIndexes.includes(index)) {
				notDeadPresident = true;
			} else {
				index = findNext(index);
			}
		}

		return index;
	})();

	const {seatedPlayers} = game.private,
		{presidentIndex, previousElectedGovernment} = game.gameState,
		pendingPresidentPlayer = game.private.seatedPlayers[presidentIndex];

	if (game.general.livingPlayerCount < 6 && previousElectedGovernment.length) {
		game.gameState.previousElectedGovernment = [previousElectedGovernment[0]];
	}

	game.general.electionCount++;
	game.general.status = `Election #${game.general.electionCount}: president to select chancellor.`;
	pendingPresidentPlayer.gameChats.push({
		gameChat: true,
		timestamp: new Date(),
		chat: [{
			text: 'You are president and must select a chancellor.'
		}]
	});

	pendingPresidentPlayer.playersState.filter((player, index) => index !== presidentIndex && !ineligableIndexes.includes(index)).forEach(player => {
		player.notificationStatus = 'notification';
	});

	game.publicPlayersState.forEach(player => {
		player.cardStatus.cardDisplayed = false;
		player.governmentStatus = '';
	});

	game.publicPlayersState[presidentIndex].governmentStatus = 'isPendingPresident';
	game.publicPlayersState[presidentIndex].isLoader = true;
	game.gameState.phase = 'selectingChancellor';
	game.gameState.clickActionInfo = [pendingPresidentPlayer.userName, _.without(_.range(0, seatedPlayers.length), presidentIndex, ...game.gameState.previousElectedGovernment).filter(num => !seatedPlayers[num].isDead)];
	sendInProgressGameUpdate(game);
};

module.exports.shufflePolicies = (remainingPolicies = []) => {
	const count = _.countBy(remainingPolicies);

	return remainingPolicies.concat(_.shuffle((_.range(1, 12 - (count.fascist || 0)).map(num => 'fascist').concat(_.range(1, 7 - (count.liberal || 0)).map(num => 'liberal')))));
};