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
			isRainbow: Boolean,
			newReport: Boolean,
			customCardback: String,
			customCardbackSaveTime: String,
			customCardbackUid: String,
			enableTimestamps: Boolean,
			enableRightSidebarInGame: Boolean,
			disablePlayerColorsInChat: Boolean,
			disablePlayerCardbacks: Boolean,
			disableHelpMessages: Boolean,
			disableHelpIcons: Boolean,
			disableConfetti: Boolean,
			disableCrowns: Boolean,
			disableSeasonal: Boolean,
			unbanTime: Date,
			unTimeoutTime: Date,
			fontSize: Number,
			fontFamily: String,
			isPrivate: Boolean,
			privateToggleTime: Number,
			blacklist: Array,
			tournyWins: Array,
			hasChangedName: Boolean,
			gameNotes: {
				top: Number,
				left: Number,
				width: Number,
				height: Number
			},
			playerNotes: Array
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
		isTimeout: Date,
		bio: String,
		games: Array,
		wins: Number,
		losses: Number,
		rainbowWins: Number,
		rainbowLosses: Number,
		winsSeason1: Number,
		lossesSeason1: Number,
		rainbowWinsSeason1: Number,
		rainbowLossesSeason1: Number,
		created: Date,
		lastVersionSeen: String,
		isFixed: Boolean
	});

Account.plugin(passportLocalMongoose);

module.exports = mongoose.model('Account', Account);
