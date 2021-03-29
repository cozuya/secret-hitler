const run = async () => {
	const mongoose = require('mongoose');
	const Account = require('../models/account');
	const moment = require('moment');

	mongoose.Promise = global.Promise;
	mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`, { useUnifiedTopology: true, useNewUrlParser: true });

	// Process Birthday Accounts
	let birthdayAccounts = await Account.find(
		{
			$and: [
				{
					created: {
						$lte: moment()
							.utc()
							.subtract(1, 'years')
							.toDate()
					}
				},
				{
					created: {
						$gt: moment()
							.utc()
							.subtract(2, 'years')
							.toDate()
					}
				}
			],
			'badges.id': { $ne: 'birthday1' }
		},
		{ badges: 1, username: 1, created: 1 }
	);

	birthdayAccounts.forEach(account => {
		account.badges.push({
			id: 'birthday1',
			text: 'This account is more than 1 year old.'
		});
	});
	for (let i = 0; i < birthdayAccounts.length; i++) await birthdayAccounts[i].save();

	for (let y = 2; y <= new Date().getFullYear() - 2017; y++) {
		birthdayAccounts = await Account.find(
			{
				$and: [
					{
						created: {
							$lte: moment()
								.utc()
								.subtract(y, 'years')
								.toDate()
						}
					},
					{
						created: {
							$gt: moment()
								.utc()
								.subtract(y + 1, 'years')
								.toDate()
						}
					}
				],
				'badges.id': { $ne: `birthday${y}` }
			},
			{ badges: 1, username: 1, created: 1 }
		);

		birthdayAccounts.forEach(account => {
			account.badges = account.badges.filter(badge => badge.id != `birthday${y - 1}`);
			account.badges.push({
				id: `birthday${y}`,
				text: `This account is more than ${y} years old.`
			});
		});
		for (i = 0; i < birthdayAccounts.length; i++) await birthdayAccounts[i].save();
	}

	mongoose.connection.close();
};

run();
