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

export const TOGGLE_NOTES = 'TOGGLE_NOTES';

export function toggleNotes(notesShown) {
	return {
		type: TOGGLE_NOTES,
		notesShown
	};
}

export const TOGGLE_PLAYER_NOTES = 'TOGGLE_PLAYER_NOTES';

export function togglePlayerNotes(playerName) {
	return {
		type: TOGGLE_PLAYER_NOTES,
		playerName
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

export const updateActiveStats = activeStat => ({
	type: 'UPDATE_ACTIVE_STATS',
	activeStat
});

export function updateVersion(version) {
	return {
		type: 'UPDATE_VERSION',
		version
	};
}

export function viewPatchNotes() {
	return { type: 'VIEW_PATCH_NOTES' };
}

export const fetchProfile = username => ({
	type: 'FETCH_PROFILE',
	username
});

export const loadReplay = summary => ({
	type: 'LOAD_REPLAY',
	summary
});

export const fetchReplay = gameId => ({
	type: 'FETCH_REPLAY',
	gameId
});
