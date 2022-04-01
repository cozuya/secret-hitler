const Account = require('../../models/account'); // temp
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`);

let count = 0;

Account.find({ 'gameSettings.blacklist.0': { $exists: true } })
	.lean()
	.eachAsync(account => {
		for (let i = 0; i < account.gameSettings.blacklist.length; i++) {
			if (typeof account.gameSettings.blacklist[i] == 'string') {
				account.gameSettings.blacklist[i] = { userName: account.gameSettings.blacklist[i] };
			}
		}
		account.save();
		count++;
		if (count % 100 == 0) {
			console.log(count + ' processed');
		}
	})
	.then(() => {
		console.log('done ' + count);
	});
