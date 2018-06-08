const mongoose = require('mongoose');
const Account = require('../models/account');
// const moment = require('moment');
// const _ = require('lodash');
const fs = require('fs');
const data = {
	seasonalLeaderboard: [],
	dailyLeaderboard: []
};

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:15726/secret-hitler-app`);

Account.find({})
	.cursor()
	.eachAsync(account => {
		if (account.previousDayElo) {
			dailyLeaderboard.push({
				userName: account.username,
				dailyEloDifference: account.eloSeason - account.previousDayElo
			});
		}
		account.previousDayElo = account.eloSeason;
	})
	.then(() => {
		Account.find({});
		fs.writeFile('/var/www/secret-hitler/data/leaderboardData.json', JSON.stringify(data), () => {
			mongoose.connection.close();
		});
	});
