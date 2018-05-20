const Account = require('../../models/account'); // temp
const mongoose = require('mongoose');

let count = 0;

async function clearRatings() {
	try {
		mongoose.Promise = global.Promise;
		await mongoose.connect(`mongodb://localhost:15726/secret-hitler-app`);
		await Account.find({ 'gameSettings.blacklist.0': { $exists: true } })
			.cursor()
			.eachAsync(account => {
				count++;
				account.gameSettings.blacklist = [];
				account.save();

				if (!(count % 100)) {
					console.log('account cleared:' + count);
				}
			});
	} finally {
		console.log('accounts cleared');
		await mongoose.disconnect();
	}
}

clearRatings();
