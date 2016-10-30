import {combineReducers} from 'redux';
import {UPDATE_USER, UPDATE_MIDSECTION, UPDATE_GAMELIST, UPDATE_GAMEINFO, UPDATE_USERLIST, UPDATE_GENERALCHATS} from '../actions/actions.js';

const userInfo = (state = {}, action) => {
		switch (action.type) {
		case UPDATE_USER:
			state = action.user;
			break;
		default:
		}
		return state;
	},
	midSection = (state = 'default', action) => {
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
	};

export default combineReducers({
	userInfo,
	midSection,
	gameList,
	gameInfo,
	userList,
	generalChats
});