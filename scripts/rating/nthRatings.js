const Summary = require('../../models/game-summary');
const Account = require('../../models/account');
const buildEnhancedGameSummary = require('../../models/game-summary/buildEnhancedGameSummary');
const { CURRENTSEASONNUMBER } = require('../../src/frontend-scripts/node-constants');
const mongoose = require('mongoose');

const libAdjust = {
	5: -19.253,
	6: 20.637,
	7: -17.282,
	8: 45.418,
	9: -70.679,
	10: -31.539
};

ja = async votes => votes.toArray().filter(b => b).length;
nein = async votes => votes.toArray().filter(b => !b).length;
passed = async votes => (await ja(votes)) > (await nein(votes));

softmax = arr => arr.map((value, index) => Math.exp(value) / arr.map(Math.exp).reduce((a, b) => a + b));
avg = arr => arr.reduce((p, c) => p + c, 0) / arr.length;

// This function approximates the degree to wich each player may have influenced the end game result.
// Players will be considered more influential when:
// + Casting votes that may have changed the outcome of an election.
// + Elected to governments.
// + Using the presidential powers.
async function influence(game) {
	const weighting = new Array(game.playerSize).fill(0.0);
	let red = 0;
	for (const turn of game.summary.logs) {
		p = passed(turn.votes);
		if (Math.abs((await ja(turn.votes)) - (await nein(turn.votes))) === 1) {
			for (const v of turn.votes) {
				if (turn.votes[v] === (await p)) {
					// voting with the majority on a close vote
					weighting[v]++;
				}
			}
		}
		if (Math.abs((await ja(turn.votes)) - (await nein(turn.votes))) === 0) {
			for (const v of turn.votes) {
				// even number of fascist and liberal votes: everyone gets a point
				weighting[v]++;
			}
		}
		if (await p) {
			// In government influence
			weighting[turn.presidentId]++;
			weighting[turn.chancellorId]++;
			if (red > 3 && turn.enactedPolicy._value === 'fascist') {
				// President powers influence
				weighting[turn.presidentId]++;
			}
			if (turn.enactedPolicy._value === 'fascist') {
				red += 1;
			}
		}
	}
	return softmax(weighting)
		.map(v => (v + 5 / game.playerSize) / 6) // Dampen so as to only account for 16% of ELO
		.map(v => game.playerSize * v); // Normalise
}

async function rate(summary) {
	const game = buildEnhancedGameSummary(summary.toObject());
	// Construct extra game info
	const liberalPlayerNames = game.players
		.filter(player => player.role === 'liberal')
		.map(player => player.username)
		.toArray();
	const fascistPlayerNames = game.players
		.filter(player => liberalPlayerNames.indexOf(player.username) === -1)
		.map(player => player.username)
		.toArray();
	const winningPlayerNames = game.winningTeam === 'liberal' ? liberalPlayerNames : fascistPlayerNames;
	const losingPlayerNames = game.winningTeam === 'liberal' ? fascistPlayerNames : liberalPlayerNames;
	const playerNames = game.players.map(player => player.username).toArray();
	const playerInfluence = await influence(game);
	// Construct some basic statistics for each team
	const b = game.winningTeam === 'liberal' ? 1 : 0;
	const weightedPlayerRank = new Array(game.playerSize);
	const weightedPlayerSeasonRank = new Array(game.playerSize);
	for (const i in playerNames) {
		const account = await Account.findOne({ username: playerNames[i] });
		weightedPlayerRank[i] = playerInfluence[i] * account.eloOverall;
		weightedPlayerSeasonRank[i] = playerInfluence[i] * account.eloSeason;
	}
	const averageRatingWinners = avg(weightedPlayerRank.filter((_, i) => game.isWinner(i)._value)) + b * libAdjust[game.playerSize];
	const averageRatingWinnersSeason = avg(weightedPlayerSeasonRank.filter((_, i) => game.isWinner(i)._value)) + b * libAdjust[game.playerSize];
	const averageRatingLosers = avg(weightedPlayerRank.filter((_, i) => !game.isWinner(i)._value)) + (1 - b) * libAdjust[game.playerSize];
	const averageRatingLosersSeason = avg(weightedPlayerSeasonRank.filter((_, i) => !game.isWinner(i)._value)) + (1 - b) * libAdjust[game.playerSize];

	// Elo Formula
	const k = 64;
	const winFactor = k / winningPlayerNames.length;
	const loseFactor = -k / losingPlayerNames.length;
	const p = 1 / (1 + Math.pow(10, (averageRatingWinners - averageRatingLosers) / 400));
	const pSeason = 1 / (1 + Math.pow(10, (averageRatingWinnersSeason - averageRatingLosersSeason) / 400));
	// Apply the rating changes
	for (const account of await Account.find({ username: { $in: playerNames } }, { eloOverall: 1, eloSeason: 1, username: 1 })) {
		let eloOverall, eloSeason;
		if (!account.eloOverall) {
			eloOverall = 1600;
			eloSeason = 1600;
		} else {
			eloOverall = account.eloOverall;
			eloSeason = account.eloSeason;
		}
		const influence = playerInfluence[playerNames.indexOf(account.username)];
		const win = winningPlayerNames.includes(account.username);
		if (win) {
			change = p * winFactor * influence;
			changeSeason = pSeason * winFactor * influence;
		} else {
			change = p * loseFactor * influence;
			changeSeason = pSeason * loseFactor * influence;
		}
		account.eloOverall = eloOverall + change;
		if (game.season === CURRENTSEASONNUMBER) {
			account.eloSeason = eloSeason + changeSeason;
		}
		await account.save();
	}
}

async function allSummaries(rate) {
	try {
		mongoose.Promise = global.Promise;
		await mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`);
		const cursor = await Summary.find().cursor();
		for (let summary = await cursor.next(); summary != null; summary = await cursor.next()) {
			// Ignore casual games
			if (summary.casualGame) {
				return;
			}
			await rate(summary);
		}
	} catch (error) {
		console.error(error);
	} finally {
		await mongoose.disconnect();
	}
}

allSummaries(rate);
