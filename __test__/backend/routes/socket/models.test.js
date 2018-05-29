import {
	games,
	userList,
	generalChats,
	accountCreationDisabled,
	ipbansNotEnforced,
	gameCreationDisabled,
	currentSeasonNumber,
	profiles,
	formattedUserList,
	userListEmitter
} from '../../../../routes/socket/models';

describe('models', () => {
	it('has a games array', () => {
		expect(Array.isArray(games)).toBe(true);
	});

	it('has a userList array', () => {
		expect(Array.isArray(userList)).toBe(true);
	});

	it('has a generalChats object', () => {
		expect(typeof generalChats).toBe('object');
	});

	it('has a accountCreationDisabled object', () => {
		expect(typeof accountCreationDisabled).toBe('object');
	});

	it('has a ipbansNotEnforced object', () => {
		expect(typeof ipbansNotEnforced).toBe('object');
	});

	it('has a gameCreationDisabled object', () => {
		expect(typeof gameCreationDisabled).toBe('object');
	});

	it('has a currentSeasonNumber number', () => {
		expect(typeof currentSeasonNumber).toBe('number');
	});

	it('has a profiles object', () => {
		expect(typeof profiles).toBe('object');
	});

	it('has a formattedUserList function', () => {
		expect(typeof formattedUserList).toBe('function');
	});

	it('has a userListEmitter object', () => {
		expect(typeof userListEmitter).toBe('object');
	});
});
