const Account = require('../../models/account'),
	{games, userList} = require('./models'),
	{secureGame} = require('./util'),
	{sendInProgressGameUpdate} = require('./user-events'),
	{sendGameList, sendUserList} = require('./user-requests'),
	_ = require('lodash'),
	highlightSeats = (player, seats, type) => {
		if (typeof seats === 'string') {
			switch (seats) {
			case 'nonplayer':
				player.tableState.seats.forEach((seat, index) => {
					if (index !== player.seatNumber) {
						seat.highlight = type;
					}
				});
				break;

			case 'otherplayers':
				player.tableState.seats.forEach((seat, index) => {
					if (index < 7 && index !== player.seatNumber) {
						seat.highlight = type;
					}
				});
				break;

			case 'centercards':
				player.tableState.seats.forEach((seat, index) => {
					if (index > 6) {
						seat.highlight = type;
					}
				});
				break;

			case 'player':
				player.tableState.seats[player.seatNumber].highlight = type;
				break;

			case 'clear':
				player.tableState.seats.forEach(seat => {
					if (seat.highlight) {
						delete seat.highlight;
					}
				});
				break;

			default:
			}
		} else {
			seats.forEach(seatNumber => {
				player.tableState.seats[seatNumber].highlight = type;
			});
		}
	},
	startGame = game => {
		let allWerewolvesNotInCenter = false;

		const assignRoles = () => {
			const _roles = [...game.roles];

			game.internals.seatedPlayers.forEach(player => {
				const roleIndex = Math.floor((Math.random() * _roles.length)),
					role = _roles[roleIndex];

				if (role === 'werewolf' && !allWerewolvesNotInCenter) {
					allWerewolvesNotInCenter = true;
				}

				player.trueRole = player.originalRole = role;
				_roles.splice(roleIndex, 1);
			});

			game.internals.centerRoles = [..._roles];

			return allWerewolvesNotInCenter;
		};

		assignRoles();

		if (game.kobk && !allWerewolvesNotInCenter) {
			while (!assignRoles()) {}  // yes goofy I know
		}

		game.status = 'Dealing..';
		game.gameState.cardsDealt = true;
		sendInProgressGameUpdate(game);

		setTimeout(() => {
			let nightPhasePause = 5;

			game.internals.seatedPlayers.forEach((player, index) => {
				player.gameChats.push({
					gameChat: true,
					userName: player.userName,
					chat: [
						{text: 'The game begins and you receive the '},
						{
							text: player.trueRole,
							type: 'roleName'
						},
						{text: ' role.'}
					],
					timestamp: new Date()
				});
				player.tableState.seats[index].role = game.internals.seatedPlayers[index].trueRole;
			});

			game.internals.unSeatedGameChats.push({
				gameChat: true,
				chat: [{text: 'The game begins.'}],
				timestamp: new Date()
			});

			sendInProgressGameUpdate(game);

			const countDown = setInterval(() => {
				game.status = `Night begins in ${nightPhasePause} second${nightPhasePause === 1 ? '' : 's'}.`;

				if (nightPhasePause === 0) {
					clearInterval(countDown);
					game.status = 'Night begins..';
					prepareNightPhases(game);
				} else if (nightPhasePause === 1) {
					game.internals.seatedPlayers.forEach((player, index) => {
						player.tableState.seats[index].isFlipped = false;
					});
				} else if (nightPhasePause === 4) {
					game.internals.seatedPlayers.forEach((player, index) => {
						player.tableState.seats[index].isFlipped = true;
					});
				}

				sendInProgressGameUpdate(game);
				nightPhasePause--;
			}, 1000);
		}, 50);
	};

