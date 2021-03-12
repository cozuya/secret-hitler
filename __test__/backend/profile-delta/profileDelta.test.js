import '../../matchers';

// mock game tests
import testGenericGame from './testGenericGame';
import testP5HitlerElected from './testP5HitlerElected';
import testP7HitlerKilled from './testP7HitlerKilled';
import testP7LiberalWin from './testP7LiberalWin';

describe('profileDelta', () => {
	describe('it should work for', () => {
		testGenericGame();
		testP5HitlerElected();
		testP7HitlerKilled();
		testP7LiberalWin();
	});
});
