const {sendInProgressGameUpdate} = require('../util.js')
	// ,
	// _ = require('lodash')
	;

/**
 * @param {object} game - game to act on.
 * @param {string} winningTeamName - name of the team that won this game.
 */
module.exports.completeGame = (game, winningTeamName) => {
	const winningPrivatePlayers = game.private.seatedPlayers.filter(player => player.role.team === winningTeamName),
		chat = {
			gameChat: true,
			timestamp: new Date(),
			chat: [
				{
					text: winningTeamName === 'fascist' ? 'Fascists' : 'Liberals',
					type: winningTeamName === 'fascist' ? 'fascist' : 'liberal',
				},
				{text: ' win the game.'}
			]
		};

	// todo-alpha reenable dead player's chats.

	winningPrivatePlayers.forEach((player, index) => {
		game.publicPlayersState.find(play => play.userName === player.userName).notificationStatus = 'success';
		player.wonGame = true;
	});

	game.general.status = winningTeamName === 'fascist' ? 'Fascists win the game.' : 'Liberals win the game.';

	game.private.seatedPlayers.forEach(player => {
		player.gameChats.push(chat);
	});

	game.private.unSeatedGameChats.push(chat);
	sendInProgressGameUpdate(game);
};