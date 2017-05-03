const mongoose = require('mongoose'),
	{Schema} = mongoose,
	gameSummary = new Schema({
		uid: String,
		date: Date,
		players: [{
			username: String,
			role: String
		}],
		logs: [{
			// election
			presidentId: Number,
			chancellorId: Number,
			votes: Array, // [Boolean]

			// policy enaction
			presidentHand: {
				reds: Number,
				blues: Number
			},
			chancellorHand: {
				reds: Number,
				blues: Number
			},
			enactedPolicy: String,

			presidentClaim: {
				reds: Number,
				blues: Number
			},
			chancellorClaim: {
				reds: Number,
				blues: Number
			},

			// actions
			policyPeek: {
				reds: Number,
				blues: Number
			},
			investigationId: Number,
			investigationClaim: String,
			specialElection: Number,
			execution: Number
		}]
	});

module.exports = mongoose.model('GameSummary', gameSummary);
