const Game = require('../models/game'); // temp
const Account = require('../models/account'); // temp

// const rateGame = () => {
Game.findOne({ uid: 'MelodicAfraidSwallow' }).then(g => {
	const liberalsWon = game.winningTeam === 'liberal';

	async function getAverageElos(accounts) {
		await Account.find({ username: { $in: accounts } }).then(acc => {
			console.log(acc, 'acc');
		});
	}

	const liberalsAverageElo = getAverageElos(liberalsWon ? game.winningPlayers : game.losingPlayers);
	console.log(liberalsAverageElo, 'libelo');
});
// }
