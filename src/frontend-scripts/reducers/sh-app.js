import {combineReducers} from 'redux';
import {UPDATE_USER, UPDATE_MIDSECTION, UPDATE_GAMELIST, UPDATE_GAMEINFO, UPDATE_USERLIST, UPDATE_GENERALCHATS} from '../actions/actions.js';
import mockGameSummary from '../../../__test__/mocks/mockGameSummary';
import buildEnhancedGameSummary from '../../../models/game-summary/buildEnhancedGameSummary';
import buildReplay from '../replay/buildReplay';

const game = buildEnhancedGameSummary(mockGameSummary)

const userInfo = (state = {}, action) => {
		switch (action.type) {
		case UPDATE_USER:
			state = action.user;
			break;
		default:
		}
		return state;
	},
	midSection = (state = '', action) => {
		switch (action.type) {
		case UPDATE_MIDSECTION:
			state = action.midSection;
			break;
		default:
		}
		return state;
	},
	gameList = (state = [], action) => {
		switch (action.type) {
		case UPDATE_GAMELIST:
			state = action.gameList;
			break;
		default:
		}
		return state;
	},
	gameInfo = (state = {}, action) => {
		switch (action.type) {
		case UPDATE_GAMEINFO:
			state = action.gameInfo;
			break;
		default:
		}
		return state;
	},
	userList = (state = {}, action) => {
		switch (action.type) {
		case UPDATE_USERLIST:
			state = action.userList;
			break;
		default:
		}
		return state;
	},
	generalChats = (state = [], action) => {
		switch (action.type) {
		case UPDATE_GENERALCHATS:
			state = action.info;
			break;
		default:
		}
		return state;
	},
	profile = (state = { status: 'INITIAL' }, action) => {
		switch (action.type) {
		case 'REQUEST_PROFILE':
			return { status: 'LOADING' };
		case 'PROFILE_NOT_FOUND':
			return { status: 'NOT_FOUND' };
		case 'RECEIVE_PROFILE':
			return Object.assign({}, action.profile, { 
				status: 'READY',
				activeStat: 'MATCHES' 
			});
		case 'UPDATE_ACTIVE_STATS':
			return Object.assign({}, state, { activeStat: action.activeStat })
		default:
			return state;
		}
	},
	replay = (state = { status: 'INITIAL' }, action) => {
		switch (action.type) {
		case 'RECEIVE_REPLAY':
			return {
				status: 'READY',
				ticks: action.replay,
				position: 0
			};
		case 'REPLAY_TO':
			return Object.assign({}, state, { 
				position: action.position
			})
		default:
			return state;
		}
	}

export default combineReducers({
	userInfo,
	midSection,
	gameList,
	gameInfo,
	userList,
	generalChats,
	profile,
	replay
});