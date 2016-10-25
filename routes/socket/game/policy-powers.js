const {sendInProgressGameUpdate} = require('../util.js'),
	{games} = require('../models.js'),
	{startElection, shufflePolicies} = require('./common.js'),
	{completeGame} = require('./end-game.js')
	// ,
	// _ = require('lodash')
	;

module.exports.policyPeek = game => {
	const {seatedPlayers} = game.private,
		{presidentIndex} = game.gameState,
		president = seatedPlayers[presidentIndex];

	if (game.gameState.undrawnPolicyCount < 3) {
		game.private.policies = shufflePolicies(game.private.policies);
		game.gameState.undrawnPolicyCount = 17;
	}

	game.general.status = 'President to peek at policies';
	game.publicPlayersState[presidentIndex].isLoader = true;
	president.playersState[presidentIndex].policyNotification = true;
	sendInProgressGameUpdate(game);
};

module.exports.selectPolicies = data => {
	const game = games.find(el => el.general.uid === data.uid),
		{presidentIndex} = game.gameState,
		{seatedPlayers} = game.private,
		president = seatedPlayers[presidentIndex],
		{policies} = game.private;

	game.publicPlayersState[presidentIndex].isLoader = false;

	president.cardFlingerState = [
		{
			position: 'middle-far-left',
			action: 'active',
			cardStatus: {
				isFlipped: false,
				cardFront: 'policy',
				cardBack: `${policies[0]}p`
			}
		},
		{
			position: 'middle-center',
			action: 'active',
			cardStatus: {
				isFlipped: false,
				cardFront: 'policy',
				cardBack: `${policies[1]}p`
			}
		},
		{
			position: 'middle-far-right',
			action: 'active',
			cardStatus: {
				isFlipped: false,
				cardFront: 'policy',
				cardBack: `${policies[2]}p`
			}
		}
	];

	president.playersState[presidentIndex].policyNotification = false;
	sendInProgressGameUpdate(game);

	setTimeout(() => {
		president.cardFlingerState[0].cardStatus.isFlipped = president.cardFlingerState[1].cardStatus.isFlipped = president.cardFlingerState[2].cardStatus.isFlipped = true;
		sendInProgressGameUpdate(game);
	}, 2000);

	setTimeout(() => {
		president.cardFlingerState[0].cardStatus.isFlipped = president.cardFlingerState[1].cardStatus.isFlipped = president.cardFlingerState[2].cardStatus.isFlipped = false;
		president.cardFlingerState[0].action = president.cardFlingerState[1].action = president.cardFlingerState[2].action = '';
		sendInProgressGameUpdate(game);
	}, 4000);

	setTimeout(() => {
		president.cardFlingerState = [];
		president.gameChats.push({
			gameChat: true,
			timestamp: new Date(),
			chat: [
				{text: 'You peek at the top 3 policies and see that they are a '},
				{
					text: policies[0],
					type: policies[0]
				},
				{text: ', a '},
				{
					text: policies[1],
					type: policies[1]
				},
				{text: ', and a '},
				{
					text: policies[2],
					type: policies[2]
				},
				{text: ' policy.'}
			]
		});
		sendInProgressGameUpdate(game);
		startElection(game);
	}, 6000);
};

module.exports.investigateLoyalty = game => {
	const {seatedPlayers} = game.private,
		{presidentIndex} = game.gameState,
		president = seatedPlayers[presidentIndex];

	game.general.status = 'Waiting for President to investigate.';
	president.playersState.filter((player, i) => i !== presidentIndex && !seatedPlayers[i].isDead).forEach(player => {
		player.notificationStatus = 'notification';
	});
	game.publicPlayersState[presidentIndex].isLoader = true;
	game.gameState.clickActionInfo = [president.userName, seatedPlayers.filter((player, i) => i !== presidentIndex && !seatedPlayers[i].isDead).map(player => seatedPlayers.indexOf(player))];
	game.gameState.phase = 'selectPartyMembershipInvestigate';
	sendInProgressGameUpdate(game);
};

module.exports.selectPartyMembershipInvestigate = data => {
	const game = games.find(el => el.general.uid === data.uid),
		{playerIndex} = data,
		{presidentIndex} = game.gameState,
		{seatedPlayers} = game.private,
		president = seatedPlayers[presidentIndex],
		playersTeam = game.private.seatedPlayers[playerIndex].role.team;

	president.playersState.forEach(player => {
		player.notificationStatus = '';
	});

	game.publicPlayersState[presidentIndex].isLoader = false;
	game.publicPlayersState[playerIndex].cardStatus = {
		cardDisplayed: true,
		cardFront: 'partymembership',
		cardBack: {}
	};

	sendInProgressGameUpdate(game);

	setTimeout(() => {
		const chat = {
			timestamp: new Date(),
			gameChat: true
		};

		president.playersState[playerIndex].cardStatus = {
			isFlipped: true,
			cardBack: {
				cardName: `membership-${playersTeam}`
			}
		};

		seatedPlayers.filter(player => player.userName !== president.userName).forEach(player => {
			chat.chat = [{text: 'President '},
			{
				text: president.userName,
				type: 'player'
			},
			{text: ' investigates the party membership of '},
			{
				text: seatedPlayers[playerIndex].userName,
				type: 'player'
			},
			{text: '.'}];

			player.gameChats.push(chat);
		});

		game.private.unSeatedGameChats.push(chat);

		president.gameChats.push({
			timestamp: new Date(),
			gameChat: true,
			chat: [{text: 'You investigate the party membership of '},
			{
				text: seatedPlayers[playerIndex].userName,
				type: 'player'
			},
			{text: ' and determine that he or she is on the '},
			{
				text: playersTeam,
				type: playersTeam
			},
			{text: ' team.'}]
		});

		sendInProgressGameUpdate(game);
	}, 2000);

	setTimeout(() => {
		president.playersState[playerIndex].cardStatus.isFlipped = false;
		sendInProgressGameUpdate(game);
	}, 4000);

	setTimeout(() => {
		game.publicPlayersState[playerIndex].cardStatus.cardDisplayed = false;
		game.gameState.presidentIndex = game.gameState.presidentIndex === game.general.livingPlayerCount ? 0 : game.gameState.presidentIndex + 1; // todo-alpha skip dead players
		sendInProgressGameUpdate(game);
	}, 6000);
};

