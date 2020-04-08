import GameSummaryBuilder from '../../models/game-summary/GameSummaryBuilder';
import GameSummary from '../../models/game-summary';
import '../matchers';

describe('GameSummaryBuilder', () => {
	let gsb;

	it('should initialize correctly', () => {
		gsb = new GameSummaryBuilder(
			'devgame',
			new Date(),
			{
				rebalance6p: false,
				rebalance7p: false,
				rebalance9p: false,
				rerebalance9p: false,
			},
			['liberal', 'fascist', 'liberal', 'fascist', 'liberal']
		);

		expect(gsb._id).toBeDefined();
		expect(gsb.date).toBeDefined();
		expect(gsb.logs.size).toBe(0);
	});

	it('should append a new log on next turn', () => {
		gsb = gsb.nextTurn();

		expect(gsb.logs.size).toBe(1);
	});

	it('should update log', () => {
		gsb = gsb.updateLog({ presidentId: 0 });

		expect(gsb.logs.get(0).presidentId).toBe(0);
	});

	it('should snap to log', () => {
		const presidentClaim = { reds: 2, blues: 1 };

		gsb = gsb.nextTurn().updateLog({ presidentId: 1 }).updateLog({ presidentClaim }, { presidentId: 0 });

		expect(gsb.logs.get(1).presidentClaim).toBeUndefined();
		expect(gsb.logs.get(0).presidentClaim).toEqual(presidentClaim);
	});

	it('should publish a GameSummary', () => {
		const gs = gsb.publish();

		expect(gs).toBeInstanceOf(GameSummary);
		expect(gs.logs[0].presidentId).toBe(0);
	});
});
