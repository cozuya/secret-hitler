const mongoose = require('mongoose'),
	{ Schema } = mongoose,
	playerNote = new Schema({
		userName: String,
		notes: Array
	});

module.exports = mongoose.model('PlayerNote', playerNote);