module.exports.specialElection = game => {
	const {seatedPlayers} = game.private,
		{presidentIndex} = game.gameState,
		president = seatedPlayers[presidentIndex];

	game.general.status = 'President to select special election';
	game.publicPlayersState[presidentIndex].isLoader = true;
	// game.gameState.nextStandardPresidentIndex = (() => {
		// const nonDeadPlayers = seatedPlayers.filter(player => !player.isDead);

		// const nextNonDeadPlayer = seatedPlayers.find((player, index) => )

	// })();

	president.playersState.filter((player, index) => index !== presidentIndex).forEach(player => {
		player.notificationStatus = 'notification';
	});

	sendInProgressGameUpdate(game);
};

module.exports.executePlayer = game => {
	const {seatedPlayers} = game.private,
		{presidentIndex} = game.gameState,
		president = seatedPlayers[presidentIndex];

	game.general.status = 'President to execute a player';
	game.publicPlayersState[presidentIndex].isLoader = true;

	president.gameChats.push({
		gameChat: true,
		timestamp: new Date(),
		chat: [
			{text: 'You must select a player to execute.'}
		]
	});

	president.playersState.filter((player, index) => index !== presidentIndex && !player.isDead).forEach(player => {
		player.notificationStatus = 'notification';
	});

	game.gameState.clickActionInfo = [president.userName, seatedPlayers.filter((player, i) => i !== presidentIndex && !seatedPlayers[i].isDead).map(player => seatedPlayers.indexOf(player))];
	game.gameState.phase = 'execution';
	sendInProgressGameUpdate(game);
};

module.exports.selectPlayerToExecute = data => {
	const game = games.find(el => el.general.uid === data.uid),
		{playerIndex} = data,
		{presidentIndex} = game.gameState,
		{seatedPlayers} = game.private,
		selectedPlayer = seatedPlayers[playerIndex],
		publicSelectedPlayer = game.publicPlayersState[playerIndex],
		president = seatedPlayers[presidentIndex],
		nonPresidentChat = {
			gameChat: true,
			timestamp: new Date(),
			chat: [{text: 'President '},
				{
					text: president.userName,
					type: 'player'
				},
				{text: ' selects to execute '},
				{
					text: selectedPlayer.userName,
					type: 'player'
				},
				{text: '.'}]
		};

	game.private.unSeatedGameChats.push(nonPresidentChat);
	game.publicPlayersState[presidentIndex].isLoader = false;

	seatedPlayers.filter(player => player.userName !== president.userName).forEach(player => {
		player.gameChats.push(nonPresidentChat);
	});

	president.gameChats.push({
		gameChat: true,
		timestamp: new Date(),
		chat: [{text: 'You select to execute '},
		{
			text: selectedPlayer.userName,
			type: 'player'
		},
		{text: '.'}]
	});

	president.playersState.forEach(player => {
		player.notificationStatus = '';
	});

	publicSelectedPlayer.cardStatus.cardDisplayed = true;
	publicSelectedPlayer.cardStatus.cardFront = 'secretrole';
	publicSelectedPlayer.notificationStatus = 'danger';
	sendInProgressGameUpdate(game);

	setTimeout(() => {
		selectedPlayer.isDead = publicSelectedPlayer.isDead = true;
		publicSelectedPlayer.notificationStatus = '';
		game.general.livingPlayerCount--;
		sendInProgressGameUpdate(game);

		if (selectedPlayer.role.cardName === 'hitler') {
			const chat = {
				timestamp: new Date(),
				gameChat: true,
				chat: [{text: 'Hitler has been executed.'}]
			};

			publicSelectedPlayer.cardStatus.cardBack = selectedPlayer.role;
			publicSelectedPlayer.cardStatus.isFlipped = true;

			seatedPlayers.forEach((player, i) => {
				player.gameChats.push(chat);
			});

			game.private.unSeatedGameChats.push(chat);

			setTimeout(() => {
				game.publicPlayersState.forEach((player, i) => {
					player.cardStatus.cardDisplayed = true;
					player.cardStatus.cardBack = seatedPlayers[i].role;
				});
				sendInProgressGameUpdate(game);
			}, 2000);

			setTimeout(() => {
				game.publicPlayersState.forEach(player => {
					player.cardStatus.isFlipped = true;
				});
				completeGame(game, 'liberal');
			}, 3000);
		} else {
			publicSelectedPlayer.cardStatus.cardDisplayed = false;
			sendInProgressGameUpdate(game);
			setTimeout(() => {
				console.log('Hello World!');
				startElection(game);
			}, 2000);
		}
	}, 5000);
};