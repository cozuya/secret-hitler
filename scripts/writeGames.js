const fs = require('fs');
const mongoose = require('mongoose');
const Game = require('../models/game-summary/index');
const Account = require('../models/account');

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:15726/secret-hitler-app`);

const games = [];

Game.find({}, { chats: 0 })
	//.limit(1)
	//.lean()
	.cursor()
	.eachAsync(game => {
		/*console.log(game);
		const playerNames = game.players.map(player => player.username);
		Account.find({ username: { $in: playerNames } }, { hashUid: 1, username: 1 }).then(accounts => {
			game.players.map(player => {
				try {
					player.username = accounts.find(account => account.username === player.username).hashUid;
				} catch (e) {
					player.username = "NOHASHUID";
				}
				return player;
			});
		});*/
		game.players.map(player => player.username = "");
		game.players.map(player => player._id = null);
		game.logs.map(log => log._id = null);
		games.push(game);

		console.log(`processed game ${game._id}`);
	})
	.then(() => {
		console.log('done');
		fs.writeFile('./out/games1.json', JSON.stringify(games), (err) => {
			if (err) console.log(err);
			else console.log('File written.');
			mongoose.connection.close();
		});
	})
	.catch(err => {
		console.log(err, 'err');
		mongoose.connection.close();
	});
