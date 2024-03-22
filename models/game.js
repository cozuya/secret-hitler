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
	hiddenInfoChat: Array,
	guesses: {
		type: Map,
		of: String
	},
	merlinGuesses: {
		type: Map,
		of: Number
	},
	timedMode: Number, // timer length
	blindMode: Boolean,
	monarchistSH: Boolean,
	avalonSH: {
		withPercival: Boolean
	},
	noTopdecking: Number,
	completed: Boolean
});

module.exports = mongoose.model('Game', Game);
