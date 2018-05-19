const Summary = require('../../models/game-summary');
const Account = require('../../models/account');
const buildEnhancedGameSummary = require('../../models/game-summary/buildEnhancedGameSummary');
const mongoose = require('mongoose');

// Players will be considered more influential when:
// + Voting with the majority (+1pt per majority vote)
// + Spending more time in government (+4pt per government)
// + Using the special powers (+7pt for special power use)

liberalRank = 1600;
fascistRank = 1600;
liberalSeasonRank = 1600;
fascistSeasonRank = 1600;

ja = async votes => votes.toArray().filter(b => b).length;
nein = async votes => votes.toArray().filter(b => !b).length;
passed = async votes => await ja(votes) > await nein(votes);

softmax = arr => arr.map((value, index) => Math.exp(value) / arr.map(Math.exp).reduce((a, b) => a + b));

async function influence(game) {
	let weighting = new Array(game.playerSize).fill(0.0);
	let red = 0;
	for (let turn of game.summary.logs) {
		p = passed(turn.votes);
		if (Math.abs(await ja(turn.votes) - await nein(turn.votes)) === 1) {
			for (let v of turn.votes) {
				if (turn.votes[v] === await p) {
					// voting with the majority on a close vote
					weighting[v]++;
				}
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
		.map(v => (v + 5/game.playerSize)/6)
		.map(v => game.playerSize * v);
}

async function rate(summary) {
	let game = buildEnhancedGameSummary(summary.toObject());
	// Construct extra game info
	const liberalPlayerNames = game.players.filter(player => player.role === 'liberal').map(player => player.username).toArray();
	const fascistPlayerNames = game.players.filter(player => liberalPlayerNames.indexOf(player.username) === -1).map(player => player.username).toArray();
	const winningPlayerNames = game.winningTeam === 'liberal' ? liberalPlayerNames : fascistPlayerNames;
	const losingPlayerNames = game.winningTeam === 'liberal' ? fascistPlayerNames : liberalPlayerNames;
	const playerNames = game.players.map(player => player.username).toArray();
	const playerInfluence = await influence(game);
	// Construct some basic statistics for each team
	const b = game.winningTeam === 'liberal' ? 1 : -1;
	let weightedPlayerRank = new Array(game.playerSize);
	let weightedPlayerSeasonRank = new Array(game.playerSize);
	for (let i in playerNames) {
		const account = await Account.findOne({ username: playerNames[i] });
		weightedPlayerRank[i] = playerInfluence[i] * account.eloOverall;
		weightedPlayerSeasonRank[i] = playerInfluence[i] * account.eloSeason;
	}
	console.log(playerInfluence);
	console.log(weightedPlayerRank);
}

async function allSummaries(rate) {
	try {
		mongoose.Promise = global.Promise;
		await mongoose.connect(`mongodb://localhost:15726/secret-hitler-app`);
		const cursor = await Summary.find().cursor();
		for (let summary = await cursor.next(); summary != null; summary = await cursor.next()) {
			// Ignore casual games
			await rate(summary);
		}
	} catch (error) {
		console.error(error);
	} finally {
		await mongoose.disconnect();
	}
}

allSummaries(rate);
