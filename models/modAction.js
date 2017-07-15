const mongoose = require('mongoose'),
	{Schema} = mongoose,
	ModAction = new Schema({
		date: Date,
		modUserName: String,
		ip: String,
		userActedOn: String,
		modNotes: String,
		actionTaken: String
	});

module.exports = mongoose.model('ModAction', ModAction);