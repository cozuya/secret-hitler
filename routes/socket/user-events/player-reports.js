const https = require('https');

const Account = require('../../../models/account');
const PlayerReport = require('../../../models/playerReport');
const { games, userList } = require('../models');

/**
 * @param {object} passport - socket authentication.
 * @param {object} data - from socket emit.
 * @param {object} callback - response function.
 */
module.exports.handlePlayerReport = (passport, data, callback) => {
	const user = userList.find(u => u.userName === passport.user);

	if (data.userName !== 'from replay' && (!user || user.wins + user.losses < 2) && process.env.NODE_ENV === 'production') {
		return;
	}

	let reason = data.reason;

	if (!/^(afk\/leaving game|abusive chat|cheating|gamethrowing|stalling|botting|other)$/.exec(reason)) {
		callback({ success: false, error: 'Invalid report reason.' });
		return;
	}

	switch (reason) {
		case 'afk/leaving game':
			reason = 'AFK/Leaving Game';
			break;
		case 'abusive chat':
			reason = 'Abusive Chat';
			break;
		case 'cheating':
			reason = 'Cheating';
			break;
		case 'gamethrowing':
			reason = 'Gamethrowing';
			break;
		case 'stalling':
			reason = 'Stalling';
			break;
		case 'botting':
			reason = 'Botting';
			break;
		case 'other':
			reason = 'Other';
			break;
	}

	const httpEscapedComment = data.comment.replace(/( |^)(https?:\/\/\S+)( |$)/gm, '$1<$2>$3');
	const game = games[data.uid];
	if (!game && data.uid) return;

	const gameType = data.uid ? (game.general.isTourny ? 'tournament' : game.general.casualGame ? 'casual' : 'standard') : 'homepage';

	const playerReport = new PlayerReport({
		date: new Date(),
		gameUid: data.uid,
		reportingPlayer: passport.user,
		reportedPlayer: data.reportedPlayer,
		reason: reason,
		gameType,
		comment: data.comment,
		isActive: true
	});

	const blindModeAnonymizedPlayer =
		data.uid && game.general.blindMode ? (game.gameState.isStarted ? `${data.reportedPlayer.split(' ')[0]} Anonymous` : 'Anonymous') : data.reportedPlayer;

	const body = JSON.stringify({
		content: `${
			data.uid ? `Game UID: <https://secrethitler.io/game/#/table/${data.uid}> (${playerReport.gameType})` : 'Report from homepage'
		}\nReported player: ${blindModeAnonymizedPlayer}\nReason: ${playerReport.reason}\nComment: ${httpEscapedComment}`,
		allowed_mentions: { parse: [] }
	});

	const options = {
		hostname: 'discordapp.com',
		path: process.env.DISCORDURL,
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Content-Length': Buffer.byteLength(body)
		}
	};

	if (game) {
		if (!game.private.reportCounts) game.private.reportCounts = {};
		if (!game.private.reportCounts[passport.user]) game.private.reportCounts[passport.user] = 0;
		if (game.private.reportCounts[passport.user] >= 4) {
			return;
		}
		game.private.reportCounts[passport.user]++;
	}

	let reportError = false;

	try {
		const req = https.request(options);
		req.end(body);
	} catch (error) {
		console.log(error, 'Caught exception in player request https request to discord server');
		reportError = true;
	}

	playerReport.save(err => {
		if (err) {
			console.log(err, 'Failed to save player report');
			callback({ success: false, error: 'Error submitting report.' });
			return;
		}

		Account.find({ staffRole: { $exists: true, $ne: 'veteran' } }).then(accounts => {
			accounts.forEach(account => {
				const onlineSocketId = Object.keys(io.sockets.sockets).find(
					socketId =>
						io.sockets.sockets[socketId].handshake.session.passport && io.sockets.sockets[socketId].handshake.session.passport.user === account.username
				);

				account.gameSettings.newReport = true;

				if (onlineSocketId) {
					io.sockets.sockets[onlineSocketId].emit('reportUpdate', true);
				}
				account.save();
			});
		});

		if (typeof callback === 'function') {
			if (reportError) {
				callback({ success: false, error: 'Error submitting report.' });
			} else {
				callback({ success: true });
			}
		}
	});
};

module.exports.handlePlayerReportDismiss = () => {
	Account.find({ staffRole: { $exists: true, $ne: 'veteran' } }).then(accounts => {
		accounts.forEach(account => {
			const onlineSocketId = Object.keys(io.sockets.sockets).find(
				socketId => io.sockets.sockets[socketId].handshake.session.passport && io.sockets.sockets[socketId].handshake.session.passport.user === account.username
			);

			account.gameSettings.newReport = false;

			if (onlineSocketId) {
				io.sockets.sockets[onlineSocketId].emit('reportUpdate', false);
			}
			account.save();
		});
	});
};
