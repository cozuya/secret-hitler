const mongoose = require('mongoose');
const Account = require('../models/account');

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:15726/secret-hitler-app`);

const bronze = [];
const silver = [];
const gold = [];
const cutoff = 1765;

// Account.find({ eloSeason: { $gte: cutoff } })
// 	.cursor()
// 	.eachAsync(account => {
// 		const { eloSeason } = account;

// 		if (eloSeason >= cutoff && eloSeason < cutoff + 24) {
// 			bronze.push(account.username);
// 		} else if (eloSeason >= cutoff + 24 && eloSeason < cutoff + 80) {
// 			silver.push(account.username);
// 		} else if (eloSeason >= cutoff + 80) {
// 			gold.push(account.username);
// 		}
// 	})
// 	.then(() => {
// 		console.log(bronze.length, 'bronze');
// 		console.log(silver.length, 'silver');
// 		console.log(gold.length, 'gold');

// 		// if this is ok, run below:
// 	});

Account.find({ eloSeason: { $gte: cutoff } })
	.cursor()
	.eachAsync(account => {
		const { eloSeason } = account;

		if (eloSeason >= cutoff && eloSeason < cutoff + 24) {
			account.gameSettings.previousSeasonAward = 'bronze';
			account.save();
		} else if (eloSeason >= cutoff + 24 && eloSeason < cutoff + 80) {
			account.gameSettings.previousSeasonAward = 'silver';
			account.save();
		} else if (eloSeason >= cutoff + 80) {
			account.gameSettings.previousSeasonAward = 'gold';
			account.save();
		}
	})
	.then(() => {
		console.log('done');
	});
