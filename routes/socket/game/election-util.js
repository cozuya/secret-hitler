const { sendInProgressGameUpdate } = require('../util.js');
const { games } = require('../models.js');

/**
 * @param {object} data from socket emit
 */
module.exports.selectChancellor = data => {
	const game = games.find(el => el.general.uid === data.uid);

	if (!game || !game.private.seatedPlayers || (game.general.isTourny && game.general.tournyInfo.isCancelled)) {
		return;
	}

	const { chancellorIndex } = data;
	const { presidentIndex } = game.gameState;
	const { experiencedMode } = game.general;
	const seatedPlayers = game.private.seatedPlayers.filter(player => !player.isDead);
	const presidentPlayer = game.private.seatedPlayers[presidentIndex];
	const chancellorPlayer = game.private.seatedPlayers[chancellorIndex];

	if (!game.private.lock.selectChancellor) {
		game.private.lock.selectChancellor = true;
		game.publicPlayersState[presidentIndex].isLoader = false;
		game.gameState.timedModeEnabled = false;

		game.private.summary = game.private.summary.updateLog({
			chancellorId: chancellorIndex
		});

		presidentPlayer.playersState.forEach(player => {
			player.notificationStatus = '';
		});

		game.publicPlayersState[chancellorIndex].governmentStatus = 'isPendingChancellor';
		game.gameState.pendingChancellorIndex = chancellorIndex;
		game.general.status = `Vote on election #${game.general.electionCount} now.`;

		game.publicPlayersState.filter(player => !player.isDead).forEach(player => {
			player.isLoader = true;
			player.cardStatus = {
				cardDisplayed: true,
				isFlipped: false,
				cardFront: 'ballot',
				cardBack: {}
			};
		});

		sendInProgressGameUpdate(game);

		seatedPlayers.forEach(player => {
			if (!game.general.disableGamechat) {
				player.gameChats.push({
					gameChat: true,
					timestamp: new Date(),
					chat: [
						{
							text: 'You must vote for the election of president '
						},
						{
							text: game.general.blindMode ? `{${presidentIndex + 1}}` : `${presidentPlayer.userName} {${presidentIndex + 1}}`,
							type: 'player'
						},
						{
							text: ' and chancellor '
						},
						{
							text: game.general.blindMode ? `{${chancellorIndex + 1}}` : `${chancellorPlayer.userName} {${chancellorIndex + 1}}`,
							type: 'player'
						},
						{
							text: '.'
						}
					]
				});
			}

			player.cardFlingerState = [
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
		});

		setTimeout(() => {
			sendInProgressGameUpdate(game);
		}, process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 500 : 1000);

		setTimeout(() => {
			game.gameState.phase = 'voting';
			seatedPlayers.forEach(player => {
				if (player.cardFlingerState && player.cardFlingerState.length) {
					player.cardFlingerState[0].cardStatus.isFlipped = player.cardFlingerState[1].cardStatus.isFlipped = true;
					player.cardFlingerState[0].notificationStatus = player.cardFlingerState[1].notificationStatus = 'notification';
					player.voteStatus = {
						hasVoted: false
					};
				}
			});
			sendInProgressGameUpdate(game);
		}, process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 500 : 1500);
	}
};
