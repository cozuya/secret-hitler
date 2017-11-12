const mongoose = require('mongoose'),
	{ Schema } = mongoose,
	Game = new Schema({
		uid: String,
		date: Date,
		playerCount: Number,
		winningPlayers: Array,
		losingPlayers: Array,
		winningTeam: String,
		isRainbow: Boolean,
		rebalance69p: Boolean,
		chats: Array
	});

module.exports = mongoose.model('Game', Game);
