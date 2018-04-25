const { sendInProgressGameUpdate } = require('../util');

/**
 * @param {object} socket - socket reference.
 * @param {object} passport - socket authentication.
 * @param {object} game - verifyed target game.
 * @param {object} data - from socket emit.
 */
module.exports.selectChancellor = (socket, passport, game, data) => {
	if ((game.general.isTourny && game.general.tournyInfo.isCancelled) ||
		data.chancellorIndex < game.general.playerCount) {
		return;
	}

	const { chancellorIndex } = data;
	const { presidentIndex } = game.gameState;
	const { experiencedMode } = game.general;
	const seatedPlayers = game.private.seatedPlayers.filter(player => !player.isDead);
	const presidentPlayer = game.private.seatedPlayers[presidentIndex];
	const chancellorPlayer = game.private.seatedPlayers[chancellorIndex];

	if (game.general.timedMode && game.private.timerId) {
		clearTimeout(game.private.timerId);
		game.gameState.timedModeEnabled = game.private.timerId = null;
	}

	if (!game.private.lock.selectChancellor && !Number.isInteger(game.gameState.pendingChancellorIndex) && game.gameState.phase !== 'voting') {
		game.private.lock.selectChancellor = true;
		game.publicPlayersState[presidentIndex].isLoader = false;

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

		game.gameState.phase = 'voting';

		setTimeout(() => {
			seatedPlayers.forEach(player => {
				if (player.cardFlingerState && player.cardFlingerState.length) {
					player.cardFlingerState[0].cardStatus.isFlipped = player.cardFlingerState[1].cardStatus.isFlipped = true;
					player.cardFlingerState[0].notificationStatus = player.cardFlingerState[1].notificationStatus = 'notification';
					player.voteStatus = {
						hasVoted: false
					};
				}
			});

			if (game.general.timedMode) {
				game.gameState.timedModeEnabled = true;

				game.private.timerId = setTimeout(() => {
					if (game.gameState.timedModeEnabled) {
						const unvotedPlayerNames = game.private.seatedPlayers
							.filter(player => !player.voteStatus.hasVoted && !player.isDead)
							.map(player => player.userName);

						game.gameState.timedModeEnabled = false;
						unvotedPlayerNames.forEach(userName => {
							const { selectVoting } = require('./election');

							selectVoting({
								userName,
								uid: game.general.uid,
								vote: Boolean(Math.random() > 0.5)
							});
						});
					}
				}, process.env.DEVTIMEDDELAY ? process.env.DEVTIMEDDELAY : game.general.timedMode * 1000);
			}
			sendInProgressGameUpdate(game);
		}, process.env.NODE_ENV === 'development' ? 100 : experiencedMode ? 500 : 1500);
	}
};
