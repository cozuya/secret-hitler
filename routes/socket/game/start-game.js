const {sendInProgressGameUpdate} = require('../util.js'),
	// {games} = require('../models.js'),
	// {sendGameList} = require('../user-requests.js'),
	_ = require('lodash'),
	{startElection} = require('./election.js'),
	{shufflePolicies} = require('./common.js'),
	GameSummaryBuilder = require('../../../models/game-summary/GameSummaryBuilder'),
	beginGame = game => {
		const {experiencedMode} = game.general;

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
		}]);

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

			if (!game.general.disableGamechat) {
				player.gameChats.push({
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
				});
			} else {
				player.gameChats.push({
					gameChat: true,
					timestamp: new Date(),
					chat: [{
						text: 'The game begins.'
					}]
				});
			}
		});

		game.private.summary = new GameSummaryBuilder(
			game.general.uid,
			new Date(),
			game.private.seatedPlayers.map(p => ({
				username: p.userName,
				role: p.role.cardName
			}))
		);

		game.private.unSeatedGameChats = [{
			gameChat: true,
			timestamp: new Date(),
			chat: [{
				text: 'The game begins.'
			}]
		}];

		sendInProgressGameUpdate(game);

		setTimeout(() => {
			game.private.seatedPlayers.forEach((player, i) => {
				const {seatedPlayers} = game.private,
					{playerCount} = game.general,
					{cardName} = player.role;

				if (cardName === 'fascist') {
					player.playersState[i].nameStatus = 'fascist';

					if (playerCount > 6 && playerCount < 9) {
						const otherFascist = seatedPlayers.find(play => play.role.cardName === 'fascist' && play.userName !== player.userName),
							otherFascistIndex = seatedPlayers.indexOf(otherFascist);

						if (!game.general.disableGamechat) {
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
									text: `${otherFascist.userName} {${otherFascistIndex + 1}}`,
									type: 'player'
								},
								{
									text: '.'
								}]
							});

							player.playersState[otherFascistIndex].nameStatus = 'fascist';
						}
						player.playersState[otherFascistIndex].notificationStatus = 'fascist';
					} else if (playerCount > 8) {
						const otherFascists = seatedPlayers.filter(play => play.role.cardName === 'fascist' && play.userName !== player.userName);

						if (!game.general.disableGamechat) {
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
									text: ' in this game are '
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
								player.playersState[seatedPlayers.indexOf(fascistPlayer)].nameStatus = 'fascist';
							});
						}

						otherFascists.forEach(fascistPlayer => {
							player.playersState[seatedPlayers.indexOf(fascistPlayer)].notificationStatus = 'fascist';
						});
					}
					const hitlerPlayer = seatedPlayers.find(player => player.role.cardName === 'hitler'),
						chat = {
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
							}]
						};

					if (!game.general.disableGamechat) {
						if (playerCount < 7) {
							chat.chat.push({text: '. He or she also sees that you are a '},
								{
									text: 'fascist',
									type: 'fascist'
								},
								{text: '.'});
						} else {
							chat.chat.push({text: '. He or she does not know you are a '},
								{
									text: 'fascist',
									type: 'fascist'
								},
								{text: '.'});
						}
						player.gameChats.push(chat);
						player.playersState[seatedPlayers.indexOf(hitlerPlayer)].nameStatus = 'hitler';
					}

					player.playersState[seatedPlayers.indexOf(hitlerPlayer)].notificationStatus = 'hitler';
				} else if (cardName === 'hitler') {
					player.playersState[seatedPlayers.indexOf(player)].nameStatus = 'hitler';

					if (playerCount < 7) {
						const otherFascist = seatedPlayers.find(player => player.role.cardName === 'fascist');

						if (!game.general.disableGamechat) {
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

							player.playersState[seatedPlayers.indexOf(otherFascist)].nameStatus = 'fascist';
						}

						player.playersState[seatedPlayers.indexOf(otherFascist)].notificationStatus = 'fascist';
					}
				} else if (!game.general.disableGamechat) {
					player.playersState[seatedPlayers.indexOf(player)].nameStatus = 'liberal';
				}

				player.playersState[i].cardStatus.isFlipped = true;
			});
			sendInProgressGameUpdate(game);
		}, process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 200 : 2000);

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
		}, process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 5200 : 7000);

		setTimeout(() => {
			game.private.seatedPlayers.forEach(player => {
				player.playersState.forEach(state => {
					state.cardStatus = {};
				});
			});
			game.gameState.presidentIndex = -1;
			startElection(game);
		}, process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 5400 : 9000);
	};

module.exports = game => {
	let startGamePause = process.env.NODE_ENV === 'development' ? 1 : 5;

	const countDown = setInterval(() => {
		if (!startGamePause) {
			clearInterval(countDown);
			beginGame(game);
		} else {
			game.general.status = `Game starts in ${startGamePause} second${startGamePause === 1 ? '' : 's'}.`;
			io.in(game.general.uid).emit('gameUpdate', game);
			startGamePause--;
		}
	}, 1000);

	game.general.playerCount = game.publicPlayersState.length;
	game.general.livingPlayerCount = game.publicPlayersState.length;
	game.general.type = game.general.playerCount < 7 ? 0 : game.general.playerCount < 9 ? 1 : 2; // different fascist tracks
	game.publicPlayersState = _.shuffle(game.publicPlayersState);
	game.private.seatedPlayers = _.cloneDeep(game.publicPlayersState);
	game.private.seatedPlayers.forEach(player => {
		player.gameChats = [];
	});
	game.gameState.isTracksFlipped = true;
	game.private.policies = [];

	// remove idle games, timeout is reset on game updates
	// game.private.timeout = (() => {
	// 	// 10 minutes
	// 	const timeout = () => setTimeout(() => {
	// 		games.splice(games.indexOf(game), 1);
	// 		sendGameList();
	// 	}, 300000);

	// 	let id = timeout();

	// 	return {
	// 		reset: () => {
	// 			clearTimeout(id);
	// 			id = timeout();
	// 		}
	// 	};
	// })();

	shufflePolicies(game);
};