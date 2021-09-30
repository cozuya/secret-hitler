const Account = require('../../models/account'); // temp
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`);

let count = 0;

Account.find()
	.lean()
	.eachAsync(account => {
		for (let i = 0; i < account.gameSettings.blacklist.length; i++) {
			account.gameSettings.blacklist[i] = { userName: account.gameSettings.blacklist[i] };
		}
		account.save();
		count++;
	})
	.then(() => {
		console.log('done ' + count);
	});
