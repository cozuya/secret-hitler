'use strict';

let mongoose = require('mongoose'),
	passportLocalMongoose = require('passport-local-mongoose'),
	{Schema} = mongoose,
	Account = new Schema({
		username: {
			type: String,
			required: true,
			unique: true
		},
		password: String,
		gameSettings: {
			disablePopups: Boolean,
			enableTimestamps: Boolean,
			enableRightSidebarInGame: Boolean,
			enableLightTheme: Boolean
		},
		verification: {
			email: String,
			verificationToken: String,
			verificationTokenExpiration: Date,
			passwordResetToken: String,
			passwordResetTokenExpiration: Date
		},
		resetPassword: {
			resetToken: String,
			resetTokenExpiration: Date
		},
		verified: Boolean,
		games: Array,
		wins: Number,
		losses: Number,
		created: Date
	});

Account.plugin(passportLocalMongoose);

module.exports = mongoose.model('Account', Account);