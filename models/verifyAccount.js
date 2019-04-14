const mongoose = require('mongoose');
const { Schema } = mongoose;
const VerifyAccount = new Schema({
	username: String,
	token: String,
	expirationDate: Date
});

module.exports = mongoose.model('VerifyAccount', VerifyAccount);
