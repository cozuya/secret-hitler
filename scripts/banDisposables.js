const Account = require('../models/account');
const mongoose = require('mongoose');
const fs = require('fs');
const emails = require('../utils/disposableEmails.js');
mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`, { useNewUrlParser: true });

let count = 0;
let processed = 0;
let now;
const bannedAccounts = [];

Account.find({
	isBanned: { $ne: true },
	$and: [{ 'verification.email': { $ne: '' } }, { 'verification.email': /^((?!gmail.com).)*$/ }]
})
	.cursor()
	.eachAsync(account => {
		if (emails.indexOf(account.verification.email.split('@')[1]) !== -1) {
			account.isBanned = true;
			const accountData = { username: account.username, domain: account.verification.email.split('@')[1] };
			bannedAccounts.push(accountData);
			account.save();
			count++;
		}
		if (processed === 0) {
			now = Date.now();
		}
		processed++;
		if (processed % 100 === 0) {
			console.log(count + ' out of ' + processed + ' in ' + (Date.now() - now) / 1000 + ' seconds');
		}
	})
	.then(() => {
		console.log('Writing Data to File...\n');
		fs.writeFileSync('autoBans.json', JSON.stringify(bannedAccounts));
		console.log('FINAL: Processed', processed, 'accounts.');
		console.log('FINAL: Counted', count, 'accounts.');
		console.log('FINAL: Took', (Date.now() - now) / 1000, 'seconds.');
		mongoose.connection.close();
	});

return 0;
