const mongoose = require('mongoose');
const Game = require('../models/game');
const debug = require('debug')('game:scripts');

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/secret-hitler-app');

debug('Removing chats from saved games');

let numFixed = 0;

Game.find({ chats: { $gt: 0 } })
	.cursor()
	.eachAsync(game => {
		delete game.chats;
		game.save();
		numFixed++;
	})
	.then(() => {
		debug(`Chats removed for ${numFixed} games. Job complete.`);
		mongoose.connection.close();
	});
