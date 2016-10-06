const {sendInProgressGameUpdate} = require('../util.js'),
	{games} = require('../models.js'),
	_ = require('lodash');

function startElection (game) {
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

	game.publicPlayersState.forEach(player => {
		player.cardStatus.cardDisplayed = false;
		player.governmentStatus = '';
	});

	game.publicPlayersState[presidentIndex].governmentStatus = 'isPendingPresident';
	game.publicPlayersState[presidentIndex].isLoader = true;
	game.gameState.phase = 'selectingChancellor';
	game.gameState.clickActionInfo = [pendingPresidentPlayer.userName, _.without(_.range(0, seatedPlayers.length), presidentIndex, ...previousElectedGovernment)]; // todo-alpha bugged.  also does not account for dead players.
	sendInProgressGameUpdate(game);
}

module.exports.selectChancellor = data => {
	const game = games.find(el => el.general.uid === data.uid),
		{chancellorIndex} = data,
		presidentIndex = game.publicPlayersState.findIndex(player => player.governmentStatus === 'isPendingPresident'),
		{seatedPlayers} = game.private,
		presidentPlayer = game.private.seatedPlayers[presidentIndex],
		chancellorPlayer = game.private.seatedPlayers[chancellorIndex];

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

	sendInProgressGameUpdate(game);

	seatedPlayers.forEach(player => {
		player.gameChats.push({
			gameChat: true,
			chat: [{
				text: 'You must vote for the election of president '
			},
			{
				text: presidentPlayer.userName,
				type: 'player'
			},
			{
				text: ' and chancellor '
			},
			{
				text: chancellorPlayer.userName,
				type: 'player'
			},
			{
				text: '.'
			}]
		});

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
	}, 1000);

	setTimeout(() => {
		game.gameState.phase = 'voting';
		seatedPlayers.forEach(player => {
			player.cardFlingerState[0].cardStatus.isFlipped = true;
			player.cardFlingerState[0].notificationStatus = 'notification';
			player.cardFlingerState[1].cardStatus.isFlipped = true;
			player.cardFlingerState[1].notificationStatus = 'notification';
			player.voteStatus = {
				hasVoted: false
			};
		});
		sendInProgressGameUpdate(game);
	}, 3000);
};

module.exports.selectVoting = data => {
	const game = games.find(el => el.general.uid === data.uid),
		{seatedPlayers} = game.private,
		player = seatedPlayers.find(player => player.userName === data.userName),
		playerIndex = seatedPlayers.findIndex(play => play.userName === data.userName);

	player.voteStatus.hasVoted = true;
	player.voteStatus.didVoteYes = data.vote;
	game.publicPlayersState[playerIndex].isLoader = false;

	if (data.vote) {
		player.cardFlingerState[0].notificationStatus = 'selected';
		player.cardFlingerState[1].notificationStatus = '';
	} else {
		player.cardFlingerState[0].notificationStatus = '';
		player.cardFlingerState[1].notificationStatus = 'selected';
	}

	player.cardFlingerState[0].action = player.cardFlingerState[1].action = '';
	player.cardFlingerState[0].cardStatus.isFlipped = player.cardFlingerState[1].cardStatus.isFlipped = false;

	sendInProgressGameUpdate(game);

	setTimeout(() => {
		player.cardFlingerState = [];
		sendInProgressGameUpdate(game);
	}, 2000);

	if (seatedPlayers.filter(play => play.voteStatus.hasVoted).length === game.general.livingPlayerCount) {
		setTimeout(() => {
			flipBallotCards();
		}, 4000);
	}

	function flipBallotCards () {
		game.publicPlayersState.forEach((play, i) => {
			play.cardStatus.cardBack.cardName = seatedPlayers[i].voteStatus.didVoteYes ? 'ja' : 'nein';
			play.cardStatus.isFlipped = true;
		});

		sendInProgressGameUpdate(game);

		setTimeout(() => {
			seatedPlayers.forEach(play => {
				play.cardFlingerState = [];
			});
			sendInProgressGameUpdate(game);
		}, 2000);

		setTimeout(() => {
			const chat = {
				gameChat: true
			};

			game.publicPlayersState.forEach((play, i) => {
				play.cardStatus.isFlipped = false;
			});

			if (seatedPlayers.filter(play => play.voteStatus.didVoteYes).length / game.general.livingPlayerCount > 0.5) {
				chat.chat = [{text: 'The election passes.'}];

				seatedPlayers.forEach(player => {
					player.gameChats.push(chat);
				});

				game.private.unSeatedGameChats.push(chat);
				passedElection();
			} else {
				chat.chat = [{text: 'The election fails and the election tracker moves forward.'}];

				seatedPlayers.forEach(player => {
					player.gameChats.push(chat);
				});

				game.private.unSeatedGameChats.push(chat);
				failedElection();
			}

			sendInProgressGameUpdate(game);
		}, 6000);
	}

	function failedElection () {
		game.trackState.electionTrackerCount++;

		if (game.trackState.electionTrackerCount === 4) {

		} else {
			game.trackState.electionTrackerCount++;
			game.gameState.presidentIndex = game.gameState.presidentIndex === game.general.livingPlayerCount ? 1 : game.gameState.presidentIndex + 1; // todo-alpha skip dead players
			setTimeout(() => {
				startElection(game);
			}, 2000);
		}
	}

	function passedElection () {

	}
};

module.exports.startElection = startElection;