const {sendInProgressGameUpdate} = require('../util.js'),
	{sendGameList} = require('../user-requests.js'),
	_ = require('lodash');

module.exports.startElection = (game, specialElectionPresidentIndex) => {
	const ineligableIndexes = (() => {
		const {specialElectionFormerPresidentIndex, previousElectedGovernment} = game.gameState;

		let toConcat = [];

		if (!specialElectionFormerPresidentIndex && specialElectionFormerPresidentIndex !== 0) {
			toConcat = previousElectedGovernment.length ? previousElectedGovernment[0] : [];
		}

		return game.publicPlayersState.filter(player => player.isDead).map(player => game.publicPlayersState.indexOf(player)).concat(toConcat);
	})();

	if (process.env.NODE_ENV === 'development' && game.trackState.fascistPolicyCount >= 1 || game.trackState.fascistPolicyCount === 5) {
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
			game.gameState.specialElectionFormerPresidentIndex = null;
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

	if (game.general.livingPlayerCount < 6 && previousElectedGovernment.length) {
		game.gameState.previousElectedGovernment = [previousElectedGovernment[0]];
	}

	game.general.electionCount++;
	sendGameList();
	game.general.status = `Election #${game.general.electionCount}: president to select chancellor.`;
	pendingPresidentPlayer.gameChats.push({
		gameChat: true,
		timestamp: new Date(),
		chat: [{
			text: 'You are president and must select a chancellor.'
		}]
	});

	// todo-release if spec election fails, next president shows the prev government with notification blink (but is not clickable).

	pendingPresidentPlayer.playersState.filter((player, index) => (((!specialElectionPresidentIndex && game.gameState.previousElectedGovernment.length === 2 ? !ineligableIndexes.concat([game.gameState.previousElectedGovernment[1]]).includes(index) : !ineligableIndexes.includes(index)) || specialElectionPresidentIndex) && index !== presidentIndex))
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
	game.gameState.clickActionInfo = specialElectionPresidentIndex ? [pendingPresidentPlayer.userName, _.without(_.range(0, seatedPlayers.length), presidentIndex).filter(num => !seatedPlayers[num].isDead)] : [pendingPresidentPlayer.userName, _.without(_.range(0, seatedPlayers.length), presidentIndex, ...game.gameState.previousElectedGovernment).filter(num => !seatedPlayers[num].isDead)];
	sendInProgressGameUpdate(game);
};

module.exports.shufflePolicies = game => {
	const count = _.countBy(game.private.policies);

	game.private.policies = game.private.policies.concat(_.shuffle((_.range(1, 12 - (count.fascist + game.trackState.fascistPolicyCount || 0)).map(num => 'fascist').concat(_.range(1, 7 - (count.liberal + game.trackState.liberalPolicyCounter || 0)).map(num => 'liberal')))));
	game.gameState.undrawnPolicyCount = game.private.policies.length;
	game.gameState.discardedPolicyCount = 0;
};