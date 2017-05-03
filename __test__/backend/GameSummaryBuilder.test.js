import GameSummaryBuilder from '../../models/game-summary/GameSummaryBuilder';
import GameSummary from '../../models/game-summary';

describe('GameSummaryBuilder', () => {
	let gsb;

	it('should initialize correctly', () => {
		gsb = new GameSummaryBuilder(
			'devgame',
			new Date(),
			[ 'liberal', 'fascist', 'liberal', 'fascist', 'liberal' ]
		);

		expect(gsb.uid).toBeDefined();
		expect(gsb.date).toBeDefined();
		expect(gsb.players).toHaveLength(5);
		expect(gsb.logs).toHaveLength(0);
	});

	it('should append a new log on next turn', () => {
		gsb = gsb.nextTurn();

		expect(gsb.logs).toHaveLength(1);
	});

	it('should update log', () => {
		gsb = gsb.updateLog({ presidentId: 0 });

		const firstPresidentId = gsb.logs[0].presidentId;

		expect(firstPresidentId).toBe(0);
	});

	it('should publish a GameSummary', () => {
		const gs = gsb.publish();

		expect(gs).toBeInstanceOf(GameSummary);
		expect(gs.logs[0].presidentId).toBe(0);
	});
});