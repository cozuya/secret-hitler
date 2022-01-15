const mongoose = require('mongoose');
const { Schema } = mongoose;

const matchData = {
	events: { type: Number, default: 0 },
	successes: { type: Number, default: 0 }
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
			legacyMatches: {
				// pre-reset games
				liberal: matchData,
				fascist: matchData
			},
			greyMatches: {
				// ranked grey games
				liberal: matchData,
				fascist: matchData,
				5: matchData,
				6: matchData,
				7: matchData,
				8: matchData,
				9: matchData,
				10: matchData
			},
			rainbowMatches: {
				// ranked rainbow games
				liberal: matchData,
				fascist: matchData,
				5: matchData,
				6: matchData,
				7: matchData,
				8: matchData,
				9: matchData,
				10: matchData
			},
			practiceMatches: {
				// practice games
				liberal: matchData,
				fascist: matchData
			},
			silentMatches: {
				// silent games
				liberal: matchData,
				fascist: matchData
			},
			emoteMatches: {
				// emote-only games
				liberal: matchData,
				fascist: matchData
			},
			casualMatches: {
				// casual games
				liberal: matchData,
				fascist: matchData
			},
			customMatches: {
				// custom (any settings) games
				liberal: matchData,
				fascist: matchData
			}
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
