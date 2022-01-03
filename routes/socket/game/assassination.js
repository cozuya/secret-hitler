const { sendInProgressGameUpdate } = require('../util.js');
const { completeGame } = require('./end-game.js');

module.exports.assassinateMerlin = game => {
	const { seatedPlayers } = game.private;
	const hitlerIndex = seatedPlayers.findIndex(p => p.role.cardName === 'hitler');
	const hitler = seatedPlayers[hitlerIndex];

	if (!game.private.lock.assassinateMerlin && game.general.avalonSH && !(game.general.isTourny && game.general.tournyInfo.isCancelled)) {
		game.private.lock.assassinateMerlin = true;
		game.general.status = 'Hitler to choose someone to assassinate.';
		game.publicPlayersState[hitlerIndex].cardStatus.cardDisplayed = true;
		game.publicPlayersState[hitlerIndex].cardStatus.cardFront = 'secretrole';
		sendInProgressGameUpdate(game);

		setTimeout(() => {
			game.publicPlayersState[hitlerIndex].cardStatus.cardBack = hitler.role;
			game.publicPlayersState[hitlerIndex].cardStatus.isFlipped = true;
			game.publicPlayersState[hitlerIndex].isLoader = true;

			game.publicPlayersState.forEach(p => (p.isDead = false));

			if (!game.general.disableGamechat) {
				hitler.gameChats.push({
					gameChat: true,
					timestamp: new Date(),
					chat: [{ text: 'You must choose someone to assassinate.' }]
				});

				const chat = {
					timestamp: new Date(),
					gameChat: true,
					chat: [
						{
							text: 'Hitler must now choose a player to assassinate.'
						}
					]
				};

				seatedPlayers.forEach((player, i) => {
					if (i !== hitlerIndex) {
						player.gameChats.push(chat);
					}
				});

				game.private.unSeatedGameChats.push(chat);
			}

			hitler.playersState
				.filter((player, index) => seatedPlayers[index].role.cardName === 'fascist')
				.forEach(player => {
					player.nameStatus = 'fascist';
				});

			hitler.playersState
				.filter((player, index) => seatedPlayers[index].role.team === 'liberal')
				.forEach(player => {
					player.notificationStatus = 'notification';
				});

			game.gameState.clickActionInfo = [
				hitler.userName,
				seatedPlayers.filter((player, index) => seatedPlayers[index].role.team === 'liberal').map(player => seatedPlayers.indexOf(player))
			];
			game.gameState.phase = 'assassination';
			sendInProgressGameUpdate(game);
		}, 2000);
	}
};

module.exports.selectPlayerToAssassinate = (passport, game, data, socket) => {
	const { seatedPlayers } = game.private;
	const target = seatedPlayers[data.playerIndex];
	const publicTarget = game.publicPlayersState[data.playerIndex];
	const merlinIndex = seatedPlayers.findIndex(p => p.role.cardName === 'merlin');
	const merlin = seatedPlayers[merlinIndex];
	const winningTeam = target.role.cardName === 'merlin' ? 'fascist' : 'liberal';
	const hitlerIndex = seatedPlayers.findIndex(p => p.role.cardName === 'hitler');

	if (game.gameState.isGameFrozen) {
		if (socket) {
			socket.emit('sendAlert', 'An AEM member has prevented this game from proceeding. Please wait.');
		}
		return;
	}

	if (game.general.isRemade) {
		if (socket) {
			socket.emit('sendAlert', 'This game has been remade and is now no longer playable.');
		}
		return;
	}

	if (game.publicPlayersState[hitlerIndex].userName !== passport.user) {
		return;
	}

	// Make sure the target is valid
	if (target.role.team !== 'liberal') {
		return;
	}

	if (!game.general.avalonSH || game.gameState.phase !== 'assassination') {
		return;
	}

	game.private.summary = game.private.summary.updateLog({
		assassination: data.playerIndex
	});
	console.log(game.private.summary.logs);

	game.publicPlayersState[hitlerIndex].isLoader = false;
	game.gameState.clickActionInfo[1] = [];

	seatedPlayers[hitlerIndex].playersState.forEach(player => {
		player.notificationStatus = '';
	});

	publicTarget.cardStatus.cardFront = 'secretrole';
	publicTarget.cardStatus.cardBack = target.role;
	publicTarget.cardStatus.cardDisplayed = true;
	publicTarget.cardStatus.isFlipped = false;

	sendInProgressGameUpdate(game, true);

	setTimeout(() => {
		publicTarget.cardStatus.isFlipped = true;
		game.gameState.audioCue = winningTeam + 'sWin';

		const winningChat = {
			gameChat: true,
			timestamp: new Date(),
			chat:
				winningTeam === 'fascist'
					? [
							{
								text: 'Hitler',
								type: 'hitler'
							},
							{ text: ' selects to assassinate ' },
							{
								text: `${target.userName} {${data.playerIndex + 1}}`,
								type: 'player'
							},
							{ text: ', and they were ' },
							{
								text: 'merlin',
								type: 'merlin'
							},
							{ text: '.' }
					  ]
					: [
							{
								text: 'Hitler',
								type: 'hitler'
							},
							{ text: ' selects to assassinate ' },
							{
								text: `${target.userName} {${data.playerIndex + 1}}`,
								type: 'player'
							},
							{ text: ', but ' },
							{
								text: `${merlin.userName} {${merlinIndex + 1}}`,
								type: 'player'
							},
							{ text: ' was ' },
							{
								text: 'merlin',
								type: 'merlin'
							},
							{ text: '.' }
					  ]
		};
		seatedPlayers.forEach(player => {
			player.gameChats.push(winningChat);
		});

		game.private.unSeatedGameChats.push(winningChat);

		sendInProgressGameUpdate(game);
	}, 1000);

	setTimeout(() => {
		game.publicPlayersState.forEach((player, i) => {
			if (i !== data.playerIndex && i !== hitlerIndex) {
				player.cardStatus.cardFront = 'secretrole';
				player.cardStatus.cardBack = game.private.seatedPlayers[i].role;
				player.cardStatus.cardDisplayed = true;
				player.cardStatus.isFlipped = false;
			}
		});

		sendInProgressGameUpdate(game, true);
	}, 2000);

	setTimeout(() => {
		game.publicPlayersState.forEach((player, i) => {
			player.cardStatus.isFlipped = true;
		});
		game.gameState.audioCue = '';

		completeGame(game, winningTeam);
	}, 3000);
};
