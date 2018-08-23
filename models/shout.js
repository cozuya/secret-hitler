const mongoose = require('mongoose');
const { Schema } = mongoose;
const Shout = new Schema({
	createdAt: Date,
	moderator: String,
	recipient: String,
	sent: Number,
	lastSentAt: Date,
	hideModName: Boolean,
	acknowledged: Boolean,
	acknowledgedAt: Date,
	confirm: String,
	message: String
});

module.exports = mongoose.model('Shout', Shout);
