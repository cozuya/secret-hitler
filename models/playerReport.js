const mongoose = require('mongoose'),
	{ Schema } = mongoose,
	playerReport = new Schema({
		date: Date,
		gameUid: String,
		reportedPlayer: String,
		reason: String,
		reportingPlayer: String,
		comment: String,
		isActive: Boolean
	});

module.exports = mongoose.model('PlayerReport', playerReport);
