import { getEloBucketIndex } from './constants';

describe('getEloBucketIndex', () => {
	it('clamps and rounds to the expected bucket index', () => {
		expect(getEloBucketIndex(1499)).toBe(0);
		expect(getEloBucketIndex(1500)).toBe(0);
		expect(getEloBucketIndex(1502)).toBe(0);
		expect(getEloBucketIndex(1503)).toBe(1);
		expect(getEloBucketIndex(2100)).toBe(120);
		expect(getEloBucketIndex(2200)).toBe(120);
	});

	it('falls back to 1600 bucket on invalid input', () => {
		expect(getEloBucketIndex(undefined)).toBe(20);
		expect(getEloBucketIndex(null)).toBe(20);
		expect(getEloBucketIndex('bad')).toBe(20);
	});
});
