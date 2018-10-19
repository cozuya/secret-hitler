const { sendInProgressGameUpdate } = require('../util');
const { sendGameList } = require('../user-requests');
const { selectChancellor } = require('./election-util');
const _ = require('lodash');

/**
 * @param {object} game - game to act on.
 * @param {boolean} experiencedMode - true if speed mode is on.
 */
module.exports.failedElection = (game, experiencedMode) => {
	game.trackState.electionTrackerCount++;

	if (game.trackState.electionTrackerCount >= 3) {
		const chat = {
			timestamp: new Date(),
			gameChat: true,
			chat: [
				{
					text: 'The third consecutive election has failed and the top policy is enacted.'
				}
			]
		};

		game.gameState.previousElectedGovernment = [];

		if (!game.general.disableGamechat) {
			ame.private.seatedPlayers.forEach(player => {
				player.gameChats.push(chat);
			});

			game.private.unSeatedGameChats.push(chat);
		}

		if (!game.gameState.undrawnPolicyCount) {
			shufflePolicies(game);
		}

		game.gameState.undrawnPolicyCount--;
		setTimeout(() => {
			enactPolicy(game, game.private.policies.shift());
		}, process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 500 : 2000);
	} else {
		if (game.general.timedMode) {
			game.gameState.timedModeEnabled = true;
			game.private.timerId = setTimeout(() => {
				if (game.gameState.timedModeEnabled && game.gameState.phase === 'selectingChancellor') {
					const chancellorIndex = _.shuffle(game.gameState.clickActionInfo[1])[0];

					game.gameState.pendingChancellorIndex = null;
					game.gameState.timedModeEnabled = false;

					selectChancellor(null, { user: game.private.seatedPlayers[game.gameState.presidentIndex].userName }, game, { chancellorIndex: chancellorIndex });
				}
			}, process.env.DEVTIMEDDELAY ? process.env.DEVTIMEDDELAY : game.general.timedMode * 1000);
		}

		setTimeout(() => {
			module.exports.startElection(game);
		}, process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 500 : 2000);
	}
};

/**
 * @param {object} game - game to act on.
 * @param {boolean} isStart - true if this is the initial shuffle.
 */
const shufflePolicies = (module.exports.shufflePolicies = (game, isStart) => {
	if (isStart) {
		game.trackState.enactedPolicies = [];
		if (game.customGameSettings.trackState.lib > 0) {
			game.trackState.liberalPolicyCount = game.customGameSettings.trackState.lib;
			_.range(0, game.customGameSettings.trackState.lib).forEach(num => {
				game.trackState.enactedPolicies.push({
					cardBack: 'liberal',
					isFlipped: true,
					position: `liberal${num + 1}`
				});
			});
		}
		if (game.customGameSettings.trackState.fas > 0) {
			game.trackState.fascistPolicyCount = game.customGameSettings.trackState.fas;
			_.range(0, game.customGameSettings.trackState.fas).forEach(num => {
				game.trackState.enactedPolicies.push({
					cardBack: 'fascist',
					isFlipped: true,
					position: `fascist${num + 1}`
				});
			});
		}
	}

	game.private.policies = _.shuffle(
		_.range(0, game.customGameSettings.deckState.lib - game.trackState.liberalPolicyCount)
			.map(num => 'liberal')
			.concat(_.range(0, game.customGameSettings.deckState.fas - game.trackState.fascistPolicyCount).map(num => 'fascist'))
	);

	game.gameState.undrawnPolicyCount = game.private.policies.length;

	const modOnlyChat = {
		timestamp: new Date(),
		gameChat: true,
		chat: [{ text: 'The deck has been shuffled: ' }]
	};
	game.private.policies.forEach(policy => {
		modOnlyChat.chat.push({
			text: policy === 'liberal' ? 'B' : 'R',
			type: policy
		});
	});
	game.private.hiddenInfoChat.push(modOnlyChat);
});

/**
 * @param {object} game - game to act on.
 * @param {number} specialElectionPresidentIndex - number of index of the special election player (optional)
 */
module.exports.startElection = (game, specialElectionPresidentIndex) => {
	const { experiencedMode } = game.general;

	if (game.trackState.fascistPolicyCount >= game.customGameSettings.vetoZone) {
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

	let hasValidOption =
		pendingPresidentPlayer.playersState.filter(
			(player, index) =>
				seatedPlayers[index] &&
				!seatedPlayers[index].isDead &&
				(index !== presidentIndex && (game.general.livingPlayerCount > 5 ? !previousElectedGovernment.includes(index) : previousElectedGovernment[1] !== index))
		).length > 0;
	if (!hasValidOption) {
		if (!game.general.disableGamechat) {
			const chat = {
				timestamp: new Date(),
				gameChat: true,
				chat: [
					{
						text: 'President '
					},
					{
						text: game.general.blindMode ? `{${presidentIndex + 1}}` : `${pendingPresidentPlayer.userName} {${presidentIndex + 1}}`,
						type: 'player'
					},
					{
						text: ' has no options for Chancellor and was skipped.'
					}
				]
			};
			seatedPlayers.forEach(player => {
				player.gameChats.push(chat);
			});
			game.private.unSeatedGameChats.push(chat);
		}
		module.exports.failedElection(game, experiencedMode);
	}

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

	pendingPresidentPlayer.playersState
		.filter(
			(player, index) =>
				seatedPlayers[index] &&
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

	if (game.general.timedMode) {
		game.gameState.timedModeEnabled = true;
		game.private.timerId = setTimeout(() => {
			if (game.gameState.timedModeEnabled) {
				const chancellorIndex = _.shuffle(game.gameState.clickActionInfo[1])[0];

				selectChancellor(null, { user: pendingPresidentPlayer.userName }, game, { chancellorIndex });
			}
		}, process.env.DEVTIMEDDELAY ? process.env.DEVTIMEDDELAY : game.general.timedMode * 1000);
	}

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
