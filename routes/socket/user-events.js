const https = require('https');

const chat = require('./user-events/chat');
const claim = require('./user-events/claim');
const createGame = require('./user-events/create-game');
const flappyHitler = require('./user-events/flappy-hitler');
const gameCountdown = require('./user-events/game-countdown');
const joinGame = require('./user-events/join-game');
const leaveGame = require('./user-events/leave-game');
const modDms = require('./user-events/mod-dms');
const modModals = require('./user-events/mod-modals');
const moderation = require('./user-events/moderation');
const playerNotes = require('./user-events/player-notes');
const playerReports = require('./user-events/player-reports');
const remakeGame = require('./user-events/remake-game');
const settings = require('./user-events/settings');
const util = require('./user-events/util');

module.exports = Object.assign(
	{},
	chat,
	claim,
	createGame,
	flappyHitler,
	gameCountdown,
	joinGame,
	leaveGame,
	modDms,
	modModals,
	moderation,
	playerNotes,
	playerReports,
	remakeGame,
	settings,
	util
);

const crashReport = JSON.stringify({
	content: `${process.env.DISCORDADMINPING} the site just crashed or reset.`
});

const crashOptions = {
	hostname: 'discordapp.com',
	path: process.env.DISCORDCRASHURL,
	method: 'POST',
	headers: {
		'Content-Type': 'application/json',
		'Content-Length': Buffer.byteLength(crashReport)
	}
};

if (process.env.NODE_ENV === 'production') {
	const crashReq = https.request(crashOptions);

	crashReq.end(crashReport);
}
