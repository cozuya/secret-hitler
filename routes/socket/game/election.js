const {sendInProgressGameUpdate} = require('../util.js'),
	{startElection, shufflePolicies} = require('./common.js'),
	{sendGameList} = require('../user-requests.js'),
	{specialElection, policyPeek, investigateLoyalty, executePlayer} = require('./policy-powers.js'),
	{completeGame} = require('./end-game.js'),
	{games} = require('../models.js'),
	_ = require('lodash');

module.exports.selectChancellor = data => {
	const game = games.find(el => el.general.uid === data.uid),
		{chancellorIndex} = data,
		{presidentIndex} = game.gameState,
		isAlreadySelected = Boolean(game.publicPlayersState.find(player => player.governmentStatus === 'isPendingChancellor')),
		seatedPlayers = game.private.seatedPlayers.filter(player => !player.isDead),
		presidentPlayer = game.private.seatedPlayers[presidentIndex],
		chancellorPlayer = game.private.seatedPlayers[chancellorIndex];

	if (!isAlreadySelected) {
		game.publicPlayersState[presidentIndex].isLoader = false;

		presidentPlayer.playersState.forEach(player => {
			player.notificationStatus = '';
		});

		game.publicPlayersState[chancellorIndex].governmentStatus = 'isPendingChancellor';
		game.general.status = `Vote on election #${game.general.electionCount} now.`;

		game.publicPlayersState.filter(player => !player.isDead).forEach(player => {
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
					text: `${presidentPlayer.userName} {${presidentIndex + 1}}`,
					type: 'player'
				},
				{
					text: ' and chancellor '
				},
				{
					text: `${chancellorPlayer.userName} {${chancellorIndex + 1}}`,
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
		}, process.env.NODE_ENV === 'development' ? 100 : 1000);

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
		}, process.env.NODE_ENV === 'development' ? 100 : 1500);
	}
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

	if (seatedPlayers.filter(play => play.voteStatus.hasVoted && !play.isDead).length === game.general.livingPlayerCount) {
		game.general.status = 'Tallying results of ballots..';
		sendInProgressGameUpdate(game);
		setTimeout(() => {
			flipBallotCards();
		}, process.env.NODE_ENV === 'development' ? 100 : 2000);
	}

	function flipBallotCards () {
		game.publicPlayersState.forEach((player, i) => {
			if (!player.isDead) {
				player.cardStatus.cardBack.cardName = seatedPlayers[i].voteStatus.didVoteYes ? 'ja' : 'nein';
				player.cardStatus.isFlipped = true;
			}
		});

		sendInProgressGameUpdate(game);

		setTimeout(() => {
			seatedPlayers.forEach(play => {
				play.cardFlingerState = [];
			});
			sendInProgressGameUpdate(game);
		}, process.env.NODE_ENV === 'development' ? 100 : 2000);

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
			}, process.env.NODE_ENV === 'development' ? 100 : 2000);

			if (seatedPlayers.filter(play => play.voteStatus.didVoteYes && !play.isDead).length / game.general.livingPlayerCount > 0.5) {
				const chancellorIndex = game.publicPlayersState.findIndex(player => player.governmentStatus === 'isPendingChancellor'),
					{presidentIndex} = game.gameState;
				game.publicPlayersState[presidentIndex].governmentStatus = 'isPresident';
				game.publicPlayersState[chancellorIndex].governmentStatus = 'isChancellor';
				chat.chat = [{text: 'The election passes.'}];

				seatedPlayers.forEach(player => {
					player.gameChats.push(chat);
				});

				game.private.unSeatedGameChats.push(chat);

				// todo-alpha crash during normal gameplay (fpc == 4) at game.private.seatedPlayers[chancellorIndex].role is undefined ??
				console.log(chancellorIndex, 'ci');
				console.log(game.publicPlayersState);
				if (process.env.NODE_ENV !== 'development' && game.trackState.fascistPolicyCount > 3 && game.private.seatedPlayers[chancellorIndex].role.cardName === 'hitler' || (process.env.NODE_ENV === 'development' && game.private.seatedPlayers[chancellorIndex].role.cardName === 'hitler')) {
					const chat = {
						timestamp: new Date(),
						gameChat: true,
						chat: [
							{
								text: 'Hitler',
								type: 'hitler'
							},
							{text: ' has been elected chancellor after the 3rd fascist policy has been enacted.'}]
					};

					setTimeout(() => {
						game.publicPlayersState.forEach((player, i) => {
							player.cardStatus.cardFront = 'secretrole';
							player.cardStatus.cardDisplayed = true;
							player.cardStatus.cardBack = seatedPlayers[i].role;
						});

						seatedPlayers.forEach(player => {
							player.gameChats.push(chat);
						});

						game.private.unSeatedGameChats.push(chat);
						sendInProgressGameUpdate(game);
					}, process.env.NODE_ENV === 'development' ? 100 : 3000);

					setTimeout(() => {
						game.publicPlayersState.forEach(player => {
							player.cardStatus.isFlipped = true;
						});
						completeGame(game, 'fascist');
					}, process.env.NODE_ENV === 'development' ? 100 : 4000);
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
		}, process.env.NODE_ENV === 'development' ? 2100 : 4000);
	}

	function failedElection () {
		game.trackState.electionTrackerCount++;

		if (game.trackState.electionTrackerCount === 3) {
			const chat = {
				timestamp: new Date(),
				gameChat: true,
				chat: [{text: 'The third consecutive election has failed and the top policy is enacted.'}]
			};

			let {undrawnPolicyCount} = game.gameState;

			game.gameState.previousElectedGovernment = [];
			game.private.unSeatedGameChats.push(chat);

			seatedPlayers.forEach(player => {
				player.gameChats.push(chat);
			});

			if (!undrawnPolicyCount) {
				shufflePolicies(game);
			}

			undrawnPolicyCount--;
			setTimeout(() => {
				enactPolicy(game, game.private.policies.shift());
			}, process.env.NODE_ENV === 'development' ? 100 : 2000);
		} else {
			setTimeout(() => {
				startElection(game);
			}, process.env.NODE_ENV === 'development' ? 100 : 2000);
		}
	}

	function passedElection () {
		const {presidentIndex} = game.gameState,
			chancellorIndex = game.publicPlayersState.findIndex(player => player.governmentStatus === 'isChancellor');

		game.general.status = 'Waiting on presidential discard.';
		game.publicPlayersState[presidentIndex].isLoader = true;
		seatedPlayers[presidentIndex].gameChats.push({
			timestamp: new Date(),
			gameChat: true,
			chat: [{text: 'As president, you must select one policy to discard.'}]
		});

		if (game.gameState.undrawnPolicyCount < 3) {
			shufflePolicies(game);
		}

		game.gameState.undrawnPolicyCount--;
		game.private.currentElectionPolicies = [game.private.policies.shift(), game.private.policies.shift(), game.private.policies.shift()];
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
			game.gameState.undrawnPolicyCount--;
			sendInProgressGameUpdate(game);
		}, 200);
		setTimeout(() => {
			game.gameState.undrawnPolicyCount--;
			sendInProgressGameUpdate(game);
		}, 400);
		setTimeout(() => {
			seatedPlayers[presidentIndex].cardFlingerState[0].cardStatus.isFlipped = seatedPlayers[presidentIndex].cardFlingerState[1].cardStatus.isFlipped = seatedPlayers[presidentIndex].cardFlingerState[2].cardStatus.isFlipped = true;
			seatedPlayers[presidentIndex].cardFlingerState[0].notificationStatus = seatedPlayers[presidentIndex].cardFlingerState[1].notificationStatus = seatedPlayers[presidentIndex].cardFlingerState[2].notificationStatus = 'notification';
			game.gameState.phase = 'presidentSelectingPolicy';
			game.gameState.previousElectedGovernment = game.general.livingPlayerCount > 5 ? [presidentIndex, chancellorIndex] : [presidentIndex];
			sendInProgressGameUpdate(game);
		}, 600);
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
	game.gameState.phase = 'chancellorSelectingPolicy';

	chancellor.gameChats.push({
		timestamp: new Date(),
		gameChat: true,
		chat: [{text: 'As chancellor, you must select a policy to enact.'}]
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
		enactedPolicy = data.policy;

	// todo-release selects (red outline) wrong policy, maybe only if done fast.  flings to wrong side.

	if (data.selection === 3) {
		chancellor.cardFlingerState[0].notificationStatus = '';
		chancellor.cardFlingerState[1].notificationStatus = 'selected';
	} else {
		chancellor.cardFlingerState[0].notificationStatus = 'selected';
		chancellor.cardFlingerState[1].notificationStatus = '';
	}

	game.gameState.discardedPolicyCount++;
	game.publicPlayersState[chancellorIndex].isLoader = false;
	chancellor.cardFlingerState[0].action = chancellor.cardFlingerState[1].action = '';
	chancellor.cardFlingerState[0].cardStatus.isFlipped = chancellor.cardFlingerState[1].cardStatus.isFlipped = false;

	if (game.gameState.isVetoEnabled) {
		game.private.currentElectionPolicies = [data.policy];
		game.general.status = 'Chancellor to vote on policy veto.';
		sendInProgressGameUpdate(game);

		setTimeout(() => {
			const chat = {
				gameChat: true,
				timestamp: new Date(),
				chat: [{text: 'You must vote whether or not to veto these policies.'}]
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

			chancellor.gameChats.push(chat);
			sendInProgressGameUpdate(game);

			setTimeout(() => {
				chancellor.cardFlingerState[0].cardStatus.isFlipped = chancellor.cardFlingerState[1].cardStatus.isFlipped = true;
				chancellor.cardFlingerState[0].notificationStatus = chancellor.cardFlingerState[1].notificationStatus = 'notification';
				game.gameState.phase = 'chancellorVoteOnVeto';
				sendInProgressGameUpdate(game);
			}, process.env.NODE_ENV === 'development' ? 100 : 1000);
		}, process.env.NODE_ENV === 'development' ? 100 : 2000);
	} else {
		game.private.currentElectionPolicies = [];
		game.gameState.phase = 'enactPolicy';
		sendInProgressGameUpdate(game);
		setTimeout(() => {
			chancellor.cardFlingerState = [];
			enactPolicy(game, enactedPolicy);
		}, 2000);
	}
};

module.exports.selectChancellorVoteOnVeto = data => {
	const game = games.find(el => el.general.uid === data.uid),
		president = game.private.seatedPlayers[game.gameState.presidentIndex],
		chancellorIndex = game.publicPlayersState.findIndex(player => player.governmentStatus === 'isChancellor'),
		chancellor = game.private.seatedPlayers[chancellorIndex],
		publicChancellor = game.publicPlayersState[chancellorIndex];

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
				{text: 'Chancellor '},
				{
					text: `${data.userName} {${chancellorIndex + 1}}`,
					type: 'player'
				},
				{text: data.vote ? ' has voted to veto this election.' : ' has voted not to veto this election.'}]
		};

		game.private.unSeatedGameChats.push(chat);

		game.private.seatedPlayers.forEach(player => {
			player.gameChats.push(chat);
		});

		publicChancellor.cardStatus.isFlipped = true;
		sendInProgressGameUpdate(game);

		if (data.vote) {
			president.cardFlingerState = [{
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
			}];

			president.gameChats.push({
				gameChat: true,
				timestamp: new Date(),
				chat: [{text: 'You must vote whether or not to veto these policies.'}]
			});

			game.general.status = 'President to vote on policy veto.';
			sendInProgressGameUpdate(game);
			setTimeout(() => {
				president.cardFlingerState[0].cardStatus.isFlipped = president.cardFlingerState[1].cardStatus.isFlipped = true;
				president.cardFlingerState[0].notificationStatus = president.cardFlingerState[1].notificationStatus = 'notification';
				chancellor.cardFlingerState = [];
				game.publicPlayersState[game.gameState.presidentIndex].isLoader = true;
				game.gameState.phase = 'presidentVoteOnVeto';
				sendInProgressGameUpdate(game);
				setTimeout(() => {
					president.cardFlingerState[0].cardStatus.isFlipped = president.cardFlingerState[1].cardStatus.isFlipped = false;
				}, 2000);
			}, process.env.NODE_ENV === 'development' ? 100 : 1000);
		} else {
			setTimeout(() => {
				publicChancellor.cardStatus.cardDisplayed = false;
				chancellor.cardFlingerState = [];
				enactPolicy(game, game.private.currentElectionPolicies[0]);
			}, process.env.NODE_ENV === 'development' ? 100 : 2000);
		}
	}, process.env.NODE_ENV === 'development' ? 100 : 2000);
};

