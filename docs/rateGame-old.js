function resolveAfter2Seconds(x) {
	return new Promise(resolve => {
		setTimeout(() => {
			resolve(x);
		}, 2000);
	});
}

async function add1(x) {
	const a = await resolveAfter2Seconds(20);
	const b = await resolveAfter2Seconds(30);
	return x + a + b;
}

add1(10).then(v => {
	console.log(v); // prints 60 after 4 seconds.
});

const Game = require('../models/game'); // temp
const Account = require('../models/account'); // temp
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`);

// const rateGame = () => {
Game.findOne({ uid: 'MelodicAfraidSwallow' }).then(game => {
	console.log('found a game');
	const liberalsWon = game.winningTeam === 'liberal';

	// async function getAverageElos(accounts) {
	// 	const accountElos = await Account.find({ username: { $in: accounts } }).then(acc => {
	// 		const elos = acc.map(a => a.eloOverall || 1600);
	// 		console.log(elos, 'elos');
	// 		const avg = elos.reduce((prev, curr) => prev + curr, 0) / elos.length;
	// 		console.log(avg, 'avg');
	// 		return avg;
	// 	});

	// 	console.log(accountElos, 'acelos');

	// 	return accountElos;
	// }

	async function getAverageElos(accounts) {
		// const accelo = await Account.find({ username: { $in: accounts } }).then(acc => {
		// 	const elos = acc.map(a => a.eloOverall || 1600);
		// 	console.log(elos, 'elos');
		// 	const avg = elos.reduce((prev, curr) => prev + curr, 0) / elos.length;
		// 	console.log(avg, 'avg');
		// 	return avg;
		// });

		// console.log(accelo, 'accelo');

		// return Promise.resolve(accelo);

		return Account.find({ username: { $in: accounts } });

		// console.log(accountElos, 'acelos');

		// return accountElos;
	}

	const liberalsAverageElo = getAverageElos(
		liberalsWon ? game.winningPlayers.map(player => player.userName) : game.losingPlayers.map(player => player.userName)
	).then(acc => {
		const elos = acc.map(a => a.eloOverall || 1600);
		console.log(elos, 'elos');
		const avg = elos.reduce((prev, curr) => prev + curr, 0) / elos.length;
		console.log(avg, 'avg');
		return avg;
	});

	console.log(liberalsAverageElo, 'libelo');
	console.log(liberalsAverageElo / 2, 'div');
});
// }
