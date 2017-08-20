const mongoose = require('mongoose');
const Account = require('../models/accounts');
const debug = require('debug')('game:scripts');

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/secret-hitler-app');

debug('Removing games from accounts');

let numFixed = 0;

Account.find({})
	.cursor()
	.eachAsync(account => {
		account.games = [];
		account.save();
		numFixed++;
	})
	.then(() => {
		debug(`${numFixed} fixes. Job complete.`);
		mongoose.connection.close();
	});
