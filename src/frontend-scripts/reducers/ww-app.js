'use strict';

import { combineReducers } from 'redux';
import { UPDATE_USER, updateUser } from '../actions/actions.js';
import { UPDATE_MIDSECTION, updateMidsection } from '../actions/actions.js';
import { UPDATE_GAMELIST, updateGameList } from '../actions/actions.js';
import { UPDATE_GAMEINFO, updateGameInfo } from '../actions/actions.js';
import { UPDATE_USERLIST, updateUserList } from '../actions/actions.js';
import { UPDATE_GENERALCHATS, updateGeneralChats } from '../actions/actions.js';

const userInfo = (state = {}, action) => {
	switch (action.type) {
		case UPDATE_USER:
			return state = action.user;
		default:
			return state;
	}
};

const midSection = (state = 'default', action) => {
	switch (action.type) {
		case UPDATE_MIDSECTION:
			return state = action.midSection;
		default:
			return state;
	}
};

const gameList = (state = [], action) => {
	switch (action.type) {
		case UPDATE_GAMELIST:
			return state = action.gameList;
		default:
			return state;
	}
};

const gameInfo = (state = {}, action) => {
	switch (action.type) {
		case UPDATE_GAMEINFO:
			return state = action.gameInfo;
		default:
			return state;
	}
};

const userList = (state = {}, action) => {
	switch (action.type) {
		case UPDATE_USERLIST:
			return state = action.userList;
		default:
			return state;
	}
};

const generalChats = (state = [], action) => {
	switch (action.type) {
		case UPDATE_GENERALCHATS:
			return state = action.info;
		default:
			return state;
	}
};

export default combineReducers({
	userInfo,
	midSection,
	gameList,
	gameInfo,
	userList,
	generalChats
});