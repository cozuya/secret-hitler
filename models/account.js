const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
const { Schema } = mongoose;
const Account = new Schema({
	username: {
		type: String,
		required: true,
		unique: true
	},
	password: String,
	isLocal: Boolean,
	staffRole: String,
	isContributor: Boolean,
	hasNotDismissedSignupModal: Boolean,
	gameSettings: {
		staffDisableVisibleElo: Boolean,
		staffDisableStaffColor: Boolean,
		staffIncognito: Boolean,
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
		disableAggregations: Boolean,
		disableKillConfirmation: Boolean,
		soundStatus: String,
		unbanTime: Date,
		unTimeoutTime: Date,
		fontSize: Number,
		fontFamily: String,
		isPrivate: Boolean,
		privateToggleTime: Number,
		blacklist: Array,
		tournyWins: Array,
		hasChangedName: Boolean,
		previousSeasonAward: String,
		specialTournamentStatus: String,
		disableElo: Boolean,
		fullheight: Boolean,
		safeForWork: Boolean,
		keyboardShortcuts: String,
		gameFilters: {
			pub: Boolean,
			priv: Boolean,
			unstarted: Boolean,
			inprogress: Boolean,
			completed: Boolean,
			customgame: Boolean,
			casualgame: Boolean,
			timedMode: Boolean,
			standard: Boolean,
			rainbow: Boolean
		},
		gameNotes: {
			top: Number,
			left: Number,
			width: Number,
			height: Number
		},
		playerNotes: Array,
		ignoreIPBans: Boolean,
		truncatedSize: Number,
		claimCharacters: String,
		claimButtons: String
	},
	verification: {
		email: String
	},
	signupIP: String,
	lastConnectedIP: String,
	lastConnected: Date,
	ipHistory: Array,
	verified: Boolean,
	isBanned: Boolean,
	isTimeout: Date,
	touLastAgreed: String,
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
	winsSeason2: Number,
	lossesSeason2: Number,
	rainbowWinsSeason2: Number,
	rainbowLossesSeason2: Number,
	winsSeason3: Number,
	lossesSeason3: Number,
	rainbowWinsSeason3: Number,
	rainbowLossesSeason3: Number,
	winsSeason4: Number,
	lossesSeason4: Number,
	rainbowWinsSeason4: Number,
	rainbowLossesSeason4: Number,
	winsSeason5: Number,
	lossesSeason5: Number,
	rainbowWinsSeason5: Number,
	rainbowLossesSeason5: Number,
	winsSeason6: Number,
	lossesSeason6: Number,
	rainbowWinsSeason6: Number,
	rainbowLossesSeason6: Number,
	winsSeason7: Number,
	lossesSeason7: Number,
	rainbowWinsSeason7: Number,
	rainbowLossesSeason7: Number,
	winsSeason8: Number,
	lossesSeason8: Number,
	rainbowWinsSeason8: Number,
	rainbowLossesSeason8: Number,
	winsSeason9: Number,
	lossesSeason9: Number,
	rainbowWinsSeason9: Number,
	rainbowLossesSeason9: Number,
	winsSeason10: Number,
	lossesSeason10: Number,
	rainbowWinsSeason10: Number,
	rainbowLossesSeason10: Number,
	winsSeason11: Number,
	lossesSeason11: Number,
	rainbowWinsSeason11: Number,
	rainbowLossesSeason11: Number,
	winsSeason12: Number,
	lossesSeason12: Number,
	rainbowWinsSeason12: Number,
	rainbowLossesSeason12: Number,
	winsSeason13: Number,
	lossesSeason13: Number,
	rainbowWinsSeason13: Number,
	rainbowLossesSeason13: Number,
	winsSeason14: Number,
	lossesSeason14: Number,
	rainbowWinsSeason14: Number,
	rainbowLossesSeason14: Number,
	previousDayElo: Number,
	created: Date,
	isOnFire: Boolean,
	lastCompletedGame: Date,
	lastVersionSeen: String,
	isFixed: Boolean,
	eloSeason: Number,
	eloOverall: Number,
	hashUid: String,
	discordUsername: String,
	discordDiscriminator: String,
	discordMFA: Boolean,
	discordUID: String,
	githubUsername: String,
	githubMFA: Boolean,
	warnings: Array, // {text: String, moderator: String, time: Date, acknowledged: Boolean},
	feedbackSubmissions: Array, // { time: Date, text: String }
	primaryColor: String,
	secondaryColor: String,
	tertiaryColor: String,
	backgroundColor: String,
	textColor: String,
	badges: Array, // {id: String, text: String}
	eloPercentile: {
		seasonal: Number,
		overall: Number
	},
	maxElo: { type: Number, default: 1600 },
	previousMaxElo: Number,
	experiencePoints: {
		default: { type: Number, default: 0 },
		ranked: { type: Number, default: 0 },
		silent: { type: Number, default: 0 },
		emote: { type: Number, default: 0 },
		custom: { type: Number, default: 0 },
		private: { type: Number, default: 0 }
	},
	pastElo: [{ date: Date, value: Number }],
	isTournamentMod: Boolean
});

Account.plugin(passportLocalMongoose);

module.exports = mongoose.model('Account', Account);
