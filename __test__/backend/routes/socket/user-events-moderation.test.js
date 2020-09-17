import { handleModerationAction, handlePlayerReportDismiss, handlePlayerReport } from '../../../../routes/socket/user-events-moderation';

describe('user events', () => {
	it('has an handleModerationAction function', () => {
		expect(typeof handleModerationAction).toBe('function');
	});

	it('has an handlePlayerReportDismiss function', () => {
		expect(typeof handlePlayerReportDismiss).toBe('function');
	});

	it('has an handlePlayerReport function', () => {
		expect(typeof handlePlayerReport).toBe('function');
	});
});
