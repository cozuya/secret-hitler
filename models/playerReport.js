const mongoose = require('mongoose'),
	{ Schema } = mongoose,
	playerReport = new Schema({
		date: Date,
		gameUid: String,
		userReported: String,
		type: String,
		reportingUser: String,
		comment: String
	});

module.exports = mongoose.model('PlayerReport', playerReport);
