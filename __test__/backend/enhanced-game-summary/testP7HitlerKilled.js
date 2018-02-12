import buildEnhancedGameSummary from '../../../models/game-summary/buildEnhancedGameSummary';
import { p7HitlerKilled } from '../../mocks';
import { List, Range } from 'immutable';
import { some, none } from 'option';
import matches from '../../matchers';

export default () => {
	describe('Hitler killed: 7p', () => {
		const game = buildEnhancedGameSummary(p7HitlerKilled);
		const { turns } = game;

		it('should track special elections', () => {
			expect(turns.get(0).isSpecialElection).toBe(false);
			expect(turns.get(1).isSpecialElection).toBe(false);
			expect(turns.get(2).isSpecialElection).toBe(false);
			expect(turns.get(3).isSpecialElection).toBe(true);
			expect(turns.get(4).isSpecialElection).toBe(false);
		});

		it('last turn should have hitler killed', () => {
			expect(turns.last().isHitlerKilled).toBe(true);
			expect(game.winningTeam).toBe('liberal');
		});

		it('should track shots', () => {
			expect(game.shotsOf(4)).toEqual(some(List([2])));
		});
	});
};
