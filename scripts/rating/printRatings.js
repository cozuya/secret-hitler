const Account = require('../../models/account'); // temp
const mongoose = require('mongoose');

async function clearRatings() {
	try {
		mongoose.Promise = global.Promise;
		await mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`);
		await Account.find()
			.sort('-eloSeason')
			.cursor()
			.limit(25)
			.eachAsync((account) => {
				console.log(
					`${account.username.padStart(20)}: ${account.eloSeason.toFixed(1)} (${account.eloOverall.toFixed(1)})`
				);
			});
	} finally {
		await mongoose.disconnect();
	}
}

clearRatings();
