const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const { Schema } = mongoose;

const GameSettings = new Schema({
	playerPronouns: String,
	staff: {
		disableVisibleElo: Boolean,
		disableVisibleXP: Boolean,
		disableStaffColor: Boolean,
		incognito: Boolean
	},
	isRainbow: Boolean,
	newReport: Boolean,
	hasUnseenBadge: Boolean,
	customCardback: {
		fileExtension: String, // always 'png'
		saveTime: String,
		id: String
	},
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
	notifyForNewLobby: Boolean,
	gameFilters: {
		public: Boolean,
		private: Boolean,
		unstarted: Boolean,
		inProgress: Boolean,
		completed: Boolean,
		custom: Boolean,
		casual: Boolean,
		timedMode: Boolean,
		standard: Boolean,
		rainbow: Boolean
	},
	blacklist: Array,
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
});

const Stats = new Schema({
	xp: { type: Number, default: 0 },
	elo: { type: Number, default: 1600 },
	wins: { type: Number, default: 0 },
	losses: { type: Number, default: 0 },
	rainbowWins: { type: Number, default: 0 },
	rainbowLosses: { type: Number, default: 0 }
});

const SeasonStats = new Schema({
	type: Map,
	of: Stats,
	default: {}
});

const Account = new Schema({
	username: { type: String, required: true, unique: true },
	password: String,
	isLocal: Boolean,
	staffRole: String,
	isContributor: Boolean,
	dismissedSignupModal: Boolean,
	gameSettings: GameSettings,
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
	overall: Stats,
	seasons: SeasonStats,
	previousDayElo: Number,
	previousDayXP: Number,
	created: Date,
	isOnFire: Boolean,
	lastCompletedGame: Date,
	lastVersionSeen: String,
	isFixed: Boolean,
	hashUid: String,
	discord: {
		username: String,
		discriminator: String,
		mfa: Boolean,
		uid: String
	},
	github: {
		username: String,
		mfa: Boolean
	},
	warnings: Array, // { text: String, moderator: String, time: Date, acknowledged: Boolean },
	feedbackSubmissions: Array, // { time: Date, text: String }
	colors: {
		primary: String,
		secondary: String,
		tertiary: String,
		background: String,
		text: String
	},
	eloPercentile: {
		seasonal: Number,
		overall: Number
	},
	isRainbowSeason: Boolean,
	isRainbowOverall: Boolean,
	dateRainbowOverall: Date,
	badges: [{ id: String, text: String, title: String, dateAwarded: Date }],
	maxElo: { type: Number, default: 1600 },
	pastElo: [{ date: Date, value: Number }],
	isTournamentMod: Boolean
});

Account.plugin(passportLocalMongoose);

module.exports = mongoose.model('Account', Account);
