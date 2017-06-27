import { List, Range } from 'immutable';
import { fromNullable, some, none } from 'option';
import buildReplay from '../../../src/frontend-scripts/replay/buildReplay';
import buildEnhancedGameSummary from '../../../models/game-summary/buildEnhancedGameSummary';
import { veto2 } from '../../mocks';

export default () => {
    it('builds a replay without failing', () => {
        const game = buildEnhancedGameSummary(veto2);
        const replay = buildReplay(game);
        expect(true).toBe(true);
    });
};
