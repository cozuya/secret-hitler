const mongoose = require('mongoose');
const { Schema } = mongoose;
const Game = new Schema({
	uid: String,
	name: String,
	flag: String,
	date: Date,
	playerChats: String, // silent vs emote vs regular
	playerCount: Number,
	winningPlayers: Array,
	losingPlayers: Array,
	winningTeam: String,
	season: Number,
	isRainbow: Boolean,
	eloMinimum: Number,
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
	unlistedGame: Boolean,
	isVerifiedOnly: Boolean,
	chats: Array,
	timedMode: Number, // timer length
	blindMode: Boolean,
	completed: Boolean
});

module.exports = mongoose.model('Game', Game);
