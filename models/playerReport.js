const mongoose = require('mongoose');
const { Schema } = mongoose;
const playerReport = new Schema({
	date: Date,
	gameUid: String,
	reportedPlayer: String,
	reason: String,
	reportingPlayer: String,
	gameType: String,
	comment: String,
	isActive: Boolean,
});

module.exports = mongoose.model('PlayerReport', playerReport);
