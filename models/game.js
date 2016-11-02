const mongoose = require('mongoose'),
	{Schema} = mongoose,
	Game = new Schema({
		uid: String,
		date: Date,
		playerCount: Number,
		winningPlayers: Array,
		losingPlayers: Array,
		chats: Array,
		winningTeam: String
	});

module.exports = mongoose.model('Game', Game);