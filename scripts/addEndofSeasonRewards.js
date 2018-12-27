const mongoose = require('mongoose');
const Account = require('../models/account');

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`);

// const bronze = [];
// const silver = [];
// const gold = [];
// const cutoff = 1757;

// Account.find({ 'gameSettings.previousSeasonAward': { $exists: true } })
// 	.cursor()
// 	.eachAsync(account => {
// 		account.gameSettings.previousSeasonAward = '';
// 		account.save();
// 	});

// Account.find({ eloSeason: { $gte: cutoff }, isBanned: { $exists: false } })
// 	.cursor()
// 	.eachAsync(account => {
// 		const { eloSeason } = account;

// 		if (eloSeason >= cutoff && eloSeason < cutoff + 25) {
// 			bronze.push(account.username);
// 		} else if (eloSeason >= cutoff + 25 && eloSeason < cutoff + 80) {
// 			silver.push(account.username);
// 		} else if (eloSeason >= cutoff + 100) {
// 			gold.push({ name: account.username, elo: eloSeason });
// 		}
// 	})
// 	.then(() => {
// 		console.log(bronze.length, 'bronze');
// 		console.log(silver.length, 'silver');
// 		console.log(gold.length, 'gold');
// 		console.log(gold.sort((a, b) => a.elo - b.elo), 'gold');

// 		// if this is ok, delete all player's old season reward, then do below:
// 	});

let count = 0;

Account.find({ eloSeason: { $gte: 1000 } })
	.cursor()
	.eachAsync(account => {
		account.eloSeason = 1600;
		account.save();
		count++;

		if (!(count % 100)) {
			console.log(count + ' count');
		}
	})
	.then(() => {
		console.log('done');
	});
