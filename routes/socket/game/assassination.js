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

		setTimeout(
			() => {
				game.publicPlayersState[hitlerIndex].cardStatus.cardBack = hitler.role;
				game.publicPlayersState[hitlerIndex].cardStatus.isFlipped = true;
				game.publicPlayersState[hitlerIndex].isLoader = true;

				game.publicPlayersState.forEach(p => {
					p.isDead = false;
				});

				if (!game.general.disableGamechat) {
					hitler.gameChats.push({
						gameChat: true,
						timestamp: new Date(),
						chat: [{ text: 'You must choose someone to assassinate.' }]
					});

					game.private.unSeatedGameChats.push({
						timestamp: new Date(),
						gameChat: true,
						chat: [
							{
								text: 'Hitler must now choose a player to assassinate.'
							}
						]
					});
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
				game.gameState.phase = 'merlinAssassination';
				sendInProgressGameUpdate(game);
			},
			process.env.NODE_ENV === 'development' ? 100 : 4000
		);
	}
};

module.exports.selectPlayerToAssassinate = (passport, game, data, socket) => {
	const { seatedPlayers } = game.private;
	const target = seatedPlayers[data.playerIndex];
	const winningTeam = target.role.cardName === 'merlin' ? 'fascist' : 'liberal';
	const hitlerIndex = seatedPlayers.findIndex(p => p.role.cardName === 'hitler');

	game.publicPlayersState[hitlerIndex].isLoader = false;
	game.publicPlayersState.forEach((player, i) => {
		player.cardStatus.cardFront = 'secretrole';
		player.cardStatus.cardBack = game.private.seatedPlayers[i].role;
		player.cardStatus.cardDisplayed = true;
		player.cardStatus.isFlipped = false;
	});

	sendInProgressGameUpdate(game);

	game.gameState.audioCue = winningTeam + 'sWin';
	setTimeout(
		() => {
			game.publicPlayersState.forEach((player, i) => {
				player.cardStatus.isFlipped = true;
			});
			game.gameState.audioCue = '';
			completeGame(game, winningTeam);
		},
		process.env.NODE_ENV === 'development' ? 100 : 2000
	);
};
