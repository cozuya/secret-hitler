const mongoose = require('mongoose');

const Account = require('../models/account');
const passportLocalMongoose = require('passport-local-mongoose');

const { Schema } = mongoose;

const OldAccountSchema = new Schema(
	{
		version: Number,
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
			playerPronouns: String,
			staffDisableVisibleElo: Boolean,
			staffDisableVisibleXP: Boolean,
			staffDisableStaffColor: Boolean,
			staffIncognito: Boolean,
			isRainbow: Boolean,
			newReport: Boolean,
			hasUnseenBadge: Boolean,
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
			notifyForNewLobby: Boolean,
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
		winsSeason15: Number,
		lossesSeason15: Number,
		rainbowWinsSeason15: Number,
		rainbowLossesSeason15: Number,
		winsSeason16: Number,
		lossesSeason16: Number,
		rainbowWinsSeason16: Number,
		rainbowLossesSeason16: Number,
		winsSeason17: Number,
		lossesSeason17: Number,
		rainbowWinsSeason17: Number,
		rainbowLossesSeason17: Number,
		winsSeason18: Number,
		lossesSeason18: Number,
		rainbowWinsSeason18: Number,
		rainbowLossesSeason18: Number,
		winsSeason19: Number,
		lossesSeason19: Number,
		rainbowWinsSeason19: Number,
		rainbowLossesSeason19: Number,
		winsSeason20: Number,
		lossesSeason20: Number,
		rainbowWinsSeason20: Number,
		rainbowLossesSeason20: Number,
		winsSeason21: Number,
		lossesSeason21: Number,
		rainbowWinsSeason21: Number,
		rainbowLossesSeason21: Number,
		winsSeason22: Number,
		lossesSeason22: Number,
		rainbowWinsSeason22: Number,
		rainbowLossesSeason22: Number,
		previousDayElo: Number,
		previousDayXP: Number,
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
		eloPercentile: {
			seasonal: Number,
			overall: Number
		},
		isRainbowSeason: Boolean,
		isRainbowOverall: Boolean,
		xpOverall: { type: Number, default: 0 },
		xpSeason: { type: Number, default: 0 },
		dateRainbowOverall: Date,
		badges: [{ id: String, text: String, title: String, dateAwarded: Date }],
		maxElo: { type: Number, default: 1600 },
		pastElo: [{ date: Date, value: Number }],
		isTournamentMod: Boolean
	},
	{ collection: 'accounts' }
).set('validateBeforeSave', false);

OldAccountSchema.plugin(passportLocalMongoose);

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`);

const OldAccount = mongoose.model('OldAccount', OldAccountSchema);

OldAccount.find()
	.cursor()
	.eachAsync(acc => {
		if (acc.version >= 2) {
			return;
		}

		const newAcc = acc.toObject();

		newAcc.dismissedSignupModal = !newAcc.hasNotDismissedSignupModal;

		newAcc.gameSettings = newAcc.gameSettings ? newAcc.gameSettings : {};

		const removeUnused = obj =>
			Object.keys(obj)
				.map(key => obj[key])
				.every(val => val === undefined)
				? undefined
				: obj;

		newAcc.gameSettings.staff = removeUnused({
			disableVisibleElo: newAcc.gameSettings.staffDisableVisibleElo,
			disableVisibleXP: newAcc.gameSettings.staffDisableVisibleXP,
			disableStaffColor: newAcc.gameSettings.staffDisableStaffColor,
			incognito: newAcc.gameSettings.staffIncognito,
			...newAcc.gameSettings.staff
		});

		newAcc.customCardback = removeUnused({
			fileExtension: newAcc.customCardback,
			saveTime: newAcc.customCardbackSaveTime,
			uid: newAcc.customCardbackUid,
			...newAcc.customCardback
		});

		newAcc.gameSettings.gameFilters = newAcc.gameSettings.gameFilters ? newAcc.gameSettings.gameFilters : {};

		newAcc.gameSettings.gameFilters = removeUnused({
			pub: newAcc.gameSettings.gameFilters.pub,
			priv: newAcc.gameSettings.gameFilters.priv,
			unstarted: newAcc.gameSettings.gameFilters.unstarted,
			inProgress: newAcc.gameSettings.gameFilters.inprogress,
			completed: newAcc.gameSettings.gameFilters.completed,
			custom: newAcc.gameSettings.gameFilters.customgame,
			casual: newAcc.gameSettings.gameFilters.casualgame,
			timedMode: newAcc.gameSettings.gameFilters.timedMode,
			standard: newAcc.gameSettings.gameFilters.standard,
			rainbow: newAcc.gameSettings.gameFilters.rainbow,
			...newAcc.gameSettings.gameFilters
		});

		if (!newAcc.gameSettings.gameFilters) {
			delete newAcc.gameSettings.gameFilters;
		}

		newAcc.overall = removeUnused({
			wins: newAcc.wins,
			losses: newAcc.losses,
			rainbowWins: newAcc.rainbowWins,
			rainbowLosses: newAcc.rainbowLosses,
			elo: newAcc.eloOverall,
			xp: newAcc.xpOverall,
			...newAcc.overall
		});

		newAcc.seasons = {
			...newAcc.seasons
		};

		for (let i = 1; i <= 22; i++) {
			newAcc.seasons[i] = removeUnused({
				wins: newAcc[`winsSeason${i}`],
				losses: newAcc[`lossesSeason${i}`],
				rainbowWins: newAcc[`rainbowWinsSeason${i}`],
				rainbowLosses: newAcc[`rainbowLossesSeason${i}`],
				elo: newAcc[`eloSeason${i}`],
				xp: newAcc[`xpSeason${i}`],
				...newAcc.seasons[i]
			});

			if (!newAcc.seasons[i]) {
				delete newAcc.seasons[i];
			}
		}

		newAcc.discord = removeUnused({
			username: newAcc.discordUsername,
			discriminator: newAcc.discordDiscriminator,
			mfa: newAcc.discordMFA,
			uid: newAcc.discordUID,
			...newAcc.discord
		});

		newAcc.github = removeUnused({
			username: newAcc.githubUsername,
			mfa: newAcc.githubMFA,
			...newAcc.github
		});

		newAcc.colors = removeUnused({
			primary: newAcc.primaryColor,
			secondary: newAcc.secondaryColor,
			tertiary: newAcc.tertiaryColor,
			background: newAcc.backgroundColor,
			text: newAcc.textColor,
			...newAcc.colors
		});

		newAcc.version = 2;

		delete newAcc._id;

		return Account.updateOne(
			{
				username: newAcc.username
			},
			{
				$set: newAcc
			}
		).then(() => {
			console.log('Updated:', newAcc.username);
		});
	})
	.then(() => {
		console.log('Done.');
		mongoose.connection.close();
	})
	.catch(err => {
		console.log('Error:', err);
	});
