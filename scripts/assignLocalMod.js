const mongoose = require('mongoose');
const Account = require('../models/account');

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`);

Account.findOne({ username: 'Uther' }).then(acc => {
	acc.staffRole = 'admin';
	acc.save();
	console.log('Assigned.');
});
