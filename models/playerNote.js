const mongoose = require('mongoose');
const { Schema } = mongoose;
const playerNote = new Schema({
	userName: String,
	notedUser: String,
	note: String,
});

module.exports = mongoose.model('PlayerNote', playerNote);
