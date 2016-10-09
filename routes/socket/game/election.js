const {sendInProgressGameUpdate} = require('../util.js'),
	{policyPeek, investigateLoyalty, executePlayer} = require('./policy-powers.js'),
	{games} = require('../models.js'),
	_ = require('lodash');

function startElection (game) {
	const {seatedPlayers} = game.private,
		{presidentIndex, previousElectedGovernment} = game.gameState,
		pendingPresidentPlayer = game.private.seatedPlayers[presidentIndex];

	if (game.general.livingPlayerCount < 6) {
		game.gameState.previousElectedGovernment = [previousElectedGovernment[0]];
	}

	game.general.electionCount++;
	game.general.status = `Election #${game.general.electionCount} begins`;
	pendingPresidentPlayer.gameChats.push({
		gameChat: true,
		timestamp: new Date(),
		chat: [{
			text: 'You are president and must select a chancellor.'
		}]
	});

	pendingPresidentPlayer.playersState.filter((player, index) => index !== presidentIndex && !game.gameState.previousElectedGovernment.includes(index)).forEach(player => {
		player.notificationStatus = 'notification';
	});

	game.publicPlayersState.forEach(player => {
		player.cardStatus.cardDisplayed = false;
		player.governmentStatus = '';
	});

	game.publicPlayersState[presidentIndex].governmentStatus = 'isPendingPresident';
	game.publicPlayersState[presidentIndex].isLoader = true;
	game.gameState.phase = 'selectingChancellor';
	game.gameState.clickActionInfo = [pendingPresidentPlayer.userName, _.without(_.range(0, seatedPlayers.length), presidentIndex, ...game.gameState.previousElectedGovernment)]; // todo-alpha bugged for 2nd and on election.  also does not account for dead players.
	sendInProgressGameUpdate(game);
}

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
	}, 3000);
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
		setTimeout(() => {
			flipBallotCards();
		}, 4000);
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
			}, 2000);

			if (seatedPlayers.filter(play => play.voteStatus.didVoteYes).length / game.general.livingPlayerCount > 0.5) {
				chat.chat = [{text: 'The election passes.'}];

				seatedPlayers.forEach(player => {
					player.gameChats.push(chat);
				});

				game.private.unSeatedGameChats.push(chat);
				// todo-alpha see if hitler election wins game for fascists
				passedElection();
			} else {
				chat.chat = [{text: 'The election fails and the election tracker moves forward.'}];

				seatedPlayers.forEach(player => {
					player.gameChats.push(chat);
				});

				game.private.unSeatedGameChats.push(chat);
				failedElection();
			}

			sendInProgressGameUpdate(game);
		}, 6000);
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
			chancellorIndex = game.publicPlayersState.findIndex(player => player.governmentStatus === 'isPendingChancellor'),
			policies = game.private.policies;

		game.general.status = 'Waiting on presidential discard.';
		game.publicPlayersState[presidentIndex].governmentStatus = 'isPresident';
		game.publicPlayersState[presidentIndex].isLoader = true;
		game.publicPlayersState[chancellorIndex].governmentStatus = 'isChancellor';
		game.private.seatedPlayers[presidentIndex].gameChats.push({
			timestamp: new Date(),
			gameChat: true,
			chat: [{text: 'As president, you must select one policy to discard.'}]
		});

		if (game.gameState.undrawnPolicyCount > 2) {
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
			}, 2200);
			setTimeout(() => {
				game.gameState.undrawnPolicyCount--;
				sendInProgressGameUpdate(game);
			}, 2400);
			setTimeout(() => {
				game.private.seatedPlayers[presidentIndex].cardFlingerState[0].cardStatus.isFlipped = game.private.seatedPlayers[presidentIndex].cardFlingerState[1].cardStatus.isFlipped = game.private.seatedPlayers[presidentIndex].cardFlingerState[2].cardStatus.isFlipped = true;
				game.private.seatedPlayers[presidentIndex].cardFlingerState[0].notificationStatus = game.private.seatedPlayers[presidentIndex].cardFlingerState[1].notificationStatus = game.private.seatedPlayers[presidentIndex].cardFlingerState[2].notificationStatus = 'notification';
				game.gameState.phase = 'presidentSelectingPolicy';
				game.gameState.previousElectedGovernment = [presidentIndex, chancellorIndex];
				sendInProgressGameUpdate(game);
			}, 2000);
		} else {
			// todo-alpha
		}
	}
};

