'use strict';

let mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	Game = new Schema({
		uid: String,
		time: String,
		date: Date,
		roles: Array,
		winningPlayers: Array,
		losingPlayers: Array,
		reports: Array,
		chats: Array,
		kobk: Boolean
	});

module.exports = mongoose.model('Game', Game);