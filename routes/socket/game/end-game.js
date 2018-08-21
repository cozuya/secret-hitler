const { sendInProgressGameUpdate, rateEloGame } = require('../util.js');
const { userList, games } = require('../models.js');
const { sendUserList, sendGameList } = require('../user-requests.js');
const Account = require('../../../models/account.js');
const Game = require('../../../models/game');
const GameStatistics = require('../../../models/gamestatistics');
const buildEnhancedGameSummary = require('../../../models/game-summary/buildEnhancedGameSummary');
const { updateProfiles } = require('../../../models/profile/utils');
const debug = require('debug')('game:summary');
const animals = require('../../../utils/animals');
const adjectives = require('../../../utils/adjectives');
const _ = require('lodash');
const { makeReport } = require('../report.js');
const { CURRENTSEASONNUMBER } = require('../../../src/frontend-scripts/constants.js');

/**
 * @param {object} game - game to act on.
 */
const saveGame = game => {
	const summary = game.private.summary.publish();
	/**
	 * @param {object} - object describing game model.
	 */
	const gameToSave = new Game({
		uid: game.general.uid,
		date: new Date(),
		chats: game.chats,
		season: CURRENTSEASONNUMBER,
		winningPlayers: game.private.seatedPlayers
			.filter(player => player.wonGame)
			.map(player => ({
				userName: player.userName,
				team: player.role.team,
				role: player.role.cardName
			})),
		losingPlayers: game.private.seatedPlayers
			.filter(player => !player.wonGame)
			.map(player => ({
				userName: player.userName,
				team: player.role.team,
				role: player.role.cardName
			})),
		winningTeam: game.gameState.isCompleted,
		playerCount: game.general.playerCount,
		rebalance6p: game.general.rebalance6p,
		rebalance7p: game.general.rebalance7p,
		rebalance9p2f: game.general.rebalance9p2f,
		casualGame: game.general.casualGame,
		customGame: game.customGameSettings.enabled,
		isRainbow: game.general.rainbowgame,
		isTournyFirstRound: game.general.isTourny && game.general.tournyInfo.round === 1,
		isTournySecondRound: game.general.isTourny && game.general.tournyInfo.round === 2
	});

	let enhanced;

	try {
		if (summary && summary.toObject() && game.general.uid !== 'devgame' && !game.general.private) {
			enhanced = buildEnhancedGameSummary(summary.toObject());
			updateProfiles(enhanced, { cache: true });
			if (!game.summarySaved) {
				summary.save();
				game.summarySaved = true;
			}
		} else {
			// console.log(summary, 'problem with summary');
		}
	} catch (error) {
		console.log(error, 'error in enhanced/end-game');
	}

	debug('Saving game: %O', summary);
	gameToSave.save();
};

/**
 * @param {object} game - game to act on.
 * @param {string} winningTeamName - name of the team that won this game.
 */
