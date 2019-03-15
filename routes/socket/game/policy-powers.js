const { sendInProgressGameUpdate, sendInProgressModChatUpdate } = require('../util.js');
const { startElection, shufflePolicies } = require('./common.js');
const { sendGameList } = require('../user-requests');
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
		sendInProgressGameUpdate(game, true);
	}
};

/**
 * @param {object} passport - socket authentication.
 * @param {object} game - target game.
 * @param {object} socket - socket
 */
module.exports.selectPolicies = (passport, game, socket) => {
	const { presidentIndex } = game.gameState;
	const { experiencedMode } = game.general;
	const { seatedPlayers } = game.private;
	const president = seatedPlayers[presidentIndex];

	if (game.gameState.isGameFrozen) {
		return;
	}

	if (!president || president.userName !== passport.user) {
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

		game.gameState.audioCue = 'policyPeek';
		president.playersState[presidentIndex].policyNotification = false;
		sendInProgressGameUpdate(game, true);

		setTimeout(
			() => {
				president.cardFlingerState[0].cardStatus.isFlipped = president.cardFlingerState[1].cardStatus.isFlipped = president.cardFlingerState[2].cardStatus.isFlipped = true;
				sendInProgressGameUpdate(game, true);
			},
			process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 500 : 2000
		);

		setTimeout(
			() => {
				president.cardFlingerState[0].cardStatus.isFlipped = president.cardFlingerState[1].cardStatus.isFlipped = president.cardFlingerState[2].cardStatus.isFlipped = false;
				president.cardFlingerState[0].action = president.cardFlingerState[1].action = president.cardFlingerState[2].action = '';
				sendInProgressGameUpdate(game, true);
				game.gameState.audioCue = '';
			},
			process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 3500 : 6000
		);

		setTimeout(
			() => {
				president.cardFlingerState = [];

				const modOnlyChat = {
					timestamp: new Date(),
					gameChat: true,
					chat: [
						{
							text: 'President '
						},
						{
							text: `${seatedPlayers[presidentIndex].userName} {${presidentIndex + 1}}`,
							type: 'player'
						},
						{
							text: ' peeks and sees '
						},
						{
							text: game.private.policies[0] === 'liberal' ? 'B' : 'R',
							type: game.private.policies[0]
						},
						{
							text: game.private.policies[1] === 'liberal' ? 'B' : 'R',
							type: game.private.policies[1]
						},
						{
							text: game.private.policies[2] === 'liberal' ? 'B' : 'R',
							type: game.private.policies[2]
						},
						{
							text: '.'
						}
					]
				};
				game.private.hiddenInfoChat.push(modOnlyChat);
				sendInProgressModChatUpdate(game, modOnlyChat);

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
			},
			process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 4500 : 7000
		);
	}
};

/**
 * @param {object} game - game to act on.
 */
module.exports.policyPeekAndDrop = game => {
	const { seatedPlayers } = game.private;
	const { presidentIndex } = game.gameState;
	const president = seatedPlayers[presidentIndex];

	if (!game.private.lock.policyPeekAndDrop && !(game.general.isTourny && game.general.tournyInfo.isCancelled)) {
		game.private.lock.policyPeekAndDrop = true;

		if (game.gameState.undrawnPolicyCount < 3) {
			shufflePolicies(game);
		}

		game.general.status = 'President to peek at one policy.';
		game.publicPlayersState[presidentIndex].isLoader = true;
		president.playersState[presidentIndex].policyNotification = true;
		sendInProgressGameUpdate(game, true);
	}
};

/**
 * @param {object} passport - socket authentication.
 * @param {object} game - target game.
 */
