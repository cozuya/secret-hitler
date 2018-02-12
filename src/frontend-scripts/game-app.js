'use strict';

import babelPolyfill from 'babel-polyfill'; // eslint-disable-line
import $ from 'jquery';
import React from 'react'; // eslint-disable-line no-unused-vars
import { render } from 'react-dom';
import { createStore, applyMiddleware } from 'redux';
import createSagaMiddleware from 'redux-saga';
import { Provider } from 'react-redux';
import AppComponent from './components/App.jsx';
import account from './account';
import shapp from './reducers/sh-app';
import polyfills from '../../iso/polyfills.js';
import rootSaga from './sagas';

document.addEventListener('DOMContentLoaded', () => {
	const container = document.getElementById('game-container');

	account();
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
		if (e.ctrlKey && e.keyCode === 65) {
			return false;
		}
	});
});
