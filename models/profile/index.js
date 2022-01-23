const mongoose = require('mongoose');
const { Schema } = mongoose;

const matchData = {
	events: { type: Number, default: 0 },
	successes: { type: Number, default: 0 }
};

const roleMatchData = {
	liberal: matchData,
	fascist: matchData
};

const profileSchema = new Schema({
	_id: String, // username
	username: String,
	version: String, // versioning for `recalculateProfiles`
	created: Date,
	customCardback: String,
	bio: String,
	lastConnectedIP: String,
	stats: {
		matches: {
			legacyMatches: roleMatchData, // pre-reset games
			greyMatches: {
				// ranked grey games
				liberal: matchData,
				fascist: matchData,
				5: roleMatchData,
				6: roleMatchData,
				7: roleMatchData,
				8: roleMatchData,
				9: roleMatchData,
				10: roleMatchData
			},
			rainbowMatches: {
				// ranked rainbow games
				liberal: matchData,
				fascist: matchData,
				5: roleMatchData,
				6: roleMatchData,
				7: roleMatchData,
				8: roleMatchData,
				9: roleMatchData,
				10: roleMatchData
			},
			practiceMatches: roleMatchData, // practice games
			silentMatches: roleMatchData, // silent games
			emoteMatches: roleMatchData, // emote-only games
			casualMatches: roleMatchData, // casual games
			customMatches: roleMatchData // custom (any settings) games
		},
		actions: {
			voteAccuracy: matchData,
			shotAccuracy: matchData,
			legacyVoteAccuracy: matchData,
			legacyShotAccuracy: matchData
		}
	},
	recentGames: {
		type: [
			{
				_id: String,
				loyalty: String,
				playerSize: Number,
				isWinner: Boolean,
				isRebalanced: Boolean,
				date: Date
			}
		],
		default: []
	}
});

module.exports = mongoose.model('Profile', profileSchema);
