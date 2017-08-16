const mongoose = require('mongoose'),
	{ Schema } = mongoose,
	playerReport = new Schema({
		date: Date,
		gameUid: String,
		userReported: String,
		reportingUser: String,
		comment: String,
		modNote: String,
		dismissed: Boolean
	});

module.exports = mongoose.model('PlayerReport', playerReport);
