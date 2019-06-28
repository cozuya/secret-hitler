import { socketRoutes } from '../../../../routes/socket/routes';

describe('socketRoutes', () => {
	it('is a function', () => {
		expect(typeof socketRoutes).toBe('function');
	});
});
