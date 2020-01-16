const mongoose = require('mongoose');
const Account = require('../models/account');

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`);

const bronze = [];
const silver = [];
const gold = [];
const cutoff = 1737;

// Account.find({ 'gameSettings.previousSeasonAward': { $exists: true } })
// 	.cursor()
// 	.eachAsync(account => {
// 		account.gameSettings.previousSeasonAward = '';
// 		account.save();
// 	});

Account.find({ eloSeason: { $gte: cutoff }, isBanned: { $exists: false } })
	.cursor()
	.eachAsync(account => {
		const { eloSeason } = account;

		if (eloSeason >= cutoff && eloSeason < cutoff + 30) {
			bronze.push(account.username);
			// account.previousSeasonAward = 'bronze';
		} else if (eloSeason >= cutoff + 30 && eloSeason < cutoff + 85) {
			silver.push(account.username);
			// account.previousSeasonAward = 'silver';
		} else if (eloSeason >= cutoff + 85) {
			gold.push({ name: account.username, elo: eloSeason });
			// account.previousSeasonAward = 'gold';
		}
	})
	.then(() => {
		console.log(bronze.length, 'bronze');
		console.log(silver.length, 'silver');
		console.log(gold.length, 'gold');
		console.log(
			gold.sort((a, b) => a.elo - b.elo),
			'gold'
		);
		mongoose.connection.close();

		// if this is ok, delete all player's old season reward, then do below:
	});

// let count = 0;

// Account.find({ eloSeason: { $gte: 1000 } })
// 	.cursor()
// 	.eachAsync(account => {
// 		account.eloSeason = 1600;
// 		account.save();
// 		count++;

// 		if (!(count % 100)) {
// 			console.log(count + ' count');
// 		}
// 	})
// 	.then(() => {
// 		console.log('done');
// mongoose.connection.close();
// 	});
