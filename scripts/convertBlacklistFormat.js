const Account = require('../models/account');
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`);

let count = 0;

Account.find({ 'gameSettings.blacklist.0': { $exists: true } })
	.cursor()
	.eachAsync(account => {
		account.gameSettings.blacklist = account.gameSettings.blacklist.map(userName => ({ userName }));
		account.save();

		count++;
		if (count % 100 == 0) {
			console.log(count + ' processed');
		}
	})
	.then(() => {
		console.log('done ' + count);
	});
