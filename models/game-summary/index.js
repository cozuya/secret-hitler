/*
 * Minimal representation of a game. Schema is likely final and should not be changed without good reason.
 * Use GameSummaryBuilder as a convenience tool to gradually build up this object.
 * Once you fetch this from the database, wrap it in an EnhancedGameSummary for a more human-friendly representation.
 * see: `./GameSummaryBuilder, ./EnhancedGameSummary`
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;
const gameSummary = new Schema({
	_id: String,
	date: Date,
	gameSetting: {
		rebalance6p: Boolean,
		rebalance7p: Boolean,
		rebalance9p: Boolean,
		rerebalance9p: Boolean,
		casualGame: Boolean,
		practiceGame: Boolean,
		unlistedGame: Boolean
	},
	players: [
		{
			username: String,
			role: String,
			icon: Number,
			hashUid: String
		}
	],
	libElo: {
		overall: Number,
		season: Number
	},
	fasElo: {
		overall: Number,
		season: Number
	},
	logs: [
		{
			// election
			presidentId: Number,
			chancellorId: Number,
			votes: Array, // [Boolean]

			// policy enaction
			presidentHand: Array, // [String] eg. [ "fascist", "liberal", "fascist" ]
			chancellorHand: Array, // [String]
			enactedPolicy: String,

			presidentClaim: Array, // [String]
			chancellorClaim: Array, // [String]

			presidentVeto: Boolean,
			chancellorVeto: Boolean,

			// actions
			policyPeek: Array, // [String]
			policyPeekClaim: Array, // [String]
			investigatorId: Number,
			investigationId: Number,
			investigationClaim: String,
			specialElection: Number,
			execution: Number,

			// other metadata
			deckState: Array // [String], eg. [ "fascist", "liberal", "fascist", "fascist", "liberal" ]
		}
	],
	customGameSettings: {
		enabled: Boolean,
		powers: Array, // [power x5, string or null]
		hitlerZone: Number,
		vetoZone: Number,
		fascistCount: Number,
		hitKnowsFas: Boolean,
		deckState: {
			lib: Number,
			fas: Number
		},
		trackState: {
			lib: Number,
			fas: Number
		}
	}
});

module.exports = mongoose.model('GameSummary', gameSummary);
