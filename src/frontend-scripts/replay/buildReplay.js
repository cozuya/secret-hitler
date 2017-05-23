/* eslint-disable no-use-before-define */

import { List } from 'immutable';
import { handToString, mapOpt1, capitalize } from '../../../utils';

export default function buildReplay(game) {
	// iterates through a game stepwise by phase, generating a list of snapshots along the way
	function traverse(tick, list) {
		if (tick.phase === 'gameOver') {
			return list.push(snapshot(tick));
		} else {
			return traverse(
				step(tick),
				list.push(snapshot(tick))
			);
		}
	}

	// given the current turn and phase, returns a slice of that turn showing the game at that instant in time
	function snapshot(tick) {
		const { turnNum, phase } = tick;

		const {
			beforeTrack,
			afterTrack,
			beforePlayers,
			afterPlayers,
			beforeElectionTracker,
			afterElectionTracker,
			beforeDeckSize,
			afterDeckSize,
			presidentId,
			chancellorId,
			votes,
			enactedPolicy,
			presidentHand,
			chancellorHand,
			presidentClaim,
			chancellorClaim,
			presidentDiscard,
			chancellorDiscard,
			isVotePassed,
			jas,
			neins,
			execution,
			isHitlerKilled,
			isHitlerElected,
			investigationId,
			investigationClaim
		} = game.turns.get(turnNum);


		const base = {
			turnNum,
			phase,
			track: beforeTrack,
			deckSize: beforeDeckSize,
			players: beforePlayers,
			electionTracker: beforeElectionTracker
		};

		const add = middleware => obj => Object.assign({}, base, middleware, obj);

		const preEnactionAdd = add({
			players: beforePlayers,
			track: beforeTrack,
			electionTracker: beforeElectionTracker,
			deckSize: beforeDeckSize,
		});

		const midEnactionAdd = add({
			players: beforePlayers,
			track: beforeTrack,
			electionTracker: afterElectionTracker,
			deckSize: afterDeckSize
		});

		const postEnactionAdd = add({
			players: afterPlayers,
			track: afterTrack,
			electionTracker: afterElectionTracker,
			deckSize: afterDeckSize
		});

		const handToStringOpt = mapOpt1(handToString);
		const usernameOf = game.usernameOf;
		const claimToValue = claim => handToStringOpt(claim).valueOrElse('nothing');

		switch(phase) {
		case 'candidacy':
			return preEnactionAdd({ presidentId,
				description: `${usernameOf(presidentId).value()} is President`
			});
		case 'nomination':
			return preEnactionAdd({ presidentId, chancellorId,
				description: `${usernameOf(presidentId).value()} nominates ${usernameOf(chancellorId).value()} as Chancellor`
			});
		case 'election':
			return preEnactionAdd({ presidentId, chancellorId, votes,
				electionTracker: afterElectionTracker,
				description: `The vote ${isVotePassed ? 'passes' : 'fails'} ${jas} to ${neins}`
			});
		case 'presidentLegislation':
			return midEnactionAdd({ presidentId, chancellorId, presidentClaim,
				presidentHand: presidentHand.value(),
				presidentDiscard: presidentDiscard.value(),
				description: `${usernameOf(presidentId).value()} draws 
					${handToString(presidentHand.value())}
					and claims ${claimToValue(presidentClaim)}`
			});
		case 'chancellorLegislation':
			return midEnactionAdd({ presidentId, chancellorId, chancellorClaim,
				chancellorHand: chancellorHand.value(),
				chancellorDiscard: chancellorDiscard.value(),
				description: `${usernameOf(chancellorId).value()} draws
					${handToString(chancellorHand.value())}
					and claims ${claimToValue(chancellorClaim)}`
			});
		case 'policyEnaction':
			return postEnactionAdd({ presidentId, chancellorId,
				players: beforePlayers,
				enactedPolicy: enactedPolicy.value(),
				description: `A ${enactedPolicy.value()} policy is enacted`
			});
		case 'investigation':
			return postEnactionAdd({ presidentId, chancellorId,
				investigationId: investigationId.value(),
				investigationClaim: investigationClaim,
				description: `${usernameOf(presidentId).value()} investigates ${usernameOf(investigationId.value()).value()} and claims ${investigationClaim.valueOrElse('nothing')}`
			});
		case 'execution':
			return postEnactionAdd({ presidentId, chancellorId,
				execution: execution.value(),
				description: `${usernameOf(presidentId).value()} executes ${usernameOf(execution.value()).value()}`
			});
		case 'gameOver':
			const { ending, description } = (() => {
				const f = (ending, description) => ({ ending, description: description + winners });

				const winners = `${capitalize(game.winningTeam)} win the game.`;

				if (isHitlerElected) {
					return f('hitlerElected', 'Hitler is elected.');
				} else if (isHitlerKilled) {
					return f('hitlerKilled', 'Hitler is killed.');
				} else {
					const policy = enactedPolicy.value();
					return f(
						policy + 'Policy',
						`The last ${enactedPolicy.value()} is played.`
					);
				}
			})();

			return postEnactionAdd({ presidentId, chancellorId, ending, description });
		}
	}

	// given the current turn and phase, returns the next (or same) turn and phase
	function step(tick) {
		const { turnNum, phase } = tick;

		const {
			isVotePassed,
			isGameEndingPolicyEnacted,
			isHitlerElected,
			isElectionTrackerMaxed,
			isInvestigation,
			isExecution,
			isHitlerKilled
		} = game.turns.get(turnNum);

		const next = nextPhase => ({ turnNum, phase: nextPhase });

		const jump = () => ({ turnNum: turnNum + 1, phase: 'candidacy' });

		switch (phase) {
		case 'candidacy':
			return next('nomination');
		case 'nomination':
			return next('election');
		case 'election':
			if (isHitlerElected) return next('gameOver');
			else if (isVotePassed) return next('presidentLegislation');
			else if (isElectionTrackerMaxed) return next('policyEnaction');
			else return jump();
		case 'presidentLegislation':
			return next('chancellorLegislation');
		case 'chancellorLegislation':
			return next('policyEnaction');
		case 'policyEnaction':
			if (isGameEndingPolicyEnacted) return next('gameOver');
			else if (isInvestigation) return next('investigation');
			else if (isExecution) return next('execution');
			else return jump();
		case 'investigation':
			return jump();
		case 'execution':
			if (isHitlerKilled) return next('gameOver');
			else return jump();
		}
	}

	// main method
	return traverse(
		{ turnNum: 0, phase: 'candidacy' },
		List()
	);
}