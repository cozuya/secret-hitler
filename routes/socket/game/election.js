const { sendInProgressGameUpdate } = require('../util');
const { startElection, shufflePolicies } = require('./common');
const { selectChancellor } = require('./election-util');
const { sendGameList } = require('../user-requests');
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
const { completeGame } = require('./end-game');
const _ = require('lodash');

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

	sendInProgressGameUpdate(game);

	setTimeout(() => {
		game.trackState.enactedPolicies[index].isFlipped = true;
		sendInProgressGameUpdate(game);
	}, process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 300 : 2000);

	setTimeout(() => {
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
		const presidentPowers = [
			{
				0: null,
				1: null,
				2: [policyPeek, 'The president must examine the top 3 policies.'],
				3: [executePlayer, 'The president must select a player for execution.'],
				4: [executePlayer, 'The president must select a player for execution.'],
				5: null
			},
			{
				0: null,
				1: [investigateLoyalty, 'The president must investigate the party membership of another player.'],
				2: [specialElection, 'The president must select a player for a special election.'],
				3: [executePlayer, 'The president must select a player for execution.'],
				4: [executePlayer, 'The president must select a player for execution.'],
				5: null
			},
			{
				0: [investigateLoyalty, 'The president must investigate the party membership of another player.'],
				1: [investigateLoyalty, 'The president must investigate the party membership of another player.'],
				2: [specialElection, 'The president must select a player for a special election.'],
				3: [executePlayer, 'The president must select a player for execution.'],
				4: [executePlayer, 'The president must select a player for execution.'],
				5: null
			}
		];
		const powerToEnact = team === 'fascist' ? presidentPowers[game.general.type][game.trackState.fascistPolicyCount - 1] : null;

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

			setTimeout(() => {
				game.publicPlayersState.forEach((player, i) => {
					player.cardStatus.isFlipped = true;
				});
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
						game.gameState.timedModeEnabled = false;
						switch (powerToEnact[1]) {
							case 'The president must examine the top 3 policies.':
								selectPolicies({user: game.private.seatedPlayers[game.gameState.presidentIndex].userName}, game);
								break;
							case 'The president must select a player for execution.':
								selectPlayerToExecute({user: game.private.seatedPlayers[game.gameState.presidentIndex].userName}, game,
									// TODO: prevent fas killing hit
									{playerIndex: seatedPlayers.indexOf(_.shuffle(seatedPlayers.filter((player, i) => i !== presidentIndex && !seatedPlayers[i].isDead))[0])}
								);
								break;
							case 'The president must investigate the party membership of another player.':
								selectPartyMembershipInvestigate({user: game.private.seatedPlayers[game.gameState.presidentIndex].userName}, game,
									{playerIndex: seatedPlayers.indexOf(_.shuffle(seatedPlayers.filter((player, i) => i !== presidentIndex))[0])}
								);
								break;
							case 'The president must select a player for a special election.':
								selectSpecialElection({user: game.private.seatedPlayers[game.gameState.presidentIndex].userName}, game,
									{playerIndex: seatedPlayers.indexOf(_.shuffle(seatedPlayers.filter((player, i) => i !== presidentIndex))[0])}
								);
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

/**
 * @param {object} passport - socket authentication.
 * @param {object} game - target game.
 * @param {object} data - socket emit
 */
const selectPresidentVoteOnVeto = (passport, game, data) => {
	const { experiencedMode } = game.general;
	const president = game.private.seatedPlayers[game.gameState.presidentIndex];
	const chancellorIndex = game.publicPlayersState.findIndex(player => player.governmentStatus === 'isChancellor');
	const publicChancellor = game.publicPlayersState[chancellorIndex];
	const publicPresident = game.publicPlayersState[game.gameState.presidentIndex];

	if (president.userName !== passport.user) {
		return;
	}

	game.private.summary = game.private.summary.updateLog({
		presidentVeto: data.vote
	});

	if (
		!game.private.lock.selectPresidentVoteOnVeto &&
		Number.isInteger(chancellorIndex) &&
		game.publicPlayersState[chancellorIndex] &&
		!(game.general.isTourny && game.general.tournyInfo.isCancelled) &&
		president.cardFlingerState &&
		president.cardFlingerState[0]
	) {
		game.private.lock.selectPresidentVoteOnVeto = true;

		game.publicPlayersState[chancellorIndex].isLoader = false;
		publicPresident.isLoader = false;
		president.cardFlingerState[0].action = president.cardFlingerState[1].action = '';
		president.cardFlingerState[0].cardStatus.isFlipped = president.cardFlingerState[1].cardStatus.isFlipped = false;

		if (data.vote) {
			president.cardFlingerState[0].notificationStatus = 'selected';
			president.cardFlingerState[1].notificationStatus = '';
		} else {
			president.cardFlingerState[0].notificationStatus = '';
			president.cardFlingerState[1].notificationStatus = 'selected';
		}

		publicPresident.cardStatus = {
			cardDisplayed: true,
			cardFront: 'ballot',
			cardBack: {
				cardName: data.vote ? 'ja' : 'nein'
			}
		};

		sendInProgressGameUpdate(game);

		setTimeout(() => {
			const chat = {
				timestamp: new Date(),
				gameChat: true,
				chat: [
					{ text: 'President ' },
					{
						text: game.general.blindMode
							? `{${game.private.seatedPlayers.indexOf(president) + 1}}`
							: `${passport.user} {${game.private.seatedPlayers.indexOf(president) + 1}}`,
						type: 'player'
					},
					{
						text: data.vote ? ' has voted to veto this election.' : ' has voted not to veto this election.'
					}
				]
			};

			if (!game.general.disableGamechat) {
				game.private.seatedPlayers.forEach(player => {
					player.gameChats.push(chat);
				});
				game.private.unSeatedGameChats.push(chat);
			}

			publicPresident.cardStatus.isFlipped = true;

			sendInProgressGameUpdate(game);

			if (data.vote) {
				const chat = {
					gameChat: true,
					timestamp: new Date(),
					chat: [
						{
							text: 'The President and Chancellor have voted to veto this election and the election tracker moves forward.'
						}
					]
				};

				game.gameState.pendingChancellorIndex = null;
				game.private.lock.selectChancellorPolicy = game.private.lock.selectPresidentVoteOnVeto = game.private.lock.selectChancellorVoteOnVeto = false;
				game.trackState.electionTrackerCount++;

				if (!game.general.disableGamechat) {
					game.private.seatedPlayers.forEach(player => {
						player.gameChats.push(chat);
					});

					game.private.unSeatedGameChats.push(chat);
				}

				setTimeout(() => {
					president.cardFlingerState = [];
					if (game.trackState.electionTrackerCount >= 3) {
						if (!game.gameState.undrawnPolicyCount) {
							shufflePolicies(game);
						}

						enactPolicy(game, game.private.policies.shift());
					} else {
						startElection(game);
					}
				}, process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 1000 : 3000);
			} else {
				setTimeout(() => {
					publicPresident.cardStatus.cardDisplayed = false;
					publicChancellor.cardStatus.cardDisplayed = false;
					president.cardFlingerState = [];
					enactPolicy(game, game.private.currentElectionPolicies[0]);
					setTimeout(() => {
						publicChancellor.cardStatus.isFlipped = publicPresident.cardStatus.isFlipped = false;
					}, 1000);
				}, process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 1000 : 2000);
			}
		}, process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 500 : 2000);
	}
};

module.exports.selectPresidentVoteOnVeto = selectPresidentVoteOnVeto;

/**
 * @param {object} game - target game.
 * @param {object} data - socket emit
 */
const selectChancellorVoteOnVeto = (passport, game, data) => {
	const { experiencedMode } = game.general;
	const president = game.private.seatedPlayers[game.gameState.presidentIndex];
	const chancellorIndex = game.publicPlayersState.findIndex(player => player.governmentStatus === 'isChancellor');
	const chancellor = game.private.seatedPlayers.find(player => player.userName === game.private._chancellorPlayerName);
	const publicChancellor = game.publicPlayersState[chancellorIndex];
	
	if (passport.user !== publicChancellor.userName) {
		return;
	}

	game.private.summary = game.private.summary.updateLog({
		chancellorVeto: data.vote
	});

	game.private.lock.selectPresidentVoteOnVeto = false;
	if (
		!game.private.lock.selectChancellorVoteOnVeto &&
		chancellor &&
		chancellor.cardFlingerState &&
		chancellor.cardFlingerState.length &&
		game.publicPlayersState[chancellorIndex] &&
		!(game.general.isTourny && game.general.tournyInfo.isCancelled)
	) {
		game.private.lock.selectChancellorVoteOnVeto = true;

		game.publicPlayersState[chancellorIndex].isLoader = false;

		chancellor.cardFlingerState[0].action = chancellor.cardFlingerState[1].action = '';
		chancellor.cardFlingerState[0].cardStatus.isFlipped = chancellor.cardFlingerState[1].cardStatus.isFlipped = false;

		if (data.vote) {
			chancellor.cardFlingerState[0].notificationStatus = 'selected';
			chancellor.cardFlingerState[1].notificationStatus = '';
		} else {
			chancellor.cardFlingerState[0].notificationStatus = '';
			chancellor.cardFlingerState[1].notificationStatus = 'selected';
		}

		publicChancellor.cardStatus = {
			cardDisplayed: true,
			cardFront: 'ballot',
			cardBack: {
				cardName: data.vote ? 'ja' : 'nein'
			}
		};

		sendInProgressGameUpdate(game);

		setTimeout(() => {
			const chat = {
				timestamp: new Date(),
				gameChat: true,
				chat: [
					{ text: 'Chancellor ' },
					{
						text: game.general.blindMode ? `{${chancellorIndex + 1}}` : `${passport.user} {${chancellorIndex + 1}}`,
						type: 'player'
					},
					{
						text: data.vote ? ' has voted to veto this election.' : ' has voted not to veto this election.'
					}
				]
			};

			if (!game.general.disableGamechat) {
				game.private.seatedPlayers.forEach(player => {
					player.gameChats.push(chat);
				});

				game.private.unSeatedGameChats.push(chat);
			}

			publicChancellor.cardStatus.isFlipped = true;
			sendInProgressGameUpdate(game);

			if (data.vote) {
				president.cardFlingerState = [
					{
						position: 'middle-left',
						notificationStatus: '',
						action: 'active',
						cardStatus: {
							isFlipped: false,
							cardFront: 'ballot',
							cardBack: 'ja'
						}
					},
					{
						position: 'middle-right',
						action: 'active',
						notificationStatus: '',
						cardStatus: {
							isFlipped: false,
							cardFront: 'ballot',
							cardBack: 'nein'
						}
					}
				];

				if (!game.general.disableGamechat) {
					president.gameChats.push({
						gameChat: true,
						timestamp: new Date(),
						chat: [
							{
								text:
									'You must vote whether or not to veto these policies.  Select Ja to veto the policies you passed to the Chancellor or select Nein to enact the policy the Chancellor has chosen in secret.'
							}
						]
					});
				}

				game.general.status = 'President to vote on policy veto.';
				sendInProgressGameUpdate(game);
				setTimeout(() => {
					president.cardFlingerState[0].cardStatus.isFlipped = president.cardFlingerState[1].cardStatus.isFlipped = true;
					president.cardFlingerState[0].notificationStatus = president.cardFlingerState[1].notificationStatus = 'notification';
					chancellor.cardFlingerState = [];
					game.publicPlayersState[game.gameState.presidentIndex].isLoader = true;
					game.gameState.phase = 'presidentVoteOnVeto';
					sendInProgressGameUpdate(game);

					if (game.general.timedMode) {
						game.gameState.timedModeEnabled = true;
						game.private.timerId = setTimeout(() => {
							if (game.gameState.timedModeEnabled) {
								game.gameState.timedModeEnabled = false;
								selectPresidentVoteOnVeto({user: president.userName},
														  game,
														  {vote: Boolean(Math.floor(Math.random() * 2))}
							    );
							}
						}, process.env.DEVTIMEDDELAY ? process.env.DEVTIMEDDELAY : game.general.timedMode * 1000);
					}
				}, process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 500 : 1000);
			} else {
				setTimeout(() => {
					publicChancellor.cardStatus.cardDisplayed = false;
					chancellor.cardFlingerState = [];
					setTimeout(() => {
						publicChancellor.cardStatus.isFlipped = false;
					}, 1000);
					enactPolicy(game, game.private.currentElectionPolicies[0]);
				}, process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 500 : 2000);
			}
		}, process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 500 : 2000);
	}
};

module.exports.selectChancellorVoteOnVeto = selectChancellorVoteOnVeto;

// todo check this argument for jsdoc
const handToLog = hand =>
	hand.reduce(
		(hand, policy) => {
			return policy === 'fascist' ? Object.assign({}, hand, { reds: hand.reds + 1 }) : Object.assign({}, hand, { blues: hand.blues + 1 });
		},
		{ reds: 0, blues: 0 }
	);

/**
 * @param {object} passport - socket authentication.
 * @param {object} game - target game.
 * @param {object} data - socket emit
 */
const selectChancellorPolicy = (passport, game, data) => {
	const { experiencedMode } = game.general;
	const presidentIndex = game.publicPlayersState.findIndex(player => player.governmentStatus === 'isPresident');
	const president = game.private.seatedPlayers[presidentIndex];
	const chancellorIndex = game.publicPlayersState.findIndex(player => player.governmentStatus === 'isChancellor');
	const chancellor = game.private.seatedPlayers[chancellorIndex];
	const enactedPolicy = game.private.currentChancellorOptions[data.selection === 3 ? 1 : 0];

	if (chancellor.userName !== passport.user) {
		return;
	}

	game.private.lock.selectPresidentPolicy = false;

	if (game.general.timedMode && game.private.timerId && chancellor && chancellor.cardFlingerState && chancellor.cardFlingerState.length) {
		clearTimeout(game.private.timerId);
		game.gameState.timedModeEnabled = game.private.timerId = null;
	}

	if (
		!game.private.lock.selectChancellorPolicy &&
		chancellor &&
		chancellor.cardFlingerState &&
		chancellor.cardFlingerState.length &&
		!(game.general.isTourny && game.general.tournyInfo.isCancelled)
	) {
		game.private.lock.selectChancellorPolicy = true;

		if (data.selection === 3) {
			chancellor.cardFlingerState[0].notificationStatus = '';
			chancellor.cardFlingerState[1].notificationStatus = 'selected';
		} else {
			chancellor.cardFlingerState[0].notificationStatus = 'selected';
			chancellor.cardFlingerState[1].notificationStatus = '';
		}

		game.publicPlayersState[chancellorIndex].isLoader = false;
		chancellor.cardFlingerState[0].action = chancellor.cardFlingerState[1].action = '';
		chancellor.cardFlingerState[0].cardStatus.isFlipped = chancellor.cardFlingerState[1].cardStatus.isFlipped = false;

		if (game.gameState.isVetoEnabled) {
			game.private.currentElectionPolicies = [enactedPolicy];
			game.general.status = 'Chancellor to vote on policy veto.';
			sendInProgressGameUpdate(game);

			setTimeout(() => {
				const chat = {
					gameChat: true,
					timestamp: new Date(),
					chat: [
						{
							text: 'You must vote whether or not to veto these policies.  Select Ja to veto the your chosen policy or select Nein to enact your chosen policy.'
						}
					]
				};

				game.publicPlayersState[chancellorIndex].isLoader = true;

				chancellor.cardFlingerState = [
					{
						position: 'middle-left',
						notificationStatus: '',
						action: 'active',
						cardStatus: {
							isFlipped: false,
							cardFront: 'ballot',
							cardBack: 'ja'
						}
					},
					{
						position: 'middle-right',
						action: 'active',
						notificationStatus: '',
						cardStatus: {
							isFlipped: false,
							cardFront: 'ballot',
							cardBack: 'nein'
						}
					}
				];

				if (!game.general.disableGamechat) {
					chancellor.gameChats.push(chat);
				}

				sendInProgressGameUpdate(game);

				setTimeout(() => {
					chancellor.cardFlingerState[0].cardStatus.isFlipped = chancellor.cardFlingerState[1].cardStatus.isFlipped = true;
					chancellor.cardFlingerState[0].notificationStatus = chancellor.cardFlingerState[1].notificationStatus = 'notification';
					game.gameState.phase = 'chancellorVoteOnVeto';

					if (game.general.timedMode) {
						game.gameState.timedModeEnabled = true;//(passport, game, data)
						game.private.timerId = setTimeout(() => {
							if (game.gameState.timedModeEnabled) {
								game.gameState.timedModeEnabled = false;

								selectChancellorVoteOnVeto({user: chancellor.userName},
														   game,
														   {vote: Boolean(Math.floor(Math.random() * 2))}
								);
							}
						}, process.env.DEVTIMEDDELAY ? process.env.DEVTIMEDDELAY : game.general.timedMode * 1000);
					}

					sendInProgressGameUpdate(game);
				}, process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 500 : 1000);
			}, process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 1000 : 2000);
		} else {
			game.private.currentElectionPolicies = [];
			game.gameState.phase = 'enactPolicy';
			sendInProgressGameUpdate(game);
			setTimeout(() => {
				chancellor.cardFlingerState = [];
				enactPolicy(game, enactedPolicy);
			}, experiencedMode ? 200 : 2000);
		}
		if (experiencedMode) {
			president.playersState[presidentIndex].claim = 'wasPresident';
			chancellor.playersState[chancellorIndex].claim = 'wasChancellor';
		} else {
			setTimeout(() => {
				president.playersState[presidentIndex].claim = 'wasPresident';
				chancellor.playersState[chancellorIndex].claim = 'wasChancellor';
				sendInProgressGameUpdate(game);
			}, 3000);
		}
	}
};

module.exports.selectChancellorPolicy = selectChancellorPolicy;

/**
 * @param {object} passport - socket authentication.
 * @param {object} game - target game.
 * @param {object} data - socket emit
 */
const selectPresidentPolicy = (passport, game, data) => {
	const { presidentIndex } = game.gameState;
	const president = game.private.seatedPlayers[presidentIndex];
	const chancellorIndex = game.publicPlayersState.findIndex(player => player.governmentStatus === 'isChancellor');
	const chancellor = game.private.seatedPlayers[chancellorIndex];
	const nonDiscardedPolicies = _.range(0, 3).filter(num => num !== data.selection);

	if (president.userName !== passport.user) {
		return;
	}

	if (
		game.general.timedMode &&
		game.private.timerId &&
		president &&
		president.cardFlingerState &&
		president.cardFlingerState.length &&
		Number.isInteger(chancellorIndex) &&
		game.publicPlayersState[chancellorIndex]
	) {
		clearTimeout(game.private.timerId);
		game.gameState.timedModeEnabled = game.private.timerId = null;
	}

	if (
		!game.private.lock.selectPresidentPolicy &&
		president &&
		president.cardFlingerState &&
		president.cardFlingerState.length &&
		Number.isInteger(chancellorIndex) &&
		game.publicPlayersState[chancellorIndex] &&
		!(game.general.isTourny && game.general.tournyInfo.isCancelled)
	) {
		game.private.lock.selectPresidentPolicy = true;
		game.publicPlayersState[presidentIndex].isLoader = false;
		game.publicPlayersState[chancellorIndex].isLoader = true;

		try {
			if (data.selection === 0) {
				president.cardFlingerState[0].notificationStatus = 'selected';
				president.cardFlingerState[1].notificationStatus = president.cardFlingerState[2].notificationStatus = '';
			} else if (data.selection === 1) {
				president.cardFlingerState[0].notificationStatus = president.cardFlingerState[2].notificationStatus = '';
				president.cardFlingerState[1].notificationStatus = 'selected';
			} else {
				president.cardFlingerState[0].notificationStatus = president.cardFlingerState[1].notificationStatus = '';
				president.cardFlingerState[2].notificationStatus = 'selected';
			}
		} catch (error) {
			console.log(error, 'caught exception in president cardflinger');
			return;
		}

		game.private.summary = game.private.summary.updateLog({
			chancellorHand: handToLog(game.private.currentElectionPolicies.filter((p, i) => i !== data.selection))
		});
		game.private.currentChancellorOptions = [
			game.private.currentElectionPolicies[nonDiscardedPolicies[0]],
			game.private.currentElectionPolicies[nonDiscardedPolicies[1]]
		];

		president.cardFlingerState[0].action = president.cardFlingerState[1].action = president.cardFlingerState[2].action = '';
		president.cardFlingerState[0].cardStatus.isFlipped = president.cardFlingerState[1].cardStatus.isFlipped = president.cardFlingerState[2].cardStatus.isFlipped = false;

		chancellor.cardFlingerState = [
			{
				position: 'middle-left',
				action: 'active',
				cardStatus: {
					isFlipped: false,
					cardFront: 'policy',
					cardBack: `${game.private.currentElectionPolicies[nonDiscardedPolicies[0]]}p`
				}
			},
			{
				position: 'middle-right',
				action: 'active',
				cardStatus: {
					isFlipped: false,
					cardFront: 'policy',
					cardBack: `${game.private.currentElectionPolicies[nonDiscardedPolicies[1]]}p`
				}
			}
		];

		game.general.status = 'Waiting on chancellor enactment.';
		game.gameState.phase = 'chancellorSelectingPolicy';

		if (!game.general.experiencedMode && !game.general.disableGamechat) {
			chancellor.gameChats.push({
				timestamp: new Date(),
				gameChat: true,
				chat: [{ text: 'As chancellor, you must select a policy to enact.' }]
			});
		}

		sendInProgressGameUpdate(game);

		setTimeout(() => {
			president.cardFlingerState = [];
			chancellor.cardFlingerState.forEach(cardFlinger => {
				cardFlinger.cardStatus.isFlipped = true;
			});
			chancellor.cardFlingerState.forEach(cardFlinger => {
				cardFlinger.notificationStatus = 'notification';
			});

			if (game.general.timedMode) {
				game.gameState.timedModeEnabled = true;
				game.private.timerId = setTimeout(() => {
					if (game.gameState.timedModeEnabled) {
						const isRightPolicy = Boolean(Math.floor(Math.random() * 2));

						selectChancellorPolicy({user: chancellor.userName},
											   game,
											   {selection: isRightPolicy ? 3 : 1});
					}
				}, process.env.DEVTIMEDDELAY ? process.env.DEVTIMEDDELAY : game.general.timedMode * 1000);
			}

			sendInProgressGameUpdate(game);
		}, game.general.experiencedMode ? 200 : 2000);
	}
};

module.exports.selectPresidentPolicy = selectPresidentPolicy;

/**
 * @param {object} passport - socket authentication.
 * @param {object} game - target game.
 * @param {object} data from socket emit
 */
module.exports.selectVoting = (passport, game, data) => {
	const { seatedPlayers } = game.private;
	const { experiencedMode } = game.general;
	const player = seatedPlayers.find(player => player.userName === passport.user);
	const playerIndex = seatedPlayers.findIndex(play => play.userName === passport.user);
	const failedElection = () => {
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
				seatedPlayers.forEach(player => {
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

						selectChancellor(null,
						    {user: game.private.seatedPlayers[game.gameState.presidentIndex].userName},
							game,
							{chancellorIndex: chancellorIndex}
						);
					}
				}, process.env.DEVTIMEDDELAY ? process.env.DEVTIMEDDELAY : game.general.timedMode * 1000);
			}

			setTimeout(() => {
				startElection(game);
			}, process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 500 : 2000);
		}
	};
	const passedElection = () => {
		const { gameState } = game;
		const { presidentIndex } = gameState;
		const chancellorIndex = game.publicPlayersState.findIndex(player => player.governmentStatus === 'isChancellor');

		game.private._chancellorPlayerName = game.private.seatedPlayers[chancellorIndex].userName;

		if (game.gameState.previousElectedGovernment.length) {
			game.private.seatedPlayers[game.gameState.previousElectedGovernment[0]].playersState[game.gameState.previousElectedGovernment[0]].claim = '';
			game.private.seatedPlayers[game.gameState.previousElectedGovernment[1]].playersState[game.gameState.previousElectedGovernment[1]].claim = '';
		}

		game.general.status = 'Waiting on presidential discard.';
		game.publicPlayersState[presidentIndex].isLoader = true;
		if (!experiencedMode && !game.general.disableGamechat) {
			seatedPlayers[presidentIndex].gameChats.push({
				timestamp: new Date(),
				gameChat: true,
				chat: [{ text: 'As president, you must select one policy to discard.' }]
			});
		}

		if (gameState.undrawnPolicyCount < 3) {
			shufflePolicies(game);
		}

		gameState.undrawnPolicyCount--;
		game.private.currentElectionPolicies = [game.private.policies.shift(), game.private.policies.shift(), game.private.policies.shift()];

		game.private.summary = game.private.summary.updateLog({
			presidentHand: handToLog(game.private.currentElectionPolicies)
		});

		seatedPlayers[presidentIndex].cardFlingerState = [
			{
				position: 'middle-far-left',
				action: 'active',
				cardStatus: {
					isFlipped: false,
					cardFront: 'policy',
					cardBack: `${game.private.currentElectionPolicies[0]}p`
				}
			},
			{
				position: 'middle-center',
				action: 'active',
				cardStatus: {
					isFlipped: false,
					cardFront: 'policy',
					cardBack: `${game.private.currentElectionPolicies[1]}p`
				}
			},
			{
				position: 'middle-far-right',
				action: 'active',
				cardStatus: {
					isFlipped: false,
					cardFront: 'policy',
					cardBack: `${game.private.currentElectionPolicies[2]}p`
				}
			}
		];
		sendInProgressGameUpdate(game);
		setTimeout(() => {
			gameState.undrawnPolicyCount--;
			sendInProgressGameUpdate(game);
		}, 200);
		setTimeout(() => {
			gameState.undrawnPolicyCount--;
			sendInProgressGameUpdate(game);
		}, 400);
		setTimeout(() => {
			seatedPlayers[presidentIndex].cardFlingerState[0].cardStatus.isFlipped = seatedPlayers[
				presidentIndex
			].cardFlingerState[1].cardStatus.isFlipped = seatedPlayers[presidentIndex].cardFlingerState[2].cardStatus.isFlipped = true;
			seatedPlayers[presidentIndex].cardFlingerState[0].notificationStatus = seatedPlayers[
				presidentIndex
			].cardFlingerState[1].notificationStatus = seatedPlayers[presidentIndex].cardFlingerState[2].notificationStatus = 'notification';
			gameState.phase = 'presidentSelectingPolicy';

			game.gameState.previousElectedGovernment = [presidentIndex, chancellorIndex];

			if (game.general.timedMode) {
				game.gameState.timedModeEnabled = true;
				game.private.timerId = setTimeout(() => {
					if (game.gameState.timedModeEnabled) {
						game.gameState.timedModeEnabled = false;
						selectPresidentPolicy(
							{user: seatedPlayers[presidentIndex].userName},
							game,
							{selection: Math.floor(Math.random() * 3)}
						);
					}
				}, process.env.DEVTIMEDDELAY ? process.env.DEVTIMEDDELAY : game.general.timedMode * 1000);
			}
			sendInProgressGameUpdate(game);
		}, experiencedMode ? 200 : 600);
	};
	const flipBallotCards = () => {
		const isConsensus = game.publicPlayersState
			.filter(player => !player.isDead)
			.every((el, i) => seatedPlayers[i].voteStatus.didVoteYes === seatedPlayers[0].voteStatus.didVoteYes);

		game.publicPlayersState.forEach((player, i) => {
			if (!player.isDead) {
				player.cardStatus.cardBack.cardName = seatedPlayers[i].voteStatus.didVoteYes ? 'ja' : 'nein';
				player.cardStatus.isFlipped = true;
			}
		});

		game.private.summary = game.private.summary.updateLog({
			votes: seatedPlayers.map(p => p.voteStatus.didVoteYes)
		});

		sendInProgressGameUpdate(game);

		setTimeout(() => {
			const chat = {
				timestamp: new Date(),
				gameChat: true
			};

			game.publicPlayersState.forEach((play, i) => {
				play.cardStatus.cardDisplayed = false;
			});

			setTimeout(() => {
				game.publicPlayersState.forEach((play, i) => {
					play.cardStatus.isFlipped = false;
				});
				sendInProgressGameUpdate(game);
			}, process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 500 : 2000);

			if (seatedPlayers.filter(play => play.voteStatus.didVoteYes && !play.isDead).length / game.general.livingPlayerCount > 0.5) {
				const chancellorIndex = game.gameState.pendingChancellorIndex;
				const { presidentIndex } = game.gameState;

				game.publicPlayersState[presidentIndex].governmentStatus = 'isPresident';

				game.publicPlayersState[chancellorIndex].governmentStatus = 'isChancellor';
				chat.chat = [{ text: 'The election passes.' }];

				if (!experiencedMode && !game.general.disableGamechat) {
					seatedPlayers.forEach(player => {
						player.gameChats.push(chat);
					});

					game.private.unSeatedGameChats.push(chat);
				}

				if (game.trackState.fascistPolicyCount > 2 && game.private.seatedPlayers[chancellorIndex].role.cardName === 'hitler') {
					const chat = {
						timestamp: new Date(),
						gameChat: true,
						chat: [
							{
								text: 'Hitler',
								type: 'hitler'
							},
							{
								text: ' has been elected chancellor after the 3rd fascist policy has been enacted.'
							}
						]
					};

					setTimeout(() => {
						game.publicPlayersState.forEach((player, i) => {
							player.cardStatus.cardFront = 'secretrole';
							player.cardStatus.cardDisplayed = true;
							player.cardStatus.cardBack = seatedPlayers[i].role;
						});

						if (!game.general.disableGamechat) {
							seatedPlayers.forEach(player => {
								player.gameChats.push(chat);
							});

							game.private.unSeatedGameChats.push(chat);
						}
						sendInProgressGameUpdate(game);
					}, process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 1000 : 3000);

					setTimeout(() => {
						game.publicPlayersState.forEach(player => {
							player.cardStatus.isFlipped = true;
						});
						completeGame(game, 'fascist');
					}, process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 2000 : 4000);
				} else {
					passedElection();
				}
			} else {
				if (!game.general.disableGamechat) {
					chat.chat = [
						{
							text: 'The election fails and the election tracker moves forward.'
						}
					];

					seatedPlayers.forEach(player => {
						player.gameChats.push(chat);
					});

					game.private.unSeatedGameChats.push(chat);
					game.gameState.pendingChancellorIndex = null;
				}

				failedElection();
			}

			sendInProgressGameUpdate(game);
		}, process.env.NODE_ENV === 'development' ? 2100 : isConsensus ? 1500 : 6000);
	};

	if (game.general.isTourny && game.general.tournyInfo.isCancelled) {
		return;
	}

	if (game.private.lock.selectChancellor) {
		game.private.lock.selectChancellor = false;
	}

	if (seatedPlayers.length !== seatedPlayers.filter(play => play && play.voteStatus && play.voteStatus.hasVoted).length && player && player.voteStatus) {
		player.voteStatus.hasVoted = !player.voteStatus.hasVoted ? true : player.voteStatus.didVoteYes ? !data.vote : data.vote;
		player.voteStatus.didVoteYes = player.voteStatus.hasVoted ? data.vote : false;
		game.publicPlayersState[playerIndex].isLoader = !player.voteStatus.hasVoted;

		if (data.vote) {
			player.cardFlingerState = [
				{
					position: 'middle-left',
					notificationStatus: !player.voteStatus.hasVoted ? 'notification' : 'selected',
					action: 'active',
					cardStatus: {
						isFlipped: true,
						cardFront: 'ballot',
						cardBack: 'ja'
					}
				},
				{
					position: 'middle-right',
					notificationStatus: 'notification',
					action: 'active',
					cardStatus: {
						isFlipped: true,
						cardFront: 'ballot',
						cardBack: 'nein'
					}
				}
			];
		} else {
			player.cardFlingerState = [
				{
					position: 'middle-left',
					notificationStatus: 'notification',
					action: 'active',
					cardStatus: {
						isFlipped: true,
						cardFront: 'ballot',
						cardBack: 'ja'
					}
				},
				{
					position: 'middle-right',
					notificationStatus: !player.voteStatus.hasVoted ? 'notification' : 'selected',
					action: 'active',
					cardStatus: {
						isFlipped: true,
						cardFront: 'ballot',
						cardBack: 'nein'
					}
				}
			];
		}

		sendInProgressGameUpdate(game);

		if (seatedPlayers.filter(play => play.voteStatus.hasVoted && !play.isDead).length === game.general.livingPlayerCount) {
			game.general.status = 'Tallying results of ballots..';
			seatedPlayers.forEach(player => {
				if (player.cardFlingerState.length) {
					player.cardFlingerState[0].action = player.cardFlingerState[1].action = '';
					player.cardFlingerState[0].action = player.cardFlingerState[1].action = '';
					player.cardFlingerState[0].cardStatus.isFlipped = player.cardFlingerState[1].cardStatus.isFlipped = false;
				}
			});
			sendInProgressGameUpdate(game);
			setTimeout(() => {
				seatedPlayers.forEach(player => {
					player.cardFlingerState = [];
					sendInProgressGameUpdate(game);
				});
			}, experiencedMode ? 200 : 2000);
			setTimeout(() => {
				if (game.general.timedMode && game.private.timerId) {
					clearTimeout(game.private.timerId);
					game.gameState.timedModeEnabled = game.private.timerId = null;
				}
				flipBallotCards();
			}, process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 2500 : 3000);
		}
	}
};

module.exports.startElection = startElection;
