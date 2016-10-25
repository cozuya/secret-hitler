const {sendInProgressGameUpdate} = require('../util.js'),
	{startElection, shufflePolicies} = require('./common.js'),
	{specialElection, policyPeek, investigateLoyalty, executePlayer} = require('./policy-powers.js'),
	{completeGame} = require('./end-game.js'),
	{games} = require('../models.js'),
	_ = require('lodash');

module.exports.selectChancellor = data => {
	const game = games.find(el => el.general.uid === data.uid),
		{chancellorIndex} = data,
		{presidentIndex} = game.gameState,
		{seatedPlayers} = game.private,
		presidentPlayer = game.private.seatedPlayers[presidentIndex],
		chancellorPlayer = game.private.seatedPlayers[chancellorIndex];

	game.publicPlayersState[presidentIndex].isLoader = false;

	presidentPlayer.playersState.forEach(player => {
		player.notificationStatus = '';
	});

	game.publicPlayersState[chancellorIndex].governmentStatus = 'isPendingChancellor';
	game.general.status = `Vote on election #${game.general.electionCount} now.`;

	game.publicPlayersState.forEach(player => {
		player.isLoader = true;
		player.cardStatus = {
			cardDisplayed: true,
			isFlipped: false,
			cardFront: 'ballot',
			cardBack: {}
		};
	});

	sendInProgressGameUpdate(game);

	seatedPlayers.forEach(player => {
		player.gameChats.push({
			gameChat: true,
			timestamp: new Date(),
			chat: [{
				text: 'You must vote for the election of president '
			},
			{
				text: presidentPlayer.userName,
				type: 'player'
			},
			{
				text: ' and chancellor '
			},
			{
				text: chancellorPlayer.userName,
				type: 'player'
			},
			{
				text: '.'
			}]
		});

		player.cardFlingerState = [
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
	});

	setTimeout(() => {
		sendInProgressGameUpdate(game);
	}, 1000);

	setTimeout(() => {
		game.gameState.phase = 'voting';
		seatedPlayers.forEach(player => {
			player.cardFlingerState[0].cardStatus.isFlipped = player.cardFlingerState[1].cardStatus.isFlipped = true;
			player.cardFlingerState[0].notificationStatus = player.cardFlingerState[1].notificationStatus = 'notification';
			player.voteStatus = {
				hasVoted: false
			};
		});
		sendInProgressGameUpdate(game);
	}, 1500);
};

module.exports.selectVoting = data => {
	const game = games.find(el => el.general.uid === data.uid),
		{seatedPlayers} = game.private,
		player = seatedPlayers.find(player => player.userName === data.userName),
		playerIndex = seatedPlayers.findIndex(play => play.userName === data.userName);

	player.voteStatus.hasVoted = true;
	player.voteStatus.didVoteYes = data.vote;
	game.publicPlayersState[playerIndex].isLoader = false;

	if (data.vote) {
		player.cardFlingerState[0].notificationStatus = 'selected';
		player.cardFlingerState[1].notificationStatus = '';
	} else {
		player.cardFlingerState[0].notificationStatus = '';
		player.cardFlingerState[1].notificationStatus = 'selected';
	}

	player.cardFlingerState[0].action = player.cardFlingerState[1].action = '';
	player.cardFlingerState[0].cardStatus.isFlipped = player.cardFlingerState[1].cardStatus.isFlipped = false;

	sendInProgressGameUpdate(game);

	setTimeout(() => {
		player.cardFlingerState = [];
		sendInProgressGameUpdate(game);
	}, 2000);

	if (seatedPlayers.filter(play => play.voteStatus.hasVoted).length === game.general.livingPlayerCount) {
		game.general.status = 'Tallying results of ballots..';
		sendInProgressGameUpdate(game);
		setTimeout(() => {
			flipBallotCards();
		// }, 4000);
		}, 1000);
	}

	function flipBallotCards () {
		game.publicPlayersState.forEach((play, i) => {
			play.cardStatus.cardBack.cardName = seatedPlayers[i].voteStatus.didVoteYes ? 'ja' : 'nein';
			play.cardStatus.isFlipped = true;
		});

		sendInProgressGameUpdate(game);

		setTimeout(() => {
			seatedPlayers.forEach(play => {
				play.cardFlingerState = [];
			});
			sendInProgressGameUpdate(game);
		}, 2000);

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
			}, 2000);

			if (seatedPlayers.filter(play => play.voteStatus.didVoteYes).length / game.general.livingPlayerCount > 0.5) {
				const chancellorIndex = game.publicPlayersState.findIndex(player => player.governmentStatus === 'isPendingChancellor'),
					{presidentIndex} = game.gameState;

				game.publicPlayersState[presidentIndex].governmentStatus = 'isPresident';
				game.publicPlayersState[chancellorIndex].governmentStatus = 'isChancellor';
				chat.chat = [{text: 'The election passes.'}];

				seatedPlayers.forEach(player => {
					player.gameChats.push(chat);
				});

				game.private.unSeatedGameChats.push(chat);

				// if (game.trackState.fascistPolicyCount > 3 && game.private.seatedPlayers[game.publicPlayersState.findIndex(player => player.governmentStatus === 'isPendingChancellor')].role.cardName === 'hitler') {
				if (true && game.private.seatedPlayers[chancellorIndex].role.cardName === 'hitler') {
					const chat = {
						timestamp: new Date(),
						gameChat: true,
						chat: [{text: 'Hitler has been elected chancellor and the '},
							{
								text: 'fascists',
								type: 'fascist'
							},
						{text: ' win the game.'}]
					};

					setTimeout(() => {
						game.publicPlayersState.forEach((player, i) => {
							player.cardStatus.cardDisplayed = true;
							player.cardStatus.cardBack = seatedPlayers[i].role;
						});

						seatedPlayers.forEach(player => {
							player.gameChats.push(chat);
						});

						game.private.unSeatedGameChats.push(chat);
						sendInProgressGameUpdate(game);
					}, 3000);

					setTimeout(() => {
						game.publicPlayersState.forEach(player => {
							player.cardStatus.isFlipped = true;
						});
						completeGame(game, 'fascist');
					}, 4000);
				} else {
					passedElection();
				}
			} else {
				chat.chat = [{text: 'The election fails and the election tracker moves forward.'}];

				seatedPlayers.forEach(player => {
					player.gameChats.push(chat);
				});

				game.private.unSeatedGameChats.push(chat);
				failedElection();
			}

			sendInProgressGameUpdate(game);
		// }, 6000);
		}, 2100);
	}

	function failedElection () {
		game.trackState.electionTrackerCount++;

		if (game.trackState.electionTrackerCount === 3) {
			const chat = {
				timestamp: new Date(),
				gameChat: true,
				chat: [{text: 'The third consecutive election has failed and the top policy is enacted.'}]
			};

			game.private.unSeatedGameChats.push(chat);
			game.private.seatedPlayers.forEach(player => {
				player.gameChats.push(chat);
			});
			game.gameState.undrawnPolicyCount--;
			setTimeout(() => {
				enactPolicy(game, game.private.policies.pop());
			}, 2000);
		} else {
			game.gameState.presidentIndex = game.gameState.presidentIndex === game.general.livingPlayerCount ? 0 : game.gameState.presidentIndex + 1; // todo-alpha skip dead players
			setTimeout(() => {
				startElection(game);
			}, 2000);
		}
	}

	function passedElection () {
		const {presidentIndex} = game.gameState,
			chancellorIndex = game.publicPlayersState.findIndex(player => player.governmentStatus === 'isPendingChancellor');

		let {policies} = game.private;

		game.general.status = 'Waiting on presidential discard.';
		game.publicPlayersState[presidentIndex].isLoader = true;
		game.private.seatedPlayers[presidentIndex].gameChats.push({
			timestamp: new Date(),
			gameChat: true,
			chat: [{text: 'As president, you must select one policy to discard.'}]
		});

		if (game.gameState.undrawnPolicyCount < 3) {
			policies = shufflePolicies(policies);
			game.gameState.undrawnPolicyCount = 17;
		}

		game.gameState.undrawnPolicyCount--;
		game.private.currentElectionPolicies = [policies.shift(), policies.shift(), policies.shift()];
		game.private.seatedPlayers[presidentIndex].cardFlingerState = [
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
			game.gameState.undrawnPolicyCount--;
			sendInProgressGameUpdate(game);
		}, 200);
		setTimeout(() => {
			game.gameState.undrawnPolicyCount--;
			sendInProgressGameUpdate(game);
		}, 400);
		setTimeout(() => {
			game.private.seatedPlayers[presidentIndex].cardFlingerState[0].cardStatus.isFlipped = game.private.seatedPlayers[presidentIndex].cardFlingerState[1].cardStatus.isFlipped = game.private.seatedPlayers[presidentIndex].cardFlingerState[2].cardStatus.isFlipped = true;
			game.private.seatedPlayers[presidentIndex].cardFlingerState[0].notificationStatus = game.private.seatedPlayers[presidentIndex].cardFlingerState[1].notificationStatus = game.private.seatedPlayers[presidentIndex].cardFlingerState[2].notificationStatus = 'notification';
			game.gameState.phase = 'presidentSelectingPolicy';
			game.gameState.previousElectedGovernment = [presidentIndex, chancellorIndex];
			sendInProgressGameUpdate(game);
		}, 1000);
	}
};