module.exports.selectPresidentVoteOnVeto = data => {
	const game = games.find(el => el.general.uid === data.uid),
		president = game.private.seatedPlayers[game.gameState.presidentIndex],
		chancellorIndex = game.publicPlayersState.findIndex(player => player.governmentStatus === 'isChancellor'),
		publicChancellor = game.publicPlayersState[chancellorIndex],
		publicPresident = game.publicPlayersState[game.gameState.presidentIndex];

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
				{text: 'President '},
				{
					text: `${data.userName} {${game.private.seatedPlayers.indexOf(president) + 1}}`,
					type: 'player'
				},
				{text: data.vote ? ' has voted to veto this election.' : ' has voted not to veto this election.'}]
		};

		game.private.unSeatedGameChats.push(chat);
		game.private.seatedPlayers.forEach(player => {
			player.gameChats.push(chat);
		});
		publicPresident.cardStatus.isFlipped = true;
		sendInProgressGameUpdate(game);

		if (data.vote) {
			const chat = {
				gameChat: true,
				timestamp: new Date(),
				chat: [{text: 'The President and Chancellor have voted to veto this election and the election tracker moves forward.'}]
			};

			game.trackState.electionTrackerCount++;
			game.private.unSeatedGameChats.push(chat);

			game.private.seatedPlayers.forEach(player => {
				player.gameChats.push(chat);
			});

			game.gameState.discardedPolicyCount++;
			setTimeout(() => {
				president.cardFlingerState = [];
				if (game.gameState.discardedPolicyCount === 3) {
					game.gameState.previousElectedGovernment = [];
					game.gameState.discardedPolicyCount++;
					enactPolicy(game, game.private.policies.shift());
				} else {
					startElection(game);
				}
			}, process.env.NODE_ENV === 'development' ? 100 : 3000);
		} else {
			setTimeout(() => {
				publicPresident.cardStatus.cardDisplayed = false;
				publicChancellor.cardStatus.cardDisplayed = false;
				president.cardFlingerState = [];
				enactPolicy(game, game.private.currentElectionPolicies[0]);
			}, process.env.NODE_ENV === 'development' ? 100 : 2000);
		}
	}, process.env.NODE_ENV === 'development' ? 100 : 2000);
};

