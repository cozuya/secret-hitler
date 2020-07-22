const mongoose = require('mongoose');
const Account = require('../models/account');
const fs = require('fs');
const data = {
	seasonalLeaderboard: [],
	dailyLeaderboard: []
};

const percentileData = {
	totalSeasonalPlayers: 0,
	totalOverallPlayers: 0,
	overallPlayers: [],
	seasonalPlayers: []
};

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`);

Account.find({ lastCompletedGame: { $gte: new Date(Date.now() - 86400000) } })
	.cursor()
	.eachAsync(account => {
		data.dailyLeaderboard.push({
			userName: account.username,
			dailyEloDifference: account.eloSeason - (account.previousDayElo || 1600)
		});
	})
	.then(() => {
		Account.count({
			'games.2': { $exists: true },
			eloOverall: { $ne: 1600 },
			isBanned: { $ne: true },
			lastCompletedGame: { $gte: new Date(Date.now() - 60000 * 60 * 24 * 120) }
		}).then(result => (percentileData.totalOverallPlayers = result));
		Account.count({
			'games.2': { $exists: true },
			eloSeason: { $ne: 1600 },
			isBanned: { $ne: true },
			lastCompletedGame: { $gte: new Date(Date.now() - 60000 * 60 * 24 * 120) }
		}).then(result => (percentileData.totalSeasonalPlayers = result));
		Account.find({
			'games.2': { $exists: true },
			eloSeason: { $ne: 1600 },
			isBanned: { $ne: true },
			lastCompletedGame: { $gte: new Date(Date.now() - 60000 * 60 * 24 * 120) }
		})
			.sort({ eloSeason: 1 })
			.cursor()
			.eachAsync(account => {
				percentileData.seasonalPlayers.push({ username: account.username, eloSeason: account.eloSeason });
			})
			.then(() => {
				percentileData.seasonalPlayers = percentileData.seasonalPlayers.map((player, i) => {
					return { username: player.username, eloSeason: player.eloSeason, percentile: 100 * ((i + 1 - 0.5) / percentileData.totalSeasonalPlayers) };
				});
			});
		Account.find({
			'games.2': { $exists: true },
			eloOverall: { $ne: 1600 },
			isBanned: { $ne: true },
			lastCompletedGame: { $gte: new Date(Date.now() - 60000 * 60 * 24 * 120) }
		})
			.sort({ eloOverall: 1 })
			.cursor()
			.eachAsync(account => {
				percentileData.overallPlayers.push({ username: account.username, eloOverall: account.eloOverall });
			})
			.then(() => {
				percentileData.overallPlayers = percentileData.overallPlayers.map((player, i) => {
					return { username: player.username, eloOverall: player.eloOverall, percentile: 100 * ((i + 1 - 0.5) / percentileData.totalOverallPlayers) };
				});
			});
	})
	.then(() => {
		Account.find({ 'games.2': { $exists: true }, eloSeason: { $gte: 1620 }, isBanned: { $ne: true } })
			.cursor()
			.eachAsync(account => {
				data.seasonalLeaderboard.push({
					userName: account.username,
					elo: account.eloSeason
				});
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
