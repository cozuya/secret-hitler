/* eslint-disable spaced-comment */
const { Map, isIndexed, fromJS } = require('immutable');
const { fromNullable, some, none } = require('option');
const buildTurns = require('./buildTurns');

/*
 * Represents a human-readable game. Feel free to add more convenience methods.
 * Refer to `/docs/enhanced-game-summary.md` for API documentation.
 */
function buildEnhancedGameSummary(_summary) {
	// add immutable collections and options
	const summary = fromJS(_summary, (key, value, path) => {
		const options = [ 'presidentHand', 'chancellorHand', 'enactedPolicy',
			'presidentClaim', 'chancellorClaim', 'policyPeek', 'policyPeekClaim',
			'investigationId', 'investigationClaim', 'specialElection', 'execution' ];

		if (key === 'logs') {
			return value.map(log => {
				const logOptions = Map(options.map(o => {
					const optValue = log[o] ? some(log[o]) : none;
					return [o, optValue];
				})).toObject();
				return Object.assign({}, log, logOptions);
			}).toList();
		} else {
			return isIndexed(value) ? value.toList() : value.toObject();
		}
	});

	const date = summary.date;

	const players = (() => {
		const roleToLoyalty = Map({
			liberal: 'liberal',
			fascist: 'fascist',
			hitler: 'fascist'
		});

		return summary.players.map((p, i) => {
			return Object.assign({}, p, {
				id: i,
				loyalty: roleToLoyalty.get(p.role)
			});
		});
	})();

	// List[Turn]
	const turns = buildTurns(
		summary.logs,
		players
	);

	// Int
	const playerSize = players.size;

	// String
	const winningTeam = (() => {
		const lastTurn = turns.last();

		if (lastTurn.isHitlerElected) {
			return 'fascist';
		} else if (lastTurn.isHitlerKilled) {
			return 'liberal';
		} else {
			return lastTurn.enactedPolicy.value();
		}
	})();

	// Option[Int]
	const hitlerZone = (() => {
		const i = turns.findIndex(t => t.beforeTrack.reds === 3);
		return i > -1 ? some(i) : none;
	})();

	/******************
	 * PLAYER QUERIES *
	 ******************/

	// Option[Int]
	const indexOf = id => {
		return fromNullable(
			Number.isInteger(id)
				? id
				: players.findIndex(p => p.username === id)
		);
	};

	// Option[Int]
	const playerOf = id => {
		return fromNullable(
			Number.isInteger(id)
				? players.get(id)
				: players.find(p => p.username === id)
		);
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
		return indexOf(username).map(i => turns.map(t =>
			t.votes.get(i).map(v => ({
				ja: v,
				presidentId: t.presidentId,
				chancellorId: t.chancellorId
			}))
		));
	};

	// Option[List[Int]]
	const shotsOf = username => {
		return indexOf(username).map(i => turns
			.filter(t => t.presidentId === i && t.execution.isSome())
			.map(t => t.execution.value())
		);
	};

	// Option[Boolean]
	const isWinner = username => {
		return loyaltyOf(username).map(l => l === winningTeam);
	};

	return { summary, date, players, turns, playerSize, hitlerZone, winningTeam,
		usernameOf, tagOf, indexOf, loyaltyOf, roleOf, votesOf, shotsOf, isWinner };
};

module.exports = buildEnhancedGameSummary;