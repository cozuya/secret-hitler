const Game = require('../../models/game'); // temp
const Account = require('../../models/account'); // temp
const mongoose = require('mongoose');
const { CURRENTSEASONNUMBER } = require('../../src/frontend-scripts/constants');

const winAdjust = {
	5: -19.253,
	6: 20.637,
	7: -17.282,
	8: 45.418,
	9: -70.679,
	10: -31.539
};

function avg(accounts, players, acsessor, fallback) {
	return (
		players.reduce(
			(prev, curr) =>
				acsessor(accounts.find(account => account.username === curr)) ? acsessor(accounts.find(account => account.username === curr)) + prev : fallback,
			0
		) / players.length
	);
}

async function cozRatings() {
	try {
		mongoose.Promise = global.Promise;
		await mongoose.connect(`mongodb://localhost:15726/secret-hitler-app`);
		await Game.find({}, { chats: 0 })
			.cursor()
			.eachAsync(async game => {
				// Get the players
				const winningPlayerNames = game.winningPlayers.map(player => player.userName);
				const losingPlayerNames = game.losingPlayers.map(player => player.userName);
				const playerNames = winningPlayerNames.concat(losingPlayerNames);
				// Then look up account information
				let accounts = await Account.find({ username: { $in: playerNames } }, { eloOverall: 1, eloSeason: 1, username: 1 });
				// Construct some basic statistics for each team
				const b = (game.winningTeam === 'liberal') ? 1 : -1;
				const averageRatingWinners = avg(accounts, winningPlayerNames, a => a.eloOverall, 1600) + b * winAdjust[game.playerCount];
				const averageRatingLosers = avg(accounts, losingPlayerNames, a => a.eloOverall, 1600) - b * winAdjust[game.playerCount];
				const averageRatingWinnersSeason = avg(accounts, winningPlayerNames, a => a.eloSeason, 1600) + b * winAdjust[game.playerCount];
				const averageRatingLosersSeason = avg(accounts, losingPlayerNames, a => a.eloSeason, 1600) - b * winAdjust[game.playerCount];
				// Elo Formula
				const k = 64;
				const p = 1 / (1 + Math.pow(10, (averageRatingWinners - averageRatingLosers) / 400));
				const pSeason = 1 / (1 + Math.pow(10, (averageRatingWinnersSeason - averageRatingLosersSeason) / 400));
				// Calculate ratings deltas
				const winningPlayerAdjustment = k * p / winningPlayerNames.length;
				const losingPlayerAdjustment = -k * p / losingPlayerNames.length;
				const winningPlayerAdjustmentSeason = k * pSeason / winningPlayerNames.length;
				const losingPlayerAdjustmentSeason = -k * pSeason / losingPlayerNames.length;
				// Apply the rating chaanges
				for (let account of accounts) {
					let eloOverall;
					let eloSeason;

					if (!account.eloOverall) {
						eloOverall = 1600;
						eloSeason = 1600;
					} else {
						eloOverall = account.eloOverall;
						eloSeason = account.eloSeason;
					}

					account.eloOverall = winningPlayerNames.includes(account.username) ? eloOverall + winningPlayerAdjustment : eloOverall + losingPlayerAdjustment;
					if (game.season === CURRENTSEASONNUMBER) {
						account.eloSeason = winningPlayerNames.includes(account.username) ? eloSeason + winningPlayerAdjustmentSeason : eloSeason + losingPlayerAdjustmentSeason;
					}

					account.save();
				}
			});
	} finally {
		await mongoose.disconnect();
	}
}

cozRatings();