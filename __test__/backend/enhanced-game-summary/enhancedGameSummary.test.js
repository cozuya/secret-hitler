import buildEnhancedGameSummary from '../../../models/game-summary/buildEnhancedGameSummary';
import mockGameSummary from '../../mocks/mockGameSummary';
import { List, Range } from 'immutable';
import { some, none } from 'option';
import matchers from '../../matchers'; // eslint-disable-line no-unused-vars

// mock game tests
import testGenericGame from './testGenericGame';

describe('build enhanced game summary', () => {
	const game = buildEnhancedGameSummary(mockGameSummary);

	it('should convert game summary to immutable collections and options', () => {
		const { summary, turns } = game;

		// general
		expect(summary).toBeTypeOf('object');
		expect(summary._id).toBeTypeOf('string');
		expect(summary.date).toBeInstanceOf(Date);
		expect(summary.players).toBeAList();

		const player = summary.players.first();

		expect(player).toBeTypeOf('object');
		expect(player.username).toBeTypeOf('string');
		expect(player.role).toBeTypeOf('string');

		// logs
		const logs = summary.logs;
		const log = logs.first();

		expect(logs).toBeAList();
		expect(log).toBeTypeOf('object');
		expect(log.presidentId).toBeTypeOf('number');
		expect(log.chancellorId).toBeTypeOf('number');
		expect(log.votes).toBeAList();
		expect(log.presidentHand).toBeAnOption();
		expect(log.presidentHand.value()).toBeTypeOf('object');
		expect(log.execution).toBeAnOption();

		// turns
		expect(turns).toBeAList();
		expect(turns.first()).toBeTypeOf('object');
	});

	describe('it should work for', () => {
		testGenericGame()
	});

	describe('should track turns for', () => {
		describe('mock game summary', () => {
			const { turns } = game;

			it('should track dead players', () => {
				const getBeforeDead = turnNum => turns.get(turnNum).beforeDeadPlayers;
				const getAfterDead = turnNum => turns.get(turnNum).afterDeadPlayers;

				expect(getBeforeDead(0)).toImmutableEqual(List());
				expect(getBeforeDead(1)).toImmutableEqual(List());
				expect(getBeforeDead(2)).toImmutableEqual(List());
				expect(getBeforeDead(3)).toImmutableEqual(List());
				expect(getBeforeDead(4)).toImmutableEqual(List([3]));
				expect(getBeforeDead(5)).toImmutableEqual(List([3]));
				expect(getBeforeDead(6)).toImmutableEqual(List([3]));
				expect(getBeforeDead(7)).toImmutableEqual(List([3, 2]));

				expect(getAfterDead(0)).toImmutableEqual(List());
				expect(getAfterDead(1)).toImmutableEqual(List());
				expect(getAfterDead(2)).toImmutableEqual(List());
				expect(getAfterDead(3)).toImmutableEqual(List([3]));
				expect(getAfterDead(4)).toImmutableEqual(List([3]));
				expect(getAfterDead(5)).toImmutableEqual(List([3]));
				expect(getAfterDead(6)).toImmutableEqual(List([3, 2]));
				expect(getAfterDead(7)).toImmutableEqual(List([3, 2]));
			});

			it('should track alive players', () => {
				const getAlive = turnNum => turns.get(turnNum).alivePlayers;
				const allAlive = List([0, 1, 2, 3, 4, 5, 6]);
				const p3Dead = List([0, 1, 2, 4, 5, 6]);
				const p3And2Dead = List([0, 1, 4, 5, 6]);

				expect(getAlive(0)).toImmutableEqual(allAlive);
				expect(getAlive(1)).toImmutableEqual(allAlive);
				expect(getAlive(2)).toImmutableEqual(allAlive);
				expect(getAlive(3)).toImmutableEqual(allAlive);
				expect(getAlive(4)).toImmutableEqual(p3Dead);
				expect(getAlive(5)).toImmutableEqual(p3Dead);
				expect(getAlive(6)).toImmutableEqual(p3Dead);
				expect(getAlive(7)).toImmutableEqual(p3And2Dead);
			});

			it('should track players', () => {
				const beforePlayers = turnNum => turns.get(turnNum).beforePlayers;

				expect(beforePlayers(0).first()).toEqual({
					id: 0,
					username: 'Uther',
					role: 'liberal',
					loyalty: 'liberal',
					isDead: false
				});
			});

			it('should track votes', () => {
				const getVotes = turnNum => turns.get(turnNum).votes
					.map(v => v.isSome() ? v.value() : null);

				// immutable collections don't deep compare so convert to array then check
				const allJas = Range(0, 7).map(i => true).toArray();

				Range(0, 8).forEach(i => {
					expect(getVotes(i).size).toBe(7);
				});

				expect(getVotes(0).toArray()).toEqual(allJas);
				expect(getVotes(5).toArray()).toEqual([ true, false, false, null, false, false, false ]);
				expect(getVotes(7).toArray()).toEqual([ true, false, null, null, true, true, true ]);
			});

			it('should track jas', () => {
				const jas = turnNum => turns.get(turnNum).jas;

				expect(jas(0)).toBe(7);
				expect(jas(1)).toBe(7);
				expect(jas(2)).toBe(7);
				expect(jas(3)).toBe(5);
				expect(jas(4)).toBe(2);
				expect(jas(5)).toBe(1);
				expect(jas(6)).toBe(6);
				expect(jas(7)).toBe(4);
			});

			it('should track neins', () => {
				const neins = turnNum => turns.get(turnNum).neins;

				expect(neins(0)).toBe(0);
				expect(neins(1)).toBe(0);
				expect(neins(2)).toBe(0);
				expect(neins(3)).toBe(2);
				expect(neins(4)).toBe(4);
				expect(neins(5)).toBe(5);
				expect(neins(6)).toBe(0);
				expect(neins(7)).toBe(1);
			});

			it('should track successful votes', () => {
				const getIsVotePassed = turnNum => turns.get(turnNum).isVotePassed;

				expect(getIsVotePassed(0)).toBe(true);
				expect(getIsVotePassed(3)).toBe(true);
				expect(getIsVotePassed(5)).toBe(false);
				expect(getIsVotePassed(7)).toBe(true);
			});

			it('should track the election tracker', () => {
				const beforeElectionTracker = turnNum => turns.get(turnNum).beforeElectionTracker;
				const afterElectionTracker = turnNum => turns.get(turnNum).afterElectionTracker;
				const isElectionTrackerMaxed = turnNum => turns.get(turnNum).isElectionTrackerMaxed;

				expect(beforeElectionTracker(0)).toBe(0);
				expect(beforeElectionTracker(1)).toBe(0);
				expect(beforeElectionTracker(2)).toBe(0);
				expect(beforeElectionTracker(3)).toBe(0);
				expect(beforeElectionTracker(4)).toBe(0);
				expect(beforeElectionTracker(5)).toBe(1);
				expect(beforeElectionTracker(6)).toBe(2);
				expect(beforeElectionTracker(7)).toBe(0);

				expect(afterElectionTracker(0)).toBe(0);
				expect(afterElectionTracker(1)).toBe(0);
				expect(afterElectionTracker(2)).toBe(0);
				expect(afterElectionTracker(3)).toBe(0);
				expect(afterElectionTracker(4)).toBe(1);
				expect(afterElectionTracker(5)).toBe(2);
				expect(afterElectionTracker(6)).toBe(0);
				expect(afterElectionTracker(7)).toBe(0);

				expect(isElectionTrackerMaxed(0)).toBe(false);
				expect(isElectionTrackerMaxed(1)).toBe(false);
				expect(isElectionTrackerMaxed(2)).toBe(false);
				expect(isElectionTrackerMaxed(3)).toBe(false);
				expect(isElectionTrackerMaxed(4)).toBe(false);
				expect(isElectionTrackerMaxed(5)).toBe(false);
				expect(isElectionTrackerMaxed(6)).toBe(false);
				expect(isElectionTrackerMaxed(7)).toBe(false);
			});

			it('should track the deck size', () => {
				const beforeDeckSize = turnNum => turns.get(turnNum).beforeDeckSize;
				const afterDeckSize = turnNum => turns.get(turnNum).afterDeckSize;

				expect(beforeDeckSize(0)).toBe(17);
				expect(beforeDeckSize(1)).toBe(14);
				expect(beforeDeckSize(2)).toBe(11);
				expect(beforeDeckSize(3)).toBe(8);
				expect(beforeDeckSize(4)).toBe(5);
				expect(beforeDeckSize(5)).toBe(5);
				expect(beforeDeckSize(6)).toBe(5);
				expect(beforeDeckSize(7)).toBe(12);

				expect(afterDeckSize(0)).toBe(14);
				expect(afterDeckSize(1)).toBe(11);
				expect(afterDeckSize(2)).toBe(8);
				expect(afterDeckSize(3)).toBe(5);
				expect(afterDeckSize(4)).toBe(5);
				expect(afterDeckSize(5)).toBe(5);
				expect(afterDeckSize(6)).toBe(2);
				expect(afterDeckSize(7)).toBe(9);
			});

			it('should track enacted policies', () => {
				const getEnactedPolicy = turnNum => turns.get(turnNum).enactedPolicy;

				expect(getEnactedPolicy(0)).toEqual(some('fascist'));
				expect(getEnactedPolicy(1)).toEqual(some('fascist'));
				expect(getEnactedPolicy(3)).toEqual(some('fascist'));
				expect(getEnactedPolicy(5)).toEqual(none);
				expect(getEnactedPolicy(7)).toEqual(some('fascist'));
			});

			it('should track president hands', () => {
				const presidentHand = turnNum => turns.get(turnNum).presidentHand;

				expect(presidentHand(0)).toEqual(some({ reds: 2, blues: 1 }));
				expect(presidentHand(1)).toEqual(some({ reds: 2, blues: 1 }));
				expect(presidentHand(2)).toEqual(some({ reds: 1, blues: 2 }));
				expect(presidentHand(3)).toEqual(some({ reds: 2, blues: 1 }));
				expect(presidentHand(4)).toEqual(none);
				expect(presidentHand(5)).toEqual(none);
				expect(presidentHand(6)).toEqual(some({ reds: 2, blues: 1 }));
				expect(presidentHand(7)).toEqual(some({ reds: 2, blues: 1 }));
			});

			it('should track president claims', () => {
				const presidentClaim = turnNum => turns.get(turnNum).presidentClaim;

				expect(presidentClaim(0)).toEqual(some({ reds: 2, blues: 1 }));
				expect(presidentClaim(1)).toEqual(some({ reds: 2, blues: 1 }));
				expect(presidentClaim(2)).toEqual(some({ reds: 2, blues: 1 }));
				expect(presidentClaim(3)).toEqual(some({ reds: 2, blues: 1 }));
				expect(presidentClaim(4)).toEqual(none);
				expect(presidentClaim(5)).toEqual(none);
				expect(presidentClaim(6)).toEqual(some({ reds: 2, blues: 1 }));
				expect(presidentClaim(7)).toEqual(none);
			});

			it('should track president discard', () => {
				const presidentDiscard = turnNum => turns.get(turnNum).presidentDiscard;

				expect(presidentDiscard(0)).toEqual(some('liberal'));
				expect(presidentDiscard(1)).toEqual(some('fascist'));
				expect(presidentDiscard(2)).toEqual(some('liberal'));
				expect(presidentDiscard(3)).toEqual(some('fascist'));
				expect(presidentDiscard(4)).toEqual(none);
				expect(presidentDiscard(5)).toEqual(none);
				expect(presidentDiscard(6)).toEqual(some('liberal'));
				expect(presidentDiscard(7)).toEqual(some('liberal'));
			});

			it('should track chancellor hands', () => {
				const chancellorHand = turnNum => turns.get(turnNum).chancellorHand;

				expect(chancellorHand(0)).toEqual(some({ reds: 2, blues: 0 }));
				expect(chancellorHand(1)).toEqual(some({ reds: 1, blues: 1 }));
				expect(chancellorHand(2)).toEqual(some({ reds: 1, blues: 1 }));
				expect(chancellorHand(3)).toEqual(some({ reds: 1, blues: 1 }));
				expect(chancellorHand(4)).toEqual(none);
				expect(chancellorHand(5)).toEqual(none);
				expect(chancellorHand(6)).toEqual(some({ reds: 2, blues: 0 }));
				expect(chancellorHand(7)).toEqual(some({ reds: 2, blues: 0 }));
			});

			it('should track chancellor claims', () => {
				const chancellorClaim = turnNum => turns.get(turnNum).chancellorClaim;

				expect(chancellorClaim(0)).toEqual(some({ reds: 2, blues: 0 }));
				expect(chancellorClaim(1)).toEqual(some({ reds: 2, blues: 0 }));
				expect(chancellorClaim(2)).toEqual(some({ reds: 2, blues: 0 }));
				expect(chancellorClaim(3)).toEqual(some({ reds: 2, blues: 0 }));
				expect(chancellorClaim(4)).toEqual(none);
				expect(chancellorClaim(5)).toEqual(none);
				expect(chancellorClaim(6)).toEqual(some({ reds: 2, blues: 0 }));
				expect(chancellorClaim(7)).toEqual(none);
			});

			it('should track chancellor discard', () => {
				const chancellorDiscard = turnNum => turns.get(turnNum).chancellorDiscard;

				expect(chancellorDiscard(0)).toEqual(some('fascist'));
				expect(chancellorDiscard(1)).toEqual(some('liberal'));
				expect(chancellorDiscard(2)).toEqual(some('liberal'));
				expect(chancellorDiscard(3)).toEqual(some('liberal'));
				expect(chancellorDiscard(4)).toEqual(none);
				expect(chancellorDiscard(5)).toEqual(none);
				expect(chancellorDiscard(6)).toEqual(some('fascist'));
				expect(chancellorDiscard(7)).toEqual(some('fascist'));
			});

			it('should track executions', () => {
				const execution = turnNum => turns.get(turnNum).isExecution;

				expect(execution(0)).toBe(false);
				expect(execution(1)).toBe(false);
				expect(execution(2)).toBe(false);
				expect(execution(3)).toBe(true);
				expect(execution(4)).toBe(false);
				expect(execution(5)).toBe(false);
				expect(execution(6)).toBe(true);
				expect(execution(7)).toBe(false);
			});

			it('should track investigations', () => {
				const investigation = turnNum => turns.get(turnNum).isInvestigation;

				expect(investigation(0)).toBe(false);
				expect(investigation(1)).toBe(true);
				expect(investigation(2)).toBe(false);
				expect(investigation(3)).toBe(false);
				expect(investigation(4)).toBe(false);
				expect(investigation(5)).toBe(false);
				expect(investigation(6)).toBe(false);
				expect(investigation(7)).toBe(false);
			});

			it('should track if hitler is killed', () => {
				const isHitlerKilled = turnNum => turns.get(turnNum).isHitlerKilled;

				expect(isHitlerKilled(0)).toBe(false);
				expect(isHitlerKilled(1)).toBe(false);
				expect(isHitlerKilled(2)).toBe(false);
				expect(isHitlerKilled(3)).toBe(false);
				expect(isHitlerKilled(4)).toBe(false);
				expect(isHitlerKilled(5)).toBe(false);
				expect(isHitlerKilled(6)).toBe(false);
				expect(isHitlerKilled(7)).toBe(false);
			});
		});
	});

	describe('should track general game properties', () => {
		it('should track player indexes', () => {
			expect(game.indexOf('Uther')).toEqual(some(0));
			expect(game.indexOf('Jaina')).toEqual(some(1));
			expect(game.indexOf('Rexxar')).toEqual(some(2));
			expect(game.indexOf('Anduin')).toEqual(some(6));
			expect(game.indexOf('Malfurian')).toEqual(some(3));
			expect(game.indexOf('Thrall')).toEqual(some(4));
			expect(game.indexOf('Valeera')).toEqual(some(5));
		});

		it('should track loyalties', () => {
			expect(game.loyaltyOf('Uther')).toEqual(some('liberal'));
			expect(game.loyaltyOf('Jaina')).toEqual(some('liberal'));
			expect(game.loyaltyOf('Rexxar')).toEqual(some('liberal'));
			expect(game.loyaltyOf('Anduin')).toEqual(some('liberal'));
			expect(game.loyaltyOf('Malfurian')).toEqual(some('fascist'));
			expect(game.loyaltyOf('Thrall')).toEqual(some('fascist'));
			expect(game.loyaltyOf('Valeera')).toEqual(some('fascist'));
		});

		it('should track usernames', () => {
			expect(game.usernameOf(0)).toEqual(some('Uther'));
			expect(game.usernameOf(1)).toEqual(some('Jaina'));
			expect(game.usernameOf(2)).toEqual(some('Rexxar'));
			expect(game.usernameOf(3)).toEqual(some('Malfurian'));
			expect(game.usernameOf(4)).toEqual(some('Thrall'));
			expect(game.usernameOf(5)).toEqual(some('Valeera'));
			expect(game.usernameOf(6)).toEqual(some('Anduin'));
		});

		it('should track tags', () => {
			expect(game.tagOf(0)).toEqual(some('Uther [0]'));
			expect(game.tagOf(1)).toEqual(some('Jaina [1]'));
			expect(game.tagOf(2)).toEqual(some('Rexxar [2]'));
			expect(game.tagOf(3)).toEqual(some('Malfurian [3]'));
			expect(game.tagOf(4)).toEqual(some('Thrall [4]'));
			expect(game.tagOf(5)).toEqual(some('Valeera [5]'));
			expect(game.tagOf(6)).toEqual(some('Anduin [6]'));
		});

		it('should track roles', () => {
			expect(game.roleOf('Uther')).toEqual(some('liberal'));
			expect(game.roleOf('Jaina')).toEqual(some('liberal'));
			expect(game.roleOf('Rexxar')).toEqual(some('liberal'));
			expect(game.roleOf('Anduin')).toEqual(some('liberal'));
			expect(game.roleOf('Malfurian')).toEqual(some('fascist'));
			expect(game.roleOf('Thrall')).toEqual(some('hitler'));
			expect(game.roleOf('Valeera')).toEqual(some('fascist'));
		});

		it('should track winners', () => {
			expect(game.isWinner('Uther')).toEqual(some(false));
			expect(game.isWinner('Jaina')).toEqual(some(false));
			expect(game.isWinner('Rexxar')).toEqual(some(false));
			expect(game.isWinner('Anduin')).toEqual(some(false));
			expect(game.isWinner('Malfurian')).toEqual(some(true));
			expect(game.isWinner('Thrall')).toEqual(some(true));
			expect(game.isWinner('Valeera')).toEqual(some(true));
		});

		it('should track winning team', () => {
			expect(game.winningTeam).toBe('fascist');
		});

		it('should track votes', () => {
			expect(game.votesOf('Uther').value().get(4)).toEqual(some({
				ja: true,
				presidentId: 4,
				chancellorId: 2
			}));

			expect(game.votesOf('Malfurian').value().get(5)).toEqual(none);
		});

		it('should track hitler zone', () => {
			expect(game.hitlerZone).toEqual(some(3));
		});

		it('should track player size', () => {
			expect(game.playerSize).toBe(7);
		});

		it('should track shots', () => {
			expect(game.shotsOf('Uther').value()).toImmutableEqual(List([]));
			expect(game.shotsOf('Jaina').value()).toImmutableEqual(List([3]));
		});
	});
});