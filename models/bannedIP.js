const mongoose = require('mongoose');
const { Schema } = mongoose;
const BannedIP = new Schema({
	bannedDate: Date,
	type: String,
	ip: String,
	permanent: Boolean
});

module.exports = mongoose.model('BannedIP', BannedIP);
