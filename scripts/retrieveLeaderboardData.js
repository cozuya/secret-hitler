const mongoose = require('mongoose');
const Account = require('../models/account');
const fs = require('fs');
const data = {
	seasonalLeaderboardElo: [],
	seasonalLeaderboardXP: [],
	dailyLeaderboardElo: [],
	dailyLeaderboardXP: [],
	rainbowLeaderboard: []
};

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`);

Account.find({ lastCompletedGame: { $gte: new Date(Date.now() - 86400000) } })
	.cursor()
	.eachAsync(account => {
		data.dailyLeaderboardElo.push({
			userName: account.username,
			dailyEloDifference: account.eloSeason - (account.previousDayElo || 1600)
		});
		data.dailyLeaderboardXP.push({
			userName: account.username,
			dailyXPDifference: account.xpSeason - (account.previousDayXP || 1600)
		});
	})
	.then(() => {
		Account.find({ 'games.2': { $exists: true } })
			.cursor()
			.eachAsync(account => {
				if (account.eloSeason > 1620 && !account.isBanned) {
					data.seasonalLeaderboardElo.push({
						userName: account.username,
						elo: account.eloSeason
					});
				}
				if (account.xpSeason > 10 && !account.isBanned) {
					data.seasonalLeaderboardXP.push({
						userName: account.username,
						xp: account.xpSeason
					});
				}
				if (account.isRainbowOverall && !account.isBanned) {
					data.rainbowLeaderboard.push({
						userName: account.username,
						date: account.dateRainbowOverall || new Date(0)
					});
				}
				account.previousDayElo = account.eloSeason;
				account.previousDayXP = account.xpSeason;
				account.save();
			})
			.then(() => {
				data.dailyLeaderboardElo = data.dailyLeaderboardElo.sort((a, b) => b.dailyEloDifference - a.dailyEloDifference).slice(0, 20);
				data.dailyLeaderboardXP = data.dailyLeaderboardXP.sort((a, b) => b.dailyXPDifference - a.dailyXPDifference).slice(0, 20);
				data.seasonalLeaderboardElo = data.seasonalLeaderboardElo.sort((a, b) => b.elo - a.elo).slice(0, 20);
				data.seasonalLeaderboardXP = data.seasonalLeaderboardXP.sort((a, b) => b.xp - a.xp).slice(0, 20);
				data.rainbowLeaderboard = data.rainbowLeaderboard.sort((a, b) => b.date - a.date).slice(0, 20);
				fs.writeFile('/var/www/secret-hitler/public/leaderboardData.json', JSON.stringify(data), () => {
					mongoose.connection.close();
				});
			});
	});
