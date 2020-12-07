const https = require('https');
const Account = require('../../models/account');
const { newStaff } = require('./models');

function sendReport(game, report, data, type) {
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
				report = JSON.stringify(report);
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
			const text = JSON.stringify(report);
			console.log(`${text}\n${game.general.uid}`);
		}
	});
}

module.exports.makeReport = (data, game, type = 'report') => {
	// No Auto-Reports, or Mod Pings from Custom, Unlisted, or Private Games
	if (!game || game.customGameSettings.enabled || game.general.unlisted || game.general.private) return;
	// No Auto-Reports from Casual games
	if (game.general.casualGame && (type === 'report' || type === 'reportdelayed')) return;
	const { player, seat, role, election, situation, uid, gameType } = data;

	let report;

	if (type === 'report' || type === 'modchat') {
		game.private.hiddenInfoShouldNotify = false;
	}

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

	if (type === 'report' || type === 'reportdelayed') {
		const upperRole = role[0].toUpperCase() + role.substr(1);
		const isDelayed = type === 'reportdelayed' ? ' - **AEM DELAYED**' : '';
		let throwerIP;
		const otherPlayers = [];

		report = {
			content: `${process.env.DISCORDMODPING}${isDelayed}\n__**Player**__: ${player} {${seat}}\n__**Role**__: ${upperRole}\n__**Situation**__: ${situation}\n__**Election #**__: ${election}\n__**Game Type**__: ${gameType}`,
			username: 'Auto Report',
			avatar_url: 'https://cdn.discordapp.com/emojis/230161421336313857.png?v=1'
		};

		game.publicPlayersState.map(state => {
			if (state.userName !== player) {
				otherPlayers.push(state.userName);
			}
		});

		Account.findOne({ username: player }, (err, account) => {
			if (err) console.log(err, 'err finding user');
			else if (account) data.ip = account.lastConnectedIP || account.signupIP;
			throwerIP = data.ip;

			const matches = {};
			Account.find({ username: { $in: otherPlayers } })
				.then(accounts => {
					accounts.forEach(account => {
						let ip;
						if (account) ip = account.lastConnectedIP || account.signupIP;

						const seat = game.private.seatedPlayers.findIndex(elem => elem.userName === account.username);
						if (ip === throwerIP) {
							matches[seat] = `${account.username} {${seat + 1}}`;
						} else if (
							ip.includes('.') && // Ensure both IPs are IPv4
							throwerIP.includes('.') &&
							ip
								.split('.')
								.splice(0, -1)
								.join('.') === // Splice off last block
								throwerIP
									.split('.')
									.splice(0, -1)
									.join('.') // to determine if the IPs are a 3-block match
						) {
							matches[seat] = `${account.username} {${seat + 1}} (3-block)`;
						}
					});
				})
				.then(() => {
					const sortedSeats = Object.keys(matches).sort();
					if (sortedSeats.length > 0) {
						const sortedMatches = [];

						for (const seat of sortedSeats) {
							sortedMatches.push(matches[seat]);
						}

						report.content += `\n__**Matching IPs**__: ${sortedMatches.join(', ')}`;
					}
					report.content += `\n**<https://secrethitler.io/game/#/table/${uid}>**`;
					sendReport(game, report, data, type);
				});
		});
	}

	if (type === 'modchat' || type === 'modchatdelayed') {
		const isDelayed = type === 'modchatdelayed' ? ' - **AEM DELAYED**' : '';
		report = {
			content: `${process.env.DISCORDMODPING}${isDelayed}\n__**Member**__: ${player} \n__**Situation**__: ${situation}\n__**Election #**__: ${election}\n__**Game Type**__: ${gameType}\n**<https://secrethitler.io/game/#/table/${uid}>**`,
			username: 'Mod Chat',
			avatar_url: 'https://cdn.discordapp.com/emojis/230161421311148043.png?v=1'
		};
		sendReport(game, report, data, type);
	}
};
