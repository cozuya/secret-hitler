const https = require('https');
const Account = require('../../models/account');
const { newStaff } = require('./models');

module.exports.makeReport = (data, game, type = 'report') => {
	// Custom games are strictly casual and for fun, writing proper report logic to account for it would be a massive pain.
	if (!game || game.customGameSettings.enabled || game.general.unlisted) return;
	const { title, player, seat, role, election, situation, uid, gameType } = data;

	let report;

	if (type === 'ping') {
		report = JSON.stringify({
			'content': `${process.env.DISCORDMODPING}\n__**[${title}](<https://secrethitler.io/game/#/table/${uid}>)**__\n__**Player**__: ${player} \n__**Situation**__: ${situation}\n__**Election #**__: ${election}\n__**Game Type**__: ${gameType}\n`, 'username': '@Mod Ping'
		});
	}

	if (type === 'delayed') {
		report = JSON.stringify({
			'content': `${process.env.DISCORDMODPING} - **AEM DELAYED**\n__**[${title}](<https://secrethitler.io/game/#/table/${uid}>)**__\n__**Player**__: ${player}\n__**Seat**__: ${seat}\n__**Role**__: ${role}\n__**Situation**__: ${situation}\n__**Election #**__: ${election}\n__**Game Type**__: ${gameType}\n`,
			'username': 'AEM Delayed'
		});
	}

	if (type === 'modchat') {
		report = JSON.stringify({
			'content': `${process.env.DISCORDMODPING}\n__**[${title}](<https://secrethitler.io/game/#/table/${uid}>)**__\n__**Member**__: ${player} \n__**Situation**__: ${situation}\n__**Election #**__: ${election}\n__**Game Type**__: ${gameType}\n`,
			'username': 'Mod Chat'
		});
		game.private.hiddenInfoShouldNotify = false;
	}

	if (process.env.NODE_ENV === 'production' && type !== 'report') {
		try {
			const req = https.request({
				hostname: 'discordapp.com',
				path: process.env.DISCORDREPORTURL,
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Content-Length': Buffer.byteLength(report)
				}
			});
			req.end(report);
		} catch (e) {
			console.log(e);
		}
		return;
	}

	Account.find({ staffRole: { $exists: true } }).then(accounts => {
		const staffUserNames = accounts
			.filter(
				account =>
					account.staffRole === 'altmod' ||
					account.staffRole === 'moderator' ||
					account.staffRole === 'editor' ||
					account.staffRole === 'admin' ||
					account.staffRole === 'trialmod'
			)
			.map(account => account.username);
		const players = game.private.seatedPlayers.map(player => player.userName);
		const isStaff = players.some(
			n =>
				staffUserNames.includes(n) ||
				newStaff.altmodUserNames.includes(n) ||
				newStaff.modUserNames.includes(n) ||
				newStaff.editorUserNames.includes(n) ||
				newStaff.trialmodUserNames.includes(n)
		);

		if (isStaff) {
			if (!game.unsentReports) game.unsentReports = [];
			game.unsentReports[game.unsentReports.length] = data;
			return;
		}

		report = JSON.stringify({
			'content': `${process.env.DISCORDMODPING}\n__**[${title}](<https://secrethitler.io/game/#/table/${uid}>)**__\n__**Player**__: ${player}\n__**Seat**__: ${seat}\n__**Role**__: ${role}\n__**Situation**__: ${situation}\n__**Election #**__: ${election}\n__**Game Type**__: ${gameType}\n`,
			'username': 'Auto Report'
		});

		if (process.env.NODE_ENV === 'production') {
			try {
				const req = https.request({
					hostname: 'discordapp.com',
					path: process.env.DISCORDREPORTURL,
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Content-Length': Buffer.byteLength(report)
					}
				});
				req.end(report);
			} catch (e) {
				console.log(e);
			}
		} else {
			console.log(`${text}\n${game.general.uid}`);
		}

		game.private.hiddenInfoShouldNotify = false;
	});
};
