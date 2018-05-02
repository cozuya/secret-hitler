const child_process = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const mongoose = require('mongoose');
const Game = require('../models/game');
const Account = require('../models/account');

const OUTPUT_DIR = '/var/www/secret-hitler/public/data';

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:15726/secret-hitler-app`);

const games = [];

Game.find({})
	.limit(1)
	.lean()
	.cursor()
	.eachAsync(game => {
		const playerNames = game.winningPlayers.map(player => player.userName).concat(game.losingPlayers.map(player => player.userName));
		const { winningTeam } = game;

		// game.winningPlayers = winningPlayersHash;
		// game.losingPlayers = losingPlayersHash;

		// games.push(game);
		console.log(`processed game ${game.uid}`);
	})
	.then(() => {
		const playerNames = game.winningPlayers.map(player => player.userName).concat(game.losingPlayers.map(player => player.userName));

		Account.find({ username: { $in: playerNames } }).then(accounts => {
			games.push('test');
			console.log(games, 'games');
			mongoose.connection.close();
		});
		console.log('done');
		// for (let game of games) {
		// 	fs.writeFileSync(OUTPUT_DIR + '1', JSON.stringify(game));
		// }

		// child_process.execSync(`tar -zcvf test.tar.gz .`, { cwd: OUTPUT_DIR });
	})
	.catch(err => {
		console.log(err, 'err');
		mongoose.connection.close();
	});
