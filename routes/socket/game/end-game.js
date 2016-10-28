const {sendInProgressGameUpdate} = require('../util.js'),
	{userList} = require('../models.js'),
	{sendUserList, sendGameList} = require('../user-requests.js'),
	Account = require('../../../models/account.js');

/**
 * @param {object} game - game to act on.
 * @param {string} winningTeamName - name of the team that won this game.
 */
module.exports.completeGame = (game, winningTeamName) => {
	const winningPrivatePlayers = game.private.seatedPlayers.filter(player => player.role.team === winningTeamName),
		{seatedPlayers} = game.private,
		{publicPlayersState} = game,
		chat = {
			gameChat: true,
			timestamp: new Date(),
			chat: [
				{
					text: winningTeamName === 'fascist' ? 'Fascists' : 'Liberals',
					type: winningTeamName === 'fascist' ? 'fascist' : 'liberal'
				},
				{text: ' win the game.'}
			]
		};

	winningPrivatePlayers.forEach((player, index) => {
		publicPlayersState.find(play => play.userName === player.userName).notificationStatus = 'success';
		player.wonGame = true;
	});

	game.general.status = winningTeamName === 'fascist' ? 'Fascists win the game.' : 'Liberals win the game.';
	game.gameState.isCompleted = winningTeamName;
	sendGameList();

	seatedPlayers.forEach(player => {
		player.gameChats.push(chat);
	});

	game.private.unSeatedGameChats.push(chat);
	sendInProgressGameUpdate(game);

	Account.find({username: {$in: seatedPlayers.map(player => player.userName)}})
		.then(results => {
			const winningPlayerNames = winningPrivatePlayers.map(player => player.userName);

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
					const userEntry = userList.find(user => user.userName === player.username);

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
		})
	.catch(err => {
		console.log(err);
	});
};