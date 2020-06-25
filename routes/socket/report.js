const https = require('https');
const Account = require('../../models/account');
const { newStaff } = require('./models');

module.exports.makeReport = (data, game, type = 'report') => {
	// No Auto-Reports, or Mod Pings from Custom, Unlisted, or Private Games
	if (!game || game.customGameSettings.enabled || game.general.unlisted || game.general.private) return;
	const { player, seat, role, election, situation, uid, gameType } = data;

	let report;

	if (type === 'ping') {
		report = JSON.stringify({
			content: `${process.env.DISCORDMODPING}\n__**Player**__: ${player} \n__**Situation**__: ${situation}\n__**Election #**__: ${election}\n__**Game Type**__: ${gameType}\n**<https://secrethitler.io/game/#/table/${uid}>**`,
			username: '@Mod Ping',
			avatar_url: 'https://cdn.discordapp.com/emojis/612042360318328842.png?v=1'
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
		return;
	}

	if (type === 'reportdelayed') {
		report = JSON.stringify({
			content: `${process.env.DISCORDMODPING} - **AEM DELAYED**\n__**Player**__: ${player} {${seat}}\n__**Role**__: ${role}\n__**Situation**__: ${situation}\n__**Election #**__: ${election}\n__**Game Type**__: ${gameType}\n**<https://secrethitler.io/game/#/table/${uid}>**`,
			username: 'Auto Report',
			avatar_url: 'https://cdn.discordapp.com/emojis/230161421336313857.png?v=1'
		});
	}

	if (type === 'modchatdelayed') {
		report = JSON.stringify({
			content: `${process.env.DISCORDMODPING} - **AEM DELAYED**\n__**Member**__: ${player} \n__**Situation**__: ${situation}\n__**Election #**__: ${election}\n__**Game Type**__: ${gameType}\n**<https://secrethitler.io/game/#/table/${uid}>**`,
			username: 'Mod Chat',
			avatar_url: 'https://cdn.discordapp.com/emojis/230161421311148043.png?v=1'
		});
	}

	if (type === 'modchat') {
		report = JSON.stringify({
			content: `${process.env.DISCORDMODPING}\n__**Member**__: ${player} \n__**Situation**__: ${situation}\n__**Election #**__: ${election}\n__**Game Type**__: ${gameType}\n**<https://secrethitler.io/game/#/table/${uid}>**`,
			username: 'Mod Chat',
			avatar_url: 'https://cdn.discordapp.com/emojis/230161421311148043.png?v=1'
		});
	}

	if (type === 'report' && !game.general.casualGame) {
		report = JSON.stringify({
			content: `${process.env.DISCORDMODPING}\n__**Player**__: ${player} {${seat}}\n__**Role**__: ${role}\n__**Situation**__: ${situation}\n__**Election #**__: ${election}\n__**Game Type**__: ${gameType}\n**<https://secrethitler.io/game/#/table/${uid}>**`,
			username: 'Auto Report',
			avatar_url: 'https://cdn.discordapp.com/emojis/230161421336313857.png?v=1'
		});
	}

	if (type === 'report' || type === 'modchat') {
		game.private.hiddenInfoShouldNotify = false;
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

		if (type !== 'reportdelayed' && type !== 'modchatdelayed') {
			if (isStaff) {
				if (!game.unsentReports) game.unsentReports = [];
				data.type = type;
				game.unsentReports[game.unsentReports.length] = data;
				return;
			}
		}

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
	});
};
