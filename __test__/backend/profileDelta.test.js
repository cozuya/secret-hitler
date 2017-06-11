import { profileDelta } from '../../models/profile/utils';
import mockGameSummary from '../mocks/mockGameSummary';
import EnhancedGameSummary from '../../models/game-summary/EnhancedGameSummary';

describe('profileDelta', () => {
	const game = new EnhancedGameSummary(mockGameSummary);

	it('should calculate the correct delta for Jaina', () => {
		const delta = profileDelta('Jaina', game);

		expect(delta.stats.matches.allMatches.events).toBe(1);
		expect(delta.stats.matches.allMatches.successes).toBe(0);

		expect(delta.stats.matches.liberal.events).toBe(1);
		expect(delta.stats.matches.liberal.successes).toBe(0);

		expect(delta.stats.matches.fascist.events).toBe(0);
		expect(delta.stats.matches.fascist.successes).toBe(0);

		expect(delta.stats.actions.voteAccuracy.events).toBe(5);
		expect(delta.stats.actions.voteAccuracy.successes).toBe(5);

		expect(delta.stats.actions.shotAccuracy.events).toBe(1);
		expect(delta.stats.actions.shotAccuracy.successes).toBe(1);

		expect(delta.recentGames.loyalty).toBe('liberal');
		expect(delta.recentGames.playerSize).toBe(7);
		expect(delta.recentGames.isWinner).toBe(false);
		expect(delta.recentGames.date).toBeDefined();
	});

	it('should calculate the correct delta for Valeera', () => {
		const delta = profileDelta('Valeera', game);

		expect(delta.stats.matches.allMatches.events).toBe(1);
		expect(delta.stats.matches.allMatches.successes).toBe(1);

		expect(delta.stats.matches.liberal.events).toBe(0);
		expect(delta.stats.matches.liberal.successes).toBe(0);

		expect(delta.stats.matches.fascist.events).toBe(1);
		expect(delta.stats.matches.fascist.successes).toBe(1);

		expect(delta.stats.actions.voteAccuracy.events).toBe(0);
		expect(delta.stats.actions.voteAccuracy.successes).toBe(0);

		expect(delta.stats.actions.shotAccuracy.events).toBe(0);
		expect(delta.stats.actions.shotAccuracy.successes).toBe(0);

		expect(delta.recentGames.loyalty).toBe('fascist');
		expect(delta.recentGames.playerSize).toBe(7);
		expect(delta.recentGames.isWinner).toBe(true);
		expect(delta.recentGames.date).toBeDefined();
	});

	it('should calculate the correct delta for Uther', () => {
		const delta = profileDelta('Uther', game);

		expect(delta.stats.matches.allMatches.events).toBe(1);
		expect(delta.stats.matches.allMatches.successes).toBe(0);

		expect(delta.stats.matches.liberal.events).toBe(1);
		expect(delta.stats.matches.liberal.successes).toBe(0);

		expect(delta.stats.matches.fascist.events).toBe(0);
		expect(delta.stats.matches.fascist.successes).toBe(0);

		expect(delta.stats.actions.voteAccuracy.events).toBe(5);
		expect(delta.stats.actions.voteAccuracy.successes).toBe(3);

		expect(delta.stats.actions.shotAccuracy.events).toBe(0);
		expect(delta.stats.actions.shotAccuracy.successes).toBe(0);

		expect(delta.recentGames.loyalty).toBe('liberal');
		expect(delta.recentGames.playerSize).toBe(7);
		expect(delta.recentGames.isWinner).toBe(false);
		expect(delta.recentGames.date).toBeDefined();
	});

	it('should calculate the correct delta for Anduin', () => {
		const delta = profileDelta('Anduin', game);

		expect(delta.stats.matches.allMatches.events).toBe(1);
		expect(delta.stats.matches.allMatches.successes).toBe(0);

		expect(delta.stats.matches.liberal.events).toBe(1);
		expect(delta.stats.matches.liberal.successes).toBe(0);

		expect(delta.stats.matches.fascist.events).toBe(0);
		expect(delta.stats.matches.fascist.successes).toBe(0);

		expect(delta.stats.actions.shotAccuracy.events).toBe(1);
		expect(delta.stats.actions.shotAccuracy.successes).toBe(0);

		expect(delta.recentGames.loyalty).toBe('liberal');
		expect(delta.recentGames.playerSize).toBe(7);
		expect(delta.recentGames.isWinner).toBe(false);
		expect(delta.recentGames.date).toBeDefined();
	});
});