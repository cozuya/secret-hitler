const { sendInProgressGameUpdate, sendInProgressModChatUpdate } = require('../util.js');
const _ = require('lodash');
const { startElection } = require('./election.js');
const { shufflePolicies } = require('./common.js');
const GameSummaryBuilder = require('../../../models/game-summary/GameSummaryBuilder');
const Account = require('../../../models/account.js');

/**
 * @param {object} game - game to act on.
 */
const beginGame = game => {
	const { experiencedMode } = game.general;
	const libCount = Math.floor(game.publicPlayersState.length / 2) + 1;
	const fasCount = game.publicPlayersState.length - libCount - 1;

	game.general.timeStarted = new Date().getTime();
	game.general.type = Math.floor((game.publicPlayersState.length - 5) / 2);

	game.private.hiddenInfoChat = [];
	game.private.hiddenInfoSubscriptions = [];
	game.private.hiddenInfoShouldNotify = true;

	const roles = [
		{
			cardName: 'hitler',
			icon: 0,
			team: 'fascist'
		}
	]
		.concat(
			_.shuffle(
				_.range(0, 6).map(el => ({
					cardName: 'liberal',
					icon: el,
					team: 'liberal'
				}))
			).slice(0, libCount)
		)
		.concat(
			_.shuffle(
				_.range(0, 3).map(el => ({
					cardName: 'fascist',
					icon: el,
					team: 'fascist'
				}))
			).slice(0, fasCount)
		);

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

			play.cardStatus = i === index ? { cardBack: player.role } : {};
		});

		if (!game.general.disableGamechat) {
			player.gameChats.push({
				timestamp: new Date(),
				gameChat: true,
				chat: [
					{
						text: 'The game begins and you receive the '
					},
					{
						text: player.role.cardName === 'hitler' ? 'hitler' : player.role.cardName,
						type: player.role.cardName
					},
					{
						text: ' role and take seat '
					},
					{
						text: `#${i + 1}.`,
						type: 'player'
					}
				]
			});
		} else {
			player.gameChats.push({
				gameChat: true,
				timestamp: new Date(),
				chat: [
					{
						text: 'The game begins.'
					}
				]
			});
		}

		game.private.hiddenInfoChat.push({
			timestamp: new Date(),
			gameChat: true,
			chat: [
				{
					text: `${player.userName} #${i + 1}.`,
					type: 'player'
				},
				{
					text: ' is assigned the '
				},
				{
					text: player.role.cardName === 'hitler' ? 'hitler' : player.role.cardName,
					type: player.role.cardName
				},
				{
					text: ' role.'
				}
			]
		});
	});
	sendInProgressModChatUpdate(game);

	const libPlayers = game.private.seatedPlayers.filter(player => player.role.team === 'liberal');
	const fasPlayers = game.private.seatedPlayers.filter(player => player.role.team !== 'liberal');
	const lib = libPlayers.map(player => player.userName);
	const fas = fasPlayers.map(player => player.userName);
	const libElo = { overall: 1600, season: 1600 };
	const fasElo = { overall: 1600, season: 1600 };
	Account.find({
		username: { $in: game.private.seatedPlayers.map(player => player.userName) }
	}).then(accounts => {
		libElo.overall =
			lib.reduce(
				(prev, curr) =>
					(accounts.find(account => account.username === curr).eloOverall ? accounts.find(account => account.username === curr).eloOverall : 1600) + prev,
				0
			) / lib.length;
		libElo.season =
			lib.reduce(
				(prev, curr) =>
					(accounts.find(account => account.username === curr).eloSeason ? accounts.find(account => account.username === curr).eloSeason : 1600) + prev,
				0
			) / lib.length;
		fasElo.overall =
			fas.reduce(
				(prev, curr) =>
					(accounts.find(account => account.username === curr).eloOverall ? accounts.find(account => account.username === curr).eloOverall : 1600) + prev,
				0
			) / fas.length;
		fasElo.season =
			fas.reduce(
				(prev, curr) =>
					(accounts.find(account => account.username === curr).eloSeason ? accounts.find(account => account.username === curr).eloSeason : 1600) + prev,
				0
			) / fas.length;
	});

	game.private.summary = new GameSummaryBuilder(
		game.general.uid,
		new Date(),
		{
			rebalance6p: game.general.rebalance6p && game.private.seatedPlayers.length === 6,
			rebalance7p: game.general.rebalance7p && game.private.seatedPlayers.length === 7,
			rebalance9p: false,
			rerebalance9p: game.general.rerebalance9p && game.private.seatedPlayers.length === 9,
			casualGame: Boolean(game.general.casualGame)
		},
		game.private.seatedPlayers.map(p => ({
			username: p.userName,
			role: p.role.cardName,
			icon: p.role.icon
		})),
		libElo,
		fasElo
	);

	game.private.unSeatedGameChats = [
		{
			gameChat: true,
			timestamp: new Date(),
			chat: [
				{
					text: 'The game begins.'
				}
			]
		}
	];

	sendInProgressGameUpdate(game);

	setTimeout(() => {
		game.private.seatedPlayers.forEach((player, i) => {
			const { seatedPlayers } = game.private;
			const { playerCount } = game.general;
			const { cardName } = player.role;

			if (cardName === 'fascist') {
				player.playersState[i].nameStatus = 'fascist';

				if (playerCount > 6 && playerCount < 9) {
					const otherFascist = seatedPlayers.find(play => play.role.cardName === 'fascist' && play.userName !== player.userName);
					const otherFascistIndex = seatedPlayers.indexOf(otherFascist);

					if (!game.general.disableGamechat) {
						player.gameChats.push({
							timestamp: new Date(),
							gameChat: true,
							chat: [
								{
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
									text: game.general.blindMode ? `{${otherFascistIndex + 1}}` : `${otherFascist.userName} {${otherFascistIndex + 1}}`,
									type: 'player'
								},
								{
									text: '.'
								}
							]
						});
					}
					player.playersState[otherFascistIndex].nameStatus = 'fascist';
					player.playersState[otherFascistIndex].notificationStatus = 'fascist';
				} else if (playerCount > 8) {
					const otherFascists = seatedPlayers.filter(play => play.role.cardName === 'fascist' && play.userName !== player.userName);

					if (!game.general.disableGamechat) {
						player.gameChats.push({
							timestamp: new Date(),
							gameChat: true,
							chat: [
								{
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
									text: game.general.blindMode
										? `{${seatedPlayers.indexOf(otherFascists[0]) + 1}}`
										: `${otherFascists[0].userName} {${seatedPlayers.indexOf(otherFascists[0]) + 1}}`,
									type: 'player'
								},
								{
									text: ' and '
								},
								{
									text: game.general.blindMode
										? `{${seatedPlayers.indexOf(otherFascists[1]) + 1}}`
										: `${otherFascists[1].userName} {${seatedPlayers.indexOf(otherFascists[1]) + 1}}`,
									type: 'player'
								},
								{
									text: '.'
								}
							]
						});
					}
					otherFascists.forEach(fascistPlayer => {
						player.playersState[seatedPlayers.indexOf(fascistPlayer)].nameStatus = 'fascist';
					});
					otherFascists.forEach(fascistPlayer => {
						player.playersState[seatedPlayers.indexOf(fascistPlayer)].notificationStatus = 'fascist';
					});
				}

				const hitlerPlayer = seatedPlayers.find(player => player.role.cardName === 'hitler');
				const chat = {
					timestamp: new Date(),
					gameChat: true,
					chat: [
						{
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
							text: game.general.blindMode
								? `{${seatedPlayers.indexOf(hitlerPlayer) + 1}}`
								: `${hitlerPlayer.userName} {${seatedPlayers.indexOf(hitlerPlayer) + 1}}`,
							type: 'player'
						}
					]
				};

				if (!game.general.disableGamechat) {
					if (playerCount < 7) {
						chat.chat.push(
							{ text: '. They also see that you are a ' },
							{
								text: 'fascist',
								type: 'fascist'
							},
							{ text: '.' }
						);
					} else {
						chat.chat.push(
							{ text: '. They do not know you are a ' },
							{
								text: 'fascist',
								type: 'fascist'
							},
							{ text: '.' }
						);
					}
					player.gameChats.push(chat);
				}

				player.playersState[seatedPlayers.indexOf(hitlerPlayer)].notificationStatus = 'hitler';
				player.playersState[seatedPlayers.indexOf(hitlerPlayer)].nameStatus = 'hitler';
			} else if (cardName === 'hitler') {
				player.playersState[seatedPlayers.indexOf(player)].nameStatus = 'hitler';

				if (playerCount < 7) {
					const otherFascist = seatedPlayers.find(player => player.role.cardName === 'fascist');

					if (!game.general.disableGamechat) {
						player.gameChats.push({
							timestamp: new Date(),
							gameChat: true,
							chat: [
								{
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
									text: game.general.blindMode
										? `{${seatedPlayers.indexOf(otherFascist) + 1}}`
										: `${otherFascist.userName} {${seatedPlayers.indexOf(otherFascist) + 1}}`,
									type: 'player'
								},
								{
									text: '.  They know who you are.'
								}
							]
						});
					}
					player.playersState[seatedPlayers.indexOf(otherFascist)].nameStatus = 'fascist';
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
			if (!player.playersState) {
				return;
			}
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

/**
 * @param {object} game - game to act on.
 */
module.exports = game => {
	let startGamePause = process.env.NODE_ENV === 'development' ? 1 : 5;

	const countDown = setInterval(() => {
		if (!startGamePause) {
			clearInterval(countDown);
			beginGame(game);
		} else {
			game.general.status = `Game starts in ${startGamePause} second${startGamePause === 1 ? '' : 's'}.`;
			sendInProgressGameUpdate(game);
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
		player.wasInvestigated = false;
	});
	game.gameState.isTracksFlipped = true;
	game.gameState.audioCue = '';
	game.private.policies = [];

	shufflePolicies(
		game,
		Boolean(game.private.seatedPlayers.length === 6) && game.general.rebalance6p,
		Boolean(game.private.seatedPlayers.length === 9) && game.general.rebalance9p2f
	);
};
