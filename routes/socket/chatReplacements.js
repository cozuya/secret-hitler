module.exports.chatReplacements = [
	// !!! Don't use ID 0 for any replacements !!!
	{
		id: 1,
		regex: /^r.ainbow/i,
		replacement:
			'To have a coloured name and be able to play in experienced games, you have to play 50 ranked games (non-casual, non-private, non-custom, non-unlisted games). To check how many games you have left to play check your profile!',
		aemCooldown: 15,
		normalCooldown: 180,
		normalGames: 50
	},
	{
		id: 2,
		regex: /^o.verall/i,
		replacement:
			'If you have played 50 games but still see yourself as being grey, you might have seasonal ELO on, this will get reset with every new season. To see your overall ELO instead, go to settings and toggle “show overall winrates and colors).',
		aemCooldown: 15,
		normalCooldown: 180,
		normalGames: 50
	},
	{
		id: 3,
		regex: /^mod.support/i,
		replacement:
			'The  most effective way to contact a mod is through our discord server in #mod-support. Join here:https://discord.gg/secrethitlerio. Make sure to agree to our rules to access the channel. Once there just ping @Moderator and explain the situation. Provide game links and images when possible.',
		aemCooldown: 15,
		normalCooldown: 180,
		normalGames: 50
	},
	{
		id: 4,
		regex: /^v.eto/i,
		replacement:
			'Veto is unlocked after the 5th fascist card is played. This power allows for the resulting policy to be played to be nullified- but only if both the president and chancellor vote "ja". If either votes "nein", the resulting policy will be enacted as usual.',
		aemCooldown: 15,
		normalCooldown: 180,
		normalGames: 50
	},
	{
		id: 5,
		regex: /^a.fk/i,
		replacement:
			'If someone seems to be AFK, be sure to report them and wait 3 minutes before abandoning or remaking the game. Mods can sometimes help you finish the game or in some situations collect evidence to appropriately punish the offender.',
		aemCooldown: 15,
		normalCooldown: 180,
		normalGames: 50
	},
	{
		id: 6,
		regex: /^d.iscard/i,
		replacement:
			'When you are in a government you  can either be the president or the chancellor. As the president, you receive 3 cards and select a card you do NOT want to be played. As a chancellor, you get 2 cards and select the one you WANT to play.',
		aemCooldown: 15,
		normalCooldown: 180,
		normalGames: 50
	},
	{
		id: 7,
		regex: /^l.ag$/i,
		replacement:
			'If you\'re facing lag problems, try lowering the "Truncated Chat Length" in your settings. The lower the number, the less chat you see, and the less lag there should be in game.',
		aemCooldown: 15,
		normalCooldown: 180,
		normalGames: 50
	},
	{
		id: 8,
		regex: /^b.lacklist/i,
		replacement:
			'To blacklist a player go to their profile, either through clicking their name on the sidebar or searching it up in settings. Once there just click "Blacklist Player". Please make sure to not threaten to, and generally avoid mentioning blacklists during games.',
		aemCooldown: 15,
		normalCooldown: 120,
		normalGames: 999999999
	}
];
