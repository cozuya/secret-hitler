/* eslint-disable */
const fs = require('fs');
const mongoose = require('mongoose');
const Game = require('../models/game-summary/index');
const Account = require('../models/account');

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`);

String.prototype.hashCode = function() {
	var hash = 0,
		i,
		chr;
	if (this.length === 0) return hash;
	for (i = 0; i < this.length; i++) {
		chr = this.charCodeAt(i);
		hash = (hash << 5) - hash + chr;
		hash |= 0; // Convert to 32bit integer
	}
	return hash;
};

const games = [];
const nameHashes = [];

function genHash() {
	return `${Math.random()
		.toString(36)
		.substring(2)}${Math.random()
		.toString(36)
		.substring(2)}`;
}

function getHash(name) {
	if (nameHashes[name]) return nameHashes[name];
	nameHashes[name] = genHash();
	return nameHashes[name];
}

Game.find({}, { chats: 0 })
	//.limit(1)
	//.lean()
	.cursor()
	.eachAsync(game => {
		game.players.map(player => (player.username = getHash(player.username)));
		game.players.map(player => (player.icon = null));
		game.players.map(player => (player._id = null));
		game.logs.map(log => (log._id = null));

		games.push(game);

		console.log(`processed game ${game._id}`);
	})
	.then(() => {
		console.log('done');
		fs.writeFile(
			'./out/fullgamedump.json',
			JSON.stringify(games, (key, value) => {
				if (value !== null) return value;
			}),
			err => {
				if (err) console.log(err);
				else console.log('File written.');
				mongoose.connection.close();
			}
		);
	})
	.catch(err => {
		console.log(err, 'err');
		mongoose.connection.close();
	});
