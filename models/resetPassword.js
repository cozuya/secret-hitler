const mongoose = require('mongoose');
const { Schema } = mongoose;
const ResetPassword = new Schema({
	username: String,
	token: String,
	expirationDate: Date
});

module.exports = mongoose.model('ResetPassword', ResetPassword);
