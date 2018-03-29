const mongoose = require('mongoose');
const Account = require('../models/account');

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:15726/secret-hitler-app`);

const bronze = [];
const silver = [];
const gold = [];

Account.find({ winsSeason1: { $gte: 150 } })
	.cursor()
	.eachAsync(account => {
		const winrate = account.winsSeason1 / (account.winsSeason1 + account.lossesSeason1);

		if (winrate > 0.52 && winrate < 0.54) {
			bronze.push(account.username);
		} else if (winrate >= 0.54 && winrate < 0.562) {
			silver.push(account.username);
		} else if (winrate >= 0.562) {
			gold.push(account.username);
		}
	})
	.then(() => {
		console.log(bronze.length, 'bronze');
		console.log(silver.length, 'silver');
		console.log(gold.length, 'gold');

		// if this is ok, run below:
	});

// Account.find({ winsSeason1: { $gte: 150 } })
// 	.cursor()
// 	.eachAsync(account => {
// 		const winrate = account.winsSeason1 / (account.winsSeason1 + account.lossesSeason1);

// 		if (winrate > 0.52 && winrate < 0.54) {
// 			account.previousSeasonAward = 'bronze';
// 		} else if (winrate >= 0.54 && winrate < 0.562) {
// 			account.previousSeasonAward = 'silver';
// 		} else if (winrate >= 0.562) {
// 			account.previousSeasonAward = 'gold';
// 		}
// 	});