function enactPolicy (game, team) {
	const index = game.trackState.enactedPolicies.length;

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
	}, process.env.NODE_ENV === 'development' ? 100 : 4000);

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
			// 		0: null,
			// 		1: null,
			// 		2: [policyPeek, 'The president must examine the top 3 policies.'],
			// 		3: [executePlayer, 'The president must select a player for execution.'],
			// 		4: [executePlayer, 'The president must select a player for execution.'],
			// 		5: null
			// 	},
			// 	{
			// 		0: null,
			// 		1: [investigateLoyalty, 'The president must investigate another player\'s party membership.'],
			// 		2: [specialElection, 'The president must select a player for a special election.'],
			// 		3: [executePlayer, 'The president must select a player for execution.'],
			// 		4: [executePlayer, 'The president must select a player for execution.'],
			// 		5: null
			// 	},
			// 	{
			// 		0: [investigateLoyalty, 'The president must investigate another player\'s party membership.'],
			// 		1: [investigateLoyalty, 'The president must investigate another player\'s party membership.'],
			// 		2: [specialElection, 'The president must select a player for a special election.'],
			// 		3: [executePlayer, 'The president must select a player for execution.'],
			// 		4: [executePlayer, 'The president must select a player for execution.'],
			// 		5: null
			// 	}
			// ],
			presidentPowers = [
				{
					1: [specialElection, 'y']
				}
			],
			powerToEnact = team === 'fascist' ? presidentPowers[game.general.type][game.trackState.fascistPolicyCount - 1] : null;

		game.trackState.enactedPolicies[index].position = team === 'liberal' ? `liberal${game.trackState.liberalPolicyCount}` : `fascist${game.trackState.fascistPolicyCount}`;

		game.private.seatedPlayers.forEach(player => {
			player.gameChats.push(chat);
		});

		game.private.unSeatedGameChats.push(chat);

		// if (process.env.NODE_ENV === 'development' && (game.trackState.liberalPolicyCount === 1 || game.trackState.fascistPolicyCount === 1) || (game.trackState.liberalPolicyCount === 5 || game.trackState.fascistPolicyCount === 6)) {
		if (game.trackState.liberalPolicyCount === 5 || game.trackState.fascistPolicyCount === 6) {
			game.publicPlayersState.forEach((player, i) => {
				player.cardStatus.cardFront = 'secretrole';
				player.cardStatus.cardBack = game.private.seatedPlayers[i].role;
				player.cardStatus.cardDisplayed = true;
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
		} else if (powerToEnact && game.trackState.electionTrackerCount !== 3) {
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
		} else {
			sendInProgressGameUpdate(game);
			game.trackState.electionTrackerCount = 0;
			startElection(game);
		}
	}, process.env.NODE_ENV === 'development' ? 100 : 7000);
}

module.exports.startElection = startElection;