const mongoose = require('mongoose');
const Account = require('../models/account');
const Profile = require('../models/profile/index');
const _ = require('lodash');
const { awardBadgePrequeried } = require('../routes/socket/badges');

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`);

Account.find({ 'games.1': { $exists: true } })
	.cursor()
	.eachAsync(acc => {
		// == QUERY PROFILE ==
		Profile.findOne({ _id: acc.username }).then(profile => {
			// == DATA TO SAVE ==
			const preResetElo = acc.eloOverall;
			const preResetGameCount = acc.games.length;

			// == UPDATE PROFILE STATS ==
			profile.stats.matches.legacyMatches = {
				liberal: _.clone(profile.stats.matches.liberal),
				fascist: _.clone(profile.stats.matches.fascist)
			};
			profile.stats.actions.legacyVoteAccuracy = _.clone(profile.stats.actions.voteAccuracy);
			profile.stats.actions.legacyShotAccuracy = _.clone(profile.stats.actions.shotAccuracy);
			profile.stats.actions.voteAccuracy = {
				events: 0,
				successes: 0
			};
			profile.stats.actions.shotAccuracy = {
				events: 0,
				successes: 0
			};

			// == BADGES ==
			awardBadgePrequeried(
				acc,
				'eloReset',
				`At the time of the Elo reset, you had ${preResetElo.toFixed(0)} overall Elo and ${preResetGameCount} games played.`,
				`Elo Reset`
			); // other badges will be awarded when players log in

			// == RESET ACCOUNT STATS ==
			acc.eloSeason = 1600;
			acc.eloOverall = 1600;
			acc.xpOverall = preResetGameCount;
			acc.xpSeason = 0;
			acc.isRainbowOverall = acc.xpOverall >= 50.0;
			if (acc.isRainbowOverall) {
				acc.dateRainbowOverall = new Date();
			}
			acc.isRainbowSeason = false;

			// == WE ARE DONE ==
			profile.save(() => {
				acc.save();
			});
		});
	});
