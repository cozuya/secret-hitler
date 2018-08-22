const mongoose = require('mongoose');
const Account = require('../../models/account');

if (process.argv.length === 3) {
	mongoose.Promise = global.Promise;
	mongoose.connect(`mongodb://localhost:15726/secret-hitler-app`);
	const username = process.argv[2];
	let user = Account.findOne({ username });
	user.setPassword('ChangeMe123', () => {
		user.save();
	});
	console.log(`Set ${username}'s password to \'ChangeMe123\'`);
} else if (process.argv.length > 3) {
	console.error('Error: To many arguments');
} else {
	console.error('Error: Please specify an account name');
}
