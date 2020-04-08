import {
	sendModInfo,
	sendUserList,
	sendUserGameSettings,
	sendPlayerNotes,
	sendReplayGameChats,
	sendGameList,
	sendUserReports,
	sendGeneralChats,
	sendGameInfo,
} from '../../../../routes/socket/user-requests';

describe('user requests', () => {
	it('has an sendModInfo function', () => {
		expect(typeof sendModInfo).toBe('function');
	});

	it('has an sendUserList function', () => {
		expect(typeof sendUserList).toBe('function');
	});
	it('has an sendUserGameSettings function', () => {
		expect(typeof sendUserGameSettings).toBe('function');
	});
	it('has an sendPlayerNotes function', () => {
		expect(typeof sendPlayerNotes).toBe('function');
	});
	it('has an sendReplayGameChats function', () => {
		expect(typeof sendReplayGameChats).toBe('function');
	});
	it('has an sendGameList function', () => {
		expect(typeof sendGameList).toBe('function');
	});
	it('has an sendUserReports function', () => {
		expect(typeof sendUserReports).toBe('function');
	});
	it('has an sendGeneralChats function', () => {
		expect(typeof sendGeneralChats).toBe('function');
	});
	it('has an sendGameInfo function', () => {
		expect(typeof sendGameInfo).toBe('function');
	});
});
