require('dotenv').config();
const mongoose = require('mongoose');
const Account = require('../models/account');
const fs = require('fs');
const data = {
	seasonalLeaderboard: [],
	dailyLeaderboard: []
};

mongoose.Promise = global.Promise;
mongoose.connect(`${process.env.MONGODB_URI || 'localhost:27017'}/secret-hitler-app`);

Account.find({ lastCompletedGame: { $gte: new Date(Date.now() - 86400000) } })
	.cursor()
	.eachAsync(account => {
		data.dailyLeaderboard.push({
			userName: account.username,
			dailyEloDifference: account.eloSeason - (account.previousDayElo || 1600)
		});
	})
	.then(() => {
		Account.find({ 'games.2': { $exists: true } })
			.cursor()
			.eachAsync(account => {
				if (account.eloSeason > 1620 && !account.isBanned) {
					data.seasonalLeaderboard.push({
						userName: account.username,
						elo: account.eloSeason
					});
				}
				account.previousDayElo = account.eloSeason;
				account.save();
			})
			.then(() => {
				data.dailyLeaderboard = data.dailyLeaderboard.sort((a, b) => b.dailyEloDifference - a.dailyEloDifference).slice(0, 20);
				data.seasonalLeaderboard = data.seasonalLeaderboard.sort((a, b) => b.elo - a.elo).slice(0, 20);
				fs.writeFile('/var/www/secret-hitler/public/leaderboardData.json', JSON.stringify(data), () => {
					mongoose.connection.close();
				});
			});
	});
