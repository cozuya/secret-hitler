const {sendInProgressGameUpdate} = require('../util.js'),
	{userList} = require('../models.js'),
	{sendUserList, sendGameList} = require('../user-requests.js'),
	Account = require('../../../models/account.js'),
	Game = require('../../../models/game'),
	EnhancedGameSummary = require('../../../models/game-summary/EnhancedGameSummary'),
	{updateProfiles} = require('../../../models/profile/utils'),
	debug = require('debug')('game'),
	saveGame = game => {
		const
			summary = game.private.summary.publish(),
			enhanced = new EnhancedGameSummary(summary),
			gameToSave = new Game({
				uid: game.general.uid,
				date: new Date(),
				winningPlayers: game.private.seatedPlayers.filter(player => player.wonGame).map(player => (
					{
						userName: player.userName,
						team: player.role.team,
						role: player.role.cardName
					}
				)),
				losingPlayers: game.private.seatedPlayers.filter(player => !player.wonGame).map(player => (
					{
						userName: player.userName,
						team: player.role.team,
						role: player.role.cardName
					}
				)),
				chats: game.chats.filter(chat => !chat.gameChat).map(chat => (
					{
						timestamp: chat.timestamp,
						chat: chat.chat,
						userName: chat.userName
					}
				)),
				winningTeam: game.gameState.isCompleted,
				playerCount: game.general.playerCount
			});

		debug('Saving game: %O', summary);

		updateProfiles(enhanced, { cache: true });
		summary.save();
		gameToSave.save();
	};

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
		publicPlayersState.find(play => play.userName === player.userName).isConfetti = true;
		player.wonGame = true;
	});

	setTimeout(() =>{
		winningPrivatePlayers.forEach((player, index) => {
			publicPlayersState.find(play => play.userName === player.userName).isConfetti = false;
		});
		sendInProgressGameUpdate(game);
	}, 15000);

	game.general.status = winningTeamName === 'fascist' ? 'Fascists win the game.' : 'Liberals win the game.';
	game.gameState.isCompleted = winningTeamName;
	sendGameList();

	publicPlayersState.forEach((publicPlayer, index) => {
		publicPlayer.nameStatus = seatedPlayers[index].role.cardName;
	});

	seatedPlayers.forEach(player => {
		player.gameChats.push(chat);
	});

	game.private.unSeatedGameChats.push(chat);
	sendInProgressGameUpdate(game);

	saveGame(game);

	Account.find({username: {$in: seatedPlayers.map(player => player.userName)}})
		.then(results => {
			const winningPlayerNames = winningPrivatePlayers.map(player => player.userName),
				isRainbow = game.general.rainbowgame;

			results.forEach(player => {
				let winner = false;

				if (winningPlayerNames.includes(player.username)) {
					if (isRainbow) {
						player.rainbowWins = player.rainbowWins ? player.rainbowWins + 1 : 1;
						player.rainbowLosses = player.rainbowLosses ? player.rainbowLosses : 0;
					} else {
						player.wins++;
					}
					winner = true;
				} else {
					if (isRainbow) {
						player.rainbowLosses = player.rainbowLosses ? player.rainbowLosses + 1 : 1;
						player.rainbowWins = player.rainbowWins ? player.rainbowWins : 0;
					}
					player.losses++;
				}

				player.games.push(game.uid);
				player.save(() => {
					const userEntry = userList.find(user => user.userName === player.username);

					if (userEntry) {
						if (winner) {
							if (isRainbow) {
								userEntry.rainbowWins = userEntry.rainbowWins ? userEntry.rainbowWins + 1 : 1;
							} else {
								userEntry.wins++;
							}
						} else {
							if (isRainbow) {
								userEntry.rainbowLosses = userEntry.rainbowLosses ? userEntry.rainbowLosses + 1 : 1;
							} else {
								userEntry.losses++;
							}
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