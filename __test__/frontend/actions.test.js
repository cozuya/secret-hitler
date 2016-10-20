import {
	updateUser,
	updateMidsection,
	updateGameList,
	updateGameInfo,
	updateUserList,
	updateGeneralChats
} from '../../src/frontend-scripts/actions/actions.js';

describe('actions', () => {
	describe('updateUser', () => {
		it('should have a type of UPDATE_USER', () => {
			expect(updateUser().type).toEqual('UPDATE_USER');
		});

		it('should update the user information we pass in', () => {
			const user = {userName: 'foo'};

			expect(updateUser(user).user).toEqual(user);
		});
	});

	describe('updateMidsection', () => {
		it('should have a type of UPDATE_MIDSECTION', () => {
			expect(updateMidsection().type).toEqual('UPDATE_MIDSECTION');
		});

		it('should update the midsection that is being displayed to the client that we pass in', () => {
			const midSection = 'game';

			expect(updateMidsection(midSection).midSection).toEqual(midSection);
		});
	});

	describe('updateGameList', () => {
		it('should have a type of UPDATE_GAMELIST', () => {
			expect(updateGameList().type).toEqual('UPDATE_GAMELIST');
		});

		it('should update the list of games that we pass in', () => {
			const gameList = [{name: 'foo'}];

			expect(updateGameList(gameList).gameList).toEqual(gameList);
		});
	});

	describe('updateGameInfo', () => {
		it('should have a type of UPDATE_GAMEINFO', () => {
			expect(updateGameInfo().type).toEqual('UPDATE_GAMEINFO');
		});

		it('should update the gameInfo for a specific game that we pass in', () => {
			const gameInfo = {name: 'foo'};

			expect(updateGameInfo(gameInfo).gameInfo).toEqual(gameInfo);
		});
	});

	describe('updateUserList', () => {
		it('should have a type of UPDATE_USERLIST', () => {
			expect(updateUserList().type).toEqual('UPDATE_USERLIST');
		});

		it('should update the list of logged in users that we pass in', () => {
			const userList = [{userName: 'foo'}];

			expect(updateUserList(userList).userList).toEqual(userList);
		});
	});

	describe('updateGeneralChats', () => {
		it('should have a type of UPDATE_GENERALCHATS', () => {
			expect(updateGeneralChats().type).toEqual('UPDATE_GENERALCHATS');
		});

		it('should update the list of general chats that we pass in', () => {
			const generalChats = [{chat: 'foo'}];

			expect(updateGeneralChats(generalChats).info).toEqual(generalChats);
		});
	});
});