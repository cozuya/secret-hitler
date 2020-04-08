// keep this updated with GameSummary schema

// Jaina never votes for a fascist, kills a fascist
// Valeera shoots a liberal
// Uther always votes for a fascist
module.exports = {
	_id: 'generic-game',
	date: new Date(),
	gameSetting: {
		rebalance6p: false,
		rebalance7p: false,
		rebalance9p: false,
		rerebalance9p: false,
	},
	logs: [
		// turn 0
		{
			presidentId: 0,
			chancellorId: 1,
			enactedPolicy: 'fascist',
			chancellorHand: {
				reds: 2,
				blues: 0,
			},
			presidentHand: {
				reds: 2,
				blues: 1,
			},
			votes: [true, true, true, true, true, true, true],
			presidentClaim: { reds: 2, blues: 1 },
			chancellorClaim: { reds: 2, blues: 0 },
		},
		// turn 1
		{
			presidentId: 1,
			chancellorId: 3,
			enactedPolicy: 'fascist',
			investigationId: 4,
			investigationClaim: 'fascist',
			chancellorHand: {
				reds: 1,
				blues: 1,
			},
			presidentHand: {
				reds: 2,
				blues: 1,
			},
			votes: [true, true, true, true, true, true, true],
			presidentClaim: { reds: 2, blues: 1 },
			chancellorClaim: { reds: 2, blues: 0 },
		},
		// turn 2
		{
			presidentId: 2,
			chancellorId: 0,
			enactedPolicy: 'fascist',
			specialElection: 1,
			chancellorHand: {
				reds: 1,
				blues: 1,
			},
			presidentHand: {
				reds: 1,
				blues: 2,
			},
			votes: [true, true, true, true, true, true, true],
			presidentClaim: { reds: 2, blues: 1 },
			chancellorClaim: { reds: 2, blues: 0 },
		},
		// turn 3
		{
			presidentId: 1,
			chancellorId: 6,
			enactedPolicy: 'fascist',
			execution: 3,
			chancellorHand: {
				reds: 1,
				blues: 1,
			},
			presidentHand: {
				reds: 2,
				blues: 1,
			},
			votes: [true, false, true, true, true, true, false],
			presidentClaim: { reds: 2, blues: 1 },
			chancellorClaim: { reds: 2, blues: 0 },
		},
		// turn 4
		{
			presidentId: 4,
			chancellorId: 2,
			votes: [true, false, false, true, false, true, false],
		},
		// turn 5
		{
			presidentId: 5,
			chancellorId: 4,
			votes: [true, false, false, true, false, false, false],
		},
		// turn 6
		{
			presidentId: 6,
			chancellorId: 2,
			enactedPolicy: 'fascist',
			execution: 2,
			chancellorHand: {
				reds: 2,
				blues: 0,
			},
			presidentHand: {
				reds: 2,
				blues: 1,
			},
			votes: [true, true, true, true, true, true, true],
			presidentClaim: { reds: 2, blues: 1 },
			chancellorClaim: { reds: 2, blues: 0 },
		},
		// turn 7
		{
			presidentId: 0,
			chancellorId: 5,
			enactedPolicy: 'fascist',
			chancellorHand: {
				reds: 2,
				blues: 0,
			},
			presidentHand: {
				reds: 2,
				blues: 1,
			},
			votes: [true, false, true, true, true, true, true],
		},
	],
	players: [
		{
			username: 'Uther',
			role: 'liberal',
		},
		{
			username: 'Jaina',
			role: 'liberal',
		},
		{
			username: 'Rexxar',
			role: 'liberal',
		},
		{
			username: 'Malfurian',
			role: 'fascist',
		},
		{
			username: 'Thrall',
			role: 'hitler',
		},
		{
			username: 'Valeera',
			role: 'fascist',
		},
		{
			username: 'Anduin',
			role: 'liberal',
		},
	],
};
