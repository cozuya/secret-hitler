const Game = require('../models/game'); // temp
const Account = require('../models/account'); // temp
const mongoose = require('mongoose');
const { CURRENTSEASONNUMBER } = require('../src/frontend-scripts/constants');

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`);

const libWinAdjust = {
	5: -19.253,
	6: 20.637,
	7: -17.282,
	8: 45.418,
	9: -70.679,
	10: -31.539
};

let gameCount = 0;

Game.findOne({}, { chats: 0 })
	.skip(130000)
	.cursor()
	.eachAsync(game => {
		const winningPlayerNames = game.winningPlayers.map(player => player.userName);
		const losingPlayerNames = game.losingPlayers.map(player => player.userName);

		Account.find({ username: { $in: winningPlayerNames.concat(losingPlayerNames) } }, { eloOverall: 1, eloSeason: 1, username: 1 })
			.then(accounts => {
				let averageRatingWinners =
					winningPlayerNames.reduce(
						(prev, curr) =>
							accounts.find(account => account.username === curr) ? accounts.find(account => account.username === curr).eloOverall + prev : 1600,
						0
					) / winningPlayerNames.length;
				let averageRatingWinnersSeason =
					winningPlayerNames.reduce(
						(prev, curr) => (accounts.find(account => account.username === curr) ? accounts.find(account => account.username === curr).eloSeason + prev : 1600),
						0
					) / winningPlayerNames.length;
				let averageRatingLosers =
					losingPlayerNames.reduce(
						(prev, curr) =>
							accounts.find(account => account.username === curr) ? accounts.find(account => account.username === curr).eloOverall + prev : 1600,
						0
					) / losingPlayerNames.length;
				let averageRatingLosersSeason =
					losingPlayerNames.reduce(
						(prev, curr) => (accounts.find(account => account.username === curr) ? accounts.find(account => account.username === curr).eloSeason + prev : 1600),
						0
					) / losingPlayerNames.length;

				if (game.winningTeam === 'liberal') {
					averageRatingWinners += libWinAdjust[game.playerCount];
					averageRatingWinnersSeason += libWinAdjust[game.playerCount];
				} else {
					averageRatingLosers += libWinAdjust[game.playerCount];
					averageRatingLosersSeason += libWinAdjust[game.playerCount];
				}

				// double p = 1.0 / (1.0 + Math.pow(10.0, (avgRatingWinners - avgRatingLosers) / 400.0));

				const k = 10;
				const p = 1 / (1 + Math.pow(10, (averageRatingWinners - averageRatingLosers) / 400));
				const pSeason = 1 / (1 + Math.pow(10, (averageRatingWinnersSeason - averageRatingLosersSeason) / 400));

				const winningPlayerAdjustment = (k * p) / winningPlayerNames.length;
				const losingPlayerAdjustment = (-k * p) / losingPlayerNames.length;
				const winningPlayerAdjustmentSeason = (k * pSeason) / winningPlayerNames.length;
				const losingPlayerAdjustmentSeason = (-k * pSeason) / losingPlayerNames.length;

				accounts.forEach(account => {
					account.eloOverall = winningPlayerNames.includes(account.username)
						? (account.eloOverall || 1600) + winningPlayerAdjustment
						: (account.eloOverall || 1600) + losingPlayerAdjustment;

					if (game.season === CURRENTSEASONNUMBER) {
						account.eloSeason = winningPlayerNames.includes(account.username)
							? (account.eloSeason || 1600) + winningPlayerAdjustmentSeason
							: (account.eloSeason || 1600) + losingPlayerAdjustmentSeason;
					}

					account.save();
				});
			})
			.catch(err => {
				console.log(err, 'caught err');
			});
		gameCount++;
		if (Number.isInteger(gameCount / 100)) {
			console.log('processed game ' + gameCount);
		}
	});
