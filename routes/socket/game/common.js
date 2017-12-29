const { sendInProgressGameUpdate } = require('../util.js');
const { sendGameList } = require('../user-requests.js');
const _ = require('lodash');

/**
 * @param {object} game - game to act on.
 * @param {boolean} is6pRebalanceStart - whether or not 6p is rebalanced
 */
const shufflePolicies = (module.exports.shufflePolicies = (game, is6pRebalanceStart) => {
	const count = _.countBy(game.private.policies);

	game.private.policies = _.shuffle(
		game.private.policies.concat(
			_.range(
				1,
				((game.general.rebalance7p && game.private.seatedPlayers.length === 7) || (game.general.rebalance9p && game.private.seatedPlayers.length === 9)
					? 11
					: 12) -
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

	game.trackState.fascistPolicyCount = 3;
	game.private.policies.splice(game.private.policies.findIndex(policy => policy === 'fascist'), 1);
	game.private.policies.splice(game.private.policies.findIndex(policy => policy === 'fascist'), 1);
	game.private.policies.splice(game.private.policies.findIndex(policy => policy === 'fascist'), 1);
	game.trackState.enactedPolicies = [
		{
			cardBack: 'fascist',
			isFlipped: true,
			position: 'fascist1'
		},
		{
			cardBack: 'fascist',
			isFlipped: true,
			position: 'fascist2'
		},
		{
			cardBack: 'fascist',
			isFlipped: true,
			position: 'fascist3'
		}
	];

	// delete/comment above

	game.gameState.undrawnPolicyCount = game.private.policies.length;
});

/**
 * @param {object} game - game to act on.
 * @param {number} specialElectionPresidentIndex - number of index of the special election player (optional)
 */
module.exports.startElection = (game, specialElectionPresidentIndex) => {
	const { experiencedMode } = game.general;

	if (game.trackState.fascistPolicyCount >= 5) {
		game.gameState.isVetoEnabled = true;
	}

	if (game.gameState.undrawnPolicyCount < 3) {
		shufflePolicies(game);
	}

	/**
 	 * @return {number} index of the president
	 */
	game.gameState.presidentIndex = (() => {
		const { presidentIndex, specialElectionFormerPresidentIndex } = game.gameState;

		/**
		 * @param {number} index - index of the current president
 		 * @return {number} index of the next president
 		 */
		const nextPresidentIndex = index => {
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

	const { seatedPlayers } = game.private; // eslint-disable-line one-var
	const { presidentIndex, previousElectedGovernment } = game.gameState;
	const pendingPresidentPlayer = seatedPlayers[presidentIndex];

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

	// todo-release if spec election fails, next president shows the prev government with notification blink (but is not clickable).  Dunno if this is true any more haven't heard about this in months.

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
