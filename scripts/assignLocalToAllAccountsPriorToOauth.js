const Account = require('../models/account'); // temp
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`);

let count = 0;

Account.findOne({})
	.cursor()
	.eachAsync((account) => {
		account.isLocal = true;
		account.save();
		count++;
		if (Number.isInteger(count / 1000)) {
			console.log('processed account ' + count);
		}
	})
	.then(() => {
		console.log('done');
		monogoose.connection.close();
	})
	.catch((err) => {
		console.log(err, 'caught err');
	});