module.exports.updateSeatedUser = (socket, data) => {
	const game = games.find(el => el.uid === data.uid);

	game.seated[`seat${data.seatNumber}`] = {
		userName: data.userName,
		connected: true
	};

	if (Object.keys(game.seated).length === 7) {
		let startGamePause = 5;

		game.gameState.isStarted = true;

		Object.keys(game.seated).forEach((seat, index) => {
			const userName = game.seated[`seat${index}`].userName;

			game.internals.seatedPlayers[index].userName = userName;
			game.internals.seatedPlayers[index].seatNumber = index;
			game.internals.seatedPlayers[index].gameChats.push({
				gameChat: true,
				userName,
				chat: [{text: 'The table is full and the game will begin.'}],
				timestamp: new Date()
			});
		});

		const countDown = setInterval(() => {
			if (startGamePause === 0) {
				clearInterval(countDown);
				startGame(game);
			} else {
				game.status = `Game starts in ${startGamePause} second${startGamePause === 1 ? '' : 's'}.`;
				sendInProgressGameUpdate(game);
			}
			startGamePause--;
		}, 1000);
	} else {
		io.sockets.in(data.uid).emit('gameUpdate', secureGame(game));
	}

	sendGameList();
};

const prepareNightPhases = game => {
	// round 1: all werewolves minions masons seers and (one robber or troublemaker)
	// round 2 through x: robbercount + troublemaker count minus 1
	// round x+1: all insomniacs

	let roleChangerInPhase1 = false;

	const phases = [[]],
		insomniacs = [],
		roles = _.shuffle(game.internals.seatedPlayers.concat(game.internals.centerRoles.map(role => (
			{
				trueRole: role,
				isCenter: true
			}
		))));

	roles.forEach(player => {
		switch (player.trueRole) {
		case 'seer':
			if (!player.isCenter) {
				player.tableState.nightAction = {
					action: 'seer',
					phase: 1,
					gameChat: [{text: 'You wake up, and may look at one player\'s card, or two of the center cards.'}],
					highlight: 'nonplayer'
				};
			}

			phases[0].push(player);
			break;

		case 'robber':
			if (!player.isCenter) {
				player.tableState.nightAction = {
					action: 'robber',
					gameChat: [{text: 'You wake up, and may exchange your card with another player\'s, and view your new role (but do not take an additional night action).'}],
					highlight: 'otherplayers'
				};
			}

			if (roleChangerInPhase1) {
				if (!player.isCenter) {
					player.tableState.nightAction.phase = phases.length + 1;
				}
				phases.push([player]);
			} else {
				if (!player.isCenter) {
					player.tableState.nightAction.phase = 1;
				}
				roleChangerInPhase1 = true;
				phases[0].push(player);
			}
			break;

		case 'troublemaker':
			if (!player.isCenter) {
				player.tableState.nightAction = {
					action: 'troublemaker',
					gameChat: [{text: 'You wake up, and may switch cards between two other players without viewing them.'}],
					highlight: 'otherplayers'
				};
			}

			if (roleChangerInPhase1) {
				if (!player.isCenter) {
					player.tableState.nightAction.phase = phases.length + 1;
				}
				phases.push([player]);
			} else {
				if (!player.isCenter) {
					player.tableState.nightAction.phase = 1;
				}
				roleChangerInPhase1 = true;
				phases[0].push(player);
			}
			break;

		case 'insomniac':
			if (!player.isCenter) {
				player.tableState.nightAction = {
					action: 'insomniac',
					gameChat: [{text: 'You wake up, and may view your card again.'}],
					highlight: 'player'
				};
			}

			insomniacs.push(player);
			break;

		default:
			if (player.trueRole === 'werewolf' || player.trueRole === 'minion' || player.trueRole === 'mason') {
				phases[0].push(player);
			}
		}
	});

	if (insomniacs.length) {
		insomniacs.forEach(player => {
			if (!player.isCenter) {
				player.tableState.nightAction.phase = phases.length + 1;
			}
		});

		phases.push([...insomniacs]);
	}

	const werewolves = phases[0].filter(player => player.trueRole === 'werewolf' && !player.isCenter),
		masons = phases[0].filter(player => player.trueRole === 'mason' && !player.isCenter);

	phases[0].forEach(player => {
		let others, nightAction, message;

		switch (player.trueRole) {
		case 'werewolf':
			nightAction = {
				phase: 1
			};

			others = werewolves.filter(werewolf => werewolf.userName !== player.userName);

			if (werewolves.length === 1) {
				message = [
					{text: 'You wake up, and see no other '},
					{
						text: 'werewolves',
						type: 'roleName'
					},
					{text: '. You may look at a center card'}
				];
				nightAction.highlight = 'centercards';
				nightAction.action = 'singleWerewolf';
			} else {
				message = [
					{text: 'You wake up, and see that the other '},
					{
						text: `${others.length > 1 ? 'werewolves' : 'werewolf'}`,
						type: 'roleName'
					},
					{text: ` in this game ${others.length > 1 ? 'are' : 'is'} `}
				];

				others.forEach((player, index) => {
					message.push({
						text: player.userName,
						type: 'playerName'
					});

					if (index <= others.length - 3 && others.length !== 1) {
						message.push({text: ', '});
					}

					if (index === others.length - 2) {
						message.push({text: ' and '});
					}
				});

				nightAction.highlight = others.map(other => {
					return other.seatNumber;
				});

				nightAction.action = 'werewolf';
			}

			message.push({text: '.'});
			nightAction.gameChat = message;
			if (!player.isCenter) {
				player.tableState.nightAction = nightAction;
			}
			break;

		case 'minion':
			nightAction = {
				action: 'minion',
				phase: 1
			};

			if (werewolves.length) {
				message = [
					{text: 'You wake up, and see that the '},
					{
						text: `${werewolves.length === 1 ? 'werewolf' : 'werewolves'}`,
						type: 'roleName'
					},
					{text: ` in this game ${werewolves.length === 1 ? 'is' : 'are'}`}
				];

				werewolves.forEach((player, index) => {
					message.push({text: ' '});

					message.push({
						text: player.userName,
						type: 'playerName'
					});

					if (index >= werewolves.length - 3 && werewolves.length !== 1 && index !== werewolves.length - 1) {
						message.push({text: ', '});
					}

					if (index === werewolves.length - 2) {
						message.push({text: ' and '});
					}
				});

				nightAction.highlight = werewolves.map(werewolf => werewolf.seatNumber);
			} else {
				message = [
					{text: 'You wake up, and see that there are no '},
					{
						text: 'werewolves',
						type: 'roleName'
					},
					{text: ' in this game. Be careful - you lose if no village team player is eliminated.'}
				];
				game.internals.soloMinion = true;
			}

			message.push({text: '.'});
			nightAction.gameChat = message;
			if (!player.isCenter) {
				player.tableState.nightAction = nightAction;
			}
			break;

		case 'mason':
			others = masons.filter(mason => mason.userName !== player.userName);

			nightAction = {
				action: 'mason',
				phase: 1
			};

			if (others.length) {
				message = [
					{text: 'You wake up, and see that the '},
					{
						type: 'roleName',
						text: others.length === 1 ? 'mason' : 'masons'
					},
					{text: ` in this game ${others.length === 1 ? 'is' : 'are'} `}
				];

				nightAction.highlight = others.map(other => other.seatNumber);

				others.forEach((player, index) => {
					message.push({
						text: player.userName,
						type: 'playerName'
					});

					if (index <= others.length - 3 && others.length !== 1) {
						message.push({text: ', '});
					}

					if (index === others.length - 2) {
						message.push({text: ' and '});
					}
				});
			} else {
				message = [
					{text: 'You wake up, and see that you are the only '},
					{
						type: 'roleName',
						text: 'mason'
					}
				];
			}

			message.push({text: '.'});
			nightAction.gameChat = message;
			if (!player.isCenter) {
				player.tableState.nightAction = nightAction;
			}
			break;

		default:
		}
	});

	game.gameState.isNight = true;
	sendInProgressGameUpdate(game);
	setTimeout(() => {
		game.gameState.phase = 1;
		nightPhases(game, phases);
	}, 3000);
};

