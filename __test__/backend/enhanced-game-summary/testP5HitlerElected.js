import buildEnhancedGameSummary from '../../../models/game-summary/buildEnhancedGameSummary';
import p5HitlerElected from '../../mocks/p5HitlerElected';
import { List, Range } from 'immutable';
import { some, none } from 'option';
import matches from '../../matchers';

export default () => {
	describe('Hitler elected: 5p', () => {
		const game = buildEnhancedGameSummary(p5HitlerElected);
		const { turns } = game

		if('turn 3 should be a top deck', () => {
			expect(turns.get(3).isElectionTrackerMaxed).toBe(true);
			expect(turns.get(4).isElectionTrackerMaxed).toBe(false);
		});

		it('last turn should have hitler elected', () => {
			expect(turns.last().isHitlerElected).toBe(true);
			expect(game.winningTeam).toBe('fascist');
		});

		it('should track the deck size', () => {
			const beforeDeckSize = turnNum => turns.get(turnNum).beforeDeckSize;
			const afterDeckSize = turnNum => turns.get(turnNum).afterDeckSize;

			expect(beforeDeckSize(0)).toBe(17);
			expect(beforeDeckSize(1)).toBe(14);
			expect(beforeDeckSize(2)).toBe(14);
			expect(beforeDeckSize(3)).toBe(14);
			expect(beforeDeckSize(4)).toBe(13);
			expect(beforeDeckSize(5)).toBe(10);

			expect(afterDeckSize(0)).toBe(14);
			expect(afterDeckSize(1)).toBe(14);
			expect(afterDeckSize(2)).toBe(14);
			expect(afterDeckSize(3)).toBe(13);
			expect(afterDeckSize(4)).toBe(10);
			expect(afterDeckSize(5)).toBe(10);
		});
	});
};