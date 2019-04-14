const mongoose = require('mongoose');
const { Schema } = mongoose;
const Eighteightcounter = new Schema({
	username: String,
	date: Date
});

module.exports = mongoose.model('Eighteightcounter', Eighteightcounter);
