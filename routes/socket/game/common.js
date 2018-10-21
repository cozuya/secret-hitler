const { sendInProgressGameUpdate } = require('../util');
const { sendGameList } = require('../user-requests');
const { selectChancellor } = require('./election-util');
const {
	specialElection,
	policyPeek,
	investigateLoyalty,
	executePlayer,
	selectPolicies,
	selectPlayerToExecute,
	selectPartyMembershipInvestigate,
	selectSpecialElection
} = require('./policy-powers');
const _ = require('lodash');

const powerMapping = {
	investigate: [investigateLoyalty, 'The president must investigate the party membership of another player.'],
	deckpeek: [policyPeek, 'The president must examine the top 3 policies.'],
	election: [specialElection, 'The president must select a player for a special election.'],
	bullet: [executePlayer, 'The president must select a player for execution.']
};

const presidentPowers = [
	{
		0: null,
		1: null,
		2: powerMapping.deckpeek,
		3: powerMapping.bullet,
		4: powerMapping.bullet
	},
	{
		0: null,
		1: powerMapping.investigate,
		2: powerMapping.election,
		3: powerMapping.bullet,
		4: powerMapping.bullet
	},
	{
		0: powerMapping.investigate,
		1: powerMapping.investigate,
		2: powerMapping.election,
		3: powerMapping.bullet,
		4: powerMapping.bullet
	}
];

/**
 * @param {object} game - game to act on.
 * @param {string} team - name of team that is enacting policy.
 */
