import { profileDelta } from '../../../models/profile/utils';
import buildEnhancedGameSummary from '../../../models/game-summary/buildEnhancedGameSummary';
import p7HitlerKilled from '../../mocks/p7HitlerKilled';

export default () => {
	const game = buildEnhancedGameSummary(p7HitlerKilled);

	describe('hitler killed, 7p', () => {
		it('Thrall', () => {
			const delta = profileDelta('Thrall', game);

			expect(delta.stats.matches.allMatches.events).toBe(1);
			expect(delta.stats.matches.allMatches.successes).toBe(1);

			expect(delta.stats.matches.liberal.events).toBe(1);
			expect(delta.stats.matches.liberal.successes).toBe(1);

			expect(delta.stats.matches.fascist.events).toBe(0);
			expect(delta.stats.matches.fascist.successes).toBe(0);

			expect(delta.stats.actions.voteAccuracy.events).toBe(0);
			expect(delta.stats.actions.voteAccuracy.successes).toBe(0);

			expect(delta.stats.actions.shotAccuracy.events).toBe(1);
			expect(delta.stats.actions.shotAccuracy.successes).toBe(1);

			expect(delta.recentGames.loyalty).toBe('liberal');
			expect(delta.recentGames.playerSize).toBe(7);
			expect(delta.recentGames.isWinner).toBe(true);
		});

		it('Jaina', () => {
			const delta = profileDelta('Jaina', game);

			expect(delta.stats.matches.allMatches.events).toBe(1);
			expect(delta.stats.matches.allMatches.successes).toBe(0);

			expect(delta.stats.matches.liberal.events).toBe(0);
			expect(delta.stats.matches.liberal.successes).toBe(0);

			expect(delta.stats.matches.fascist.events).toBe(1);
			expect(delta.stats.matches.fascist.successes).toBe(0);

			expect(delta.stats.actions.voteAccuracy.events).toBe(0);
			expect(delta.stats.actions.voteAccuracy.successes).toBe(0);

			expect(delta.stats.actions.shotAccuracy.events).toBe(0);
			expect(delta.stats.actions.shotAccuracy.successes).toBe(0);

			expect(delta.recentGames.loyalty).toBe('fascist');
			expect(delta.recentGames.playerSize).toBe(7);
			expect(delta.recentGames.isWinner).toBe(false);
		});

		it('Malfurian', () => {
			const delta = profileDelta('Malfurian', game);

			expect(delta.stats.matches.allMatches.events).toBe(1);
			expect(delta.stats.matches.allMatches.successes).toBe(0);

			expect(delta.stats.matches.liberal.events).toBe(0);
			expect(delta.stats.matches.liberal.successes).toBe(0);

			expect(delta.stats.matches.fascist.events).toBe(1);
			expect(delta.stats.matches.fascist.successes).toBe(0);

			expect(delta.stats.actions.voteAccuracy.events).toBe(0);
			expect(delta.stats.actions.voteAccuracy.successes).toBe(0);

			expect(delta.stats.actions.shotAccuracy.events).toBe(0);
			expect(delta.stats.actions.shotAccuracy.successes).toBe(0);

			expect(delta.recentGames.loyalty).toBe('fascist');
			expect(delta.recentGames.playerSize).toBe(7);
			expect(delta.recentGames.isWinner).toBe(false);
		});
	});
};