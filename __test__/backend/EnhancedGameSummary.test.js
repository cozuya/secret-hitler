import EnhancedGameSummary from '../../models/game-summary/EnhancedGameSummary';
import mockGameSummary from '../mocks/mockGameSummary';

describe('EnhancedGameSummary', () => {
	const game = new EnhancedGameSummary(mockGameSummary);

	it('should get the player size', () => {
		expect(game.playerSize).toBe(7);
	});

	it('should get player from username', () => {
		expect(game.playerOf('Jaina')).toEqual({ username: 'Jaina', role: 'liberal' });
	});

	it('should get player from id', () => {
		expect(game.playerOf(1, true)).toEqual({ username: 'Jaina', role: 'liberal' });
	});

	it('should get player index from username', () => {
		expect(game.indexOf('Uther')).toBe(0);
		expect(game.indexOf('Thrall')).toBe(4);
		expect(game.indexOf('Anduin')).toBe(6);
	});

	it('should set hitler zone', () => {
		expect(game.hitlerZone).toBe(3);
	});

	it('should get the number of turns', () => {
		expect(game.numberOfTurns).toBe(8);
	});

	it('should get winner from player', () => {
		expect(game.isWinner('Valeera')).toBe(true);
		expect(game.isWinner('Jaina')).toBe(false);
	});

	it('should get loyalty from player', () => {
		expect(game.loyaltyOf('Thrall')).toBe('fascist');
		expect(game.loyaltyOf('Valeera')).toBe('fascist');
		expect(game.loyaltyOf('Jaina')).toBe('liberal');
	});

	it('should get role from player', () => {
		expect(game.roleOf('Thrall')).toBe('hitler');
		expect(game.roleOf('Valeera')).toBe('fascist');
		expect(game.roleOf('Jaina')).toBe('liberal');
	});

	it('should get votes from player', () => {
		const votes = game.votesOf('Jaina');
		// expect(votes).toHaveLength(8);
		expect(votes[0].vote).toBe(true);
		expect(votes[5].vote).toBe(false);
	});

	it('should get shots from player', () => {
		expect(game.shotsOf('Jaina')).toEqual([3]);
		expect(game.shotsOf('Anduin')).toEqual([2]);
	});
});