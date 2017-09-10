const mongoose = require('mongoose'),
	passportLocalMongoose = require('passport-local-mongoose'),
	{ Schema } = mongoose,
	Account = new Schema({
		username: {
			type: String,
			required: true,
			unique: true
		},
		password: String,
		gameSettings: {
			newReport: Boolean,
			customCardback: String,
			customCardbackSaveTime: Date,
			customCardbackUid: String,
			customWidth: String,
			enableTimestamps: Boolean,
			enableRightSidebarInGame: Boolean,
			disablePlayerColorsInChat: Boolean,
			disablePlayerCardbacks: Boolean,
			unbanTime: Date,
			unTimeoutTime: Date,
			fontSize: Number
		},
		verification: {
			email: String,
			verificationToken: String,
			verificationTokenExpiration: Date,
			passwordResetToken: String,
			passwordResetTokenExpiration: Date
		},
		signupIP: String,
		lastConnectedIP: String,
		resetPassword: {
			resetToken: String,
			resetTokenExpiration: Date
		},
		verified: Boolean,
		isBanned: Boolean,
		games: Array,
		wins: Number,
		losses: Number,
		rainbowWins: Number,
		rainbowLosses: Number,
		created: Date,
		lastVersionSeen: String,
		isFixed: Boolean
	});

Account.plugin(passportLocalMongoose);

module.exports = mongoose.model('Account', Account);
