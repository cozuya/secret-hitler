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
	.eachAsync((account, i) => {
		if (account.version && account.version >= 2) {
			return;
		}

		const newAccount = account.toObject();

		newAccount.dismissedSignupModal = !newAccount.hasNotDismissedSignupModal;

		newAccount.gameSettings = newAccount.gameSettings ? newAccount.gameSettings : {};

		const removeUnused = obj =>
			Object.keys(obj)
				.map(key => obj[key])
				.every(val => val === undefined)
				? undefined
				: obj;

		newAccount.gameSettings.staff = removeUnused({
			disableVisibleElo: newAccount.gameSettings.staffDisableVisibleElo,
			disableVisibleXP: newAccount.gameSettings.staffDisableVisibleXP,
			disableStaffColor: newAccount.gameSettings.staffDisableStaffColor,
			incognito: newAccount.gameSettings.staffIncognito,
			...newAccount.gameSettings.staff
		});

		newAccount.customCardback = removeUnused({
			fileExtension: newAccount.customCardback,
			saveTime: newAccount.customCardbackSaveTime,
			uid: newAccount.customCardbackUid,
			...newAccount.customCardback
		});

		newAccount.gameSettings.gameFilters = newAccount.gameSettings.gameFilters ? newAccount.gameSettings.gameFilters : {};

		newAccount.gameSettings.gameFilters = removeUnused({
			pub: newAccount.gameSettings.gameFilters.pub,
			priv: newAccount.gameSettings.gameFilters.priv,
			unstarted: newAccount.gameSettings.gameFilters.unstarted,
			inProgress: newAccount.gameSettings.gameFilters.inprogress,
			completed: newAccount.gameSettings.gameFilters.completed,
			custom: newAccount.gameSettings.gameFilters.customgame,
			casual: newAccount.gameSettings.gameFilters.casualgame,
			timedMode: newAccount.gameSettings.gameFilters.timedMode,
			standard: newAccount.gameSettings.gameFilters.standard,
			rainbow: newAccount.gameSettings.gameFilters.rainbow,
			...newAccount.gameSettings.gameFilters
		});

		if (!newAccount.gameSettings.gameFilters) {
			delete newAccount.gameSettings.gameFilters;
		}

		newAccount.overall = removeUnused({
			wins: newAccount.wins,
			losses: newAccount.losses,
			rainbowWins: newAccount.rainbowWins,
			rainbowLosses: newAccount.rainbowLosses,
			elo: newAccount.eloOverall,
			xp: newAccount.xpOverall,
			...newAccount.overall
		});

		newAccount.seasons = {
			...newAccount.seasons
		};

		for (let i = 1; i <= 22; i++) {
			newAccount.seasons[i] = removeUnused({
				wins: newAccount[`winsSeason${i}`],
				losses: newAccount[`lossesSeason${i}`],
				rainbowWins: newAccount[`rainbowWinsSeason${i}`],
				rainbowLosses: newAccount[`rainbowLossesSeason${i}`],
				elo: newAccount[`eloSeason${i}`],
				xp: newAccount[`xpSeason${i}`],
				...newAccount.seasons[i]
			});

			if (!newAccount.seasons[i]) {
				delete newAccount.seasons[i];
			}
		}

		newAccount.discord = removeUnused({
			username: newAccount.discordUsername,
			discriminator: newAccount.discordDiscriminator,
			mfa: newAccount.discordMFA,
			uid: newAccount.discordUID,
			...newAccount.discord
		});

		newAccount.github = removeUnused({
			username: newAccount.githubUsername,
			mfa: newAccount.githubMFA,
			...newAccount.github
		});

		newAccount.colors = removeUnused({
			primary: newAccount.primaryColor,
			secondary: newAccount.secondaryColor,
			tertiary: newAccount.tertiaryColor,
			background: newAccount.backgroundColor,
			text: newAccount.textColor,
			...newAccount.colors
		});

		newAccount.version = 2;

		delete newAccount._id;

		return Account.updateOne(
			{
				username: newAccount.username
			},
			{
				$set: newAccount
			}
		).then(() => {
			if (i % 100 === 0 || i < 10) {
				console.log(`Migrated ${i + 1} accounts.`);
			}
		});
	})
	.then(() => {
		console.log('Done migrating accounts.');
		mongoose.connection.close();
	})
	.catch(err => {
		console.log('Error migrating accounts:', err);
	});
