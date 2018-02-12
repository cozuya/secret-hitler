import { List, Range } from 'immutable';
import { fromNullable, some, none } from 'option';
import buildReplay from '../../../src/frontend-scripts/replay/buildReplay';
import buildEnhancedGameSummary from '../../../models/game-summary/buildEnhancedGameSummary';
import mockGame from '../../mocks/mockGameSummary';

export default () => {
	const game = buildEnhancedGameSummary(mockGame);
	const replay = buildReplay(game);

	describe('generic game', () => {
		it('should have something', () => {
			expect(replay).toBeInstanceOf(List);
			expect(replay.size).toBeGreaterThanOrEqual(mockGame.logs.length);
		});

		const testSnapshot = (snapshot, turnNum, phase, track, deadPlayers, electionTracker) => {
			expect(snapshot.turnNum).toBe(turnNum);
			expect(snapshot.phase).toBe(phase);
			expect(snapshot.track).toEqual(track);
			snapshot.players.forEach((p, i) => {
				if (deadPlayers.includes(i)) expect(p.isDead).toBe(true);
				else expect(p.isDead).toBe(false);
			});
		};

		const findPhase = (phase, turnNum) => replay.find(t => {
			return t.turnNum === turnNum && t.phase === phase;
		});

		const testCandidacy = (snapshot, turnNum, phase, track, deadPlayers, electionTracker, presidentId) => {
			testSnapshot(snapshot, turnNum, phase, track, deadPlayers, electionTracker);
			expect(snapshot.presidentId).toBe(presidentId);
		};

		const testNomination = (turnNum, presidentId, chancellorId) => {
			const snapshot = findPhase('nomination', turnNum);
			expect(snapshot.presidentId).toBe(presidentId);
			expect(snapshot.chancellorId).toBe(chancellorId);
		};

		const testElection = (turnNum, votes) => {
			const snapshot = findPhase('election', turnNum);
			expect(snapshot.votes).toListOptionEqual(votes);
		};

		const testLegislation = (govt, turnNum, hand, discard, claim) => {
			if (!hand) {
				expect(findPhase(govt + 'Legislation'), turnNum).toBeUndefined();
				return;
			}

			const snapshot = findPhase(govt + 'Legislation', turnNum);

			expect(snapshot[govt + 'Hand']).toEqual(hand);
			expect(snapshot[govt + 'Discard']).toEqual(discard);
			expect(snapshot[govt + 'Claim']).toEqual(claim);
		};

		const testPresidentLegislation = testLegislation.bind(null, 'president');

		const testChancellorLegislation = testLegislation.bind(null, 'chancellor');

		const testPolicyEnaction = (turnNum, policy) => {
			if (!policy) {
				expect(findPhase('policyEnaction', turnNum)).toBeUndefined();
				return;
			}

			const snapshot = findPhase('policyEnaction', turnNum);
			expect(snapshot.enactedPolicy).toEqual(policy);
		};

		const testInvestigation = (turnNum, investigation, claim) => {
			if (!investigation) {
				expect(findPhase('investigation', turnNum)).toBeUndefined();
				return;
			}

			const snapshot = findPhase('investigation', turnNum);
			expect(snapshot.investigationId).toEqual(investigation);
			expect(snapshot.investigationClaim).toEqual(claim);
		};

		const testExecution = (turnNum, execution) => {
			if (!execution) {
				expect(findPhase('execution', turnNum)).toBeUndefined();
				return;
			}

			const snapshot = findPhase('execution', turnNum);
			expect(snapshot.execution).toBe(execution);
			expect(snapshot.players.get(execution)).toMatchObject({ isDead: true });
		};

		const findCandidacy = findPhase.bind(null, 'candidacy');

		it('find phase should work', () => {
			expect(findPhase('candidacy', 0)).toBeDefined();
			expect(findPhase('candidacy', 6)).toBeDefined();
		});

		describe('should take the correct snapshot for turn', () => {
			it('0', () => {
				testCandidacy(findCandidacy(0), 0, 'candidacy', {
					reds: 0,
					blues: 0
				}, [], 0, 0);

				testNomination(0, 0, 1);

				testElection(0, Range(0, 7).map(i => some(true)));

				testPresidentLegislation(0, { reds: 2, blues: 1 }, 'liberal', some({ reds: 2, blues: 1 }));

				testChancellorLegislation(0, { reds: 2, blues: 0 }, some('fascist'), some({ reds: 2, blues: 0 }));

				testPolicyEnaction(0, 'fascist');

				testExecution(0, null);

				testInvestigation(0, null);
			});

			it('1', () => {
				testCandidacy(findCandidacy(1), 1, 'candidacy', {
					reds: 1,
					blues: 0
				}, [], 0, 1);

				testNomination(1, 1, 3);

				testElection(1, Range(0, 7).map(i => some(true)));

				testPresidentLegislation(1, { reds: 2, blues: 1 }, 'fascist', some({ reds: 2, blues: 1 }));

				testChancellorLegislation(1, { reds: 1, blues: 1 }, some('liberal'), some({ reds: 2, blues: 0 }));

				testPolicyEnaction(1, 'fascist');

				testExecution(1, null);

				testInvestigation(1, 4, some('fascist'));
			});

			it('3', () => {
				testExecution(3, 3);

				testInvestigation(3, null);
			});

			it('5', () => {
				testCandidacy(findCandidacy(5), 5, 'candidacy', {
					reds: 4,
					blues: 0
				}, [3], 1, 5);

				testNomination(5, 5, 4);

				testElection(5, List([true, false, false, null, false, false, false]).map(x => fromNullable(x)));

				testPresidentLegislation(5, null, none);

				testChancellorLegislation(5, null, none);

				testPolicyEnaction(5, null);

				testExecution(5, null);

				testInvestigation(5, null);
			});

			it('6', () => {
				testCandidacy(findCandidacy(6), 6, 'candidacy', {
					reds: 4,
					blues: 0
				}, [3], 2, 6);

				testNomination(6, 6, 2);

				testElection(6, List([true, true, true, null, true, true, true]).map(x => fromNullable(x)));

				testPresidentLegislation(6, { reds: 2, blues: 1 }, 'liberal', some({ reds: 2, blues: 1 }));

				testChancellorLegislation(6, { reds: 2, blues: 0 }, some('fascist'), some({ reds: 2, blues: 0 }));

				testPolicyEnaction(6, 'fascist');

				testExecution(6, 2);

				testInvestigation(6, null);
			});

			it('7', () => {
				testCandidacy(findCandidacy(7), 7, 'candidacy', {
					reds: 5,
					blues: 0
				}, [2, 3], 0, 0);

				testNomination(7, 0, 5);

				testPresidentLegislation(7, { reds: 2, blues: 1 }, 'liberal', none);

				testChancellorLegislation(7, { reds: 2, blues: 0 }, some('fascist'), none);

				testElection(7, List([true, false, null, null, true, true, true]).map(x => fromNullable(x)));

				testPolicyEnaction(7, 'fascist');

				testExecution(7, null);

				testInvestigation(7, null);
			});
		});

		it('should have a game over state', () => {
			const snapshot = replay.last();
			expect(snapshot).toBeDefined();
			expect(snapshot.gameOver).toBe(true);
		});
	});
};
