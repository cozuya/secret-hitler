import buildEnhancedGameSummary from '../../../models/game-summary/buildEnhancedGameSummary';
import { hitlerKilledLiberalLoss } from '../../mocks';
import { List, Range } from 'immutable';
import { some, none } from 'option';
import matches from '../../matchers';

export default () => {
	describe('hitler killed so liberals should win', () => {
		const game = buildEnhancedGameSummary(hitlerKilledLiberalLoss);
		const { turns } = game;

		it('liberals should be winning team', () => {
			expect(game.winningTeam).toBe('liberal');
			expect(game.isWinner('onebobby')).toEqual(some(true));
		});
	});
};
