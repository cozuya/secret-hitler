/* eslint-disable spaced-comment */
const { Map, isIndexed, fromJS } = require('immutable');
const { fromNullable, some, none } = require('option');
const buildTurns = require('./buildTurns');

/*
 * Wraps a gameSummary to produce a more human-friendly representation.
 * Feel free to add to this as needed.
 * Refer to `/docs/enhanced-game-summary.md` for API documentation.
 */
function buildEnhancedGameSummary(_summary) {
	// convert Arrays to Lists and some values to Options
	const summary = fromJS(_summary, (key, value, path) => {
		const options = [
			'presidentHand',
			'chancellorHand',
			'enactedPolicy',
			'presidentClaim',
			'chancellorClaim',
			'presidentVeto',
			'chancellorVeto',
			'policyPeek',
			'policyPeekClaim',
			'investigatorId',
			'investigationId',
			'investigationClaim',
			'specialElection',
			'execution'
		];

		return key === 'logs'
			? value
					.map(log => {
						const logOptions = Map(
							options.map(o => {
								const optValue = log[o] !== undefined ? some(log[o]) : none;
								return [o, optValue];
							})
						).toObject();
						return Object.assign({}, log, logOptions);
					})
					.toList()
			: isIndexed(value)
			? value.toList()
			: value.toObject();
	});

	// String
	const id = summary._id;

	// Date
	const date = summary.date;

	// List[{ id: Int, username: String, role: String, loyalty: String }]
	const players = (() => {
		const roleToLoyalty = Map({
			liberal: 'liberal',
			fascist: 'fascist',
			hitler: 'fascist'
		});

		return summary.players.map((p, i) => {
			return Object.assign({}, p, {
				id: i,
				loyalty: roleToLoyalty.get(p.role),
				icon: p.icon || 0
			});
		});
	})();

	// List[Turn]
	const turns = buildTurns(summary.logs, players, summary.gameSetting);

	// Int
	const playerSize = players.size;

	// Boolean
	const isRebalanced =
		summary.gameSetting.rebalance6p || summary.gameSetting.rebalance7p || summary.gameSetting.rebalance9p || summary.gameSetting.rerebalance9p;

	const casualGame = summary.gameSetting.casualGame;

	// String
	const winningTeam = (() => {
		const lastTurn = turns.last();

		if (lastTurn.isHitlerElected) {
			return 'fascist';
		} else if (lastTurn.isHitlerKilled) {
			return 'liberal';
		} else {
			if (!lastTurn.enactedPolicy) {
				console.log('no lastturn enacted policy @ buildenhancedgamesummary');
				return null;
			}
			return lastTurn.enactedPolicy.value();
		}
	})();

	// Option[Int]
	const hitlerZone = (() => {
		const i = turns.findIndex(t => t.beforeTrack.reds === 3);
		return i > -1 ? some(i) : none;
	})();

	// Option[Int]
	const indexOf = id => {
		return fromNullable(Number.isInteger(id) ? id : players.findIndex(p => p.username === id));
	};

	// Option[Int]
	const playerOf = id => {
		return fromNullable(Number.isInteger(id) ? players.get(id) : players.find(p => p.username === id));
	};

	// Option[String]
	const usernameOf = id => {
		return playerOf(id).map(p => p.username);
	};

	// Option[String]
	const tagOf = id => {
		return playerOf(id).map(p => `${p.username} [${p.id}]`);
	};

	// Option[String]
	const loyaltyOf = id => {
		return playerOf(id).map(p => p.loyalty);
	};

	// Option[String]
	const roleOf = id => {
		return playerOf(id).map(p => p.role);
	};

	// Option[List[Option[{ ja: Boolean, presidentId: Int, chancellorId: Int }]]]
	const votesOf = username => {
		return indexOf(username).map(i =>
			turns
				.filter(t => t.votes.get(i))
				.map(t => {
					return t.votes.get(i).map(v => ({
						ja: v,
						presidentId: t.presidentId,
						chancellorId: t.chancellorId
					}));
				})
		);
	};

	// Option[List[Int]]
	const shotsOf = username => {
		return indexOf(username).map(i => turns.filter(t => t.presidentId === i && t.execution.isSome()).map(t => t.execution.value()));
	};

	// Option[Boolean]
	const isWinner = username => {
		return loyaltyOf(username).map(l => l === winningTeam);
	};

	return {
		summary,
		id,
		date,
		players,
		turns,
		playerSize,
		hitlerZone,
		winningTeam,
		isRebalanced,
		casualGame,
		usernameOf,
		tagOf,
		indexOf,
		loyaltyOf,
		roleOf,
		votesOf,
		shotsOf,
		isWinner
	};
}

module.exports = buildEnhancedGameSummary;
