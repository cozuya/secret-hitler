/* eslint-disable no-use-before-define */

import { List } from 'immutable';
import { handToString, mapOpt1, capitalize } from '../../../utils';

export default function buildReplay(game) {
	// iterates through a game stepwise by phase, generating a list of snapshots along the way
	function traverse(tick, list) {
		if (tick.gameOver) {
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
		const { turnNum, phase, gameOver } = tick;

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
			gameOver,
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
		const gameOverText = text => text + ` ${capitalize(game.winningTeam)} win the game.`;

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
				description: gameOver
					? gameOverText('Hitler is elected.')
					: `The vote ${isVotePassed ? 'passes' : 'fails'} ${jas} to ${neins}`
			});
		case 'topDeck':
			return midEnactionAdd({ presidentId, chancellorId,
				electionTracker: afterElectionTracker,
				description: `The top policy is enacted.`
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
				description: gameOver
					? gameOverText(`The last ${enactedPolicy.value()} policy is played.`)
					: `A ${enactedPolicy.value()} policy is enacted`
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
				description: gameOver
					? gameOverText('Hitler is killed.')
					: `${usernameOf(presidentId).value()} executes ${usernameOf(execution.value()).value()}`
			});
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

		const next = nextPhase => ({ turnNum, phase: nextPhase, gameOver: false });

		const jump = () => ({ turnNum: turnNum + 1, phase: 'candidacy', gameOver: false });

		const gameOver = () => {
			return Object.assign({}, tick, { gameOver: true });
		}

		switch (phase) {
		case 'candidacy':
			return next('nomination');
		case 'nomination':
			return next('election');
		case 'election':
			if (isHitlerElected) return gameOver();
			else if (isVotePassed) return next('presidentLegislation');
			else if (isElectionTrackerMaxed) return next('topDeck');
			else return jump();
		case 'topDeck':
			return next('policyEnaction');
		case 'presidentLegislation':
			return next('chancellorLegislation');
		case 'chancellorLegislation':
			return next('policyEnaction');
		case 'policyEnaction':
			if (isGameEndingPolicyEnacted) return gameOver();
			else if (isInvestigation) return next('investigation');
			else if (isExecution) return next('execution');
			else return jump();
		case 'investigation':
			return jump();
		case 'execution':
			if (isHitlerKilled) return gameOver();
			else return jump();
		}
	}

	// main method
	return traverse(
		{ turnNum: 0, phase: 'candidacy', gameOver: false },
		List()
	);
}