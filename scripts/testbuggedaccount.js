const Account = require('../models/account'),
	mongoose = require('mongoose'),
	_ = require('lodash');

mongoose.Promise = global.promise;
mongoose.connect(`mongodb://localhost:${process.env.MONGOPORT}/secret-hitler-app`);

Account.findOne({ username: new RegExp(_.escapeRegExp(process.argv[2], 'i')) }, (err, account) => {
	if (err) {
		console.log(err, 'err');
	}

	if (account) {
		console.log(account, 'account');
	} else {
		console.log('no account/not bugged');
	}
}).then(() => {
	console.log('done');
	mongoose.connection.close();
});
