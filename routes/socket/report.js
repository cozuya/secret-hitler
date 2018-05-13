const https = require('https');

module.exports.makeReport = (text, roomID) => {
	const report = JSON.stringify({
		content: `${process.env.DISCORDMODPING} ${text}\nhttps://secrethitler.io/game/#/table/${roomID}`
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
	}
	else console.log(`${text}\n${roomID}`);
}