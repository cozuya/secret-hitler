const moment = require('moment');

const ModAction = require('../../../models/modAction');
const { makeReport } = require('../report');
const { sendInProgressGameUpdate } = require('../util');

/**
 * @param {object} socket - socket reference.
 * @param {object} passport - socket authentication.
 * @param {object} game - game reference.
 */
module.exports.handleSubscribeModChat = (socket, passport, game) => {
	// Authentication Assured in routes.js

	if (game.private.hiddenInfoSubscriptions.includes(passport.user)) return;

	if (game.private.hiddenInfoShouldNotify) {
		makeReport(
			{
				player: passport.user,
				situation: `has subscribed to mod chat for a game without an auto-report.`,
				election: game.general.electionCount,
				title: game.general.name,
				uid: game.general.uid,
				gameType: game.general.casualGame ? 'Casual' : game.general.practiceGame ? 'Practice' : 'Ranked'
			},
			game,
			'modchat'
		);
		game.private.hiddenInfoShouldNotify = false;
	}

	const modOnlyChat = {
		timestamp: new Date(),
		gameChat: true,
		chat: [{ text: `${passport.user} has subscribed to mod chat. Current deck: ` }]
	};
	game.private.policies.forEach(policy => {
		modOnlyChat.chat.push({
			text: policy === 'liberal' ? 'B' : 'R',
			type: policy
		});
	});
	game.private.hiddenInfoChat.push(modOnlyChat);
	game.private.hiddenInfoSubscriptions.push(passport.user);
	sendInProgressGameUpdate(game);
};

/**
 * @param {object} socket - socket reference.
 * @param {object} passport - socket authentication.
 * @param {object} game - game reference.
 * @param {string} modUserName - freezing Moderator's username
 */
module.exports.handleGameFreeze = (socket, passport, game, modUserName) => {
	const gameToFreeze = game;

	if (gameToFreeze && gameToFreeze.private && gameToFreeze.private.seatedPlayers) {
		for (player of gameToFreeze.private.seatedPlayers) {
			if (modUserName === player.userName) {
				socket.emit('sendAlert', 'You cannot freeze the game whilst playing.');
				return;
			}
		}
	}

	if (!game.private.gameFrozen) {
		const modaction = new ModAction({
			date: new Date(),
			modUserName: passport.user,
			userActedOn: game.general.uid,
			modNotes: '',
			actionTaken: 'Game Freeze'
		});
		modaction.save();
		game.private.gameFrozen = true;
	} else {
		ModAction.findOne({ userActedOn: game.general.uid, actionTaken: 'Game Freeze' })
			.then(action => {
				if (action.modNotes) {
					if (action.modNotes.indexOf(passport.user) === -1) {
						action.modNotes += passport.user + '\n';
					}
				} else {
					action.modNotes = 'Subsequently frozen/unfrozen by:\n';
					action.modNotes += passport.user + '\n';
				}
				action.save();
			})
			.catch(err => {
				console.log(err, 'err in finding player report');
			});
	}

	const now = new Date();
	if (game.gameState.isGameFrozen) {
		if (now - game.gameState.isGameFrozen >= 4000) {
			game.gameState.isGameFrozen = false;
		} else {
			// Figured this would get annoying - can add it back if mods want.
			// socket.emit('sendAlert', `You cannot do this yet, please wait ${Math.ceil((now - game.gameState.isGameFrozen) / 1000)} seconds`);
			return;
		}
	} else {
		game.gameState.isGameFrozen = now;
	}

	gameToFreeze.chats.push({
		userName: `(AEM) ${modUserName}`,
		chat: `has ${game.gameState.isGameFrozen ? 'frozen' : 'unfrozen'} the game. ${game.gameState.isGameFrozen ? 'All actions are prevented.' : ''}`,
		isBroadcast: true,
		timestamp: new Date()
	});

	sendInProgressGameUpdate(game);
};

/**
 * @param {object} socket - socket reference.
 * @param {object} passport - socket authentication.
 * @param {object} game - game reference.
 * @param {string} modUserName - requesting Moderator's username
 */
