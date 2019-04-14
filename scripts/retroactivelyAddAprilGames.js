const mongoose = require('mongoose');
const Game = require('../models/game');
const Account = require('../models/account');

let count = 0;

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`);

Game.find({
	date: {
		$gte: new Date('2019-04-01 00:00:00.000'),
		$lte: new Date('2019-04-08 00:00:00.000')
	},
	casualGame: false
})
	.cursor()
	.eachAsync(game => {
		game.winningPlayers.forEach(username => {
			Account.findOne({ username: username.userName })
				.cursor()
				.eachAsync(user => {
					user.winsSeason6 = user.winsSeason6 ? user.winsSeason6 + 1 : 1;
					user.save();
				});
		});

		game.losingPlayers.forEach(username => {
			Account.findOne({ username: username.userName })
				.cursor()
				.eachAsync(user => {
					user.lossesSeason6 = user.lossesSeason6 ? user.lossesSeason6 + 1 : 1;
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
