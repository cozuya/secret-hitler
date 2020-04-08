import buildEnhancedGameSummary from '../../../models/game-summary/buildEnhancedGameSummary';
import { p7LiberalWin } from '../../mocks';
import { List, Range } from 'immutable';
import { some, none } from 'option';
import '../../matchers';

export default () => {
	describe('Liberal win: 7p', () => {
		const game = buildEnhancedGameSummary(p7LiberalWin);
		const { turns } = game;

		it('last turn should have hitler elected', () => {
			expect(turns.last().isGameEndingPolicyEnacted).toBe(true);
			expect(game.winningTeam).toBe('liberal');
		});
	});
};
