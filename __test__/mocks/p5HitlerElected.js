// hitler elected
// also a top deck happens
module.exports = {
	_id: 'hitler-elected-5p',
	date: new Date(),
	gameSetting: {
		rebalance6p: false,
		rebalance7p: false,
		rebalance9p: false,
		rerebalance9p: false
	},
	logs: [
		// turn 0
		{
			presidentId: 0,
			chancellorId: 4,
			enactedPolicy: 'fascist',
			chancellorHand: {
				reds: 1,
				blues: 1
			},
			presidentHand: {
				reds: 1,
				blues: 2
			},
			votes: [true, true, true, true, true]
		},
		// turn 1
		{
			presidentId: 1,
			chancellorId: 3,
			votes: [false, false, false, false, false]
		},
		// turn 2
		{
			presidentId: 2,
			chancellorId: 1,
			votes: [false, false, false, false, false]
		},
		// turn 3
		{
			presidentId: 3,
			chancellorId: 2,
			enactedPolicy: 'fascist',
			votes: [false, false, false, false, false]
		},
		// turn 4
		{
			presidentId: 4,
			chancellorId: 1,
			enactedPolicy: 'fascist',
			policyPeek: {
				reds: 2,
				blues: 1
			},
			policyPeekClaim: {
				reds: 3,
				blues: 0
			},
			chancellorHand: {
				reds: 1,
				blues: 1
			},
			presidentHand: {
				reds: 2,
				blues: 1
			},
			votes: [true, true, true, true, true]
		},
		// turn 5
		{
			presidentId: 0,
			chancellorId: 3,
			votes: [false, false, false, false, false]
		},
		{
			presidentId: 1,
			chancellorId: 0,
			votes: [true, true, true, true, false]
		}
	],
	players: [
		{
			username: 'Uther',
			role: 'hitler'
		},
		{
			username: 'Jaina',
			role: 'fascist'
		},
		{
			username: 'Rexxar',
			role: 'liberal'
		},
		{
			username: 'Thrall',
			role: 'liberal'
		},
		{
			username: 'Malfurian',
			role: 'liberal'
		}
	],
	__v: 0
};
