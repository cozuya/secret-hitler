const run = async () => {
	const mongoose = require('mongoose');
	const Account = require('../models/account');
	const Profile = require('../models/profile');

	mongoose.Promise = global.Promise;
	mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`, { useUnifiedTopology: true, useNewUrlParser: true });

	let count = 0;

	await Account.find({})
		.cursor()
		.eachAsync(account => {
			account.maxElo = account.eloOverall || 1600;
			account.previousMaxElo = account.eloOverall || 1600;
			account.pastElo = [{ date: new Date(), value: 1600 }];
			account.experiencePoints = {
				default: 0,
				ranked: 0,
				silent: 0,
				emote: 0,
				custom: 0,
				private: 0
			};

			// TODO: Add reset Elo badges

			account.eloOverall = 1600;

			// Normal season reset
			account.eloSeason = 1600;

			account.save();

			count++;
			if (Number.isInteger(count / 100)) {
				console.log('processed account ' + count);
			}
		});

	count = 0;

	await Profile.find({})
		.cursor()
		.eachAsync(profile => {
			profile.stats = {
				matches: {
					legacyMatches: {
						// pre-reset games
						liberal: profile.stats.matches.liberal,
						fascist: profile.stats.matches.fascist
					},
					greyMatches: {
						// ranked grey games
						liberal: { events: 0, successes: 0 },
						fascist: { events: 0, successes: 0 },
						5: { events: 0, successes: 0 },
						6: { events: 0, successes: 0 },
						7: { events: 0, successes: 0 },
						8: { events: 0, successes: 0 },
						9: { events: 0, successes: 0 },
						10: { events: 0, successes: 0 }
					},
					rainbowMatches: {
						// ranked rainbow games
						liberal: { events: 0, successes: 0 },
						fascist: { events: 0, successes: 0 },
						5: { events: 0, successes: 0 },
						6: { events: 0, successes: 0 },
						7: { events: 0, successes: 0 },
						8: { events: 0, successes: 0 },
						9: { events: 0, successes: 0 },
						10: { events: 0, successes: 0 }
					},
					practiceMatches: {
						// practice games
						liberal: { events: 0, successes: 0 },
						fascist: { events: 0, successes: 0 }
					},
					silentMatches: {
						// silent games
						liberal: { events: 0, successes: 0 },
						fascist: { events: 0, successes: 0 }
					},
					emoteMatches: {
						// emote-only games
						liberal: { events: 0, successes: 0 },
						fascist: { events: 0, successes: 0 }
					},
					casualMatches: {
						// casual games
						liberal: { events: 0, successes: 0 },
						fascist: { events: 0, successes: 0 }
					},
					customMatches: {
						// custom (any settings) games
						liberal: { events: 0, successes: 0 },
						fascist: { events: 0, successes: 0 }
					},
					privateMatches: {
						// private games
						liberal: { events: 0, successes: 0 },
						fascist: { events: 0, successes: 0 }
					}
				},
				actions: {
					voteAccuracy: { events: 0, successes: 0 },
					shotAccuracy: { events: 0, successes: 0 },
					legacyVoteAccuracy: profile.stats.actions.voteAccuracy,
					legacyShotAccuracy: profile.stats.actions.shotAccuracy
				}
			};

			profile.save();

			count++;
			if (Number.isInteger(count / 100)) {
				console.log('processed account ' + count);
			}
		});

	mongoose.connection.close();
};

run();
