const {sendInProgressGameUpdate} = require('../util.js'),
	{games} = require('../models.js'),
	{startElection, shufflePolicies} = require('./common.js'),
	{completeGame} = require('./end-game.js');

module.exports.policyPeek = game => {
	const {seatedPlayers} = game.private,
		{presidentIndex} = game.gameState,
		president = seatedPlayers[presidentIndex];

	if (game.gameState.undrawnPolicyCount < 3) {
		shufflePolicies(game);
	}

	game.general.status = 'President to peek at policies';
	game.publicPlayersState[presidentIndex].isLoader = true;
	president.playersState[presidentIndex].policyNotification = true;
	sendInProgressGameUpdate(game);
};

module.exports.selectPolicies = data => {
	const game = games.find(el => el.general.uid === data.uid),
		{presidentIndex} = game.gameState,
		{experiencedMode} = game.general,
		{seatedPlayers} = game.private,
		president = seatedPlayers[presidentIndex];

	game.publicPlayersState[presidentIndex].isLoader = false;

	if (game.private.policies.length < 3) {
		shufflePolicies(game);
	}

	president.cardFlingerState = [
		{
			position: 'middle-far-left',
			action: 'active',
			cardStatus: {
				isFlipped: false,
				cardFront: 'policy',
				cardBack: `${game.private.policies[0]}p`
			}
		},
		{
			position: 'middle-center',
			action: 'active',
			cardStatus: {
				isFlipped: false,
				cardFront: 'policy',
				cardBack: `${game.private.policies[1]}p`
			}
		},
		{
			position: 'middle-far-right',
			action: 'active',
			cardStatus: {
				isFlipped: false,
				cardFront: 'policy',
				cardBack: `${game.private.policies[2]}p`
			}
		}
	];

	president.playersState[presidentIndex].policyNotification = false;
	sendInProgressGameUpdate(game);

	setTimeout(() => {
		president.cardFlingerState[0].cardStatus.isFlipped = president.cardFlingerState[1].cardStatus.isFlipped = president.cardFlingerState[2].cardStatus.isFlipped = true;
		sendInProgressGameUpdate(game);
	}, process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 500 : 2000);

	setTimeout(() => {
		president.cardFlingerState[0].cardStatus.isFlipped = president.cardFlingerState[1].cardStatus.isFlipped = president.cardFlingerState[2].cardStatus.isFlipped = false;
		president.cardFlingerState[0].action = president.cardFlingerState[1].action = president.cardFlingerState[2].action = '';
		sendInProgressGameUpdate(game);
	}, process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 1500 : 4000);

	setTimeout(() => {
		president.cardFlingerState = [];

		if (!game.general.disableGamechat) {
			president.gameChats.push({
				gameChat: true,
				timestamp: new Date(),
				chat: [
					{text: 'You peek at the top 3 policies and see that they are a '},
					{
						text: game.private.policies[0],
						type: game.private.policies[0]
					},
					{text: ', a '},
					{
						text: game.private.policies[1],
						type: game.private.policies[1]
					},
					{text: ', and a '},
					{
						text: game.private.policies[2],
						type: game.private.policies[2]
					},
					{text: ' policy.'}
				]
			});
		}

		sendInProgressGameUpdate(game);
		game.trackState.electionTrackerCount = 0;
		startElection(game);
	}, process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 2000 : 6000);
};

module.exports.investigateLoyalty = game => {
	const {seatedPlayers} = game.private,
		{presidentIndex} = game.gameState,
		president = seatedPlayers[presidentIndex];

	game.general.status = 'Waiting for President to investigate.';
	president.playersState.filter((player, i) => i !== presidentIndex && !seatedPlayers[i].isDead && !seatedPlayers[i].wasInvestigated).forEach(player => {
		player.notificationStatus = 'notification';
	});
	game.publicPlayersState[presidentIndex].isLoader = true;
	game.gameState.clickActionInfo = [president.userName, seatedPlayers.filter((player, i) => i !== presidentIndex && !seatedPlayers[i].isDead && !seatedPlayers[i].wasInvestigated).map(player => seatedPlayers.indexOf(player))];
	game.gameState.phase = 'selectPartyMembershipInvestigate';
	sendInProgressGameUpdate(game);
};

module.exports.selectPartyMembershipInvestigate = data => {
	const game = games.find(el => el.general.uid === data.uid),
		{playerIndex} = data,
		{experiencedMode} = game.general,
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

	seatedPlayers[playerIndex].wasInvestigated = true;
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

		if (!game.general.disableGamechat) {
			seatedPlayers.filter(player => player.userName !== president.userName).forEach(player => {
				chat.chat = [{text: 'President '},
					{
						text: `${president.userName} {${presidentIndex + 1}}`,
						type: 'player'
					},
					{text: ' investigates the party membership of '},
					{
						text: `${seatedPlayers[playerIndex].userName} {${playerIndex + 1}}`,
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
						text: `${seatedPlayers[playerIndex].userName} {${playerIndex + 1}}`,
						type: 'player'
					},
					{text: ' and determine that he or she is on the '},
					{
						text: playersTeam,
						type: playersTeam
					},
					{text: ' team.'}]
			});
		}

		if (!game.general.disableGamechat) {
			president.playersState[playerIndex].nameStatus = playersTeam;
		}

		sendInProgressGameUpdate(game);
	}, process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 200 : 2000);

	setTimeout(() => {
		president.playersState[playerIndex].cardStatus.isFlipped = false;
		sendInProgressGameUpdate(game);
	}, process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 4000 : 6000);

	setTimeout(() => {
		game.publicPlayersState[playerIndex].cardStatus.cardDisplayed = false;
		president.playersState[playerIndex].cardStatus.cardBack = {};
		sendInProgressGameUpdate(game);
		startElection(game);
	}, process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 4200 : 8000);
};