module.exports.completeGame = (game, winningTeamName) => {
	if (game && game.unsentReports) {
		game.unsentReports.forEach(report => {
			makeReport(report, game, true);
		});
		game.unsentReports = [];
	}

	const winningPrivatePlayers = game.private.seatedPlayers.filter(player => player.role.team === winningTeamName);
	const winningPlayerNames = winningPrivatePlayers.map(player => player.userName);
	const { seatedPlayers } = game.private;
	const { publicPlayersState } = game;
	const chat = {
		gameChat: true,
		timestamp: new Date(),
		chat: [
			{
				text: winningTeamName === 'fascist' ? 'Fascists' : 'Liberals',
				type: winningTeamName === 'fascist' ? 'fascist' : 'liberal'
			},
			{ text: ' win the game.' }
		]
	};
	const remainingPoliciesChat = {
		gameChat: true,
		timestamp: new Date(),
		chat: [
			{
				text: 'The remaining policies are '
			}
		].concat(
			game.private.policies
				.map(policyName => ({
					text: policyName === 'liberal' ? 'B' : 'R',
					type: policyName === 'liberal' ? 'liberal' : 'fascist'
				}))
				.concat({
					text: '.'
				})
		)
	};

	if (!(game.general.isTourny && game.general.tournyInfo.round === 1)) {
		winningPrivatePlayers.forEach((player, index) => {
			publicPlayersState.find(play => play.userName === player.userName).notificationStatus = 'success';
			publicPlayersState.find(play => play.userName === player.userName).isConfetti = true;
			player.wonGame = true;
		});

		setTimeout(() => {
			winningPrivatePlayers.forEach((player, index) => {
				publicPlayersState.find(play => play.userName === player.userName).isConfetti = false;
			});
			sendInProgressGameUpdate(game, true);
		}, 15000);
	}

	game.general.status = winningTeamName === 'fascist' ? 'Fascists win the game.' : 'Liberals win the game.';
	game.gameState.isCompleted = winningTeamName;
	sendGameList();

	publicPlayersState.forEach((publicPlayer, index) => {
		publicPlayer.nameStatus = seatedPlayers[index].role.cardName;
	});

	seatedPlayers.forEach(player => {
		player.gameChats.push(chat, remainingPoliciesChat);
	});

	game.private.unSeatedGameChats.push(chat, remainingPoliciesChat);

	game.summary = game.private.summary;
	debug('Final game summary: %O', game.summary.publish().toObject());

	sendInProgressGameUpdate(game);

	saveGame(game);

	if (!game.general.private && !game.general.casualGame) {
		Account.find({
			username: { $in: seatedPlayers.map(player => player.userName) }
		})
			.then(results => {
				const isRainbow = game.general.rainbowgame;
				const isTournamentFinalGame = game.general.isTourny && game.general.tournyInfo.round === 2;
				const { rebalance6p, rebalance7p, rebalance9p, rerebalance9p, rebalance9p2f } = game;
				GameStatistics.findOne({ rebalance6p, rebalance7p, rebalance9p, rerebalance9p, rebalance9p2f }).then(stats => {
					if (!stats) {
						stats = new GameStatistics({
							rebalance6p,
							rebalance7p,
							rebalance9p,
							rerebalance9p,
							rebalance9p2f,
							fascistBias: 1600,
							liberalBias: 1600
						});
					}
					const eloAdjustments = rateEloGame(game, results, winningPlayerNames, stats);

					results.forEach(player => {
						const listUser = userList.find(user => user.userName === player.username);
						if (listUser) {
							listUser.eloOverall = player.eloOverall;
							listUser.eloSeason = player.eloSeason;
						}

						const seatedPlayer = seatedPlayers.find(p => p.userName === player.username);
						seatedPlayers.forEach(eachPlayer => {
							const playerChange = eloAdjustments[eachPlayer.userName];
							const activeChange = player.gameSettings.disableSeasonal ? playerChange.changeSeason : playerChange.change;
							if (!player.gameSettings.disableElo) {
								seatedPlayer.gameChats.push({
									gameChat: true,
									timestamp: new Date(),
									chat: [
										{
											text: eachPlayer.userName,
											type: eachPlayer.role.team
										},
										{
											text: ` ${activeChange > 0 ? 'increased' : 'decreased'} by `
										},
										{
											text: Math.abs(activeChange).toFixed(1),
											type: 'player'
										},
										{
											text: ` points.`
										}
									]
								});
							}
						});

						let winner = false;

						if (winningPlayerNames.includes(player.username)) {
							if (isRainbow) {
								player.rainbowWins = player.rainbowWins ? player.rainbowWins + 1 : 1;
								player[`rainbowWinsSeason${CURRENTSEASONNUMBER}`] = player[`rainbowWinsSeason${CURRENTSEASONNUMBER}`]
									? player[`rainbowWinsSeason${CURRENTSEASONNUMBER}`] + 1
									: 1;
								player[`rainbowLossesSeason${CURRENTSEASONNUMBER}`] = player[`rainbowLossesSeason${CURRENTSEASONNUMBER}`]
									? player[`rainbowLossesSeason${CURRENTSEASONNUMBER}`]
									: 0;
							}

							player[`winsSeason${CURRENTSEASONNUMBER}`] = player[`winsSeason${CURRENTSEASONNUMBER}`] ? player[`winsSeason${CURRENTSEASONNUMBER}`] + 1 : 1;
							player.wins = player.wins ? player.wins + 1 : 1;
							player[`lossesSeason${CURRENTSEASONNUMBER}`] = player[`lossesSeason${CURRENTSEASONNUMBER}`] ? player[`lossesSeason${CURRENTSEASONNUMBER}`] : 0;
							winner = true;

							if (isTournamentFinalGame && !game.general.casualGame) {
								player.gameSettings.tournyWins.push(new Date().getTime());
								const playerSocketId = Object.keys(io.sockets.sockets).find(
									socketId =>
										io.sockets.sockets[socketId].handshake.session.passport && io.sockets.sockets[socketId].handshake.session.passport.user === player.username
								);

								io.sockets.sockets[playerSocketId].emit('gameSettings', player.gameSettings);
							}
						} else {
							if (isRainbow) {
								player.rainbowLosses = player.rainbowLosses ? player.rainbowLosses + 1 : 1;
								player[`rainbowLossesSeason${CURRENTSEASONNUMBER}`] = player[`rainbowLossesSeason${CURRENTSEASONNUMBER}`]
									? player[`rainbowLossesSeason${CURRENTSEASONNUMBER}`] + 1
									: 1;
								player[`rainbowWinsSeason${CURRENTSEASONNUMBER}`] = player[`rainbowWinsSeason${CURRENTSEASONNUMBER}`]
									? player[`rainbowWinsSeason${CURRENTSEASONNUMBER}`]
									: 0;
							}

							player.losses++;
							player[`lossesSeason${CURRENTSEASONNUMBER}`] = player[`lossesSeason${CURRENTSEASONNUMBER}`] ? player[`lossesSeason${CURRENTSEASONNUMBER}`] + 1 : 1;
							player[`winsSeason${CURRENTSEASONNUMBER}`] = player[`winsSeason${CURRENTSEASONNUMBER}`] ? player[`winsSeason${CURRENTSEASONNUMBER}`] : 0;
						}

						player.games.push(game.general.uid);
						player.lastCompletedGame = new Date();
						player.save(() => {
							const userEntry = userList.find(user => user.userName === player.username);

							if (userEntry) {
								if (winner) {
									if (isRainbow) {
										userEntry.rainbowWins = userEntry.rainbowWins ? userEntry.rainbowWins + 1 : 1;
										userEntry.rainbowLosses = userEntry.rainbowLosses ? userEntry.rainbowLosses : 0;
										userEntry[`rainbowWinsSeason${CURRENTSEASONNUMBER}`] = userEntry[`rainbowWinsSeason${CURRENTSEASONNUMBER}`]
											? userEntry[`rainbowWinsSeason${CURRENTSEASONNUMBER}`] + 1
											: 1;
										userEntry[`rainbowLossesSeason${CURRENTSEASONNUMBER}`] = userEntry[`rainbowLossesSeason${CURRENTSEASONNUMBER}`]
											? userEntry[`rainbowWinsSeason${CURRENTSEASONNUMBER}`]
											: 0;
									}
									userEntry.wins = userEntry.wins ? userEntry.wins + 1 : 1;
									userEntry[`winsSeason${CURRENTSEASONNUMBER}`] = userEntry[`winsSeason${CURRENTSEASONNUMBER}`]
										? userEntry[`winsSeason${CURRENTSEASONNUMBER}`] + 1
										: 1;
									userEntry[`lossesSeason${CURRENTSEASONNUMBER}`] = userEntry[`lossesSeason${CURRENTSEASONNUMBER}`]
										? userEntry[`lossesSeason${CURRENTSEASONNUMBER}`]
										: 0;

									if (isTournamentFinalGame && !game.general.casualGame) {
										userEntry.tournyWins.push(new Date().getTime());
									}
								} else {
									if (isRainbow) {
										userEntry.rainbowLosses = userEntry.rainbowLosses ? userEntry.rainbowLosses + 1 : 1;
										userEntry[`rainbowLossesSeason${CURRENTSEASONNUMBER}`] = userEntry[`rainbowLossesSeason${CURRENTSEASONNUMBER}`]
											? userEntry[`rainbowLossesSeason${CURRENTSEASONNUMBER}`] + 1
											: 1;
										userEntry[`rainbowWinsSeason${CURRENTSEASONNUMBER}`] = userEntry[`rainbowWinsSeason${CURRENTSEASONNUMBER}`]
											? userEntry[`rainbowWinsSeason${CURRENTSEASONNUMBER}`]
											: 0;
									}
									userEntry.losses = userEntry.losses = userEntry.losses ? userEntry.losses + 1 : 1;
									userEntry[`lossesSeason${CURRENTSEASONNUMBER}`] = userEntry[`lossesSeason${CURRENTSEASONNUMBER}`]
										? userEntry[`lossesSeason${CURRENTSEASONNUMBER}`] + 1
										: 1;
									userEntry[`winsSeason${CURRENTSEASONNUMBER}`] = userEntry[`winsSeason${CURRENTSEASONNUMBER}`]
										? userEntry[`winsSeason${CURRENTSEASONNUMBER}`]
										: 0;
								}

								sendUserList();
							}
						});
					});
					sendInProgressGameUpdate(game);
				});
			})
			.catch(err => {
				console.log(err, 'error in updating accounts at end of game');
			});
	}

	if (game.general.isTourny) {
		if (game.general.tournyInfo.round === 1) {
			const { uid } = game.general;
			const tableUidLastLetter = uid.charAt(uid.length - 1);
			const otherUid = tableUidLastLetter === 'A' ? `${uid.substr(0, uid.length - 1)}B` : `${uid.substr(0, uid.length - 1)}A`;
			const otherGame = games.find(g => g.general.uid === otherUid);

			if (!otherGame || otherGame.gameState.isCompleted) {
				const finalGame = _.cloneDeep(game);
				let gamePause = 10;

				finalGame.general.uid = `${uid.substr(0, uid.length - 1)}Final`;
				finalGame.general.timeCreated = new Date();
				finalGame.gameState = {
					previousElectedGovernment: [],
					undrawnPolicyCount: 17,
					discardedPolicyCount: 0,
					presidentIndex: -1,
					isStarted: true
				};
				finalGame.trackState = {
					liberalPolicyCount: 0,
					fascistPolicyCount: 0,
					electionTrackerCount: 0,
					enactedPolicies: []
				};

				const countDown = setInterval(() => {
					if (gamePause) {
						game.general.status = `Final game starts in ${gamePause} ${gamePause === 1 ? 'second' : 'seconds'}.`;
						if (otherGame) {
							otherGame.general.status = `Final game starts in ${gamePause} ${gamePause === 1 ? 'second' : 'seconds'}.`;
							sendInProgressGameUpdate(otherGame);
						}
						sendInProgressGameUpdate(game);
						gamePause--;
					} else {
						clearInterval(countDown);
						game.general.status = 'Final game has begun.';
						if (otherGame) {
							otherGame.general.status = 'Final game has begun.';
							sendInProgressGameUpdate(otherGame);
						}
						game.general.tournyInfo.isRound1TableThatFinished2nd = true;
						sendInProgressGameUpdate(game);
						const winningPlayerSocketIds = Object.keys(io.sockets.sockets).filter(
							socketId =>
								io.sockets.sockets[socketId].handshake.session.passport &&
								winningPrivatePlayers.map(player => player.userName).includes(io.sockets.sockets[socketId].handshake.session.passport.user)
						);

						// crash here line 302 map of undefined.  Not sure how this didn't exist at this time.  Race condition in settimeout/interval?  Both games completed at almost the same time?  Dunno.
						const otherGameWinningPlayerSocketIds = Object.keys(io.sockets.sockets).filter(
							socketId =>
								io.sockets.sockets[socketId].handshake.session.passport &&
								game.general.tournyInfo.winningPlayersFirstCompletedGame
									.map(player => player.userName)
									.includes(io.sockets.sockets[socketId].handshake.session.passport.user)
						);

						const socketIds = winningPlayerSocketIds.concat(otherGameWinningPlayerSocketIds);

						socketIds.forEach(id => {
							const socket = io.sockets.sockets[id];

							Object.keys(socket.rooms).forEach(roomUid => {
								socket.leave(roomUid);
							});
							socket.join(finalGame.general.uid);
							socket.emit('joinGameRedirect', finalGame.general.uid);
						});

						finalGame.general.tournyInfo.round = 2;
						finalGame.general.electionCount = 0;
						finalGame.publicPlayersState = game.general.tournyInfo.winningPlayersFirstCompletedGame
							.concat(game.private.seatedPlayers.filter(player => player.role.team === winningTeamName))
							.map(player => {
								player.cardStatus = {
									cardDisplayed: false,
									isFlipped: false,
									cardFront: 'secretrole',
									cardBack: {}
								};

								player.isDead = false;

								return player;
							});

						if (finalGame.general.blindMode) {
							const _shuffledAdjectives = _.shuffle(adjectives);

							finalGame.general.replacementNames = _.shuffle(animals)
								.slice(0, finalGame.publicPlayersState.length)
								.map((animal, index) => `${_shuffledAdjectives[index].charAt(0).toUpperCase()}${_shuffledAdjectives[index].slice(1)} ${animal}`);
						}

						finalGame.private.lock = {};
						finalGame.general.name = `${game.general.name.slice(0, game.general.name.length - 7)}-tableFINAL`;
						games.push(finalGame);
						require('./start-game.js')(finalGame); // circular dep.
						sendGameList();
					}
				}, 1000);
			} else {
				game.general.tournyInfo.showOtherTournyTable = true;
				game.chats.push({
					gameChat: true,
					timestamp: new Date(),
					chat: [
						{
							text: 'This tournament game has finished first.  Winning players will be pulled into the final round when it starts.'
						}
					]
				});
				otherGame.general.tournyInfo.winningPlayersFirstCompletedGame = _.cloneDeep(game.private.seatedPlayers).filter(
					player => player.role.team === winningTeamName
				);
				sendInProgressGameUpdate(game);
			}
		} else {
			if (!game.general.casualGame) {
				game.publicPlayersState.forEach(player => {
					if (winningPlayerNames.includes(player.userName)) {
						player.tournyWins.push(new Date().getTime());
					}
				});
			}
			game.chats.push({
				gameChat: true,
				timestamp: new Date(),
				chat: [
					{
						text: 'The tournament has ended.'
					}
				]
			});
			game.general.status = 'The tournament has ended.';
			sendInProgressGameUpdate(game);
		}
	}
};
