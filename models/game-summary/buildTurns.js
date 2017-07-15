/* eslint-disable no-use-before-define */
const { List, Range } = require('immutable');
const { some, none, fromNullable } = require('option');
const { filterOpt, flattenListOpts, pushOpt, mapOpt1, mapOpt2, handDiff, policyToHand, handToPolicy } = require('../../utils');

module.exports = (logs, players) => {
	return buildTurns(List(), logs, players);
};

const buildTurns = (turns, logs, players) => {
	if (logs.isEmpty()) return turns;

	const nextTurn = buildTurn(
		fromNullable(turns.last()),
		logs.first(),
		players
	);

	return buildTurns(
		turns.push(nextTurn),
		logs.rest(),
		players
	);
};

const buildTurn = (prevTurnOpt, log, players) => {
	const prevTurn = prevTurnOpt.valueOrElse({
		isVotePassed: true,
		afterDeadPlayers: List(),
		execution: none,
		afterDeckSize: 17,
		afterTrack: { reds: 0, blues: 0 },
		afterElectionTracker: 0,
		enactedPolicy: none
	});

	// List[Int]
	const beforeDeadPlayers = prevTurn.afterDeadPlayers;

	// List[Int]
	const afterDeadPlayers = pushOpt(beforeDeadPlayers, log.execution);

	// List[Int]
	const { beforePlayers, afterPlayers } = (() => {
		const p = deadPlayers => players.map((p, i) => (
			Object.assign({}, p, { isDead: deadPlayers.includes(i) })
		));

		return {
			beforePlayers: p(beforeDeadPlayers),
			afterPlayers: p(afterDeadPlayers)
		};
	})();

	// List[Int]
	const alivePlayers = Range(0, players.size)
		.filterNot(i => beforeDeadPlayers.includes(i))
		.toList();

	// List[Option[Boolean]]
	const votes = log.votes.map((v, i) =>
		beforeDeadPlayers.includes(i) ? none : some(v)
	);

	// Int
	const jas = flattenListOpts(votes).count(v => v);

	// Int
	const neins = players.size - jas - beforeDeadPlayers.size;

	// Boolean
	const isVotePassed = jas > neins;

	// Boolean
	const isVoteFailed = !isVotePassed;

	// Boolean
	const isExecution = log.execution.isSome();

	// Boolean
	const isInvestigation = log.investigationId.isSome();

	// Boolean
	const isPolicyPeek = log.policyPeek.isSome();

	// Boolean
	const isSpecialElection = log.specialElection.isSome();

	// Boolean
	const poorMansVeto = isVotePassed && log.enactedPolicy.isNone(); // backwards compatability before veto was tracked

	// Option[Boolean]
	const presidentVeto = poorMansVeto ? some(true) : log.presidentVeto;

	// Option[Boolean]
	const chancellorVeto = poorMansVeto ? some(true) : log.chancellorVeto;

	// Boolean
	const isVeto = chancellorVeto.isSome();

	// Boolean
	const isVetoSuccessful = chancellorVeto.valueOrElse(false) && presidentVeto.valueOrElse(false);

	// Int
	const { beforeElectionTracker, afterElectionTracker } = (() => {
		const beforeElectionTracker = prevTurn.afterElectionTracker === 3
			? 0
			: prevTurn.afterElectionTracker;

		const afterElectionTracker = isVotePassed && !isVetoSuccessful
			? 0
			: beforeElectionTracker + 1;

		return { beforeElectionTracker, afterElectionTracker };
	})();

	// Boolean
	const isElectionTrackerMaxed = afterElectionTracker === 3;

	// { reds: Int, blues: Int }
	const { beforeTrack, afterTrack } = (() => {
		const f = (count, policy, type) => {
			const inc = filterOpt(policy, x => x === type)
				.map(x => 1).valueOrElse(0);

			return count + inc;
		};

		const beforeTrack = prevTurn.afterTrack;
		const afterTrack = {
			reds: f(beforeTrack.reds, log.enactedPolicy, 'fascist'),
			blues: f(beforeTrack.blues, log.enactedPolicy, 'liberal')
		};

		return { beforeTrack, afterTrack };
	})();

	// Boolean
	const isGameEndingPolicyEnacted = afterTrack.reds === 6 || afterTrack.blues === 5;

	// Boolean
	const isHitlerElected = (() => {
		const hitlerIndex = players.findIndex(p => p.role === 'hitler');

		return beforeTrack.reds >= 3 && log.chancellorId === hitlerIndex && isVotePassed;
	})();

	// Boolean
	const isHitlerKilled = (() => {
		const hitlerIndex = players.findIndex(p => p.role === 'hitler');

		return log.execution.map(e => e === hitlerIndex).valueOrElse(false);
	})();

	// Option[String]
	const { presidentDiscard, chancellorDiscard} = (() => {
		const handDiffOpt = mapOpt2(handDiff);
		const policyToHandOpt = mapOpt1(policyToHand);
		const handToPolicyOpt = mapOpt1(handToPolicy);

		const presidentDiscard = handToPolicyOpt(
			handDiffOpt(log.presidentHand, log.chancellorHand)
		);

		const chancellorDiscard = handToPolicyOpt(
			handDiffOpt(
				log.chancellorHand,
				policyToHandOpt(log.enactedPolicy)
			)
		);

		return { presidentDiscard, chancellorDiscard };
	})();

	// Int
	const { beforeDeckSize, afterDeckSize } = (() => {
		const numPoliciesInGame = 17;

		const beforeDeckSize = (() => {
			if (prevTurn.afterDeckSize < 3) {
				const numPoliciesOnTrack = beforeTrack.reds + beforeTrack.blues;
				return numPoliciesInGame - numPoliciesOnTrack;
			} else {
				return prevTurn.afterDeckSize;
			}
		})();

		const afterDeckSize = (() => {
			if (isVotePassed) {
				return beforeDeckSize - 3;
			} else if (isElectionTrackerMaxed) {
				return beforeDeckSize - 1;
			} else {
				return beforeDeckSize;
			}
		})();

		return { beforeDeckSize, afterDeckSize };
	})();

	return Object.assign({}, log, {
		beforeTrack,
		afterTrack,
		beforeDeckSize,
		afterDeckSize,
		isGameEndingPolicyEnacted,
		beforeDeadPlayers,
		afterDeadPlayers,
		beforePlayers,
		afterPlayers,
		players: null,
		alivePlayers,
		votes,
		jas,
		neins,
		isVotePassed,
		isVoteFailed,
		beforeElectionTracker,
		afterElectionTracker,
		isElectionTrackerMaxed,
		isInvestigation,
		isExecution,
		isHitlerKilled,
		isHitlerElected,
		presidentDiscard,
		chancellorDiscard,
		isSpecialElection,
		isPolicyPeek,
		isVeto,
		isVetoSuccessful,
		presidentVeto,
		chancellorVeto
	});
};
