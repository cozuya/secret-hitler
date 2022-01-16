const mongoose = require('mongoose');
const { Schema } = mongoose;
const BlanketBanIP = new Schema({
	bb: String,
	account: String,
	ip: String
});

module.exports = mongoose.model('BlanketBanIP', BlanketBanIP);
