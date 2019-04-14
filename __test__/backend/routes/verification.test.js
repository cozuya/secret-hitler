import { verifyRoutes, setVerify } from '../../../routes/verification';

describe('verifyRoutes', () => {
	it('is a function', () => {
		expect(typeof verifyRoutes).toBe('function');
	});
});

describe('setVerify', () => {
	it('is a function', () => {
		expect(typeof setVerify).toBe('function');
	});
});