const nightPhases = (game, phases) => {
	let phasesIndex = 0,
		phasesTimer;

	const phasesCount = phases.length,
		endPhases = () => {
			clearInterval(phasesTimer);
			game.internals.seatedPlayers.forEach(player => {
				player.gameChats.push({
					gameChat: true,
					userName: player.userName,
					chat: [{text: 'Night ends and the day begins.'}],
					timestamp: new Date()
				});
			});
			game.internals.unSeatedGameChats.push({
				gameChat: true,
				chat: [{text: 'Night ends and the day begins.'}],
				timestamp: new Date()
			});
			game.gameState.isNight = false;
			sendInProgressGameUpdate(game);
			setTimeout(() => {
				dayPhase(game);
			}, 50);
		},
		phasesFn = () => {
			if (phasesIndex === phasesCount && phasesCount > 1) {
				endPhases();
			} else {
				let phaseTime = 10;

				const startPhaseTime = phaseTime,
					phasesPlayers = phases[phasesIndex];

				phasesPlayers.forEach(player => {
					if (!player.isCenter) {
						const chat = {
							gameChat: true,
							userName: player.userName,
							chat: player.tableState.nightAction.gameChat,
							timestamp: new Date()
						};

						player.gameChats.push(chat);
					}
				});

				const countDown = setInterval(() => {
					if (game.gameState.secondsLeftInNight) {
						game.gameState.secondsLeftInNight--;
					}

					if (phaseTime === 0) {
						game.status = `Night phase ${phases.length === 1 ? 1 : (phasesIndex).toString()} of ${phasesCount} ends.`;
						phasesIndex++;
						game.gameState.phase++;
						sendInProgressGameUpdate(game);

						if (phasesCount === 1) {
							endPhases();
						}

						clearInterval(countDown);
					} else {
						game.status = `Night phase ${phases.length === 1 ? 1 : (phasesIndex).toString()} of ${phasesCount} ends in ${phaseTime} second${phaseTime === 1 ? '' : 's'}.`;

						if (phaseTime === startPhaseTime - 1 || phaseTime === startPhaseTime - 3) {
							phasesPlayers.forEach(player => {
								if (!player.isCenter && player.tableState.nightAction.highlight) {
									highlightSeats(player, player.tableState.nightAction.highlight, 'notify');
								}
							});
						} else if (phaseTime === startPhaseTime - 2 || phaseTime === startPhaseTime - 4) {
							phasesPlayers.forEach(player => {
								if (!player.isCenter && player.tableState.nightAction.highlight) {
									highlightSeats(player, 'clear');
								}
							});
						}

						sendInProgressGameUpdate(game);
					}
					phaseTime--;
				}, 1000);
			}
		};

	game.gameState.secondsLeftInNight = game.gameState.maxSecondsLeftInNight = [10, 21, 32, 43, 54, 65, 76, 86][phases.length - 1];

	phasesFn();

	if (phases.length > 1) {
		phasesIndex++;
		phasesTimer = setInterval(phasesFn, 11000);
	}
};

