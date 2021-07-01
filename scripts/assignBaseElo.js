const Account = require('../models/account');
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`);

let count = 0;

Account.findOne({ eloSeason: { $ne: 1600 } })
	.cursor()
	.eachAsync(account => {
		account.eloSeason = 1600;
		account.save();
		count++;
		if (Number.isInteger(count / 100)) {
			console.log('processed account ' + count);
		}
	})
	.catch(err => {
		console.log(err, 'caught err');
	});
