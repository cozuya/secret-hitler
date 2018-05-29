import {
	handleUpdatedPlayerNote,
	updateSeatedUser,
	handleUpdatedBio,
	handleAddNewGame,
	handleAddNewClaim,
	handleUpdatedRemakeGame,
	handleAddNewGameChat,
	handleUpdateWhitelist,
	handleNewGeneralChat,
	handleUpdatedGameSettings,
	handleModerationAction,
	handlePlayerReport,
	handlePlayerReportDismiss,
	checkUserStatus,
	handleUserLeaveGame,
	handleSocketDisconnect
} from '../../../../routes/socket/user-events';

describe('user events', () => {
	it('has an handleUpdatedPlayerNote function', () => {
		expect(typeof handleUpdatedPlayerNote).toBe('function');
	});

	it('has an updateSeatedUser function', () => {
		expect(typeof updateSeatedUser).toBe('function');
	});

	it('has an handleUpdatedBio function', () => {
		expect(typeof handleUpdatedBio).toBe('function');
	});

	it('has an handleUpdatedPlayerNote function', () => {
		expect(typeof handleUpdatedPlayerNote).toBe('function');
	});

	it('has an handleAddNewGame function', () => {
		expect(typeof handleAddNewGame).toBe('function');
	});

	it('has an handleAddNewClaim function', () => {
		expect(typeof handleAddNewClaim).toBe('function');
	});

	it('has an handleUpdatedRemakeGame function', () => {
		expect(typeof handleUpdatedRemakeGame).toBe('function');
	});

	it('has an handleAddNewGameChat function', () => {
		expect(typeof handleAddNewGameChat).toBe('function');
	});

	it('has an handleUpdateWhitelist function', () => {
		expect(typeof handleUpdateWhitelist).toBe('function');
	});

	it('has an handleNewGeneralChat function', () => {
		expect(typeof handleNewGeneralChat).toBe('function');
	});

	it('has an handleUpdatedGameSettings function', () => {
		expect(typeof handleUpdatedGameSettings).toBe('function');
	});

	it('has an handleModerationAction function', () => {
		expect(typeof handleModerationAction).toBe('function');
	});

	it('has an handlePlayerReport function', () => {
		expect(typeof handlePlayerReport).toBe('function');
	});

	it('has an handlePlayerReportDismiss function', () => {
		expect(typeof handlePlayerReportDismiss).toBe('function');
	});

	it('has an checkUserStatus function', () => {
		expect(typeof checkUserStatus).toBe('function');
	});

	it('has an handleUserLeaveGame function', () => {
		expect(typeof handleUserLeaveGame).toBe('function');
	});

	it('has an handleSocketDisconnect function', () => {
		expect(typeof handleSocketDisconnect).toBe('function');
	});
});