module.exports.updateUserNightActionEvent = (socket, data) => {
	let updatedTrueRoles = [];

	const game = games.find(el => el.uid === data.uid),
		player = game.internals.seatedPlayers.find(player => player.userName === data.userName),
		chat = {
			gameChat: true,
			userName: player.userName,
			timestamp: new Date()
		},
		getTrueRoleBySeatNumber = num => {
			num = parseInt(num, 10);

			return num < 7 ? game.internals.seatedPlayers[num].trueRole : game.internals.centerRoles[num - 7];
		},
		eventMap = {
			singleWerewolf() {
				const selectedCard = {
						7: 'center left',
						8: 'center middle',
						9: 'center right'
					},
					seat = player.tableState.seats[parseInt(data.action, 10)],
					roleClicked = getTrueRoleBySeatNumber(data.action);

				seat.isFlipped = true;
				seat.role = roleClicked;
				player.tableState.nightAction.completed = true;
				setTimeout(() => {
					seat.isFlipped = false;
					sendInProgressGameUpdate(game);
				}, 3000);
				chat.chat = [
					{text: `You select the ${selectedCard[data.action]} card and it is revealed to be ${selectedCard[data.action] === 'insomniac' ? 'an' : 'a'} `},
					{
						type: 'roleName',
						text: roleClicked
					},
					{text: '.'}
				];
			},
			insomniac() {
				const roleClicked = getTrueRoleBySeatNumber(data.action),
					seat = player.tableState.seats[parseInt(data.action, 10)];

				seat.isFlipped = true;
				seat.role = roleClicked;
				setTimeout(() => {
					seat.isFlipped = false;
					sendInProgressGameUpdate(game);
				}, 3000);
				player.tableState.nightAction.completed = true;
				chat.chat = [
					{text: `You look at your own card and it is revealed to be ${roleClicked === 'insomniac' ? 'an' : 'a'} `},
					{
						type: 'roleName',
						text: roleClicked
					},
					{text: '.'}
				];
			},
			troublemaker() {
				const action1 = parseInt(data.action[0], 10),
					action2 = parseInt(data.action[1], 10),
					seat1player = game.internals.seatedPlayers.find(player => player.seatNumber === action1),
					seat2player = game.internals.seatedPlayers.find(player => player.seatNumber === action2),
					seat1 = player.tableState.seats[action1],
					seat2 = player.tableState.seats[action2];

				updatedTrueRoles = game.internals.seatedPlayers.map(player => {
					if (player.userName === seat1player.userName) {
						return seat2player.trueRole;
					} else if (player.userName === seat2player.userName) {
						return seat1player.trueRole;
					}

					return player.trueRole;
				});

				player.tableState.nightAction.completed = true;
				seat1.swappedWithSeat = action2;
				seat2.swappedWithSeat = action1;
				chat.chat = [
					{text: 'You swap the two cards between '},
					{
						type: 'playerName',
						text: seat1player.userName
					},
					{text: ' and '},
					{
						type: 'playerName',
						text: seat2player.userName
					},
					{text: '.'}
				];
			},
			robber() {
				const action = parseInt(data.action, 10),
					playerSeat = player.tableState.seats[player.seatNumber],
					swappedPlayerSeat = player.tableState.seats[action],
					swappedPlayer = game.internals.seatedPlayers.find(play => play.seatNumber === action),
					_role = swappedPlayer.trueRole;

				updatedTrueRoles = game.internals.seatedPlayers.map(play => {
					if (play.userName === player.userName) {
						return swappedPlayer.trueRole;
					}

					if (play.userName === swappedPlayer.userName) {
						return player.trueRole;
					}

					return play.trueRole;
				});

				player.tableState.nightAction.completed = true;
				swappedPlayerSeat.swappedWithSeat = player.seatNumber;
				playerSeat.swappedWithSeat = swappedPlayer.seatNumber;
				setTimeout(() => {
					swappedPlayerSeat.isFlipped = true;
					swappedPlayerSeat.role = _role;
				}, 2000);
				setTimeout(() => {
					swappedPlayerSeat.isFlipped = false;
					sendInProgressGameUpdate(game);
				}, 5000);

				chat.chat = [
					{text: 'You exchange cards between yourself and '},
					{
						type: 'playerName',
						text: swappedPlayer.userName
					},
					{text: ` and view your new role, which is ${_role === 'insomniac' ? 'an' : 'a'} `},
					{
						type: 'roleName',
						text: _role
					},
					{text: '.'}
				];
			},
			seer() {
				const selectedCard = {
					7: 'center left',
					8: 'center middle',
					9: 'center right'
				};

				player.tableState.nightAction.completed = true;

				if (data.action.length === 1) {
					const playerClicked = game.internals.seatedPlayers[parseInt(data.action[0], 10)],
						seat = player.tableState.seats[parseInt(data.action[0], 10)];

					seat.isFlipped = true;
					seat.role = playerClicked.originalRole;
					setTimeout(() => {
						seat.isFlipped = false;
						sendInProgressGameUpdate(game);
					}, 3000);
					chat.chat = [
						{text: 'You select to see the card of '},
						{
							type: 'playerName',
							text: playerClicked.userName
						},
						{text: ` and it is ${playerClicked.originalRole === 'insomniac' ? 'an' : 'a'} `},
						{
							type: 'roleName',
							text: playerClicked.originalRole
						},
						{text: '.'}
					];
				} else {
					const seats = [player.tableState.seats[parseInt(data.action[0], 10)], player.tableState.seats[parseInt(data.action[1], 10)]],
						rolesClicked = data.action.map(role => getTrueRoleBySeatNumber(role));

					seats[0].isFlipped = true;
					seats[1].isFlipped = true;
					seats[0].role = rolesClicked[0];
					seats[1].role = rolesClicked[1];
					setTimeout(() => {
						seats[0].isFlipped = false;
						seats[1].isFlipped = false;
						sendInProgressGameUpdate(game);
					}, 3000);
					chat.chat = [
						{text: `You select to see the ${selectedCard[data.action[1]]} and ${selectedCard[data.action[0]]} cards and they are ${rolesClicked[1] === 'insomniac' ? 'an' : 'a'} `},
						{
							type: 'roleName',
							text: rolesClicked[1]
						},
						{text: ` and ${rolesClicked[0] === 'insomniac' ? 'an' : 'a'} `},
						{
							type: 'roleName',
							text: rolesClicked[0]
						},
						{text: '.'}
					];
				}
			}
		};

	eventMap[data.role]();

	if (updatedTrueRoles.length) { // todo-release refactor this whole stupid idea
		game.internals.seatedPlayers.map((player, index) => {
			player.trueRole = updatedTrueRoles[index];
			return player;
		});
	}

	player.gameChats.push(chat);
	sendInProgressGameUpdate(game);
};

