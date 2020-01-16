const Account = require('../models/account');
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`, { useNewUrlParser: true });

let count = 0;

Account.findOne({
	created: { $lte: new Date(new Date() - 7 * 24 * 60 * 60 * 1000) },
	isBanned: { $ne: true },
	wins: 0,
	losses: 0
})
	.cursor()
	.eachAsync(account => {
		account.delete();
		count++;
		if (Number.isInteger(count / 100)) {
			console.log(count, 'accounts proccessed.');
		}
	})
	.then(() => {
		console.log(count + ' accounts successfully deleted.');
		mongoose.connection.close();
		return 0;
	})
	.catch(err => {
		console.log('error in pruning accounts', err);
		return 1;
	});