module.exports.specialElection = game => {
	const {seatedPlayers} = game.private,
		{presidentIndex} = game.gameState,
		president = seatedPlayers[presidentIndex];

	game.general.status = 'President to select special election';
	game.gameState.specialElectionFormerPresidentIndex = presidentIndex;
	game.publicPlayersState[presidentIndex].isLoader = true;
	president.playersState.filter((player, index) => index !== presidentIndex && !seatedPlayers[index].isDead).forEach(player => {
		player.notificationStatus = 'notification';
	});
	game.gameState.phase = 'specialElection';
	game.gameState.clickActionInfo = [president.userName, seatedPlayers.filter((player, i) => i !== presidentIndex && !seatedPlayers[i].isDead).map(player => seatedPlayers.indexOf(player))];
	sendInProgressGameUpdate(game);
};

module.exports.selectSpecialElection = data => {
	const game = games.find(el => el.general.uid === data.uid);

	game.publicPlayersState[game.gameState.presidentIndex].isLoader = false;

	game.private.seatedPlayers[game.gameState.presidentIndex].playersState.forEach(player => {
		player.notificationStatus = '';
	});

	startElection(game, data.playerIndex);
};

module.exports.executePlayer = game => {
	const {seatedPlayers} = game.private,
		{presidentIndex} = game.gameState,
		president = seatedPlayers[presidentIndex];

	game.general.status = 'President to execute a player';
	game.publicPlayersState[presidentIndex].isLoader = true;

	if (!game.general.disableGamechat) {
		president.gameChats.push({
			gameChat: true,
			timestamp: new Date(),
			chat: [
				{text: 'You must select a player to execute.'}
			]
		});
	}

	president.playersState.filter((player, index) => index !== presidentIndex && !seatedPlayers[index].isDead).forEach(player => {
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
					text: `${president.userName} {${presidentIndex + 1}}`,
					type: 'player'
				},
				{text: ' selects to execute '},
				{
					text: `${selectedPlayer.userName} {${playerIndex + 1}}`,
					type: 'player'
				},
				{text: '.'}]
		};

	if (!game.general.disableGamechat) {
		game.private.unSeatedGameChats.push(nonPresidentChat);

		seatedPlayers.filter(player => player.userName !== president.userName).forEach(player => {
			player.gameChats.push(nonPresidentChat);
		});

		president.gameChats.push({
			gameChat: true,
			timestamp: new Date(),
			chat: [{text: 'You select to execute '},
				{
					text: `${selectedPlayer.userName} {${playerIndex + 1}}`,
					type: 'player'
				},
				{text: '.'}]
		});
	}

	game.publicPlayersState[presidentIndex].isLoader = false;

	president.playersState.forEach(player => {
		player.notificationStatus = '';
	});

	publicSelectedPlayer.cardStatus.cardDisplayed = true;
	publicSelectedPlayer.cardStatus.cardFront = 'secretrole';
	publicSelectedPlayer.notificationStatus = 'danger';
	publicSelectedPlayer.isDead = true;
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
				chat: [
					{
						text: 'Hitler',
						type: 'hitler'
					},
					{text: '  has been executed.'}]
			};

			publicSelectedPlayer.cardStatus.cardBack = selectedPlayer.role;
			publicSelectedPlayer.cardStatus.isFlipped = true;

			seatedPlayers.forEach((player, i) => {
				player.gameChats.push(chat);
			});

			game.private.unSeatedGameChats.push(chat);

			setTimeout(() => {
				game.publicPlayersState.forEach((player, i) => {
					player.cardStatus.cardFront = 'secretrole';
					player.cardStatus.cardDisplayed = true;
					player.cardStatus.cardBack = seatedPlayers[i].role;
				});
				sendInProgressGameUpdate(game);
			}, process.env.NODE_ENV === 'development' ? 100 : 1000);

			setTimeout(() => {
				game.publicPlayersState.forEach(player => {
					player.cardStatus.isFlipped = true;
				});
				completeGame(game, 'liberal');
			}, process.env.NODE_ENV === 'development' ? 100 : 2000);
		} else {
			publicSelectedPlayer.cardStatus.cardDisplayed = false;
			sendInProgressGameUpdate(game);
			setTimeout(() => {
				game.trackState.electionTrackerCount = 0;
				startElection(game);
			}, process.env.NODE_ENV === 'development' ? 100 : 2000);
		}
	}, process.env.NODE_ENV === 'development' ? 100 : 4000);
};