module.exports.selectPresidentPolicy = data => {
	const game = games.find(el => el.general.uid === data.uid),
		{presidentIndex} = game.gameState,
		president = game.private.seatedPlayers[presidentIndex],
		chancellorIndex = game.publicPlayersState.findIndex(player => player.governmentStatus === 'isChancellor'),
		chancellor = game.private.seatedPlayers[chancellorIndex];

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
	game.private.currentElectionPolicies.splice(data.selection, 1);
	game.gameState.discardedPolicyCount++;
	chancellor.cardFlingerState = [{
		position: 'middle-left',
		action: 'active',
		cardStatus: {
			isFlipped: false,
			cardFront: 'policy',
			cardBack: `${game.private.currentElectionPolicies[0]}p`
		}
	},
	{
		position: 'middle-right',
		action: 'active',
		cardStatus: {
			isFlipped: false,
			cardFront: 'policy',
			cardBack: `${game.private.currentElectionPolicies[1]}p`
		}
	}];
	game.general.status = 'Waiting on chancellor enactment.';
	game.gameState.phase = 'chancellorSelectingPolicy';
	chancellor.gameChats.push({
		timestamp: new Date(),
		gameChat: true,
		chat: [{text: 'As chancellor, you must select one policy to enact.'}]
	});

	sendInProgressGameUpdate(game);
	setTimeout(() => {
		president.cardFlingerState = [];
		chancellor.cardFlingerState[0].cardStatus.isFlipped = chancellor.cardFlingerState[1].cardStatus.isFlipped = true;
		chancellor.cardFlingerState[0].notificationStatus = chancellor.cardFlingerState[1].notificationStatus = 'notification';
		sendInProgressGameUpdate(game);
	}, 2000);
};

module.exports.selectChancellorPolicy = data => {
	const game = games.find(el => el.general.uid === data.uid),
		chancellorIndex = game.publicPlayersState.findIndex(player => player.governmentStatus === 'isChancellor'),
		chancellor = game.private.seatedPlayers[chancellorIndex],
		enactedPolicy = game.private.currentElectionPolicies[data.selection];

	game.publicPlayersState[chancellorIndex].isLoader = false;
	console.log(data.selection, 'selectiondata');
	if (data.selection) {
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
		game.general.status = 'A policy is being enacted.';
		enactPolicy(game, enactedPolicy);
	}, 4000);
};

function enactPolicy (game, team) {
	const index = game.trackState.enactedPolicies.length;

	if (team === 'liberal') {
		game.trackState.liberalPolicyCount++;
	} else {
		game.trackState.fascistPolicyCount++;
	}

	game.trackState.enactedPolicies.push({
		position: 'middle',
		cardBack: team,
		isFlipped: false
	});

	sendInProgressGameUpdate(game);

	setTimeout(() => {
		game.trackState.enactedPolicies[index].isFlipped = true;
		sendInProgressGameUpdate(game);
	}, 4000);

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
			chat2 = {
				timestamp: new Date(),
				gameChat: true,
				chat: [{text: 'The president must investigate another player\'s party membership.'}]
			},
			// presidentPowers = [
			// 	{
			// 		2: policyPeek,
			// 		3: executePlayer,
			// 		4: executePlayer
			// 	},
			// 	{
			// 		1: investigateLoyalty,
			// 		2: specialElection,
			// 		3: executePlayer'
			// 		4: executePlayer
			// 	},
			// 	{
			// 		0: investigateLoyalty,
			// 		1: investigateLoyalty,
			// 		2: specialElection,
			// 		3: executePlayer
			// 		4: executePlayer
			// 	}
			// ],
			presidentPowers = [
				{
					0: executePlayer
				}
			],
			powerToEnact = team === 'fascist' ? presidentPowers[game.general.type][game.trackState.fascistPolicyCount - 1] : null;

		game.trackState.enactedPolicies[index].position = team === 'liberal' ? `liberal${game.trackState.liberalPolicyCount}` : `fascist${game.trackState.fascistPolicyCount}`;

		game.private.seatedPlayers.forEach(player => {
			player.gameChats.push(chat, chat2);
		});

		game.private.unSeatedGameChats.push(chat, chat2);
		sendInProgressGameUpdate(game);
		// todo-alpha check for exec actions
		game.previousElectedGovernment = [game.gameState.presidentIndex, game.publicPlayersState.findIndex(player => player.governmentStatus === 'isChancellor')];
		game.trackState.electionTrackerCount = 0;

		if (powerToEnact) {
			powerToEnact(game);
		} else {
			game.gameState.presidentIndex = game.gameState.presidentIndex === game.general.livingPlayerCount ? 0 : game.gameState.presidentIndex + 1; // todo-alpha skip dead players
			startElection(game);
		}
	}, 7000);

	// todo-alpha check for end game
}

module.exports.startElection = startElection;