const https = require('https');
const Account = require('../../models/account');
const { newStaff } = require('./models');

module.exports.makeReport = (text, game, gameEnd) => {
	Account.find({ staffRole: { $exists: true } }).then(accounts => {
		const staffUserNames = accounts
			.filter(account => account.staffRole === 'moderator' || account.staffRole === 'editor' || account.staffRole === 'admin')
			.map(account => account.userName);
		const players = game.private.seatedPlayers.map(player => player.userName);
		const isStaff = players.some(n => staffUserNames.includes(n) || newStaff.modUserNames.includes(n) || newStaff.editorUserNames(includes(n)));

		if (!gameEnd && isStaff) {
			if (!game.unsentReports) game.unsentReports = [];
			game.unsentReports[game.unsentReports.length] = `AEM DELAYED - ${text}`;
			return;
		}

		const report = JSON.stringify({
			content: `${process.env.DISCORDMODPING} ${text}\nhttps://secrethitler.io/game/#/table/${game.general.uid}`
		});
		const options = {
			hostname: 'discordapp.com',
			path: process.env.DISCORDREPORTURL,
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': Buffer.byteLength(report)
			}
		};

		if (process.env.NODE_ENV === 'production') {
			try {
				const req = https.request(options);
				req.end(report);
			} catch (e) {
				console.log(e);
			}
		} else {
			console.log(`${text}\n${game.general.uid}`);
		}
	});
};
