import React from 'react'; // eslint-disable-line
import { shallowWithStore } from 'enzyme-redux';
import { createMockStore } from 'redux-test-utils';
import Gamechat from './Gamechat';

describe('Gamechat', () => {
	it('should initialize correctly', () => {
		const initialProps = {
			loadReplay: () => {},
			toggleNotes: () => {},
			updateUser: () => {},
			notesActive: false
		};

		const store = createMockStore(initialProps);

		const component = shallowWithStore(<Gamechat />, store);

		expect(component).toHaveLength(1);
	});
});
