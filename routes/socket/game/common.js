const { sendInProgressGameUpdate } = require('../util.js'),
	{ sendGameList } = require('../user-requests.js'),
	_ = require('lodash');

const shufflePolicies = (module.exports.shufflePolicies = (game, is6pRebalanceStart) => {
	const count = _.countBy(game.private.policies);

	game.private.policies = game.private.policies.concat(
		_.shuffle(
			_.range(
				1,
				(game.general.rebalance69p && (game.private.seatedPlayers.length === 9 || game.private.seatedPlayers.length === 7) ? 11 : 12) -
					(game.trackState.fascistPolicyCount + (count.fascist || 0))
			)
				.map(num => 'fascist')
				.concat(_.range(1, 7 - (game.trackState.liberalPolicyCount + (count.liberal || 0))).map(num => 'liberal'))
		)
	);

	if (is6pRebalanceStart) {
		game.trackState.fascistPolicyCount = 1;
		game.private.policies.splice(game.private.policies.findIndex(policy => policy === 'fascist'), 1);
		game.trackState.enactedPolicies = [
			{
				cardBack: 'fascist',
				isFlipped: true,
				position: 'fascist1'
			}
		];
	}

	// delete/comment below prior to deployment..

	// game.trackState.fascistPolicyCount = 3;
	// game.private.policies.splice(game.private.policies.findIndex(policy => policy === 'fascist'), 1);
	// game.private.policies.splice(game.private.policies.findIndex(policy => policy === 'fascist'), 1);
	// game.private.policies.splice(game.private.policies.findIndex(policy => policy === 'fascist'), 1);
	// game.trackState.enactedPolicies = [
	// 	{
	// 		cardBack: 'fascist',
	// 		isFlipped: true,
	// 		position: 'fascist1'
	// 	},
	// 	{
	// 		cardBack: 'fascist',
	// 		isFlipped: true,
	// 		position: 'fascist2'
	// 	},
	// 	{
	// 		cardBack: 'fascist',
	// 		isFlipped: true,
	// 		position: 'fascist3'
	// 	}
	// ];

	// delete/comment above

	game.gameState.undrawnPolicyCount = game.private.policies.length;
});

module.exports.startElection = (game, specialElectionPresidentIndex) => {
	const { experiencedMode } = game.general;

	if (game.trackState.fascistPolicyCount >= 5) {
		game.gameState.isVetoEnabled = true;
	}

	if (game.gameState.undrawnPolicyCount < 3) {
		shufflePolicies(game);
	}

	game.gameState.presidentIndex = (() => {
		const { presidentIndex, specialElectionFormerPresidentIndex } = game.gameState,
			nextPresidentIndex = index => {
				const nextIndex = index + 1 === game.general.playerCount ? 0 : index + 1;

				if (game.publicPlayersState[nextIndex].isDead) {
					return nextPresidentIndex(nextIndex);
				} else {
					return nextIndex;
				}
			};

		if (Number.isInteger(specialElectionPresidentIndex)) {
			return specialElectionPresidentIndex;
		} else if (Number.isInteger(specialElectionFormerPresidentIndex)) {
			game.gameState.specialElectionFormerPresidentIndex = null;
			return nextPresidentIndex(specialElectionFormerPresidentIndex);
		} else {
			return nextPresidentIndex(presidentIndex);
		}
	})();

	game.private.summary = game.private.summary.nextTurn().updateLog({ presidentId: game.gameState.presidentIndex });

	const { seatedPlayers } = game.private, // eslint-disable-line one-var
		{ presidentIndex, previousElectedGovernment } = game.gameState,
		pendingPresidentPlayer = seatedPlayers[presidentIndex];

	game.general.electionCount++;
	sendGameList();
	game.general.status = `Election #${game.general.electionCount}: president to select chancellor.`;
	if (!experiencedMode && !game.general.disableGamechat) {
		pendingPresidentPlayer.gameChats.push({
			gameChat: true,
			timestamp: new Date(),
			chat: [
				{
					text: 'You are president and must select a chancellor.'
				}
			]
		});
	}

	// todo-release if spec election fails, next president shows the prev government with notification blink (but is not clickable).

	pendingPresidentPlayer.playersState
		.filter(
			(player, index) =>
				!seatedPlayers[index].isDead &&
				(index !== presidentIndex && (game.general.livingPlayerCount > 5 ? !previousElectedGovernment.includes(index) : previousElectedGovernment[1] !== index))
		)
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

	game.gameState.clickActionInfo =
		game.general.livingPlayerCount > 5
			? [
					pendingPresidentPlayer.userName,
					seatedPlayers
						.filter((player, index) => !player.isDead && index !== presidentIndex && !previousElectedGovernment.includes(index))
						.map(el => seatedPlayers.indexOf(el))
				]
			: [
					pendingPresidentPlayer.userName,
					seatedPlayers
						.filter((player, index) => !player.isDead && index !== presidentIndex && previousElectedGovernment[1] !== index)
						.map(el => seatedPlayers.indexOf(el))
				];
	sendInProgressGameUpdate(game);
};
