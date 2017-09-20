const mongoose = require('mongoose'),
	{ Schema } = mongoose,
	BannedIP = new Schema({
		bannedDate: Date,
		type: String,
		ip: String
	});

module.exports = mongoose.model('BannedIP', BannedIP);
