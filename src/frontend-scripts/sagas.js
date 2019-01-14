import { put, call, takeLatest } from 'redux-saga/effects';
import buildEnhancedGameSummary from '../../models/game-summary/buildEnhancedGameSummary';
import buildReplay from './replay/buildReplay';

function* fetchProfile(action) {
	const { username, requestingUser } = action;

	yield put({ type: 'REQUEST_PROFILE' });

	try {
		const response = yield call(fetch, `/profile?username=${username}&requestingUser=${requestingUser}`);
		const profile = yield call([response, 'json']);
		yield put({ type: 'RECEIVE_PROFILE', profile });
	} catch (err) {
		yield put({ type: 'PROFILE_NOT_FOUND' });
	}
}

function* loadReplay(action) {
	const { summary } = action;

	const game = buildEnhancedGameSummary(summary);
	const replay = buildReplay(game);

	yield put({ type: 'RECEIVE_REPLAY', replay, game });
}

function* fetchReplay(action) {
	const { gameId } = action;

	yield put({ type: 'REQUEST_REPLAY' });

	try {
		const response = yield call(fetch, `/gameSummary?id=${gameId}`);
		const summary = yield call([response, 'json']);
		yield put({ type: 'LOAD_REPLAY', summary });
	} catch (err) {
		yield put({ type: 'REPLAY_NOT_FOUND' });
	}
}

export default function* rootSaga() {
	yield takeLatest('FETCH_PROFILE', fetchProfile);
	yield takeLatest('FETCH_REPLAY', fetchReplay);
	yield takeLatest('LOAD_REPLAY', loadReplay);
}
