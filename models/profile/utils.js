const
	Profile = require('./index'),
	Account = require('../account'),
	debug = require('debug')('game:profile');

function profileDelta(username, game) {
	const
		{ playerSize, date } = game,
		isWinner = game.isWinner(username),
		loyalty = game.loyaltyOf(username),
		isLiberal = loyalty === 'liberal',
		isFascist = !isLiberal,

		votes = game.hitlerZone > -1 ? game.votesOf(username).slice(game.hitlerZone) : [],

		accurateVotes = votes.filter(v => {
			const
				{ presidentId, chancellorId, vote } = v,
				presidentLoyalty = game.loyaltyOf(presidentId, true),
				chancellorRole = game.roleOf(chancellorId, true);

			return !(vote && (presidentLoyalty === 'fascist' || chancellorRole === 'hitler'));
		}),

		shots = game.shotsOf(username),

		accurateShots = shots.filter(id => game.loyaltyOf(id, true) === 'fascist');

	return {
		stats: {
			matches: {
				allMatches: {
					events: 1,
					successes: isWinner ? 1 : 0
				},
				liberal: {
					events: isLiberal ? 1 : 0,
					successes: isLiberal && isWinner ? 1 : 0
				},
				fascist: {
					events: isFascist ? 1 : 0,
					successes: isFascist && isWinner ? 1 : 0
				}
			},
			actions: {
				voteAccuracy: {
					events: isLiberal ? votes.length : 0,
					successes: isLiberal ? accurateVotes.length : 0
				},
				shotAccuracy: {
					events: isLiberal ? shots.length : 0,
					successes: isLiberal ? accurateShots.length : 0
				}
			}
		},
		recentGames: {
			loyalty,
			playerSize,
			isWinner,
			date
		}
	};
}

function updateProfile(username, game, version = false) {
	const delta = profileDelta(username, game);

	return Profile
		.findByIdAndUpdate(username, {
			$inc: {
				'stats.matches.allMatches.events': delta.stats.matches.allMatches.events,
				'stats.matches.allMatches.successes': delta.stats.matches.allMatches.successes,

				'stats.matches.liberal.events': delta.stats.matches.liberal.events,
				'stats.matches.liberal.successes': delta.stats.matches.liberal.successes,

				'stats.matches.fascist.events': delta.stats.matches.fascist.events,
				'stats.matches.fascist.successes': delta.stats.matches.fascist.successes,

				'stats.actions.voteAccuracy.events': delta.stats.actions.voteAccuracy.events,
				'stats.actions.voteAccuracy.successes': delta.stats.actions.voteAccuracy.successes,

				'stats.actions.shotAccuracy.events': delta.stats.actions.shotAccuracy.events,
				'stats.actions.shotAccuracy.successes': delta.stats.actions.shotAccuracy.successes,
			},
			$push: {
				recentGames: {
					$each: [ delta.recentGames ],
					$position: 0,
					$slice: 10
				}
			}
		}, {
			new: true,
			upsert: true
		})
		.exec()
		// drop the document when recalculating profiles
		.then(profile => {
			if (version && profile.version !== version) {
				return profile
					.update({ version }, { overwrite: true })
					.exec()
					.then(() => updateProfile(username, game));
			} else {
				return profile;
			}
		})
		// the first time a profile is saved, fetch the account creation date
		.then(profile => {
			if (!profile.created) {
				return Account
					.findOne({ username: profile._id })
					.exec()
					.then(account => {
						profile.created = account.created;
						return profile.save();
					});
			} else {
				return profile;
			}
		});
}

function updateProfiles(game, version = false) {
	debug('Updating profiles for: %s', game.uid);

	return Promise.all(game.players
		.map(p => p.username)
		.map(username => updateProfile(username, game, version)));
}

module.exports.updateProfiles = updateProfiles;
module.exports.profileDelta = profileDelta;
