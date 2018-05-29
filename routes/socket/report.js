const { EDITORS, ADMINS, MODERATORS, TRIALMODS } = require('../../src/frontend-scripts/constants');
const https = require('https');
const AEM = [...EDITORS, ...ADMINS, ...MODERATORS, ...TRIALMODS];
const checkAEM = names => {
	return names.some(n => AEM.includes(n));
};

module.exports.makeReport = (text, game, gameEnd) => {
	const players = game.private.seatedPlayers.map(player => player.userName);
	if (!gameEnd && checkAEM(players)) {
		if (!game.unsentReports) game.unsentReports = [];
		game.unsentReports[game.unsentReports.length] = 'AEM DELAYED - ' + text;
		console.log(`Delayed report due to AEM presence:\n${text}\n${game.general.uid}`);
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
		const req = https.request(options);
		req.end(report);
	} else console.log(`${text}\n${game.general.uid}`);
};
