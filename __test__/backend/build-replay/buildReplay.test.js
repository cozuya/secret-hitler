import '../../matchers';
import testGenericGame from './testGenericGame';
import testVeto from './testVeto';
import testVeto2 from './testVeto2';

describe('ReplayBuilder', () => {
	testGenericGame();
	testVeto();
	testVeto2();
});