module.exports.selectPresidentPolicy = data => {
	const game = games.find(el => el.general.uid === data.uid),
		{presidentIndex} = game.gameState,
		president = game.private.seatedPlayers[presidentIndex],
		chancellorIndex = game.publicPlayersState.findIndex(player => player.governmentStatus === 'isChancellor'),
		chancellor = game.private.seatedPlayers[chancellorIndex],
		nonDiscardedPolicies = _.range(0, 3).filter(num => num !== data.selection);

	game.publicPlayersState[presidentIndex].isLoader = false;
	game.publicPlayersState[chancellorIndex].isLoader = true;

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

	president.cardFlingerState[0].action = president.cardFlingerState[1].action = president.cardFlingerState[2].action = '';
	president.cardFlingerState[0].cardStatus.isFlipped = president.cardFlingerState[1].cardStatus.isFlipped = president.cardFlingerState[2].cardStatus.isFlipped = false;
	game.gameState.discardedPolicyCount++;
	console.log(data);
	console.log(game.private.currentElectionPolicies);
	game.private.currentElectionPolicies.splice(data.selection, 1);
	// todo-alpha remove this
	if (game.trackState.fascistPolicyCount === 5) {
	// if (game.trackState.fascistPolicyCount === 0) {
		game.general.status = 'Waiting on chancellor enactment or veto.';
		chancellor.cardFlingerState = [{
			position: 'middle-far-left',
			action: 'active',
			cardStatus: {
				isFlipped: false,
				cardFront: 'policy',
				cardBack: `${game.private.currentElectionPolicies[nonDiscardedPolicies[0]]}p`
			}
		},
		{
			position: 'middle-center',
			action: 'active',
			cardStatus: {
				isFlipped: false,
				cardFront: 'policy',
				cardBack: `${game.private.currentElectionPolicies[nonDiscardedPolicies[1]]}p`
			}
		},
		{
			position: 'middle-far-right',
			action: 'active',
			cardStatus: {
				isFlipped: false,
				cardFront: 'policy',
				cardBack: 'veto'
			}
		}];
	} else {
		chancellor.cardFlingerState = [{
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
		}];
		game.general.status = 'Waiting on chancellor enactment.';
	}

	game.gameState.phase = 'chancellorSelectingPolicy';
	chancellor.gameChats.push({
		timestamp: new Date(),
		gameChat: true,
		chat: [{text: game.trackState.fascistPolicyCount === 5 ? 'As chancellor, you must select one policy to enact or veto this election.' : 'As chancellor, you must select a policy to enact.'}]
	});

	sendInProgressGameUpdate(game);
	setTimeout(() => {
		president.cardFlingerState = [];
		chancellor.cardFlingerState.forEach(cardFlinger => {
			cardFlinger.cardStatus.isFlipped = true;
		});
		chancellor.cardFlingerState.forEach(cardFlinger => {
			cardFlinger.notificationStatus = 'notification';
		});
		sendInProgressGameUpdate(game);
	}, 2000);
};

