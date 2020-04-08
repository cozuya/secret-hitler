const Profile = require('./index');
const Account = require('../account');
const { profiles } = require('../../routes/socket/models');
const debug = require('debug')('game:profile');
const { List } = require('immutable');
const { flattenListOpts } = require('../../utils');

// handles all stat computation logic
function profileDelta(username, game) {
	const { playerSize, isRebalanced, date, id } = game;
	const isWinner = game.isWinner(username).value();
	const loyalty = game.loyaltyOf(username).value();
	const isLiberal = loyalty === 'liberal';
	const isFascist = !isLiberal;
	const votes = game.hitlerZone
		.map((hz) =>
			flattenListOpts(game.votesOf(username).value().slice(hz)).filter(
				(v) => game.loyaltyOf(v.presidentId).value() === 'fascist' || game.roleOf(v.chancellorId).value() === 'hitler'
			)
		)
		.valueOrElse(List());
	const accurateVotes = votes.filterNot((v) => {
		const { presidentId, chancellorId, ja } = v;
		const presidentLoyalty = game.loyaltyOf(presidentId).value();
		const chancellorRole = game.roleOf(chancellorId).value();

		return ja && (presidentLoyalty === 'fascist' || chancellorRole === 'hitler');
	});
	const shots = game.shotsOf(username).value();
	const accurateShots = shots.filter((id) => game.loyaltyOf(id).value() === 'fascist');

	if (game.casualGame) {
		return {
			stats: {
				matches: {
					allMatches: {
						events: 0,
						successes: 0,
					},
					liberal: {
						events: 0,
						successes: 0,
					},
					fascist: {
						events: 0,
						successes: 0,
					},
				},
				actions: {
					voteAccuracy: {
						events: 0,
						successes: 0,
					},
					shotAccuracy: {
						events: 0,
						successes: 0,
					},
				},
			},
			recentGames: {
				_id: id,
				loyalty,
				playerSize,
				isWinner,
				isRebalanced,
				date,
			},
		};
	}

	return {
		stats: {
			matches: {
				allMatches: {
					events: 1,
					successes: isWinner ? 1 : 0,
				},
				liberal: {
					events: isLiberal ? 1 : 0,
					successes: isLiberal && isWinner ? 1 : 0,
				},
				fascist: {
					events: isFascist ? 1 : 0,
					successes: isFascist && isWinner ? 1 : 0,
				},
			},
			actions: {
				voteAccuracy: {
					events: isLiberal ? votes.size : 0,
					successes: isLiberal ? accurateVotes.size : 0,
				},
				shotAccuracy: {
					events: isLiberal ? shots.size : 0,
					successes: isLiberal ? accurateShots.size : 0,
				},
			},
		},
		recentGames: {
			_id: id,
			loyalty,
			playerSize,
			isWinner,
			isRebalanced,
			date,
		},
	};
}

// username: String, game: enhancedGameSummary, options: { version: String, cache: Boolean }
function updateProfile(username, game, options = {}) {
	const { version, cache } = options;
	const delta = profileDelta(username, game);

	return (
		Profile.findByIdAndUpdate(
			username,
			{
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
						$each: [delta.recentGames],
						$position: 0,
						$slice: 10,
					},
				},
			},
			{
				new: true,
				upsert: true,
			}
		)
			.exec()
			// drop the document when recalculating profiles
			.then((profile) => {
				if (!profile) {
					return null;
				} else if (version && profile.version !== version) {
					return profile
						.update({ version }, { overwrite: true })
						.exec()
						.then(() => updateProfile(username, game, options));
				} else {
					return profile;
				}
			})
			// fetch account creation date when profile is first added
			.then((profile) => {
				if (!profile) {
					return null;
				} else if (!profile.created) {
					return Account.findOne({ username: profile._id })
						.exec()
						.then((account) => {
							if (account) {
								profile.created = account.created;
								return profile.save();
							} else return null;
						});
				} else {
					return profile;
				}
			})
			.then((profile) => {
				if (!profile) return null;
				else if (cache) return profiles.push(profile);
				else return profile;
			})
			.catch((err) => debug(err))
	);
}

// game: enhancedGameSummary, options: { version: String, cache: Boolean }
function updateProfiles(game, options = {}) {
	debug('Updating profiles for: %s', game.id);

	return Promise.all(game.players.map((p) => p.username).map((username) => updateProfile(username, game, options)));
}

// side effect: caches profile
function getProfile(username) {
	const profile = profiles.get(username);

	if (profile) {
		debug('Cache hit for: %s', username);
		return Promise.resolve(profile);
	} else {
		debug('Cache miss for: %s', username);
		return Profile.findById(username)
			.exec()
			.then((profile) => profiles.push(profile));
	}
}

module.exports.updateProfiles = updateProfiles;
module.exports.profileDelta = profileDelta;
module.exports.getProfile = getProfile;
