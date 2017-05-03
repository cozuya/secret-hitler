const mongoose = require('mongoose'),
	{Schema} = mongoose,
	profileSchema = new Schema({
		_id: String, // username
		version: String, // versioning for `recalculateProfiles`
		created: Date,
		stats: {
			matches: {
				allMatches: {
					events: { type: Number, default: 0 },
					successes: { type: Number, default: 0 }
				},
				liberal: {
					events: { type: Number, default: 0 },
					successes: { type: Number, default: 0 }
				},
				fascist: {
					events: { type: Number, default: 0 },
					successes: { type: Number, default: 0 }
				}
			},
			actions: {
				voteAccuracy: {
					events: { type: Number, default: 0 },
					successes: { type: Number, default: 0 }
				},
				shotAccuracy: {
					events: { type: Number, default: 0 },
					successes: { type: Number, default: 0 }
				}
			}
		},
		recentGames: {
			type: [{
				loyalty: String,
				playerSize: Number,
				isWinner: Boolean,
				date: Date
			}],
			default: []
		}
	});

module.exports = mongoose.model('Profile', profileSchema);