const mongoose = require('mongoose');
const Account = require('../models/account');

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`);

// const bronze = [];
// const silver = [];
// const gold = [];
// const cutoff = 1720;

// Account.find({ 'gameSettings.previousSeasonAward': { $exists: true } })
// 	.cursor()
// 	.eachAsync(account => {
// 		account.gameSettings.previousSeasonAward = '';
// 		account.save();
// 	});

Account.find({ staffRole: 'contributor' })
	.cursor()
	.eachAsync(account => {
		account.staffRole = '';
		account.save();
	})
	.then(() => {
		console.log('Hello, World!');
		mongoose.connection.close();

		// if this is ok, delete all player's old season reward, then do below:
	});
