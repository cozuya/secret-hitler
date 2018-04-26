const { sendInProgressGameUpdate } = require('../util.js');
const { games } = require('../models.js');
const { startElection, shufflePolicies } = require('./common.js');
const { completeGame } = require('./end-game.js');

/**
 * @param {object} game - game to act on.
 */
module.exports.policyPeek = game => {
	const { seatedPlayers } = game.private;
	const { presidentIndex } = game.gameState;
	const president = seatedPlayers[presidentIndex];

	if (!game.private.lock.policyPeek && !(game.general.isTourny && game.general.tournyInfo.isCancelled)) {
		game.private.lock.policyPeek = true;

		if (game.gameState.undrawnPolicyCount < 3) {
			shufflePolicies(game);
		}

		game.general.status = 'President to peek at policies.';
		game.publicPlayersState[presidentIndex].isLoader = true;
		president.playersState[presidentIndex].policyNotification = true;
		sendInProgressGameUpdate(game);
	}
};

/**
 * @param {object} passport - socket authentication.
 * @param {object} game - target game.
 * @param {object} data from socket emit
 */
module.exports.selectPolicies = (passport, game, data) => {
	const { presidentIndex } = game.gameState;
	const { experiencedMode } = game.general;
	const { seatedPlayers } = game.private;
	const president = seatedPlayers[presidentIndex];

	if (president.userName !== passport.user) {
		return;
	}

	if (game.general.timedMode && game.private.timerId) {
		clearTimeout(game.private.timerId);
		game.gameState.timedModeEnabled = game.private.timerId = null;
	}

	if (!game.private.lock.selectPolicies && !(game.general.isTourny && game.general.tournyInfo.isCancelled)) {
		game.private.lock.selectPolicies = true;
		game.publicPlayersState[presidentIndex].isLoader = false;

		if (game.private.policies.length < 3) {
			shufflePolicies(game);
		}

		game.private.summary = game.private.summary.updateLog({
			policyPeek: game.private.policies.slice(0, 3).reduce(
				(peek, policy) => {
					if (policy === 'fascist') {
						return Object.assign({}, peek, { reds: peek.reds + 1 });
					} else {
						return Object.assign({}, peek, { blues: peek.blues + 1 });
					}
				},
				{ reds: 0, blues: 0 }
			)
		});

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
		}, process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 3500 : 6000);

		setTimeout(() => {
			president.cardFlingerState = [];

			if (!game.general.disableGamechat) {
				president.gameChats.push({
					gameChat: true,
					timestamp: new Date(),
					chat: [
						{ text: 'You peek at the top 3 policies and see that they are a ' },
						{
							text: game.private.policies[0],
							type: game.private.policies[0]
						},
						{ text: ', a ' },
						{
							text: game.private.policies[1],
							type: game.private.policies[1]
						},
						{ text: ', and a ' },
						{
							text: game.private.policies[2],
							type: game.private.policies[2]
						},
						{ text: ' policy.' }
					]
				});
			}

			sendInProgressGameUpdate(game);
			game.trackState.electionTrackerCount = 0;
			president.playersState[presidentIndex].claim = 'didPolicyPeek';
			startElection(game);
		}, process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 4500 : 7000);
	}
};

/**
 * @param {object} game - game to act on.
 */
module.exports.investigateLoyalty = game => {
	const { seatedPlayers } = game.private;
	const { presidentIndex } = game.gameState;
	const president = seatedPlayers[presidentIndex];

	if (!game.private.lock.investigateLoyalty && !(game.general.isTourny && game.general.tournyInfo.isCancelled)) {
		game.private.lock.investigateLoyalty = true;

		game.general.status = 'Waiting for President to investigate.';
		president.playersState.filter((player, i) => i !== presidentIndex && !seatedPlayers[i].isDead && !seatedPlayers[i].wasInvestigated).forEach(player => {
			player.notificationStatus = 'notification';
		});
		game.publicPlayersState[presidentIndex].isLoader = true;
		game.gameState.clickActionInfo = [
			president.userName,
			seatedPlayers
				.filter((player, i) => i !== presidentIndex && !seatedPlayers[i].isDead && !seatedPlayers[i].wasInvestigated)
				.map(player => seatedPlayers.indexOf(player))
		];
		game.gameState.phase = 'selectPartyMembershipInvestigate';
		sendInProgressGameUpdate(game);
	}
};

/**
 * @param {object} passport - socket authentication.
 * @param {object} game - target game.
 * @param {object} data from socket emit
 */