module.exports.handleModPeekVotes = (socket, passport, game, modUserName) => {
	const gameToPeek = game;
	let output = '<table class="fullTable"><tr><th>Seat</th><th>Role</th><th>Vote</th></tr>';

	if (gameToPeek && gameToPeek.private && gameToPeek.private.seatedPlayers) {
		for (player of gameToPeek.private.seatedPlayers) {
			if (modUserName === player.userName) {
				socket.emit('sendAlert', 'You cannot peek votes whilst playing.');
				return;
			}
		}
	}

	if (!game.private.votesPeeked) {
		const modaction = new ModAction({
			date: new Date(),
			modUserName: passport.user,
			userActedOn: game.general.uid,
			modNotes: '',
			actionTaken: 'Peek Votes'
		});
		modaction.save();
		game.private.votesPeeked = true;
	} else {
		ModAction.findOne({ userActedOn: game.general.uid, actionTaken: 'Peek Votes' })
			.then(action => {
				if (action.modNotes) {
					if (action.modNotes.indexOf(passport.user) === -1) {
						action.modNotes += passport.user + '\n';
					}
				} else {
					action.modNotes = 'Subsequently viewed by:\n';
					action.modNotes += passport.user + '\n';
				}
				action.save();
			})
			.catch(err => {
				console.log(err, 'err in finding player report');
			});
	}

	if (gameToPeek && gameToPeek.private && gameToPeek.private.seatedPlayers) {
		const playersToCheckVotes = gameToPeek.private.seatedPlayers;
		playersToCheckVotes.map(player => {
			output += '<tr>';
			output += '<td>' + (playersToCheckVotes.indexOf(player) + 1) + '</td>';
			output += '<td>';
			if (player && player.role && player.role.cardName) {
				if (player.role.cardName === 'hitler') {
					output += player.role.cardName.substring(0, 1).toUpperCase() + player.role.cardName.substring(1);
				} else {
					output += player.role.cardName.substring(0, 1).toUpperCase() + player.role.cardName.substring(1);
				}
			} else {
				output += 'Roles not Dealt';
			}
			output +=
				'</td><td>' +
				(player.isDead ? 'Dead' : player.voteStatus && player.voteStatus.hasVoted ? (player.voteStatus.didVoteYes ? 'Ja' : 'Nein') : 'Not' + ' Voted') +
				'</td>';
			output += '</tr>';
		});
	}

	output += '</table>';
	socket.emit('sendAlert', output);
};

/**
 * @param {object} socket - socket reference.
 * @param {object} passport - socket authentication.
 * @param {object} game - game reference.
 * @param {string} modUserName - requesting Moderator's username
 */
module.exports.handleModPeekRemakes = (socket, passport, game, modUserName) => {
	const gameToPeek = game;
	let output =
		'<table class="fullTable"><tr><th>Seat</th><th>Role</th><th>Time since last voted to remake</th><th>Currently voting to remake?</th><th>Times voted to remake</th></tr>';

	if (gameToPeek && gameToPeek.private && gameToPeek.private.seatedPlayers) {
		for (const player of gameToPeek.private.seatedPlayers) {
			if (modUserName === player.userName) {
				socket.emit('sendAlert', 'You cannot get votes to remake whilst playing.');
				return;
			}
		}
	}

	if (!game.private.remakeVotesPeeked) {
		const modaction = new ModAction({
			date: new Date(),
			modUserName: passport.user,
			userActedOn: game.general.uid,
			modNotes: '',
			actionTaken: 'Get Remakes'
		});
		modaction.save();
		game.private.remakeVotesPeeked = true;
	} else {
		ModAction.findOne({ userActedOn: game.general.uid, actionTaken: 'Get Remakes' })
			.then(action => {
				if (action.modNotes) {
					if (action.modNotes.indexOf(passport.user) === -1) {
						action.modNotes += passport.user + '\n';
					}
				} else {
					action.modNotes = 'Subsequently viewed by:\n';
					action.modNotes += passport.user + '\n';
				}
				action.save();
			})
			.catch(err => {
				console.log(err, 'err in finding player report');
			});
	}

	if (gameToPeek && gameToPeek.private && gameToPeek.private.seatedPlayers) {
		const playersToCheckVotes = gameToPeek.private.seatedPlayers;
		playersToCheckVotes.map(player => {
			output += '<tr>';
			output += '<td>' + (playersToCheckVotes.indexOf(player) + 1) + '</td>';
			output += '<td>';
			if (player && player.role && player.role.cardName) {
				if (player.role.cardName === 'hitler') {
					output += player.role.cardName.substring(0, 1).toUpperCase() + player.role.cardName.substring(1);
				} else {
					output += player.role.cardName.substring(0, 1).toUpperCase() + player.role.cardName.substring(1);
				}
			} else {
				output += 'Roles not Dealt';
			}

			const playerRemakeData = game.remakeData.find(d => d.userName === player.userName);
			output += '<td>' + (playerRemakeData.remakeTime ? moment.duration(new Date() - new Date(playerRemakeData.remakeTime)).humanize() : '-') + '</td>';
			output += '<td>' + (playerRemakeData.isRemaking ? 'Yes' : 'No') + '</td>';
			output += '<td>' + playerRemakeData.timesVoted + '</td>';
			output += '</tr>';
		});
	}

	output += '</table>';
	socket.emit('sendAlert', output);
};