module.exports.selectOnePolicy = (passport, game) => {
	const { presidentIndex } = game.gameState;
	const { experiencedMode } = game.general;
	const { seatedPlayers } = game.private;
	const president = seatedPlayers[presidentIndex];

	if (game.gameState.isGameFrozen) {
		if (socket) {
			socket.emit('sendAlert', 'An AEM member has prevented this game from proceeding. Please wait.');
		}
		return;
	}

	if (!president || president.userName !== passport.user) {
		return;
	}

	if (game.general.timedMode && game.private.timerId) {
		clearTimeout(game.private.timerId);
		game.gameState.timedModeEnabled = game.private.timerId = null;
	}

	if (!game.private.lock.selectOnePolicy && !(game.general.isTourny && game.general.tournyInfo.isCancelled)) {
		game.private.lock.selectOnePolicy = true;
		game.publicPlayersState[presidentIndex].isLoader = false;

		if (game.private.policies.length < 3) {
			shufflePolicies(game);
		}

		game.private.summary = game.private.summary.updateLog({
			policyPeek: game.private.policies.slice(0, 1).reduce(
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

		const policy = game.private.policies[0];
		president.cardFlingerState = [
			{
				position: 'middle-center',
				action: 'active',
				cardStatus: {
					isFlipped: false,
					cardFront: 'policy',
					cardBack: `${policy}p`
				}
			}
		];

		game.gameState.audioCue = 'policyPeek';
		president.playersState[presidentIndex].policyNotification = false;
		sendInProgressGameUpdate(game, true);

		setTimeout(
			() => {
				president.cardFlingerState[0].cardStatus.isFlipped = true;
				sendInProgressGameUpdate(game, true);
			},
			process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 500 : 2000
		);

		setTimeout(
			() => {
				president.cardFlingerState[0].cardStatus.isFlipped = false;
				president.cardFlingerState[0].action = '';
				sendInProgressGameUpdate(game, true);
				game.gameState.audioCue = '';
			},
			process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 3500 : 6000
		);

		setTimeout(
			() => {
				president.cardFlingerState = [];

				const modOnlyChat = {
					timestamp: new Date(),
					gameChat: true,
					chat: [
						{
							text: 'President '
						},
						{
							text: `${seatedPlayers[presidentIndex].userName} {${presidentIndex + 1}}`,
							type: 'player'
						},
						{
							text: ' peeks and sees '
						},
						{
							text: game.private.policies[0] === 'liberal' ? 'B' : 'R',
							type: game.private.policies[0]
						},
						{
							text: '.'
						}
					]
				};
				game.private.hiddenInfoChat.push(modOnlyChat);
				sendInProgressModChatUpdate(game, modOnlyChat);

				if (!game.general.disableGamechat) {
					president.gameChats.push({
						gameChat: true,
						timestamp: new Date(),
						chat: [
							{ text: 'You peek at the top policy and see that it is a ' },
							{
								text: policy,
								type: policy
							},
							{ text: ' policy.' }
						]
					});
				}

				sendInProgressGameUpdate(game);
				game.trackState.electionTrackerCount = 0;
				president.playersState[presidentIndex].claim = 'didSinglePolicyPeek';
				setTimeout(
					() => {
						const chat = {
							gameChat: true,
							timestamp: new Date(),
							chat: [
								{
									text:
										'You must vote whether or not to discard this policy.  Select Ja to discard the peeked policy or select Nein to put it back on the deck.'
								}
							]
						};

						game.publicPlayersState[presidentIndex].isLoader = true;

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

						if (!game.general.disableGamechat) {
							president.gameChats.push(chat);
						}

						sendInProgressGameUpdate(game);

						setTimeout(
							() => {
								president.cardFlingerState[0].cardStatus.isFlipped = president.cardFlingerState[1].cardStatus.isFlipped = true;
								president.cardFlingerState[0].notificationStatus = president.cardFlingerState[1].notificationStatus = 'notification';
								game.gameState.phase = 'presidentVoteOnBurn';

								if (game.general.timedMode) {
									game.gameState.timedModeEnabled = true; // (passport, game, data)
									game.private.timerId = setTimeout(
										() => {
											if (game.gameState.timedModeEnabled) {
												game.gameState.timedModeEnabled = false;

												selectBurnCard({ user: president.userName }, game, { vote: Boolean(Math.floor(Math.random() * 2)) });
											}
										},
										process.env.DEVTIMEDDELAY ? process.env.DEVTIMEDDELAY : game.general.timedMode * 1000
									);
								}

								sendInProgressGameUpdate(game);
							},
							process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 500 : 1000
						);
					},
					process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 1000 : 2000
				);
			},
			process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 4500 : 7000
		);
	}
};

/**
 * @param {object} passport - socket authentication.
 * @param {object} game - target game.
 * @param {object} data from socket emit
 * @param {object} socket - socket
 */
module.exports.selectBurnCard = (passport, game, data, socket) => {
	if (game.general.timedMode && game.private.timerId) {
		clearTimeout(game.private.timerId);
		game.gameState.timedModeEnabled = game.private.timerId = null;
	}

	if (game.gameState.isGameFrozen) {
		if (socket) {
			socket.emit('sendAlert', 'An AEM member has prevented this game from proceeding. Please wait.');
		}
		return;
	}

	const { experiencedMode } = game.general;
	const { presidentIndex } = game.gameState;
	const { seatedPlayers } = game.private;
	const president = seatedPlayers[presidentIndex];
	const publicPresident = game.publicPlayersState[game.gameState.presidentIndex];

	if (!president || president.userName !== passport.user) {
		return;
	}

	if (!game.private.lock.selectBurnCard && !(game.general.isTourny && game.general.tournyInfo.isCancelled)) {
		game.private.lock.selectBurnCard = true;

		game.private.summary = game.private.summary.updateLog({
			presidentVeto: data.vote
		});
		game.publicPlayersState[presidentIndex].isLoader = false;
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

		setTimeout(
			() => {
				const chat = {
					timestamp: new Date(),
					gameChat: true,
					chat: [
						{ text: 'President ' },
						{
							text: game.general.blindMode
								? `{${game.private.seatedPlayers.indexOf(president) + 1}}`
								: `${passport.user} {${game.private.seatedPlayers.indexOf(president) + 1}}`,
							type: 'player'
						},
						{
							text: data.vote ? ' has chosen to discard the top card.' : ' has chosen to keep the top card.'
						}
					]
				};

				if (!game.general.disableGamechat) {
					game.private.seatedPlayers.forEach(player => {
						player.gameChats.push(chat);
					});
					game.private.unSeatedGameChats.push(chat);
				}

				publicPresident.cardStatus.isFlipped = true;

				president.cardFlingerState = [];
				if (data.vote) {
					game.private.policies.shift();
					game.gameState.undrawnPolicyCount--;
					if (game.gameState.undrawnPolicyCount < 3) {
						shufflePolicies(game);
					}
				}
				sendInProgressGameUpdate(game);

				setTimeout(
					() => {
						startElection(game);
					},
					process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 1000 : 3000
				);
			},
			process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 1000 : 3000
		);
	}
};

/**
 * @param {object} game - game to act on.
 */
module.exports.investigateLoyalty = game => {
	const { seatedPlayers } = game.private;
	const { presidentIndex } = game.gameState;
	const president = seatedPlayers[presidentIndex];

	president.playersState.forEach((player, i) => {
		if (!seatedPlayers[i]) {
			console.error(`PLAYERSTATE CONTAINS NULL!\n${JSON.stringify(president.playersState)}\n${JSON.stringify(game)}`);
		}
	});
	const hasTarget =
		president.playersState.filter((player, i) => i !== presidentIndex && !seatedPlayers[i].isDead && !seatedPlayers[i].wasInvestigated).length > 0;
	if (!hasTarget) {
		let t = new Date();
		t.setMilliseconds(t.getMilliseconds + 1);
		const chat = {
			timestamp: t,
			gameChat: true,
			chat: [
				{ text: 'President ' },
				{
					text: game.general.blindMode ? `{${presidentIndex + 1}}` : `${president.userName} {${presidentIndex + 1}}`,
					type: 'player'
				},
				{ text: '  has no valid investigation target.' }
			]
		};

		seatedPlayers.forEach((player, i) => {
			player.gameChats.push(chat);
		});

		game.private.unSeatedGameChats.push(chat);
		startElection(game);
		return;
	}

	if (!game.private.lock.investigateLoyalty && !(game.general.isTourny && game.general.tournyInfo.isCancelled)) {
		game.private.lock.investigateLoyalty = true;

		game.general.status = 'Waiting for President to investigate.';
		president.playersState
			.filter((player, i) => i !== presidentIndex && !seatedPlayers[i].isDead && !seatedPlayers[i].wasInvestigated)
			.forEach(player => {
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
		sendInProgressGameUpdate(game, true);
	}
};

/**
 * @param {object} passport - socket authentication.
 * @param {object} game - target game.
 * @param {object} data from socket emit
 * @param {object} socket - socket
 */
module.exports.selectPartyMembershipInvestigate = (passport, game, data, socket) => {
	if (game.general.timedMode && game.private.timerId) {
		clearTimeout(game.private.timerId);
		game.gameState.timedModeEnabled = game.private.timerId = null;
	}

	if (game.gameState.isGameFrozen) {
		if (socket) {
			socket.emit('sendAlert', 'An AEM member has prevented this game from proceeding. Please wait.');
		}
		return;
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

	if (!president || president.userName !== passport.user) {
		return;
	}

	if (!game.private.lock.selectPartyMembershipInvestigate && !(game.general.isTourny && game.general.tournyInfo.isCancelled)) {
		game.private.lock.selectPartyMembershipInvestigate = true;

		if (!seatedPlayers[playerIndex].isDead && !seatedPlayers[playerIndex].wasInvestigated) {
			game.gameState.audioCue = 'selectedInvestigate';
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

			sendInProgressGameUpdate(game, true);

			setTimeout(
				() => {
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
						seatedPlayers
							.filter(player => player.userName !== president.userName)
							.forEach(player => {
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

					const modOnlyChat = {
						timestamp: new Date(),
						gameChat: true,
						chat: [
							{
								text: 'President '
							},
							{
								text: `${seatedPlayers[presidentIndex].userName} {${presidentIndex + 1}}`,
								type: 'player'
							},
							{
								text: ' sees a '
							},
							{
								text: playersTeam,
								type: playersTeam
							},
							{
								text: ' loyalty card.'
							}
						]
					};
					game.private.hiddenInfoChat.push(modOnlyChat);
					sendInProgressModChatUpdate(game, modOnlyChat);

					if (!game.general.disableGamechat && !(game.private.seatedPlayers[playerIndex].role.cardName === 'hitler' && president.role.team === 'fascist')) {
						president.playersState[playerIndex].nameStatus = playersTeam;
					}

					sendInProgressGameUpdate(game);
				},
				process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 200 : 2000
			);

			setTimeout(
				() => {
					game.gameState.audioCue = '';
					president.playersState[playerIndex].cardStatus.isFlipped = false;
					sendInProgressGameUpdate(game, true);
				},
				process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 4000 : 6000
			);

			setTimeout(
				() => {
					game.publicPlayersState[playerIndex].cardStatus.cardDisplayed = false;
					president.playersState[playerIndex].cardStatus.cardBack = {};
					president.playersState[presidentIndex].claim = 'didInvestigateLoyalty';
					sendInProgressGameUpdate(game, true);
					startElection(game);
				},
				process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 4200 : 8000
			);
		}
	}
};

/**
 * @param {object} game - game to act on.
 */
module.exports.showPlayerLoyalty = game => {
	const { seatedPlayers } = game.private;
	const { presidentIndex } = game.gameState;
	const president = seatedPlayers[presidentIndex];

	if (!game.private.lock.showPlayerLoyalty && !(game.general.isTourny && game.general.tournyInfo.isCancelled)) {
		game.private.lock.showPlayerLoyalty = true;

		game.general.status = 'Waiting for President to show their party.';
		president.playersState
			.filter((player, i) => i !== presidentIndex && !seatedPlayers[i].isDead)
			.forEach(player => {
				player.notificationStatus = 'notification';
			});
		game.publicPlayersState[presidentIndex].isLoader = true;
		game.gameState.clickActionInfo = [
			president.userName,
			seatedPlayers.filter((player, i) => i !== presidentIndex && !seatedPlayers[i].isDead).map(player => seatedPlayers.indexOf(player))
		];
		game.gameState.phase = 'selectPartyMembershipInvestigateReverse';
		sendInProgressGameUpdate(game, true);
	}
};

/**
 * @param {object} passport - socket authentication.
 * @param {object} game - target game.
 * @param {object} data from socket emit
 * @param {object} socket - socket
 */
module.exports.selectPartyMembershipInvestigateReverse = (passport, game, data, socket) => {
	if (game.general.timedMode && game.private.timerId) {
		clearTimeout(game.private.timerId);
		game.gameState.timedModeEnabled = game.private.timerId = null;
	}

	if (game.gameState.isGameFrozen) {
		if (socket) {
			socket.emit('sendAlert', 'An AEM member has prevented this game from proceeding. Please wait.');
		}
		return;
	}

	const { playerIndex } = data;
	const { experiencedMode } = game.general;
	const { presidentIndex } = game.gameState;
	const { seatedPlayers } = game.private;
	const president = seatedPlayers[presidentIndex];
	const playersTeam = game.private.seatedPlayers[presidentIndex].role.team;

	if (playerIndex === presidentIndex) {
		return;
	}

	if (!president || president.userName !== passport.user) {
		return;
	}

	if (!game.private.lock.selectPartyMembershipInvestigateReverse && !(game.general.isTourny && game.general.tournyInfo.isCancelled)) {
		game.private.lock.selectPartyMembershipInvestigateReverse = true;

		const targetPlayer = seatedPlayers[playerIndex];
		if (!targetPlayer.isDead) {
			game.gameState.audioCue = 'selectedInvestigate';
			seatedPlayers[presidentIndex].wasInvestigated = true;

			president.playersState.forEach(player => {
				player.notificationStatus = '';
			});

			game.private.summary = game.private.summary.updateLog({
				investigationId: playerIndex
			});

			game.publicPlayersState[presidentIndex].isLoader = false;
			game.publicPlayersState[presidentIndex].cardStatus = {
				cardDisplayed: true,
				cardFront: 'partymembership',
				cardBack: {}
			};

			sendInProgressGameUpdate(game, true);

			setTimeout(
				() => {
					const chat = {
						timestamp: new Date(),
						gameChat: true
					};

					targetPlayer.playersState[presidentIndex].cardStatus = {
						isFlipped: true,
						cardBack: {
							cardName: `membership-${playersTeam}`
						}
					};

					if (!game.general.disableGamechat) {
						seatedPlayers
							.filter(player => player.userName !== president.userName && player.userName !== targetPlayer.userName)
							.forEach(player => {
								chat.chat = [
									{ text: 'President ' },
									{
										text: game.general.blindMode ? `{${presidentIndex + 1}}` : `${president.userName} {${presidentIndex + 1}}`,
										type: 'player'
									},
									{ text: ' shows their party membership to ' },
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
								{
									text: 'You have shown your party membership card to '
								},
								{
									text: game.general.blindMode ? `{${playerIndex + 1}}` : `${targetPlayer.userName} {${playerIndex + 1}}`,
									type: 'player'
								},
								{ text: '.' }
							]
						});
						targetPlayer.gameChats.push({
							timestamp: new Date(),
							gameChat: true,
							chat: [
								{
									text: game.general.blindMode ? `{${presidentIndex + 1}}` : `${president.userName} {${presidentIndex + 1}}`,
									type: 'player'
								},
								{ text: ' has shown you their party membership, and you determine that they are on the ' },
								{
									text: playersTeam,
									type: playersTeam
								},
								{ text: ' team.' }
							]
						});
					}

					const modOnlyChat = {
						timestamp: new Date(),
						gameChat: true,
						chat: [
							{
								text: 'President '
							},
							{
								text: `${seatedPlayers[presidentIndex].userName} {${presidentIndex + 1}}`,
								type: 'player'
							},
							{
								text: ' shows their '
							},
							{
								text: playersTeam,
								type: playersTeam
							},
							{
								text: ' loyalty card.'
							}
						]
					};
					game.private.hiddenInfoChat.push(modOnlyChat);
					sendInProgressModChatUpdate(game, modOnlyChat);

					if (
						!game.general.disableGamechat &&
						!(game.private.seatedPlayers[presidentIndex].role.cardName === 'hitler' && targetPlayer.role.team === 'fascist')
					) {
						targetPlayer.playersState[presidentIndex].nameStatus = playersTeam;
					}

					sendInProgressGameUpdate(game);
				},
				process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 200 : 2000
			);

			setTimeout(
				() => {
					game.gameState.audioCue = '';
					targetPlayer.playersState[presidentIndex].cardStatus.isFlipped = false;
					sendInProgressGameUpdate(game, true);
				},
				process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 4000 : 6000
			);

			setTimeout(
				() => {
					game.publicPlayersState[presidentIndex].cardStatus.cardDisplayed = false;
					targetPlayer.playersState[presidentIndex].cardStatus.cardBack = {};
					targetPlayer.playersState[playerIndex].claim = 'didInvestigateLoyalty';
					sendInProgressGameUpdate(game, true);
					startElection(game);
				},
				process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 4200 : 8000
			);
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

		president.playersState
			.filter((player, index) => index !== presidentIndex && !seatedPlayers[index].isDead)
			.forEach(player => {
				player.notificationStatus = 'notification';
			});

		game.gameState.phase = 'specialElection';
		game.gameState.clickActionInfo = [
			president.userName,
			seatedPlayers.filter((player, i) => i !== presidentIndex && !seatedPlayers[i].isDead).map(player => seatedPlayers.indexOf(player))
		];
		sendInProgressGameUpdate(game, true);
	}
};

/**
 * @param {object} passport - socket authentication.
 * @param {object} game - target game.
 * @param {object} data from socket emit
 * @param {object} socket - socket
 */
module.exports.selectSpecialElection = (passport, game, data, socket) => {
	const { playerIndex } = data;
	const { presidentIndex } = game.gameState;
	const president = game.private.seatedPlayers[presidentIndex];
	if (!president || president.userName !== passport.user) {
		return;
	}

	if (game.gameState.isGameFrozen) {
		if (socket) {
			socket.emit('sendAlert', 'An AEM member has prevented this game from proceeding. Please wait.');
		}
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
 * @param {object} socket - socket
 */
module.exports.selectPlayerToExecute = (passport, game, data, socket) => {
	const { playerIndex } = data;
	const { presidentIndex } = game.gameState;
	const { seatedPlayers } = game.private;
	const selectedPlayer = seatedPlayers[playerIndex];
	const publicSelectedPlayer = game.publicPlayersState[playerIndex];
	const president = seatedPlayers[presidentIndex];

	if (game.gameState.isGameFrozen) {
		if (socket) {
			socket.emit('sendAlert', 'An AEM member has prevented this game from proceeding. Please wait.');
		}
		return;
	}

	// Make sure the target is valid
	if (playerIndex === presidentIndex || selectedPlayer.isDead || (selectedPlayer.role.cardName === 'hitler' && president.role.cardName === 'fascist')) {
		return;
	}

	if (!president || president.userName !== passport.user) {
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
		game.gameState.audioCue = 'selectedExecution';
		game.private.lock.selectPlayerToExecute = true;

		game.private.summary = game.private.summary.updateLog({
			execution: playerIndex
		});

		if (!game.general.disableGamechat) {
			game.private.unSeatedGameChats.push(nonPresidentChat);

			seatedPlayers
				.filter(player => player.userName !== president.userName)
				.forEach(player => {
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

		setTimeout(
			() => {
				game.gameState.audioCue = '';
				selectedPlayer.isDead = publicSelectedPlayer.isDead = true;
				publicSelectedPlayer.notificationStatus = '';
				game.general.livingPlayerCount--;
				sendInProgressGameUpdate(game, true);

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

					setTimeout(
						() => {
							game.publicPlayersState.forEach((player, i) => {
								player.cardStatus.cardFront = 'secretrole';
								player.cardStatus.cardDisplayed = true;
								player.cardStatus.cardBack = seatedPlayers[i].role;
							});
							game.gameState.audioCue = 'hitlerShot';
							sendInProgressGameUpdate(game);
						},
						process.env.NODE_ENV === 'development' ? 100 : 1000
					);

					setTimeout(
						() => {
							game.publicPlayersState.forEach(player => {
								player.cardStatus.isFlipped = true;
							});

							game.gameState.audioCue = '';
							completeGame(game, 'liberal');
						},
						process.env.NODE_ENV === 'development' ? 100 : 2000
					);
				} else {
					let libAlive = false;
					seatedPlayers.forEach(p => {
						if (p.role.cardName == 'liberal' && !p.isDead) libAlive = true;
					});
					if (!libAlive) {
						const chat = {
							timestamp: new Date(),
							gameChat: true,
							chat: [
								{ text: 'All ' },
								{
									text: 'liberals',
									type: 'liberal'
								},
								{ text: '  have been executed.' }
							]
						};

						publicSelectedPlayer.cardStatus.cardBack = selectedPlayer.role;
						publicSelectedPlayer.cardStatus.isFlipped = true;

						seatedPlayers.forEach((player, i) => {
							player.gameChats.push(chat);
						});

						game.private.unSeatedGameChats.push(chat);

						setTimeout(
							() => {
								game.publicPlayersState.forEach((player, i) => {
									player.cardStatus.cardFront = 'secretrole';
									player.cardStatus.cardDisplayed = true;
									player.cardStatus.cardBack = seatedPlayers[i].role;
								});
								game.gameState.audioCue = 'hitlerShot';
								sendInProgressGameUpdate(game);
							},
							process.env.NODE_ENV === 'development' ? 100 : 1000
						);

						setTimeout(
							() => {
								game.publicPlayersState.forEach(player => {
									player.cardStatus.isFlipped = true;
								});

								game.gameState.audioCue = '';
								completeGame(game, 'fascist');
							},
							process.env.NODE_ENV === 'development' ? 100 : 2000
						);
					} else {
						let playersAlive = 0;
						seatedPlayers.forEach(p => {
							if (!p.isDead) playersAlive++;
						});
						if (playersAlive <= 2) {
							const chat = {
								timestamp: new Date(),
								gameChat: true,
								chat: [
									{
										text: 'Hitler',
										type: 'hitler'
									},
									{
										text: ' and one '
									},
									{
										text: 'liberal',
										type: 'liberal'
									},
									{
										text: ' remains, top-decking to the end...'
									}
								]
							};

							seatedPlayers.forEach((player, i) => {
								player.gameChats.push(chat);
							});

							game.private.unSeatedGameChats.push(chat);
							game.general.status = 'Top-decking to the end...';
							sendInProgressGameUpdate(game);

							const playCard = () => {
								if (game.private.policies.length < 3) shufflePolicies(game);
								const index = game.trackState.enactedPolicies.length;
								const policy = game.private.policies.shift();
								game.trackState[`${policy}PolicyCount`]++;
								sendGameList();
								game.trackState.enactedPolicies.push({
									position: 'middle',
									cardBack: policy,
									isFlipped: false
								});
								game.trackState.enactedPolicies[index].isFlipped = true;
								const chat = {
									timestamp: new Date(),
									gameChat: true,
									chat: [
										{ text: 'A ' },
										{
											text: policy === 'liberal' ? 'liberal' : 'fascist',
											type: policy === 'liberal' ? 'liberal' : 'fascist'
										},
										{
											text: ` policy has been enacted. (${
												policy === 'liberal' ? game.trackState.liberalPolicyCount.toString() : game.trackState.fascistPolicyCount.toString()
											}/${policy === 'liberal' ? '5' : '6'})`
										}
									]
								};
								game.trackState.enactedPolicies[index].position =
									policy === 'liberal' ? `liberal${game.trackState.liberalPolicyCount}` : `fascist${game.trackState.fascistPolicyCount}`;

								if (!game.general.disableGamechat) {
									game.private.seatedPlayers.forEach(player => {
										player.gameChats.push(chat);
									});

									game.private.unSeatedGameChats.push(chat);
								}
								if (game.trackState.liberalPolicyCount === 5 || game.trackState.fascistPolicyCount === 6) {
									game.publicPlayersState.forEach((player, i) => {
										player.cardStatus.cardFront = 'secretrole';
										player.cardStatus.cardBack = game.private.seatedPlayers[i].role;
										player.cardStatus.cardDisplayed = true;
										player.cardStatus.isFlipped = false;
									});
									game.gameState.audioCue = game.trackState.liberalPolicyCount === 5 ? 'liberalsWin' : 'fascistsWin';
									setTimeout(
										() => {
											game.publicPlayersState.forEach((player, i) => {
												player.cardStatus.isFlipped = true;
											});
											game.gameState.audioCue = '';
											if (process.env.NODE_ENV === 'development') {
												completeGame(game, game.trackState.liberalPolicyCount === 1 ? 'liberal' : 'fascist');
											} else {
												completeGame(game, game.trackState.liberalPolicyCount === 5 ? 'liberal' : 'fascist');
											}
										},
										process.env.NODE_ENV === 'development' ? 100 : 2000
									);
								} else setTimeout(playCard, 2500);
								sendInProgressGameUpdate(game);
							};
							setTimeout(playCard, 2500);
						} else {
							publicSelectedPlayer.cardStatus.cardDisplayed = false;
							sendInProgressGameUpdate(game, true);
							setTimeout(
								() => {
									game.trackState.electionTrackerCount = 0;
									startElection(game);
								},
								process.env.NODE_ENV === 'development' ? 100 : 2000
							);
						}
					}
				}
			},
			process.env.NODE_ENV === 'development' ? 100 : 4000
		);
	}
};
