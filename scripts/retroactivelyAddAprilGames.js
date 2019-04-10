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
	}
})
	.cursor()
	.eachAsync(game => {
		if (!game.casualGame) {
			let winnerUsernames = [],
				loserUsernames = [];
			game.winningPlayers.forEach(player => winnerUsernames.push(player.userName));
			game.losingPlayers.forEach(player => loserUsernames.push(player.userName));

			winnerUsernames.forEach(username => {
				Account.findOne({ username: username })
					.cursor()
					.eachAsync(user => {
						console.log(username, 'win', user.winsSeason6, user.winsSeason6 ? user.winsSeason6 + 1 : 1);
						user.winsSeason6 = user.winsSeason6 ? user.winsSeason6 + 1 : 1;
						user.save();
					});
			});

			loserUsernames.forEach(username => {
				Account.findOne({ username: username })
					.cursor()
					.eachAsync(user => {
						console.log(username, 'loss', user.lossesSeason6, user.lossesSeason6 ? user.lossesSeason6 + 1 : 1);
						user.lossesSeason6 = user.lossesSeason6 ? user.lossesSeason6 + 1 : 1;
						user.save();
					});
			});
			count++;
			if (count % 100 === 0) {
				console.log(count + ' games processed.');
			}
		}
	});
