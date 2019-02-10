const https = require('https');
const { getPowerFromName } = require('./models');

module.exports.makeReport = (text, game, gameEnd) => {
	// Custom games are strictly casual and for fun, writing proper report logic to account for it would be a massive pain.
	if (!game || game.customGameSettings.enabled) return;

	const isStaff = game.private.seatedPlayers.some(user => getPowerFromName(user.userName) >= 0);

	if (!gameEnd && isStaff) {
		if (!game.unsentReports) game.unsentReports = [];
		game.unsentReports[game.unsentReports.length] = `AEM DELAYED - ${text}`;
		return;
	}

	const report = JSON.stringify({
		content: `${process.env.DISCORDMODPING} ${text}\n<https://secrethitler.io/game/#/table/${game.general.uid}>`
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
