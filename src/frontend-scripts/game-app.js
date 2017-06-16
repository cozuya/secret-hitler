'use strict';

import $ from 'jquery';
import React from 'react'; // eslint-disable-line no-unused-vars
import {render} from 'react-dom';
import {createStore, applyMiddleware} from 'redux';
import thunk from 'redux-thunk';
import {Provider} from 'react-redux';
import AppComponent from './components/App.jsx';
import account from './account';
import shapp from './reducers/sh-app';
import polyfills from '../../iso/polyfills.js';

import 'scss/style-dark.scss';

document.addEventListener('DOMContentLoaded', () => {
	const container = document.getElementById('game-container');

	account();
	polyfills();

	console.log('%c%s', 'color: teal; background: #eee; font-size: 14px; font-style: italic; font-family: verdana', 'Secret Hitler');

	if (container) {
		const store = createStore(shapp, applyMiddleware(thunk));

		render(
			<Provider store={store}>
				<AppComponent />
			</Provider>,
		container);
	}

	$(document).keydown(function(e) {
		if (e.ctrlKey && e.keyCode === 65) {
			return false;
		}
	});
});
