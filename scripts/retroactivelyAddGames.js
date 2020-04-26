const mongoose = require('mongoose');
const Game = require('../models/game');
const Account = require('../models/account');

let count = 0;
const season = 10;

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`, { useNewUrlParser: true });

Game.find({
	// date: {
	// 	$gte: new Date('2019-04-01 00:00:00.000'),
	// 	$lte: new Date()
	// },
	season: 10,
	casualGame: false,
})
	.cursor()
	.eachAsync((game) => {
		game.winningPlayers.forEach((username) => {
			Account.findOne({ username: username.userName })
				.cursor()
				.eachAsync((user) => {
					user[`winsSeason${season}`] = user[`winsSeason${season}`] ? user[`winsSeason${season}`] + 1 : 1;
					if (game.isRainbow)
						user[`rainbowWinsSeason${season}`] = user[`rainbowWinsSeason${season}`]
							? user[`rainbowWinsSeason${season}`] + 1
							: 1;
					user.save();
				});
		});

		game.losingPlayers.forEach((username) => {
			Account.findOne({ username: username.userName })
				.cursor()
				.eachAsync((user) => {
					user[`lossesSeason${season}`] = user[`lossesSeason${season}`] ? user[`lossesSeason${season}`] + 1 : 1;
					if (game.isRainbow)
						user[`rainbowLossesSeason${season}`] = user[`rainbowLossesSeason${season}`]
							? user[`rainbowLossesSeason${season}`] + 1
							: 1;
					user.save();
				});
		});

		count++;

		if (!(count % 100)) {
			console.log(count + ' games processed.');
		}
	})
	.then(() => {
		console.log('done');
		mongoose.connection.close();
	});
