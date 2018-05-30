const Account = require('../../models/account'); // temp
const mongoose = require('mongoose');

async function clearRatings() {
	try {
		mongoose.Promise = global.Promise;
		await mongoose.connect(`mongodb://localhost:15726/secret-hitler-app`);
		await Account.find()
			.cursor()
			.eachAsync(account => {
				console.log(`${account.username.padStart(20)}: ${(account.eloOverallDisplay || 0.0).toFixed(1)} | ${account.eloOverall.map(e => e.toFixed(1))}`);
			});
	} finally {
		await mongoose.disconnect();
	}
}

clearRatings();
