const run = async () => {
	const mongoose = require('mongoose');
	const Account = require('../models/account');
	const fs = require('fs');
	const data = {
		seasonalLeaderboard: [],
		dailyLeaderboard: []
	};

	mongoose.Promise = global.Promise;
	mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`, { useUnifiedTopology: true, useNewUrlParser: true });

	const dailyAccounts = await Account.find(
		{ lastCompletedGame: { $gte: new Date(Date.now() - 60000 * 60 * 24 * 120) } },
		{ eloSeason: 1, previousDayElo: 1, username: 1 }
	);
	const previousDayResetAccounts = await Account.find(
		{ 'games.2': { $exists: true }, eloSeason: { $ne: 1600 }, isBanned: { $ne: true } },
		{ eloSeason: 1, previousDayElo: 1, username: 1 }
	);

	// Get daily leaderboard data
	dailyAccounts.forEach(account => {
		data.dailyLeaderboard.push({
			userName: account.username,
			dailyEloDifference: account.eloSeason - (account.previousDayElo || 1600)
		});
	});
	// Reset previousDayElo's, get seasonalLeaderboard
	previousDayResetAccounts.forEach(account => {
		data.seasonalLeaderboard.push({
			userName: account.username,
			elo: account.eloSeason
		});
		account.previousDayElo = account.eloSeason;
	});
	for (i = 0; i < previousDayResetAccounts.length; i++) await previousDayResetAccounts[i].save();

	// Prepare percentile data
	let overallPlayers = await Account.find(
		{
			'games.2': { $exists: true },
			eloOverall: { $ne: 1600 },
			isBanned: { $ne: true },
			lastCompletedGame: { $gte: new Date(Date.now() - 60000 * 60 * 24 * 90) }
		},
		{ eloPercentile: 1, username: 1, eloOverall: 1 }
	);
	overallPlayers = overallPlayers.sort((a, b) => a.eloOverall - b.eloOverall);
	overallPlayers.forEach((player, i) => {
		player.eloPercentile = { ...player.eloPercentile, overall: 100 * ((i + 1 - 0.5) / overallPlayers.length) };
	});
	for (i = 0; i < overallPlayers.length; i++) await overallPlayers[i].save();

	let seasonalPlayers = await Account.find(
		{
			'games.2': { $exists: true },
			eloSeason: { $ne: 1600 },
			isBanned: { $ne: true },
			lastCompletedGame: { $gte: new Date(Date.now() - 60000 * 60 * 24 * 90) }
		},
		{ eloPercentile: 1, username: 1, eloSeason: 1 }
	);
	seasonalPlayers = seasonalPlayers.sort((a, b) => a.eloSeason - b.eloSeason);
	seasonalPlayers.forEach((player, i) => {
		player.eloPercentile = { ...player.eloPercentile, seasonal: 100 * ((i + 1 - 0.5) / seasonalPlayers.length) };
	});
	for (i = 0; i < seasonalPlayers.length; i++) await seasonalPlayers[i].save();

	// Prepare JSON data, save file
	data.dailyLeaderboard = data.dailyLeaderboard.sort((a, b) => b.dailyEloDifference - a.dailyEloDifference).slice(0, 20);
	data.seasonalLeaderboard = data.seasonalLeaderboard.sort((a, b) => b.elo - a.elo).slice(0, 20);
	fs.writeFile('/var/www/secret-hitler/public/leaderboardData.json', JSON.stringify(data), () => {
		mongoose.connection.close();
	});
};

run();
