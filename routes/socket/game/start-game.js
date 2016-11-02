const {sendInProgressGameUpdate} = require('../util.js'),
	_ = require('lodash'),
	{startElection} = require('./election.js'),
	{shufflePolicies} = require('./common.js');

module.exports = game => {
	let roles = _.range(0, 3).map(el => ({
		cardName: 'liberal',
		icon: el,
		team: 'liberal'
	})).concat([{
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
	game.general.playerCount = game.general.livingPlayerCount = game.publicPlayersState.length;

	if (game.publicPlayersState.length > 5) {
		roles = roles.concat([{
			cardName: 'liberal',
			icon: 4,
			team: 'liberal'
		}]);
	}

	if (game.publicPlayersState.length > 6) {
		roles = roles.concat([{
			cardName: 'fascist',
			icon: 1,
			team: 'fascist'
		}]);
		game.general.type = 1;
	}

	if (game.publicPlayersState.length > 7) {
		roles = roles.concat([{
			cardName: 'liberal',
			icon: 5,
			team: 'liberal'
		}]);
	}

	if (game.publicPlayersState.length > 8) {
		roles = roles.concat([{
			cardName: 'fascist',
			icon: 2,
			team: 'fascist'
		}]);
		game.general.type = 2;
	}

	if (game.publicPlayersState.length > 9) {
		roles = roles.concat([{
			cardName: 'liberal',
			icon: 4,
			team: 'liberal'
		}]);
	}
	// console.log(_.shuffle(game.publicPlayersState));
	game.publicPlayersState = _.shuffle(game.publicPlayersState);
	// console.log(game.publicPlayersState);
	game.private.seatedPlayers = _.cloneDeep(game.publicPlayersState);
	game.private.policies = shufflePolicies();
	game.general.status = 'Dealing roles..';

	game.publicPlayersState.forEach(player => {
		player.cardStatus.cardDisplayed = true;
	});

	game.private.seatedPlayers.forEach((player, i) => {
		const index = Math.floor(Math.random() * roles.length);

		player.role = roles[index];
		roles.splice(index, 1);
		player.playersState = _.range(0, game.publicPlayersState.length).map(play => ({}));

		player.playersState.forEach((play, index) => {
			play.notificationStatus = play.nameStatus = '';
			play.cardStatus = i === index ? {cardBack: player.role} : {};
		});

		// console.log(player.playersState);

		player.gameChats = [{
			timestamp: new Date(),
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
		timestamp: new Date(),
		chat: [{
			text: 'The game begins.'
		}]
	}];

	game.gameState.isStarted = true;
	sendInProgressGameUpdate(game);

	setTimeout(() => {
		game.private.seatedPlayers.forEach((player, i) => {
			const playerCountInGame = game.private.seatedPlayers.length,
				{seatedPlayers} = game.private,
				{cardName} = player.role;

			if (cardName === 'fascist') {
				if (playerCountInGame > 6 && playerCountInGame < 9) {
					const otherFascist = seatedPlayers.find(player => player.role.cardName === 'fascist');

					player.gameChats.push({
						timestamp: new Date(),
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
							text: `${otherFascist.userName} {${seatedPlayers.indexOf(otherFascist) + 1}}`,
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
						timestamp: new Date(),
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
							text: `${otherFascists[0].userName} {${seatedPlayers.indexOf(otherFascists[0]) + 1}}`,
							type: 'player'

						},
						{
							text: ' and '
						},
						{
							text: `${otherFascists[1].userName} {${seatedPlayers.indexOf(otherFascists[1]) + 1}}`,
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
						timestamp: new Date(),
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
							text: `${hitlerPlayer.userName} {${seatedPlayers.indexOf(hitlerPlayer) + 1}}`,
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
					timestamp: new Date(),
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
						text: `${otherFascist.userName} {${seatedPlayers.indexOf(otherFascist) + 1}}`,
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
	}, process.env.NODE_ENV === 'development' ? 100 : 2000);

	setTimeout(() => {
		game.private.seatedPlayers.forEach((player, i) => {
			player.playersState[i].cardStatus.isFlipped = false;
			player.playersState.forEach(play => {
				play.notificationStatus = '';
			});
		});
		sendInProgressGameUpdate(game);
	}, process.env.NODE_ENV === 'development' ? 100 : 5000);

	setTimeout(() => {
		game.publicPlayersState.forEach(player => {
			player.cardStatus.cardDisplayed = false;
		});
		sendInProgressGameUpdate(game);
	}, process.env.NODE_ENV === 'development' ? 100 : 7000);

	setTimeout(() => {
		game.private.seatedPlayers.forEach(player => {
			player.playersState.forEach(state => {
				state.cardStatus = {};
			});
		});
		game.gameState.presidentIndex = -1;
		startElection(game);
	}, process.env.NODE_ENV === 'development' ? 100 : 9000);
};