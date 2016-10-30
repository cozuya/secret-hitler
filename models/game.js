const mongoose = require('mongoose'),
	{Schema} = mongoose,
	Game = new Schema({
		uid: String,
		date: Date,
		playerNumber: Number,
		winningPlayers: Array,
		losingPlayers: Array,
		reports: Array,
		chats: Array
	});

module.exports = mongoose.model('Game', Game);