module.exports.selectPartyMembershipInvestigate = (passport, game, data) => {
	if (game.general.timedMode && game.private.timerId) {
		clearTimeout(game.private.timerId);
		game.gameState.timedModeEnabled = game.private.timerId = null;
	}

	const { playerIndex } = data;
	const { experiencedMode } = game.general;
	const { presidentIndex } = game.gameState;
	const { seatedPlayers } = game.private;
	const president = seatedPlayers[presidentIndex];
	const playersTeam = game.private.seatedPlayers[playerIndex].role.team;
	
	if (playerIndex === presidentIndex) {
		return;
	}

	if (president.userName !== passport.user) {
		return;
	}

	if (!game.private.lock.selectPartyMembershipInvestigate && !(game.general.isTourny && game.general.tournyInfo.isCancelled)) {
		game.private.lock.selectPartyMembershipInvestigate = true;

		if (!seatedPlayers[playerIndex].wasInvestigated) {
			seatedPlayers[playerIndex].wasInvestigated = true;

			president.playersState.forEach(player => {
				player.notificationStatus = '';
			});

			game.private.summary = game.private.summary.updateLog({
				investigationId: playerIndex
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

				if (!game.general.disableGamechat) {
					seatedPlayers.filter(player => player.userName !== president.userName).forEach(player => {
						chat.chat = [
							{ text: 'President ' },
							{
								text: game.general.blindMode ? `{${presidentIndex + 1}}` : `${president.userName} {${presidentIndex + 1}}`,
								type: 'player'
							},
							{ text: ' investigates the party membership of ' },
							{
								text: game.general.blindMode ? `{${playerIndex + 1}}` : `${seatedPlayers[playerIndex].userName} {${playerIndex + 1}}`,
								type: 'player'
							},
							{ text: '.' }
						];

						player.gameChats.push(chat);
					});

					game.private.unSeatedGameChats.push(chat);

					president.gameChats.push({
						timestamp: new Date(),
						gameChat: true,
						chat: [
							{ text: 'You investigate the party membership of ' },
							{
								text: game.general.blindMode ? `{${playerIndex + 1}}` : `${seatedPlayers[playerIndex].userName} {${playerIndex + 1}}`,
								type: 'player'
							},
							{ text: ' and determine that they are on the ' },
							{
								text: playersTeam,
								type: playersTeam
							},
							{ text: ' team.' }
						]
					});
				}

				if (!game.general.disableGamechat && !(game.private.seatedPlayers[playerIndex].role.cardName === 'hitler' && president.role.team === 'fascist')) {
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
				president.playersState[presidentIndex].claim = 'didInvestigateLoyalty';
				sendInProgressGameUpdate(game);
				startElection(game);
			}, process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 4200 : 8000);
		}
	}
};

/**
 * @param {object} game - game to act on.
 */
module.exports.specialElection = game => {
	const { seatedPlayers } = game.private;
	const { presidentIndex } = game.gameState;
	const president = seatedPlayers[presidentIndex];

	if (!game.private.lock.specialElection && !(game.general.isTourny && game.general.tournyInfo.isCancelled)) {
		game.private.lock.specialElection = true;
		game.general.status = 'President to select special election.';
		game.gameState.specialElectionFormerPresidentIndex = presidentIndex;
		game.publicPlayersState[presidentIndex].isLoader = true;

		president.playersState.filter((player, index) => index !== presidentIndex && !seatedPlayers[index].isDead).forEach(player => {
			player.notificationStatus = 'notification';
		});

		game.gameState.phase = 'specialElection';
		game.gameState.clickActionInfo = [
			president.userName,
			seatedPlayers.filter((player, i) => i !== presidentIndex && !seatedPlayers[i].isDead).map(player => seatedPlayers.indexOf(player))
		];
		sendInProgressGameUpdate(game);
	}
};

/**
 * @param {object} data from socket emit
 */
module.exports.selectSpecialElection = (passport, game, data) => {
	const game = games.find(el => el.general.uid === data.uid);

	if (!game || !game.gameState) {
		return;
	}

	const { playerIndex } = data;
	const { presidentIndex } = game.gameState;
	const selectedPlayer = seatedPlayers[playerIndex];
	const president = seatedPlayers[presidentIndex];
	if (president.userName !== passport.user) {
		return;
	}
	
	if (playerIndex === presidentIndex) {
		return;
	}

	if (game.general.timedMode && game.private.timerId) {
		clearTimeout(game.private.timerId);
		game.gameState.timedModeEnabled = game.private.timerId = null;
	}

	if (!game.private.lock.selectSpecialElection && !(game.general.isTourny && game.general.tournyInfo.isCancelled)) {
		game.private.lock.selectSpecialElection = true;

		game.private.summary = game.private.summary.updateLog({
			specialElection: data.playerIndex
		});

		game.publicPlayersState[game.gameState.presidentIndex].isLoader = false;

		game.private.seatedPlayers[game.gameState.presidentIndex].playersState.forEach(player => {
			player.notificationStatus = '';
		});

		startElection(game, data.playerIndex);
	}
};

/**
 * @param {object} game - game to act on.
 */
module.exports.executePlayer = game => {
	const { seatedPlayers } = game.private;
	const { presidentIndex } = game.gameState;
	const president = seatedPlayers[presidentIndex];

	if (!game.private.lock.executePlayer && !(game.general.isTourny && game.general.tournyInfo.isCancelled)) {
		game.private.lock.executePlayer = true;
		game.general.status = 'President to execute a player.';
		game.publicPlayersState[presidentIndex].isLoader = true;

		if (!game.general.disableGamechat) {
			president.gameChats.push({
				gameChat: true,
				timestamp: new Date(),
				chat: [{ text: 'You must select a player to execute.' }]
			});
		}

		president.playersState
			.filter(
				(player, index) =>
					index !== presidentIndex &&
					!seatedPlayers[index].isDead &&
					!(president.role.cardName === 'fascist' && seatedPlayers[index].role.cardName === 'hitler')
			)
			.forEach(player => {
				player.notificationStatus = 'notification';
			});

		game.gameState.clickActionInfo = [
			president.userName,
			seatedPlayers
				.filter(
					(player, i) =>
						i !== presidentIndex && !seatedPlayers[i].isDead && !(president.role.cardName === 'fascist' && seatedPlayers[i].role.cardName === 'hitler')
				)
				.map(player => seatedPlayers.indexOf(player))
		];
		game.gameState.phase = 'execution';
		sendInProgressGameUpdate(game);
	}
};

/**
 * @param {object} passport - socket authentication.
 * @param {object} game - target game.
 * @param {object} data from socket emit
 */
module.exports.selectPlayerToExecute = (passport, game, data) => {
	const { playerIndex } = data;
	const { presidentIndex } = game.gameState;
	const { seatedPlayers } = game.private;
	const selectedPlayer = seatedPlayers[playerIndex];
	const publicSelectedPlayer = game.publicPlayersState[playerIndex];
	const president = seatedPlayers[presidentIndex];
	
	// Make sure the target is valid
	if (playerIndex === presidentIndex ||
		selectedPlayer.isDead ||
	   (selectedPlayer.role.cardName === "hitler" && president.role.cardName === "fascist")) {
		return;
	}

	if (president.userName !== passport.user) {
		return;
	}

	const nonPresidentChat = {
		gameChat: true,
		timestamp: new Date(),
		chat: [
			{ text: 'President ' },
			{
				text: game.general.blindMode ? `{${presidentIndex + 1}}` : `${president.userName} {${presidentIndex + 1}}`,
				type: 'player'
			},
			{ text: ' selects to execute ' },
			{
				text: game.general.blindMode ? `{${playerIndex + 1}}` : `${selectedPlayer.userName} {${playerIndex + 1}}`,
				type: 'player'
			},
			{ text: '.' }
		]
	};

	if (game.general.timedMode && game.private.timerId) {
		clearTimeout(game.private.timerId);
		game.gameState.timedModeEnabled = game.private.timerId = null;
	}

	if (!game.private.lock.selectPlayerToExecute && !(game.general.isTourny && game.general.tournyInfo.isCancelled)) {
		game.private.lock.selectPlayerToExecute = true;

		game.private.summary = game.private.summary.updateLog({
			execution: playerIndex
		});

		if (!game.general.disableGamechat) {
			game.private.unSeatedGameChats.push(nonPresidentChat);

			seatedPlayers.filter(player => player.userName !== president.userName).forEach(player => {
				player.gameChats.push(nonPresidentChat);
			});

			president.gameChats.push({
				gameChat: true,
				timestamp: new Date(),
				chat: [
					{ text: 'You select to execute ' },
					{
						text: game.general.blindMode ? `{${playerIndex + 1}}` : `${selectedPlayer.userName} {${playerIndex + 1}}`,
						type: 'player'
					},
					{ text: '.' }
				]
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
						{ text: '  has been executed.' }
					]
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
	}
};
