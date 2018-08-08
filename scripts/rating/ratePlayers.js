const AllGames = require('./allGames');
const Account = require('../../models/account');
const Bias = require('../../models/bias');

function average(elements) {
	return elements.reduce((sum, value) => sum + value, 0) / elements.length;
}

function smoothing(elements, alpha) {
	return alpha * elements.reduce((sum, value, i) => sum + (value * Math.pow(1 - alpha, i)), 0);
}

function standardDeviation(elements) {
	const avg = average(elements);
	return Math.sqrt(average(elements.map(p => (p - avg) ** 2)));
}

function elo(w, l, k) {
	p = 1 / (1 + 10 ** ((w - l) / 400));
	return p * k;
}

function sigmoid(bias, offset, spread) {
	return x => bias + 1 / (1 + 10 ** ((x - offset) / spread));
}

async function rate(game) {
	// Constants
	const startingElo = 1600;
	const kBase = 3 * 6;
	const deviationWeight = sigmoid(.091, 200, 200);
	// Players
	const winningPlayerNames = game.winningPlayers.map(player => player.userName);
	const losingPlayerNames = game.losingPlayers.map(player => player.userName);
	// Accounts
	const features = { eloOverall: 1, eloOverallMax: 1, eloSeason: 1, eloSeasonMax: 1, username: 1 };
	let winners = await Account.find({ username: { $in: winningPlayerNames } }, features);
	let losers = await Account.find({ username: { $in: losingPlayerNames } }, features);
	let accounts = await Account.find({ username: { $in: [...winningPlayerNames, ...losingPlayerNames] } }, features);
	// Teams
	const averageWinnerOverall = average(winners.map(w => w.eloOverall[0]));
	const averageWinnerSeason = average(winners.map(w => w.eloSeason[0]));
	const averageLoserOverall = average(losers.map(l => l.eloOverall[0]));
	const averageLoserSeason = average(losers.map(l => l.eloSeason[0]));
	// Bias
	let r = 0;
	if (game.playerCount === 6 && game.rebalance6p) r = 1;
	if (game.playerCount === 7 && game.rebalance7p) r = 1;
	if (game.playerCount === 9 && game.rebalance9p) r = 1;
	if (game.playerCount === 9 && game.rerebalance9p) r = 2;
	if (game.playerCount === 9 && game.rebalance9p2f) r = 3;
	let bias = await Bias.findOne({ size: game.playerCount, balance: r });
	if (!bias) {
		bias = new Bias({ size: game.playerCount, balance: r });
	}
	const libsWon = game.winningTeam === 'liberal';
	const winnerBias = libsWon ? bias.liberal : bias.fascist;
	const loserBias = libsWon ? bias.fascist : bias.liberal;
	// Player Elo
	let delta = {};
	for (let account of accounts) {
		delta[account.username] = {
			changeOverall: 0,
			changeSeason: 0
		};
	}
	for (let winner of winners) {
		if (winner.wins + winner.losses < 50) continue;
		const winnerEloOverall = winner.eloOverall[0] + winnerBias + averageWinnerOverall;
		const winnerEloSeason = winner.eloSeason[0] + winnerBias + averageWinnerSeason;
		for (let loser of losers) {
			if (loser.wins + loser.losses < 50) continue;
			const loserEloOverall = loser.eloOverall[0]+ loserBias + averageLoserOverall;
			const loserEloSeason = loser.eloSeason[0] + loserBias + averageLoserSeason;
			// Overall
			const kOverall = kBase * deviationWeight(standardDeviation(accounts.map(w => w.eloOverall[0] || startingElo)));
			const rewardOverall = elo(winnerEloOverall, loserEloOverall, kOverall);
			delta[winner.username].changeOverall += rewardOverall;
			delta[loser.username].changeOverall -= rewardOverall;
			// Seasonal
			const kSeason = kBase * deviationWeight(standardDeviation(accounts.map(w => w.eloSeason[0] || startingElo)));
			const rewardSeasonal = elo(winnerEloSeason, loserEloSeason, kSeason);
			delta[winner.username].changeSeason += rewardSeasonal;
			delta[loser.username].changeSeason -= rewardSeasonal;
		}
	}
	// Setup game data
	game.elo = [];
	for (let account of accounts) {
		if (delta[account.username].changeOverall !== 0) {
			const newOverall = account.eloOverall[0] + delta[account.username].changeOverall;
			account.eloOverall = [newOverall, ...account.eloOverall].slice(0, 100);
			if (newOverall > account.eloOverallMax) account.eloOverallMax = newOverall;
			account.eloOverallDisplay = 1600 + smoothing(account.eloOverall.map(e => e - 1600), .3);
		}
		if (delta[account.username].changeSeason !== 0) {
			const newSeason = account.eloSeason[0] + delta[account.username].changeSeason;
			account.eloSeason = [newSeason, ...account.eloSeason].slice(0, 100);
			if (newSeason > account.eloSeasonMax) account.eloSeasonMax = newSeason;
			account.eloSeasonDisplay = 1600 + smoothing(account.eloSeason.map(e => e - 1600), .3);
		}
		await account.save();
		game.elo.push({
			username: account.username,
			eloOverall: account.eloOverall[0],
			changeOverall: delta[account.username].changeOverall,
			eloSeason: account.eloSeason[0],
			changeSeason: delta[account.username].changeSeason,
		});
		await game.save();
	}
	// Team Elo
	const rewardTeams = elo(winnerBias, loserBias, 6) * (libsWon ? 1 : -1);
	bias.liberal += rewardTeams;
	bias.fascist -= rewardTeams;
	bias.save();
}

AllGames(rate);
