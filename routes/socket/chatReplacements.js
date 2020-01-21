module.exports.chatReplacements = [
	// !!! Don't use ID 0 for any replacements !!!
	{
		id: 1,
		regex: /^r.ainbow$/i,
		replacement:
			'To have a coloured name and be able to play in experienced games, you have to play 50 ranked games (non-casual, non-private, non-custom, non-unlisted games). To check how many games you have left to play check your profile!',
		aemCooldown: 15,
		normalCooldown: 120,
		normalGames: 50
	},
	{
		id: 2,
		regex: /^o.verall$/i,
		replacement:
			'If you have played 50 games but still see yourself as being grey, you might have seasonal ELO on, this will get reset with every new season. To see your overall ELO instead, go to settings and toggle “show overall winrates and colors).',
		aemCooldown: 15,
		normalCooldown: 120,
		normalGames: 50
	}
];
