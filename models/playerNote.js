const mongoose = require('mongoose'),
	{ Schema } = mongoose,
	playerNote = new Schema({
		userName: String,
		userNoted: String,
		note: String
	});

module.exports = mongoose.model('PlayerNote', playerNote);
