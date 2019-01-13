import { combineReducers } from 'redux';
import {
	UPDATE_USER,
	UPDATE_MIDSECTION,
	UPDATE_GAMELIST,
	UPDATE_GAMEINFO,
	UPDATE_USERLIST,
	UPDATE_GENERALCHATS,
	TOGGLE_NOTES,
	TOGGLE_PLAYER_NOTES,
	UPDATE_TYPING
} from '../actions/actions.js';

const isTyping = (state = {}, action) => {
	switch (action.type) {
		case UPDATE_TYPING:
			state = {
				...action.isTyping
			};
			break;
	}
	return state;
};

const userInfo = (state = {}, action) => {
	switch (action.type) {
		case UPDATE_USER:
			state = action.user;
			break;
	}
	return state;
};

const midSection = (state = 'default', action) => {
	switch (action.type) {
		case UPDATE_MIDSECTION:
			state = action.midSection;
			break;
	}
	return state;
};

const notesActive = (state = false, action) => {
	switch (action.type) {
		case TOGGLE_NOTES:
			state = action.notesShown;
			break;
	}
	return state;
};

const playerNotesActive = (state = '', action) => {
	switch (action.type) {
		case TOGGLE_PLAYER_NOTES:
			state = action.playerName;
			break;
	}
	return state;
};

const gameList = (state = [], action) => {
	switch (action.type) {
		case UPDATE_GAMELIST:
			state = action.gameList;
			break;
	}
	return state;
};

const gameInfo = (state = {}, action) => {
	switch (action.type) {
		case UPDATE_GAMEINFO:
			state = action.gameInfo;
			break;
	}
	return state;
};

const userList = (state = {}, action) => {
	switch (action.type) {
		case UPDATE_USERLIST:
			state = action.userList;
			break;
	}
	return state;
};

const generalChats = (state = {}, action) => {
	switch (action.type) {
		case UPDATE_GENERALCHATS:
			state = action.info;
			break;
	}
	return state;
};

const profile = (state = { status: 'INITIAL' }, action) => {
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
			return Object.assign({}, state, { activeStat: action.activeStat });
		default:
			return state;
	}
};

const version = (state = { current: { number: '', color: '', date: '' }, lastSeen: '' }, action) => {
	switch (action.type) {
		case 'UPDATE_VERSION':
			return action.version;
		case 'VIEW_PATCH_NOTES':
			return Object.assign({}, state, { lastSeen: state.current.number });
		default:
			return state;
	}
};

const replay = (state = { status: 'INITIAL' }, action) => {
	switch (action.type) {
		case 'CLEAR_REPLAY':
			return { status: 'INITIAL' };
		case 'REQUEST_REPLAY':
			return { status: 'LOADING' };
		case 'REPLAY_NOT_FOUND':
			return { status: 'NOT_FOUND' };
		case 'RECEIVE_REPLAY':
			return {
				status: 'READY',
				ticks: action.replay,
				game: action.game,
				position: 0
			};
		case 'REPLAY_TO':
			return Object.assign({}, state, {
				position: action.position
			});
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
	generalChats,
	profile,
	replay,
	version,
	notesActive,
	playerNotesActive,
	isTyping
});
