const Account = require('../../models/account'); // temp
const mongoose = require('mongoose');

async function clearRatings() {
	try {
		mongoose.Promise = global.Promise;
		await mongoose.connect(`mongodb://localhost:15726/secret-hitler-app`);
		await Account.find()
			.cursor()
			.eachAsync(account => {
				account.eloSeason = 1600;
				account.eloOverall = 1600;
				account.save();
			});
	} finally {
		await mongoose.disconnect();
	}
}

clearRatings();
