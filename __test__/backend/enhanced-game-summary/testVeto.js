import buildEnhancedGameSummary from '../../../models/game-summary/buildEnhancedGameSummary';
import { veto } from '../../mocks';
import { List, Range } from 'immutable';
import { some, none } from 'option';
import '../../matchers';

export default () => {
	describe('Veto top deck', () => {
		const game = buildEnhancedGameSummary(veto);
		const { turns } = game

		it('penultimate turn should be veto', () => {
			const turn = turns.get(-2);

			expect(turn.isVeto).toBe(true);
			expect(turn.isElectionTrackerMaxed).toBe(false);
		});

		it('last turn should be top deck', () => {
			const turn = turns.last();

			expect(turn.isElectionTrackerMaxed).toBe(true);
		})
	});
};