module.exports.selectChancellorPolicy = data => {
	const game = games.find(el => el.general.uid === data.uid),
		chancellorIndex = game.publicPlayersState.findIndex(player => player.governmentStatus === 'isChancellor'),
		chancellor = game.private.seatedPlayers[chancellorIndex],
		president = game.private.seatedPlayers[game.gameState.presidentIndex],
		enactedPolicy = (() => {
			const {currentElectionPolicies} = game.private,
				policy = currentElectionPolicies[data.selection === 1 ? 0 : 1];

			if (game.trackState.fascistPolicyCount === 5) {
			// todo-alpha remove
			// if (game.trackState.fascistPolicyCount === 0) {
				// todo-alpha fix this, doesn't work at all.
				// if (data.selection === 1) {
				// 	return policy || currentElectionPolicies[1];
				// } else if (data.selection === 2) {
				// 	return policy || currentElectionPolicies[2];
				// } else if (data.selection === 4) {
				// 	return policy;
				// }
				// return currentElectionPolicies[2];
			// } else if (data.selection === 1) {
			// 	return policy || currentElectionPolicies[1];
			// } else if (data.selection === 1) {
			// 	return policy || currentElectionPolicies[2];
			}
			return policy;
		})();
	if (enactedPolicy === 'veto') {
		const chat = {
			timestamp: new Date(),
			gameChat: true,
			chat: [
				{text: 'Chancellor '},
				{
					text: chancellor.userName,
					type: 'player'
				},
				{text: ' has voted to veto this election'}]
		};

		game.private.unSeatedGameChats.push(chat);
		game.private.seatedPlayers.forEach(player => {
			player.gameChats.push(chat);
		});
		game.general.status = 'President to vote on veto';

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
		// todo-alpha finish this functionality
	} else {
		game.publicPlayersState[chancellorIndex].isLoader = false;
		game.general.status = 'A policy is being enacted.';
		if (data.selection === 3) {
			chancellor.cardFlingerState[0].notificationStatus = '';
			chancellor.cardFlingerState[1].notificationStatus = 'selected';
		} else {
			chancellor.cardFlingerState[0].notificationStatus = 'selected';
			chancellor.cardFlingerState[1].notificationStatus = '';
		}

		chancellor.cardFlingerState[0].action = chancellor.cardFlingerState[1].action = '';
		chancellor.cardFlingerState[0].cardStatus.isFlipped = chancellor.cardFlingerState[1].cardStatus.isFlipped = false;
		game.private.currentElectionPolicies = [];
		game.gameState.discardedPolicyCount++;
		game.gameState.phase = 'enactPolicy';
		sendInProgressGameUpdate(game);
		setTimeout(() => {
			chancellor.cardFlingerState = [];
			enactPolicy(game, enactedPolicy);
		// }, 4000);
		}, 1000);
	}
};

