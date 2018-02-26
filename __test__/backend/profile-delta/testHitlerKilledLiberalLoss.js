import { profileDelta } from '../../../models/profile/utils';
import buildEnhancedGameSummary from '../../../models/game-summary/buildEnhancedGameSummary';
import { hitlerKilledLiberalLoss } from '../../mocks';

export default () => {
	const game = buildEnhancedGameSummary(hitlerKilledLiberalLoss);

	it('onebobby\'s profile should be updated correctly', () => {
		const delta = profileDelta('onebobby', game);

		expect(delta.stats.matches.allMatches.events).toBe(1);
		expect(delta.stats.matches.allMatches.successes).toBe(1);

		expect(delta.stats.matches.liberal.events).toBe(1);
		expect(delta.stats.matches.liberal.successes).toBe(1);

		expect(delta.stats.matches.fascist.events).toBe(0);
		expect(delta.stats.matches.fascist.successes).toBe(0);

		expect(delta.stats.actions.voteAccuracy.events).toBe(4);
		expect(delta.stats.actions.voteAccuracy.successes).toBe(4);

		expect(delta.stats.actions.shotAccuracy.events).toBe(1);
		expect(delta.stats.actions.shotAccuracy.successes).toBe(1);

		expect(delta.recentGames.loyalty).toBe('liberal');
		expect(delta.recentGames.playerSize).toBe(6);
		expect(delta.recentGames.isWinner).toBe(true);
	}
};
