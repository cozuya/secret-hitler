import { profileDelta } from '../../../models/profile/utils';
import buildEnhancedGameSummary from '../../../models/game-summary/buildEnhancedGameSummary';
import { p5HitlerElected } from '../../mocks';

export default () => {
	const game = buildEnhancedGameSummary(p5HitlerElected);

	describe('hitler elected, 5p', () => {
		it('Uther', () => {
			const delta = profileDelta('Uther', game);

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
			expect(delta.recentGames.playerSize).toBe(5);
			expect(delta.recentGames.isWinner).toBe(true);
			expect(delta.recentGames.date).toBeDefined();
		});

		it('Jaina', () => {
			const delta = profileDelta('Jaina', game);

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
			expect(delta.recentGames.playerSize).toBe(5);
			expect(delta.recentGames.isWinner).toBe(true);
			expect(delta.recentGames.date).toBeDefined();
		});

		it('Rexxar', () => {
			const delta = profileDelta('Rexxar', game);

			expect(delta.stats.matches.allMatches.events).toBe(1);
			expect(delta.stats.matches.allMatches.successes).toBe(0);

			expect(delta.stats.matches.liberal.events).toBe(1);
			expect(delta.stats.matches.liberal.successes).toBe(0);

			expect(delta.stats.matches.fascist.events).toBe(0);
			expect(delta.stats.matches.fascist.successes).toBe(0);

			expect(delta.stats.actions.voteAccuracy.events).toBe(2);
			expect(delta.stats.actions.voteAccuracy.successes).toBe(1);

			expect(delta.stats.actions.shotAccuracy.events).toBe(0);
			expect(delta.stats.actions.shotAccuracy.successes).toBe(0);

			expect(delta.recentGames.loyalty).toBe('liberal');
			expect(delta.recentGames.playerSize).toBe(5);
			expect(delta.recentGames.isWinner).toBe(false);
			expect(delta.recentGames.date).toBeDefined();
		});

		it('Malfurian', () => {
			const delta = profileDelta('Malfurian', game);

			expect(delta.stats.matches.allMatches.events).toBe(1);
			expect(delta.stats.matches.allMatches.successes).toBe(0);

			expect(delta.stats.matches.liberal.events).toBe(1);
			expect(delta.stats.matches.liberal.successes).toBe(0);

			expect(delta.stats.matches.fascist.events).toBe(0);
			expect(delta.stats.matches.fascist.successes).toBe(0);

			expect(delta.stats.actions.voteAccuracy.events).toBe(2);
			expect(delta.stats.actions.voteAccuracy.successes).toBe(2);

			expect(delta.stats.actions.shotAccuracy.events).toBe(0);
			expect(delta.stats.actions.shotAccuracy.successes).toBe(0);

			expect(delta.recentGames.loyalty).toBe('liberal');
			expect(delta.recentGames.playerSize).toBe(5);
			expect(delta.recentGames.isWinner).toBe(false);
			expect(delta.recentGames.date).toBeDefined();
		});
	});
};