const enactPolicy = (game, team) => {
	const index = game.trackState.enactedPolicies.length;
	const { experiencedMode } = game.general;

	if (game.private.lock.selectChancellor) {
		game.private.lock.selectChancellor = false;
	}

	if (game.private.lock.selectChancellorVoteOnVeto) {
		game.private.lock.selectChancellorVoteOnVeto = false;
	}

	if (game.private.lock.selectChancellorPolicy) {
		game.private.lock.selectChancellorPolicy = false;
	}

	if (game.private.lock.policyPeek) {
		game.private.lock.policyPeek = false;
	}

	if (game.private.lock.selectPlayerToExecute) {
		game.private.lock.selectPlayerToExecute = false;
	}

	if (game.private.lock.executePlayer) {
		game.private.lock.executePlayer = false;
	}

	if (game.private.lock.selectSpecialElection) {
		game.private.lock.selectSpecialElection = false;
	}

	if (game.private.lock.specialElection) {
		game.private.lock.specialElection = false;
	}

	if (game.private.lock.selectPartyMembershipInvestigate) {
		game.private.lock.selectPartyMembershipInvestigate = false;
	}

	if (game.private.lock.investigateLoyalty) {
		game.private.lock.investigateLoyalty = false;
	}

	if (game.private.lock.selectPolicies) {
		game.private.lock.selectPolicies = false;
	}

	game.gameState.pendingChancellorIndex = null;

	game.private.summary = game.private.summary.updateLog({
		enactedPolicy: team
	});

	game.general.status = 'A policy is being enacted.';
	game.trackState[`${team}PolicyCount`]++;
	sendGameList();

	game.trackState.enactedPolicies.push({
		position: 'middle',
		cardBack: team,
		isFlipped: false
	});

	sendInProgressGameUpdate(game, true);

	setTimeout(() => {
		game.trackState.enactedPolicies[index].isFlipped = true;
		game.gameState.audioCue = team === 'liberal' ? 'enactPolicyL' : 'enactPolicyF';
		sendInProgressGameUpdate(game, true);
	}, process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 300 : 2000);

	setTimeout(() => {
		game.gameState.audioCue = '';
		const chat = {
			timestamp: new Date(),
			gameChat: true,
			chat: [
				{ text: 'A ' },
				{
					text: team === 'liberal' ? 'liberal' : 'fascist',
					type: team === 'liberal' ? 'liberal' : 'fascist'
				},
				{
					text: ` policy has been enacted. (${
						team === 'liberal' ? game.trackState.liberalPolicyCount.toString() : game.trackState.fascistPolicyCount.toString()
					}/${team === 'liberal' ? '5' : '6'})`
				}
			]
		};
		const addPreviousGovernmentStatus = () => {
			game.publicPlayersState.forEach(player => {
				if (player.previousGovernmentStatus) {
					player.previousGovernmentStatus = '';
				}
			});

			if (game.trackState.electionTrackerCount <= 2 && game.publicPlayersState.findIndex(player => player.governmentStatus === 'isChancellor') > -1) {
				game.publicPlayersState[game.gameState.presidentIndex].previousGovernmentStatus = 'wasPresident';
				game.publicPlayersState[game.publicPlayersState.findIndex(player => player.governmentStatus === 'isChancellor')].previousGovernmentStatus =
					'wasChancellor';
			}
		};
		const powerToEnact =
			team === 'fascist'
				? game.customGameSettings.enabled
					? powerMapping[game.customGameSettings.powers[game.trackState.fascistPolicyCount - 1]]
					: presidentPowers[game.general.type][game.trackState.fascistPolicyCount - 1]
				: null;

		game.trackState.enactedPolicies[index].position =
			team === 'liberal' ? `liberal${game.trackState.liberalPolicyCount}` : `fascist${game.trackState.fascistPolicyCount}`;

		if (!game.general.disableGamechat) {
			game.private.seatedPlayers.forEach(player => {
				player.gameChats.push(chat);
			});

			game.private.unSeatedGameChats.push(chat);
		}

		if (game.trackState.liberalPolicyCount === 5 || game.trackState.fascistPolicyCount === 6) {
			game.publicPlayersState.forEach((player, i) => {
				player.cardStatus.cardFront = 'secretrole';
				player.cardStatus.cardBack = game.private.seatedPlayers[i].role;
				player.cardStatus.cardDisplayed = true;
				player.cardStatus.isFlipped = false;
			});

			sendInProgressGameUpdate(game);

			game.gameState.audioCue = game.trackState.liberalPolicyCount === 5 ? 'liberalsWin' : 'fascistsWin';
			setTimeout(() => {
				game.publicPlayersState.forEach((player, i) => {
					player.cardStatus.isFlipped = true;
				});
				game.gameState.audioCue = '';
				if (process.env.NODE_ENV === 'development') {
					completeGame(game, game.trackState.liberalPolicyCount === 1 ? 'liberal' : 'fascist');
				} else {
					completeGame(game, game.trackState.liberalPolicyCount === 5 ? 'liberal' : 'fascist');
				}
			}, process.env.NODE_ENV === 'development' ? 100 : 2000);
		} else if (powerToEnact && game.trackState.electionTrackerCount <= 2) {
			const chat = {
				timestamp: new Date(),
				gameChat: true,
				chat: [{ text: powerToEnact[1] }]
			};

			const { seatedPlayers } = game.private;

			if (!game.general.disableGamechat) {
				seatedPlayers.forEach(player => {
					player.gameChats.push(chat);
				});

				game.private.unSeatedGameChats.push(chat);
			}
			powerToEnact[0](game);
			addPreviousGovernmentStatus();

			if (game.general.timedMode) {
				const { presidentIndex } = game.gameState;

				game.gameState.timedModeEnabled = true;
				game.private.timerId = setTimeout(() => {
					if (game.gameState.timedModeEnabled) {
						const president = seatedPlayers[presidentIndex];
						let list = seatedPlayers.filter((player, i) => i !== presidentIndex && !seatedPlayers[i].isDead);

						game.gameState.timedModeEnabled = false;

						switch (powerToEnact[1]) {
							case 'The president must examine the top 3 policies.':
								selectPolicies({ user: president.userName }, game);
								break;
							case 'The president must select a player for execution.':
								if (president.role.cardName === 'fascist') {
									list = list.filter(player => player.role.cardName !== 'hitler');
								}
								selectPlayerToExecute({ user: president.userName }, game, { playerIndex: seatedPlayers.indexOf(_.shuffle(list)[0]) });
								break;
							case 'The president must investigate the party membership of another player.':
								selectPartyMembershipInvestigate({ user: president.userName }, game, { playerIndex: seatedPlayers.indexOf(_.shuffle(list)[0]) });
								break;
							case 'The president must select a player for a special election.':
								selectSpecialElection({ user: president.userName }, game, { playerIndex: seatedPlayers.indexOf(_.shuffle(list)[0]) });
								break;
						}
					}
				}, process.env.DEVTIMEDDELAY ? process.env.DEVTIMEDDELAY : game.general.timedMode * 1000);
				sendInProgressGameUpdate(game);
			}
		} else {
			sendInProgressGameUpdate(game);
			addPreviousGovernmentStatus();
			startElection(game);
		}

		game.trackState.electionTrackerCount = 0;
	}, process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 1000 : 4000);
};
module.exports.enactPolicy = enactPolicy;

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

	const libCount = game.customGameSettings.deckState.lib - game.trackState.liberalPolicyCount;
	const fasCount = game.customGameSettings.deckState.fas - game.trackState.fascistPolicyCount;
	game.private.policies = _.shuffle(
		_.range(0, libCount)
			.map(num => 'liberal')
			.concat(_.range(0, fasCount).map(num => 'fascist'))
	);

	game.gameState.undrawnPolicyCount = game.private.policies.length;

	if (!game.general.disableGamechat) {
		const chat = {
			timestamp: new Date(),
			gameChat: true,
			chat: [
				{
					text: 'Deck shuffled: '
				},
				{
					text: `${libCount} liberal`,
					type: 'liberal'
				},
				{
					text: ' and '
				},
				{
					text: `${fasCount} fascist`,
					type: 'fascist'
				},
				{
					text: ' policies.'
				}
			]
		};
		game.private.seatedPlayers.forEach(player => {
			player.gameChats.push(chat);
		});
		game.private.unSeatedGameChats.push(chat);
	}

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
			game.private.seatedPlayers.forEach(player => {
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
