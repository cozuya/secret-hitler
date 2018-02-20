// all veto situations
module.exports = {
	"_id" : "veto2",
	"gameSetting" : {
		rebalance6p: false,
		rebalance7p: false,
		rebalance9p: false,
		rerebalance9p: false
	},
	"logs" : [
		// turn 0
		{
			"presidentId" : 0,
			"chancellorId" : 1,
			"enactedPolicy" : "fascist",
			"chancellorHand" : {
				"reds" : 1,
				"blues" : 1
			},
			"presidentHand" : {
				"reds" : 2,
				"blues" : 1
			},
			"votes" : [
				true,
				true,
				true,
				true,
				true
			]
		},
		// turn 1
		{
			"presidentId" : 1,
			"chancellorId" : 2,
			"enactedPolicy" : "fascist",
			"chancellorHand" : {
				"reds" : 1,
				"blues" : 1
			},
			"presidentHand" : {
				"reds" : 2,
				"blues" : 1
			},
			"votes" : [
				true,
				true,
				true,
				true,
				true
			]
		},
		// turn 2
		{
			"presidentId" : 2,
			"chancellorId" : 1,
			"enactedPolicy" : "fascist",
			"policyPeek" : {
				"reds" : 2,
				"blues" : 1
			},
			"chancellorHand" : {
				"reds" : 2,
				"blues" : 0
			},
			"presidentHand" : {
				"reds" : 3,
				"blues" : 0
			},
			"votes" : [
				true,
				true,
				true,
				true,
				true
			]
		},
		// turn 3
		{
			"presidentId" : 3,
			"chancellorId" : 2,
			"enactedPolicy" : "fascist",
			"execution" : 4,
			"chancellorHand" : {
				"reds" : 2,
				"blues" : 0
			},
			"presidentHand" : {
				"reds" : 2,
				"blues" : 1
			},
			"votes" : [
				true,
				true,
				true,
				true,
				true
			]
		},
		// turn 4
		{
			"presidentId" : 0,
			"chancellorId" : 1,
			"enactedPolicy" : "fascist",
			"execution" : 1,
			"chancellorHand" : {
				"reds" : 2,
				"blues" : 0
			},
			"presidentHand" : {
				"reds" : 2,
				"blues" : 1
			},
			"votes" : [
				true,
				true,
				true,
				true,
				true
			]
		},
		// turn 5
		{
			"presidentId" : 2,
			"chancellorId" : 0,
			"chancellorVeto" : true,
			"presidentVeto" : false,
			"enactedPolicy" : "liberal",
			"chancellorHand" : {
				"reds" : 1,
				"blues" : 1
			},
			"presidentHand" : {
				"reds" : 1,
				"blues" : 2
			},
			"votes" : [
				true,
				true,
				true,
				true,
				true
			]
		},
		// turn 6
		{
			"presidentId" : 3,
			"chancellorId" : 2,
			"chancellorVeto" : false,
			"enactedPolicy" : "liberal",
			"chancellorHand" : {
				"reds" : 1,
				"blues" : 1
			},
			"presidentHand" : {
				"reds" : 1,
				"blues" : 2
			},
			"votes" : [
				true,
				true,
				true,
				true,
				true
			]
		},
		// turn 7
		{
			"presidentId" : 0,
			"chancellorId" : 3,
			"votes" : [
				false,
				true,
				false,
				false,
				true
			]
		},
		// turn 8
		{
			"presidentId" : 2,
			"chancellorId" : 3,
			"votes" : [
				false,
				true,
				false,
				false,
				true
			]
		},
		// turn 9
		{
			"presidentId" : 3,
			"chancellorId" : 0,
			"chancellorVeto" : true,
			"presidentVeto" : true,
			"enactedPolicy" : "fascist",
			"chancellorHand" : {
				"reds" : 1,
				"blues" : 1
			},
			"presidentHand" : {
				"reds" : 2,
				"blues" : 1
			},
			"votes" : [
				true,
				true,
				true,
				true,
				true
			]
		}
	],
	"players" : [
		{
			"username" : "Malfurian",
			"role" : "liberal",
		},
		{
			"username" : "Jaina",
			"role" : "liberal",
		},
		{
			"username" : "Uther",
			"role" : "fascist",
		},
		{
			"username" : "Rexxar",
			"role" : "hitler",
		},
		{
			"username" : "Thrall",
			"role" : "liberal",
		}
	],
	"__v" : 0
}
