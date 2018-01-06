const mongoose = require('mongoose'),
	{ Schema } = mongoose,
	Game = new Schema({
		uid: String,
		date: Date,
		playerCount: Number,
		winningPlayers: Array,
		losingPlayers: Array,
		winningTeam: String,
		season: Number,
		isRainbow: Boolean,
		rebalance6p: Boolean,
		rebalance7p: Boolean,
		rebalance9p: Boolean,
		rerebalance9p: Boolean,
		isTournyFirstRound: Boolean,
		isTournySecondRound: Boolean,
		chats: Array
	});

module.exports = mongoose.model('Game', Game);
