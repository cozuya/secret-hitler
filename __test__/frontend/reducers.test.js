import combinedReducers from '../../src/frontend-scripts/reducers/sh-app.js';

describe('reducers', () => {
	describe('mainReducer', function() {
		it('should return the initial state', () => {
			expect(combinedReducers(undefined, {})).toEqual({
				userInfo: {},
				midSection: 'default',
				gameList: [],
				gameInfo: {},
				userList: {},
				generalChats: [],
				profile: { status: "INITIAL" }
			});
		});

		it('should react to an action with the type UPDATE_USER', () => {
			const user = {userName: 'bar'};

			expect(combinedReducers(undefined, {
				type: 'UPDATE_USER',
				user
			})).toEqual({
				userInfo: user,
				midSection: 'default',
				gameList: [],
				gameInfo: {},
				userList: {},
				generalChats: [],
				profile: { status: "INITIAL" }
			});
		});

		it('should react to an action with the type UPDATE_MIDSECTION', () => {
			const midSection = 'game';

			expect(combinedReducers(undefined, {
				type: 'UPDATE_MIDSECTION',
				midSection
			})).toEqual({
				userInfo: {},
				midSection,
				gameList: [],
				gameInfo: {},
				userList: {},
				generalChats: [],
				profile: { status: "INITIAL" }
			});
		});

		it('should react to an action with the type UPDATE_GAMELIST', () => {
			const gameList = [{name: 'bar'}];

			expect(combinedReducers(undefined, {
				type: 'UPDATE_GAMELIST',
				gameList
			})).toEqual({
				userInfo: {},
				midSection: 'default',
				gameList,
				gameInfo: {},
				userList: {},
				generalChats: [],
				profile: { status: "INITIAL" }
			});
		});

		it('should react to an action with the type UPDATE_GAMEINFO', () => {
			const gameInfo = {name: 'bar'};

			expect(combinedReducers(undefined, {
				type: 'UPDATE_GAMEINFO',
				gameInfo
			})).toEqual({
				userInfo: {},
				midSection: 'default',
				gameList: [],
				gameInfo,
				userList: {},
				generalChats: [],
				profile: { status: "INITIAL" }
			});
		});

		it('should react to an action with the type UPDATE_USERLIST', () => {
			const userList = [{userName: 'bar'}];

			expect(combinedReducers(undefined, {
				type: 'UPDATE_USERLIST',
				userList
			})).toEqual({
				userInfo: {},
				midSection: 'default',
				gameList: [],
				gameInfo: {},
				userList,
				generalChats: [],
				profile: { status: "INITIAL" }
			});
		});

		it('should react to an action with the type UPDATE_EXPANDOINFO', () => {
			const info = 'foo';

			expect(combinedReducers(undefined, {
				type: 'UPDATE_EXPANDOINFO',
				info
			})).toEqual({
				userInfo: {},
				midSection: 'default',
				gameList: [],
				gameInfo: {},
				userList: {},
				generalChats: [],
				profile: { status: "INITIAL" }
			});
		});

		it('should react to an action with the type UPDATE_CLICKEDGAMEROLE', () => {
			const info = 'minion';

			expect(combinedReducers(undefined, {
				type: 'UPDATE_CLICKEDGAMEROLE',
				info
			})).toEqual({
				userInfo: {},
				midSection: 'default',
				gameList: [],
				gameInfo: {},
				userList: {},
				generalChats: [],
				profile: { status: "INITIAL" }
			});
		});

		it('should react to an action with the type UPDATE_CLICKEDPLAYER', () => {
			const info = 'bar';

			expect(combinedReducers(undefined, {
				type: 'UPDATE_CLICKEDPLAYER',
				info
			})).toEqual({
				userInfo: {},
				midSection: 'default',
				gameList: [],
				gameInfo: {},
				userList: {},
				generalChats: [],
				profile: { status: "INITIAL" }
			});
		});

		it('should react to an action with the type UPDATE_GENERALCHATS', () => {
			const info = [{chat: 'bar'}];

			expect(combinedReducers(undefined, {
				type: 'UPDATE_GENERALCHATS',
				info
			})).toEqual({
				userInfo: {},
				midSection: 'default',
				gameList: [],
				gameInfo: {},
				userList: {},
				generalChats: info,
				profile: { status: "INITIAL" }
			});
		});
	});
});