module.exports.updateSelectedElimination = data => {
	const game = games.find(el => el.uid === data.uid),
		player = game.internals.seatedPlayers[parseInt(data.seatNumber, 10)],
		{selectedForElimination} = data;

	player.selectedForElimination = selectedForElimination.toString();
	highlightSeats(player, 'clear');
	highlightSeats(player, [parseInt(selectedForElimination, 10)], 'selection');
	sendInProgressGameUpdate(game);
};

const dayPhase = game => {
	let seconds = (() => {
		const _time = game.time.split(':');

		return _time[0] ? (parseInt(_time[0], 10) * 60) + parseInt(_time[1], 10) : parseInt(_time[1], 10);
	})();

	const countDown = setInterval(() => {
		if (seconds === 0) {
			game.status = 'The game ends.';
			clearInterval(countDown);
			eliminationPhase(game);
		} else {
			let status;

			if (game.internals.truncateGame) {
				seconds = 16;
				game.internals.truncateGame = false;
			}

			if (seconds < 60) {
				status = `Day ends in ${seconds} second${seconds === 1 ? '' : 's'}`;

				if (seconds === 15) {
					game.internals.seatedPlayers.forEach(player => {
						highlightSeats(player, 'otherplayers', 'notify');
						player.gameChats.push({
							gameChat: true,
							userName: player.userName,
							chat: [{text: 'The game is coming to an end and you must click on a player\'s card to mark them for elimination.'}],
							timestamp: new Date()
						});
						player.tableState.isVotable = {
							enabled: true
						};
					});
				}

				if (seconds === 14 || seconds === 12) {
					game.internals.seatedPlayers.forEach(player => {
						if (!player.tableState.isVotable.selectedForElimination) {
							highlightSeats(player, 'clear');
						}
					});
				}

				if (seconds === 13) {
					game.internals.seatedPlayers.forEach(player => {
						if (!player.tableState.isVotable.selectedForElimination) {
							highlightSeats(player, 'otherplayers', 'notify');
						}
					});
				}

				if (seconds < 15) {
					status += '. VOTE NOW';
				}

				status += '.';
			} else {
				const minutes = Math.floor(seconds / 60),
					remainder = seconds - (minutes * 60);

				status = `Day ends in ${minutes}:${remainder < 10 ? `0${remainder}` : remainder}.`;  // yo dawg, I heard you like template strings.
			}

			game.status = status;
			sendInProgressGameUpdate(game);
			seconds--;
		}
	}, 1000);

	game.gameState.isDay = true;
};