function enactPolicy (game, team) {
	const index = game.trackState.enactedPolicies.length;

	game.trackState[`${team}PolicyCount`]++;
	game.trackState.enactedPolicies.push({
		position: 'middle',
		cardBack: team,
		isFlipped: false
	});

	sendInProgressGameUpdate(game);

	setTimeout(() => {
		game.trackState.enactedPolicies[index].isFlipped = true;
		sendInProgressGameUpdate(game);
	// }, 4000);
	}, 1000);

	setTimeout(() => {
		const chat = {
				timestamp: new Date(),
				gameChat: true,
				chat: [{text: 'A '},
					{
						text: team === 'liberal' ? 'liberal' : 'fascist',
						type: team === 'liberal' ? 'liberal' : 'fascist'
					},
				{text: ` policy has been enacted. (${team === 'liberal' ? game.trackState.liberalPolicyCount.toString() : game.trackState.fascistPolicyCount.toString()}/${team === 'liberal' ? '5' : '6'})`}]
			},
			// presidentPowers = [
			// 	{
			// 		2: [policyPeek, 'The president must examine the top 3 policies.'],
			// 		3: [executePlayer, 'The president must select a player for execution.'],
			// 		4: [executePlayer, 'The president must select a player for execution.']
			// 	},
			// 	{
			// 		1: [investigateLoyalty, 'The president must investigate another player\'s party membership.'],
			// 		2: [specialElection, 'The president must select a player for a special election'],
			// 		3: [executePlayer, 'The president must select a player for execution.'],
			// 		4: [executePlayer, 'The president must select a player for execution.']
			// 	},
			// 	{
			// 		0: [investigateLoyalty, 'The president must investigate another player\'s party membership.'],
			// 		1: [investigateLoyalty, 'The president must investigate another player\'s party membership.'],
			// 		2: [specialElection, 'The president must select a player for a special election'],
			// 		3: [executePlayer, 'The president must select a player for execution.'],
			// 		4: [executePlayer, 'The president must select a player for execution.']
			// 	}
			// ],
			presidentPowers = [
				{
					0: [executePlayer, 'The president must select a player for execution.']
				}
			],
			powerToEnact = team === 'fascist' ? presidentPowers[game.general.type][game.trackState.fascistPolicyCount - 1] : null;

		game.trackState.enactedPolicies[index].position = team === 'liberal' ? `liberal${game.trackState.liberalPolicyCount}` : `fascist${game.trackState.fascistPolicyCount}`;

		game.private.seatedPlayers.forEach(player => {
			player.gameChats.push(chat);
		});

		game.private.unSeatedGameChats.push(chat);

		if (powerToEnact) {
			const chat = {
				timestamp: new Date(),
				gameChat: true,
				chat: [{text: powerToEnact[1]}]
			};

			game.private.seatedPlayers.forEach(player => {
				player.gameChats.push(chat);
			});

			game.private.unSeatedGameChats.push(chat);
			powerToEnact[0](game);
		} else if (game.trackState.liberalPolicyCount === 1) {
		//} else if (game.trackState.liberalPolicyCount === 5) {

			
		} else if (game.trackState.fascistPolicyCount === 1) {		
		//} else if (game.trackState.fascistPolicyCount === 6) {

		} else {
			sendInProgressGameUpdate(game);
			game.previousElectedGovernment = [game.gameState.presidentIndex, game.publicPlayersState.findIndex(player => player.governmentStatus === 'isChancellor')];
			game.trackState.electionTrackerCount = 0;
			game.gameState.presidentIndex = game.gameState.presidentIndex === game.general.livingPlayerCount ? 0 : game.gameState.presidentIndex + 1; // todo-alpha skip dead players
			startElection(game);
		}
	// }, 7000);
	}, 2000);

	// todo-alpha check for end game
}

module.exports.startElection = startElection;