import React from 'react'; // eslint-disable-line
import { connect } from 'react-redux';
import { createMockStore } from 'redux-test-utils';
import { shallowWithStore } from 'enzyme-redux';
import Playerlist from './Playerlist';

describe('Playerlist', () => {
	let store;

	beforeEach(() => {
		store = createMockStore({});
	});

	it('should initialize correctly', () => {
		const mapStateToProps = (state) => ({
			state,
		});
		const ConnectedComponent = connect(mapStateToProps)(Playerlist);
		const component = shallowWithStore(<ConnectedComponent />, store);

		expect(component).toHaveLength(1);
	});
});
