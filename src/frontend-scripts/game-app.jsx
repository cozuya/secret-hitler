'use strict';

import 'babel-polyfill'; // ✅ side-effect import, no default export

import $ from 'jquery';
import React from 'react'; // eslint-disable-line no-unused-vars
import { render } from 'react-dom';
import { createStore, applyMiddleware } from 'redux';
import createSagaMiddleware from 'redux-saga';
import { Provider } from 'react-redux';
import AppComponent from './components/App.jsx';
import account from './account.js';
import shapp from './reducers/sh-app.js';
import polyfills from '../../iso/polyfills.js';
import rootSaga from './sagas.js';
import chatanimation from './chatanimation.js';

document.addEventListener('DOMContentLoaded', () => {
	const container = document.getElementById('game-container');

	account();
	chatanimation();
	polyfills();

	if (container) {
		const sagaMiddleware = createSagaMiddleware();
		const store = createStore(shapp, applyMiddleware(sagaMiddleware));
		sagaMiddleware.run(rootSaga);
		render(
			<Provider store={store}>
				<AppComponent />
			</Provider>,
			container
		);
	}

	$(document).keydown(e => {
		if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
		if (e.ctrlKey && [65, 83].includes(e.keyCode)) {
			e.preventDefault();
		}
	});
});
