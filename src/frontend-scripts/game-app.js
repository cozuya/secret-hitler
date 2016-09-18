'use strict';

import account from './account';
import AppComponent from './components/App.jsx';
import React from 'react'; // eslint-disable-line no-unused-vars
import {render} from 'react-dom';
import {createStore} from 'redux';
import {Provider} from 'react-redux';
import wwapp from './reducers/ww-app';
import polyfills from '../../iso/polyfills.js';
import $ from 'jquery';

document.addEventListener('DOMContentLoaded', () => {
	const container = document.getElementById('game-container');

	account();
	polyfills();

	console.log('%c%s', 'color: teal; background: #eee; font-size: 14px; font-style: italic; font-family: verdana', 'Secret Hitler');

	if (container) {
		const store = createStore(wwapp);

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