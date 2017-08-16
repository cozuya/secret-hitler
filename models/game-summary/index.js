/*
 * Minimal representation of a game. Schema is likely final and should not be changed without good reason.
 * Use GameSummaryBuilder as a convenience tool to gradually build up this object.
 * Once you fetch this from the database, wrap it in an EnhancedGameSummary for a more human-friendly representation.
 * see: `./GameSummaryBuilder, ./EnhancedGameSummary`
 */

const mongoose = require('mongoose'),
	{ Schema } = mongoose,
	gameSummary = new Schema({
		_id: String,
		date: Date,
		players: [
			{
				username: String,
				role: String
			}
		],
		logs: [
			{
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

				presidentVeto: Boolean,
				chancellorVeto: Boolean,

				// actions
				policyPeek: {
					reds: Number,
					blues: Number
				},
				policyPeekClaim: {
					reds: Number,
					blues: Number
				},
				investigationId: Number,
				investigationClaim: String,
				specialElection: Number,
				execution: Number
			}
		]
	});

module.exports = mongoose.model('GameSummary', gameSummary);
