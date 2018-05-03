const fs = require('fs');
const mongoose = require('mongoose');
const Game = require('../models/game');
const Account = require('../models/account');

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:15726/secret-hitler-app`);

const games = [];

Game.find({}, { chats: 0 })
	.limit(1000)
	.lean()
	.cursor()
	.eachAsync(game => {
		const playerNames = game.winningPlayers.map(player => player.userName).concat(game.losingPlayers.map(player => player.userName));

		Account.find({ username: { $in: playerNames } }, { hashUid: 1, username: 1 }).then(accounts => {
			game.winningPlayers.map(player => {
				try {
					player.userName = accounts.find(account => account.username === player.userName).hashUid;
				} catch (e) {
					player.userName = 'NOHASHUID';
				}

				return player;
			});

			game.losingPlayers.map(player => {
				try {
					player.userName = accounts.find(account => account.username === player.userName).hashUid;
				} catch (e) {
					player.userName = 'NOHASHUID';
				}

				return player;
			});

			games.push(game);
		});

		// console.log(`processed game ${game.uid}`);
	})
	.then(() => {
		console.log('done');
		fs.writeFile('/var/www/secret-hitler/public/gamedumps/games1.json', JSON.stringify(games), () => {
			console.log('file written');
			mongoose.connection.close();
		});
		// for (let game of games) {
		// 	fs.writeFileSync(OUTPUT_DIR + '1', JSON.stringify(game));
		// }

		// child_process.execSync(`tar -zcvf test.tar.gz .`, { cwd: OUTPUT_DIR });
	})
	.catch(err => {
		console.log(err, 'err');
		mongoose.connection.close();
	});
