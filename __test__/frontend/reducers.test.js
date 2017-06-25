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
				profile: { status: 'INITIAL' },
				replay: { status: 'INITIAL' },
				version: { current: { number: '', color: '', date: '' }, lastSeen: '' }
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
				profile: { status: 'INITIAL' },
				replay: { status: 'INITIAL' },
				version: { current: { number: '', color: '', date: '' }, lastSeen: '' }
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
				profile: { status: 'INITIAL' },
				replay: { status: 'INITIAL' },
				version: { current: { number: '', color: '', date: '' }, lastSeen: '' }
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
				profile: { status: 'INITIAL' },
				replay: { status: 'INITIAL' },
				version: { current: { number: '', color: '', date: '' }, lastSeen: '' }
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
				profile: { status: 'INITIAL' },
				replay: { status: 'INITIAL' },
				version: { current: { number: '', color: '', date: '' }, lastSeen: '' }
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
				profile: { status: 'INITIAL' },
				replay: { status: 'INITIAL' },
				version: { current: { number: '', color: '', date: '' }, lastSeen: '' }
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
				profile: { status: 'INITIAL' },
				replay: { status: 'INITIAL' },
				version: { current: { number: '', color: '', date: '' }, lastSeen: '' }
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
				profile: { status: 'INITIAL' },
				replay: { status: 'INITIAL' },
				version: { current: { number: '', color: '', date: '' }, lastSeen: '' }
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
				profile: { status: 'INITIAL' },
				replay: { status: 'INITIAL' },
				version: { current: { number: '', color: '', date: '' }, lastSeen: '' }
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
				profile: { status: 'INITIAL' },
				replay: { status: 'INITIAL' },
				version: { current: { number: '', color: '', date: '' }, lastSeen: '' }
			});
		});

		describe('replays', () => {
			const dispatch = combinedReducers.bind(null, undefined);

			const initialState = {
				userInfo: {},
				midSection: 'default',
				gameList: [],
				gameInfo: {},
				userList: {},
				generalChats: [],
				profile: { status: 'INITIAL' },
				replay: { status: 'INITIAL' },
				version: { current: { number: '', color: '', date: '' }, lastSeen: '' }
			};

			const add = replay => Object.assign({}, initialState, { replay });

			it('should start in the initial state', () => {
				expect(dispatch({})).toEqual(add({ status: 'INITIAL' }));
			});

			it('should start loading replays', () => {
				expect(dispatch({
					type: 'REQUEST_REPLAY'
				})).toEqual(add({ status: 'LOADING' }));
			});

			it('should start loading replays', () => {
				expect(dispatch({
					type: 'REQUEST_REPLAY'
				})).toEqual(add({ status: 'LOADING' }));
			});

			it('should fail loading replays', () => {
				expect(dispatch({
					type: 'REPLAY_NOT_FOUND'
				})).toEqual(add({ status: 'NOT_FOUND' }));
			});

			it('should receive replays', () => {
				const mockReplay = {};

				expect(dispatch({
					type: 'RECEIVE_REPLAY',
					replay: mockReplay
				})).toEqual(add({
					status: 'READY',
					ticks: mockReplay,
					position: 0
				}));
			});

			it('should update positions', () => {
				const mockReplay = {};

				let state = dispatch({
					type: 'RECEIVE_REPLAY',
					replay: mockReplay
				});

				expect(combinedReducers(state, {
					type: 'REPLAY_TO',
					position: 7
				})).toEqual(add({
					status: 'READY',
					ticks: mockReplay,
					position: 7
				}));
			});
		});
	});
});