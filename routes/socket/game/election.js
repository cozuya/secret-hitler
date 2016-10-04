const {sendInProgressGameUpdate} = require('../util.js'),
	{games} = require('../models.js'),
	_ = require('lodash');

module.exports.startElection = game => {
	const {seatedPlayers} = game.private,
		{presidentIndex, previousElectedGovernment} = game.gameState,
		pendingPresidentPlayer = game.private.seatedPlayers[presidentIndex];

	game.general.electionCount++;
	game.general.status = `Election #${game.general.electionCount} begins`;
	pendingPresidentPlayer.gameChats.push({
		gameChat: true,
		chat: [{
			text: 'You are president and must select a chancellor.'
		}]
	});

	pendingPresidentPlayer.playersState.filter((player, index) => index).forEach(player => {
		player.notificationStatus = 'notification';
	});

	game.publicPlayersState[presidentIndex].governmentStatus = 'isPendingPresident';
	game.publicPlayersState[presidentIndex].isLoader = true;
	game.gameState.phase = 'selectingChancellor';
	game.gameState.clickActionInfo = [pendingPresidentPlayer.userName, _.without(_.range(0, seatedPlayers.length), presidentIndex, ...previousElectedGovernment)];
	sendInProgressGameUpdate(game);
};

module.exports.selectChancellor = data => {
	const game = games.find(el => el.general.uid === data.uid),
		{chancellorIndex} = data,
		presidentIndex = game.publicPlayersState.findIndex(player => player.governmentStatus === 'isPendingPresident'),
		presidentPlayer = game.private.seatedPlayers[presidentIndex],
		cardFlipperCards = [
			{
				position: 'middle-left',
				cardStatus: {
					isFlipped: false,
					cardFront: 'ballot',
					cardBack: {},
					notificationStatus: ''
				}
			},
			{
				position: 'middle-right',
				cardStatus: {
					isFlipped: false,
					cardFront: 'ballot',
					cardBack: {},
					notificationStatus: ''
				}
			}
		];

	game.publicPlayersState[presidentIndex].isLoader = false;

	presidentPlayer.playersState.forEach(player => {
		player.notificationStatus = '';
	});

	game.publicPlayersState[chancellorIndex].governmentStatus = 'isPendingChancellor';
	game.general.status = `Vote on election #${game.general.electionCount} now.`;

	game.publicPlayersState.forEach(player => {
		player.isLoader = true;
		player.cardStatus = {
			cardDisplayed: true,
			isFlipped: false,
			cardFront: 'ballot',
			cardBack: {}
		};
	});

	game.private.seatedPlayers.forEach(player => {
		player.gameChats.push({
			gameChat: true,
			chat: [{
				text: 'You must vote for the election of president '
			},
			{
				text: game.seatedPlayers[presidentIndex].userName,
				type: 'player'
			},
			{
				text: ' and chancellor '
			},
			{
				text: game.seatedPlayers[chancellorIndex].userName,
				type: 'player'
			},
			{
				text: '.'
			}]
		});

		player.cardFlingerState = _.cloneDeep(cardFlipperCards);
	});

	game.trackState.blurred = true;
	game.publicCardflingerState = _.cloneDeep(cardFlipperCards);
	sendInProgressGameUpdate(game);
};