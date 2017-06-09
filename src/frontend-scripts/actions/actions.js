import fetch from 'isomorphic-fetch';
import buildEnhancedGameSummary from '../../../models/game-summary/buildEnhancedGameSummary';
import buildReplay from '../replay/buildReplay';
import mockGameSummary from '../../../__test__/mocks/mockGameSummary'

export const UPDATE_USER = 'UPDATE_USER';

export function updateUser(user) {
	return {
		type: UPDATE_USER,
		user
	};
}

export const UPDATE_MIDSECTION = 'UPDATE_MIDSECTION';

export function updateMidsection(midSection) {
	return {
		type: UPDATE_MIDSECTION,
		midSection
	};
}

export const UPDATE_GAMELIST = 'UPDATE_GAMELIST';

export function updateGameList(gameList) {
	return {
		type: UPDATE_GAMELIST,
		gameList
	};
}

export const UPDATE_GAMEINFO = 'UPDATE_GAMEINFO';

export function updateGameInfo(gameInfo) {
	return {
		type: UPDATE_GAMEINFO,
		gameInfo
	};
}

export const UPDATE_USERLIST = 'UPDATE_USERLIST';

export function updateUserList(userList) {
	return {
		type: UPDATE_USERLIST,
		userList
	};
}

export const UPDATE_GENERALCHATS = 'UPDATE_GENERALCHATS';

export function updateGeneralChats(info) {
	return {
		type: UPDATE_GENERALCHATS,
		info
	};
}

export const updateActiveStats = activeStat => ({
	type: 'UPDATE_ACTIVE_STATS',
	activeStat
});

export const fetchProfile = username => dispatch => {
	dispatch(updateMidsection('profile'));
	dispatch({ type: 'REQUEST_PROFILE' });

	return fetch(`/profile?username=${username}`)
		.then(response => response.json())
		.then(profile => dispatch({
			type: 'RECEIVE_PROFILE',
			profile
		}))
		.catch(err => dispatch({
			type: 'PROFILE_NOT_FOUND'
		}));
};

export const fetchReplay = gameId => dispatch  => {
	return fetch(`/gameSummary?id=${gameId}`)
		.then(response => response.json())
		.then(summary => buildEnhancedGameSummary(summary))
		.then(game => buildReplay(game))
		.then(replay => {
			dispatch({
				type: 'RECEIVE_REPLAY',
				replay
			})

			dispatch(updateMidsection('replay'));
		})
		.catch(err => {
			console.log(err);
			dispatch({ type: 'REPLAY_NOT_FOUND' });
		});
};