const mongoose = require('mongoose');
const { Schema } = mongoose;
const Game = new Schema({
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
	rebalance9p2f: Boolean,
	isTournyFirstRound: Boolean,
	isTournySecondRound: Boolean,
	casualGame: Boolean,
	practiceGame: Boolean,
	customGame: Boolean,
	isVerifiedOnly: Boolean,
	chats: Array
});

module.exports = mongoose.model('Game', Game);
