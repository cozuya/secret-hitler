const {sendInProgressGameUpdate} = require('../util.js'),
	_ = require('lodash'),
	{startElection} = require('./election.js');

module.exports = game => {
	let roles = _.range(0, 3).map(el => {
		return {
			cardName: 'liberal',
			icon: el,
			team: 'liberal'
		};
	}).concat([{
		cardName: 'fascist',
		icon: 0,
		team: 'fascist'
	},
		{
			cardName: 'hitler',
			icon: 0,
			team: 'fascist'
		}]
	);

	game.general.type = 0; // different fascist tracks
	game.general.livingPlayerCount = game.seatedPlayers.length;

	if (game.seatedPlayers.length > 5) {
		roles = roles.concat([{
			cardName: 'liberal',
			icon: 4,
			team: 'liberal'
		}]);
	}

	if (game.seatedPlayers.length > 6) {
		roles = roles.concat([{
			cardName: 'fascist',
			icon: 1,
			team: 'fascist'
		}]);
		game.general.type = 1;
	}

	if (game.seatedPlayers.length > 7) {
		roles = roles.concat([{
			cardName: 'liberal',
			icon: 5,
			team: 'liberal'
		}]);
	}

	if (game.seatedPlayers.length > 8) {
		roles = roles.concat([{
			cardName: 'fascist',
			icon: 2,
			team: 'fascist'
		}]);
		game.general.type = 2;
	}

	if (game.seatedPlayers.length > 9) {
		roles = roles.concat([{
			cardName: 'liberal',
			icon: 4,
			team: 'liberal'
		}]);
	}

	game.gameState.isStarted = true;
	game.seatedPlayers = _.shuffle(game.seatedPlayers);
	game.private.seatedPlayers = _.cloneDeep(game.seatedPlayers);
	game.general.status = 'Dealing roles..';
	game.publicPlayersState = game.private.seatedPlayers.map(player => ({
		cardStatus: {
			cardDisplayed: true,
			isFlipped: false,
			cardFront: 'secretrole',
			cardBack: {}
		}
	}));
	game.private.seatedPlayers.forEach((player, i) => {
		const index = Math.floor(Math.random() * roles.length);

		player.role = roles[index];
		roles.splice(index, 1);
		player.playersState = _.range(0, game.seatedPlayers.length).map(play => ({}));

		player.playersState.forEach((play, index) => {
			play.cardStatus = {
				isFlipped: false
			};
			play.notificationStatus = play.nameStatus = '';

			if (index === game.seatedPlayers.findIndex(pla => pla.userName === player.userName)) {
				play.cardStatus.cardBack = player.role;
			} else {
				play.cardStatus.cardBack = {};
			}
		});

		player.gameChats = [{
			gameChat: true,
			chat: [{
				text: 'The game begins and you receive the '
			},
			{
				text: player.role.cardName,
				type: player.role.cardName
			},
			{
				text: ' role.'
			}]
		}];
	});

	game.private.unSeatedGameChats = [{
		gameChat: true,
		chat: [{
			text: 'The game begins.'
		}]
	}];

	sendInProgressGameUpdate(game);

	setTimeout(() => {
		game.private.seatedPlayers.forEach((player, i) => {
			const playerCountInGame = game.seatedPlayers.length,
				{seatedPlayers} = game.private,
				{cardName} = player.role;

			if (cardName === 'fascist') {
				if (playerCountInGame > 6 && playerCountInGame < 9) {
					const otherFascist = seatedPlayers.find(player => player.role.cardName === 'fascist');

					player.gameChats.push({
						gameChat: true,
						chat: [{
							text: 'You see that the other '
						},
						{
							text: 'fascist',
							type: 'fascist'
						},
						{
							text: 'in this game is '
						},
						{
							text: otherFascist.userName,
							type: 'player'

						},
						{
							text: '.'
						}]
					});

					player.playersState[seatedPlayers.indexOf(otherFascist)].notificationStatus = player.playersState[seatedPlayers.indexOf(otherFascist)].nameStatus = 'fascist';
					player.playersState[seatedPlayers.indexOf(player)].nameStatus = 'hitler';
				} else if (playerCountInGame > 8) {
					const otherFascists = seatedPlayers.filter(player => player.role.cardName === 'fascist');

					player.gameChats.push({
						gameChat: true,
						chat: [{
							text: 'You see that the other '
						},
						{
							text: 'fascists',
							type: 'fascist'
						},
						{
							text: 'in this game are '
						},
						{
							text: otherFascists[0].userName,
							type: 'player'

						},
						{
							text: ' and '
						},
						{
							text: otherFascists[1].userName,
							type: 'player'
						},
						{
							text: '.'
						}]
					});

					otherFascists.forEach(fascistPlayer => {
						player.playersState[seatedPlayers.indexOf(fascistPlayer)].notificationStatus = player.playersState[seatedPlayers.indexOf(fascistPlayer)].nameStatus = 'fascist';
					});
					player.playersState[seatedPlayers.indexOf(player)].nameStatus = 'fascist';
				} else {
					const hitlerPlayer = seatedPlayers.find(player => player.role.cardName === 'hitler');

					player.gameChats.push({
						gameChat: true,
						chat: [{
							text: 'You see that '
						},
						{
							text: 'hitler',
							type: 'hitler'
						},
						{
							text: ' in this game is '
						},
						{
							text: hitlerPlayer.userName,
							type: 'player'

						},
						{
							text: '. He or she also sees that you are a '
						},
						{
							text: 'fascist',
							type: 'fascist'
						},
						{
							text: '.'
						}]
					});

					player.playersState[seatedPlayers.indexOf(hitlerPlayer)].notificationStatus = player.playersState[seatedPlayers.indexOf(hitlerPlayer)].nameStatus = 'hitler';
					player.playersState[seatedPlayers.indexOf(player)].nameStatus = 'fascist';
				}
			} else if (cardName === 'hitler' && playerCountInGame < 7) { // not super dry but screw it
				const otherFascist = seatedPlayers.find(player => player.role.cardName === 'fascist');

				player.gameChats.push({
					gameChat: true,
					chat: [{
						text: 'You see that the other '
					},
					{
						text: 'fascist',
						type: 'fascist'
					},
					{
						text: ' in this game is '
					},
					{
						text: otherFascist.userName,
						type: 'player'

					},
					{
						text: '.  He or she knows who you are.'
					}]
				});

				player.playersState[seatedPlayers.indexOf(otherFascist)].notificationStatus = player.playersState[seatedPlayers.indexOf(otherFascist)].nameStatus = 'fascist';
				player.playersState[seatedPlayers.indexOf(player)].nameStatus = 'hitler';
			} else {
				player.playersState[seatedPlayers.indexOf(player)].nameStatus = 'liberal';
			}

			player.playersState[i].cardStatus.isFlipped = true;
		});
		sendInProgressGameUpdate(game);
	}, 2000);

	setTimeout(() => {
		game.private.seatedPlayers.forEach((player, i) => {
			player.playersState[i].cardStatus.isFlipped = false;
			player.playersState.forEach(play => {
				play.notificationStatus = '';
			});
		});
		sendInProgressGameUpdate(game);
	}, 5000);

	setTimeout(() => {
		game.publicPlayersState.forEach(player => {
			player.cardStatus.cardDisplayed = false;
		});
		sendInProgressGameUpdate(game);
	}, 7000);

	setTimeout(() => {
		game.gameState.presidentIndex = 0;
		startElection(game);
	}, 9000);
};