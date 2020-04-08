const Account = require('../models/account');
const mongoose = require('mongoose');
const fs = require('fs');

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
	const pageSize = 250;
	let skipAmt = 0;
	const data = {};
	const dateCutoff = new Date(new Date().valueOf() - 1000 * 60 * 60 * 24 * 30);
	console.log(dateCutoff);

	const parseData = () => {
		mongoose.connection.close();
		fs.writeFile('./out/data.json', JSON.stringify(data), function (err) {
			if (err) {
				return console.log(err);
			}
			console.log('The file was saved!');
		});
		console.log('Done!');
	};
	const getMoreData = () => {
		console.log(`Block: ${skipAmt / pageSize} (${skipAmt}-${skipAmt + pageSize})`);
		Account.find(
			{ wins: { $gte: 25 }, losses: { $gte: 25 }, isBanned: { $ne: true }, eloSeason: { $ne: 1600 } },
			{ username: 1, eloOverall: 1, eloSeason: 1 }
		)
			.skip(skipAmt)
			.limit(pageSize)
			.exec((err, accounts) => {
				if (err) {
					console.log(err);
					return;
				}
				if (!accounts || accounts.length === 0) {
					parseData();
					return;
				}
				accounts.forEach((acc) => {
					if (acc.eloOverall && acc.eloSeason) {
						data[acc.username] = [acc.eloOverall, acc.eloSeason];
					}
				});
				skipAmt += pageSize;
				setTimeout(getMoreData, 100);
			});
	};

	console.log('Starting query...');
	getMoreData(0);
});

mongoose.connect('mongodb://localhost:32000/secret-hitler-app', (err, db) => {
	if (err) console.error(err);
	else console.log('Connect ok!');
});