const eliminationPhase = game => {
	let index = 0;

	const {seatedPlayers} = game.internals;

	game.chats.push({
		gameChat: true,
		chat: [{text: 'The game ends.'}],
		timestamp: new Date()
	});

	game.status = 'The game ends.';

	seatedPlayers.forEach(player => {
		highlightSeats(player, 'clear');
	});

	game.gameState.eliminations = [];

	const countDown = setInterval(() => {
		if (index === 7) {
			clearInterval(countDown);
			endGame(game);
		} else {
			const noSelection = index === 6 ? 0 : index + 1;

			game.gameState.eliminations[index] = {
				seatNumber: seatedPlayers[index].selectedForElimination ? parseInt(seatedPlayers[index].selectedForElimination, 10) : noSelection
			};

			sendInProgressGameUpdate(game);
			index++;
		}
	}, 1000);
};

const endGame = game => {
	let werewolfEliminated = false,
		werewolfTeamInGame = false,
		eliminatedPlayersIndex = [],
		maxCount = 1;

	const playersSelectedForElimination = game.gameState.eliminations.map(elimination => elimination.seatNumber),
		modeMap = {},
		{seatedPlayers} = game.internals,
		tannerEliminations = [];

	playersSelectedForElimination.forEach(el => {
		if (modeMap[el]) {
			modeMap[el]++;
		} else {
			modeMap[el] = 1;
		}

		if (modeMap[el] > maxCount) {
			eliminatedPlayersIndex = [el];
			maxCount = modeMap[el];
		} else if (modeMap[el] === maxCount) {
			eliminatedPlayersIndex.push(el);
			maxCount = modeMap[el];
		}
	});

	seatedPlayers.forEach((player, index) => { // todo-release hunter's fade out thingy should happen later/not give away that he or she is a hunter
		if (player.trueRole === 'hunter' && eliminatedPlayersIndex.includes(index) && eliminatedPlayersIndex.length !== 7) {
			eliminatedPlayersIndex.push(parseInt(player.selectedForElimination, 10));
		}

		if (player.trueRole === 'werewolf' || player.trueRole === 'minion') {
			werewolfTeamInGame = true;
		}
	});

	game.gameState.eliminations.forEach(elimination => {
		let transparent = false;

		if (eliminatedPlayersIndex.length === 7 || !eliminatedPlayersIndex.includes(elimination.seatNumber)) {
			transparent = true;
		}
		elimination.transparent = transparent;
	});

	game.gameState.isCompleted = true;
	sendInProgressGameUpdate(game);
	sendGameList();

	eliminatedPlayersIndex.forEach(eliminatedPlayerIndex => {
		// app crashed on line below (truerole of undefined @ werewolf) after a game where 2 players reloaded the page during night I believe.  After much trying have not been able to reproduce much lately.  Could be related to wrong types but I'm not seeing it not be a string lately.  Will look at logs after release to see if its still happening.

		try {
			if (seatedPlayers[eliminatedPlayerIndex].trueRole === 'werewolf' || (seatedPlayers[eliminatedPlayerIndex].trueRole === 'minion' && game.internals.soloMinion)) {
				werewolfEliminated = true;
			}
			if (seatedPlayers[eliminatedPlayerIndex].trueRole === 'tanner') {
				tannerEliminations.push(eliminatedPlayerIndex);
			}
		} catch (e) {
			console.log('app crashed');
			console.log(e);
			console.log(playersSelectedForElimination); // [ 6, 2, 6, 5, 0, 6, 0] confirmed to not be the origination of the problem
			console.log(eliminatedPlayerIndex); // NaN on crash
			console.log(modeMap);
		}
	});

	seatedPlayers.forEach((player, index) => {
		if (((player.trueRole === 'werewolf' || player.trueRole === 'minion') && !tannerEliminations.length && !werewolfEliminated) ||

			tannerEliminations.includes(index) ||

			(werewolfEliminated && player.trueRole !== 'werewolf' && player.trueRole !== 'minion' && player.trueRole !== 'tanner' && eliminatedPlayersIndex.length !== 7) ||

			(eliminatedPlayersIndex.length === 7 && (player.trueRole === 'werewolf' || (player.trueRole === 'minion' && !game.internals.soloMinion))) ||

			(eliminatedPlayersIndex.length === 7 && !werewolfTeamInGame)) {
			player.wonGame = true;
		}
	});

	if (eliminatedPlayersIndex.length !== 7) {
		setTimeout(() => {
			eliminatedPlayersIndex.forEach(eliminatedPlayerIndex => {
				game.tableState.seats[eliminatedPlayerIndex] = {
					role: seatedPlayers[eliminatedPlayerIndex].trueRole,
					isFlipped: true
				};
			});

			sendInProgressGameUpdate(game);
		}, 5000);
	}

	setTimeout(() => {
		const winningPlayers = seatedPlayers.filter(player => player.wonGame),
			winningPlayersIndex = winningPlayers.map(player => player.seatNumber),
			winningPlayerNames = winningPlayers.map(player => player.userName),
			wonGameChat = {
				gameChat: true,
				chat: [],
				timestamp: new Date()
			};

		if (winningPlayers.length) {
			wonGameChat.chat.push(
				{text: `The winning player${winningPlayerNames.length === 1 ? '' : 's'} ${winningPlayerNames.length === 1 ? 'is' : 'are'} `}
			);

			winningPlayerNames.forEach((name, index) => {
				wonGameChat.chat.push({
					text: name,
					type: 'playerName'
				});

				if (winningPlayerNames.length > 2 && index < winningPlayerNames.length - 2) {
					wonGameChat.chat.push({text: ', '});
				} else if (winningPlayerNames.length - 2 === index) {
					wonGameChat.chat.push({text: ' and '});
				}
			});
		} else {
			wonGameChat.chat.push({text: 'There are no winning players in this game'});
		}

		wonGameChat.chat.push({text: '.'});
		game.chats.push(wonGameChat);

		game.tableState.seats.forEach((seat, index) => {
			if (index < 7) {
				seat.role = seatedPlayers[index].trueRole;
			} else {
				seat.role = game.internals.centerRoles[index - 7];
			}

			if (winningPlayersIndex.includes(index)) {
				seat.highlight = 'proceed';
			}

			seat.isFlipped = true;
		});

		sendInProgressGameUpdate(game);

		Account.find({username: {$in: seatedPlayers.map(player => {
			return player.userName;
		})}}, (err, results) => {
			if (err) {
				console.log(err);
			}

			results.forEach(player => {
				let winner = false;

				if (winningPlayerNames.includes(player.username)) {
					player.wins++;
					winner = true;
				} else {
					player.losses++;
				}

				player.games.push(game.uid);
				player.save(() => {
					const userEntry = userList.find(user => {
						return user.userName === player.username;
					});

					if (userEntry) {
						if (winner) {
							userEntry.wins++;
						} else {
							userEntry.losses++;
						}

						sendUserList();
					}
				});
			});
		});
	}, 11000);
};