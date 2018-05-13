const Game = require('../models/game'); // temp
const Account = require('../models/account'); // temp
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:15726/secret-hitler-app`);

const libWinAdjust = {
	5: -19.253,
	6: 20.637,
	7: -17.282,
	8: 45.418,
	9: -70.679,
	10: -31.539
};

let gameCount = 0;

Game.findOne({})
	.limit(50000)
	.cursor()
	.eachAsync(game => {
		const winningPlayerNames = game.winningPlayers.map(player => player.userName);
		const losingPlayerNames = game.losingPlayers.map(player => player.userName);

		Account.find({ username: { $in: winningPlayerNames.concat(losingPlayerNames) } }, { eloOverall: 1, eloSeason: 1, username: 1 }).then(accounts => {
			const liberalsWon = game.winningTeam === 'liberal';

			let averageRatingWinners =
				winningPlayerNames.reduce((prev, curr) => (accounts.find(account => account.username === curr).eloOverall || 1600) + prev, 0) /
				winningPlayerNames.length;
			let averageRatingLosers =
				losingPlayerNames.reduce((prev, curr) => (accounts.find(account => account.username === curr).eloOverall || 1600) + prev, 0) / losingPlayerNames.length;

			if (liberalsWon) {
				averageRatingWinners += libWinAdjust[game.playerCount];
			} else {
				averageRatingLosers += libWinAdjust[game.playerCount];
			}

			// double p = 1.0 / (1.0 + Math.pow(10.0, (avgRatingWinners - avgRatingLosers) / 400.0));

			const k = 64;
			const p = 1 / (1 + 10 ** ((averageRatingWinners - averageRatingLosers) / 400));
			const winningPlayerAdjustment = k * p / winningPlayerNames.length;
			const losingPlayerAdjustment = -k * p / losingPlayerNames.length;

			// if (Number.isInteger(gameCount / 50)) {
			// 	console.log(winningPlayerAdjustment, 'win');
			// 	console.log(losingPlayerAdjustment, 'lose');
			// }

			accounts.forEach(account => {
				account.eloOverall = winningPlayerNames.includes(account.username)
					? (account.eloOverall || 1600) + winningPlayerAdjustment
					: (account.eloOverall || 1600) + losingPlayerAdjustment;

				account.save();
			});

			// 		double k = 64;

			// // Update player ratings
			// updateRatings(game.getWinningPlayers(), k * p / game.getWinningPlayers().size());
			// updateRatings(game.getLosingPlayers(), -k * p / game.getLosingPlayers().size());
		});
		gameCount++;
		if (Number.isInteger(gameCount / 100)) {
			console.log('processed game ' + gameCount);
		}
	});
// }
