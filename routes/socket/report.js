const https = require('https');
const Account = require('../../models/account');
const { newStaff, getPowerFromName } = require('./models');

const AEM_ALTS = ['bell', 'BigbyWolf', 'Picangel', 'birdy', 'Grim', 'TermsOfUse'];

module.exports.makeReport = (text, game, gameEnd) => {
	const isStaff = game.private.seatedPlayers.map(player => player.userName).some(n => getPowerFromName(n) >= 0);

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

	game.private.hiddenInfoShouldNotify = false;
};
