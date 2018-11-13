import React from 'react'; // eslint-disable-line
import { connect } from 'react-redux';
import { createMockStore } from 'redux-test-utils';
import { shallowWithStore } from 'enzyme-redux';
import Players from './Players';

describe('Players', () => {
	let store;

	beforeEach(() => {
		store = createMockStore({});
	});

	it('should initialize correctly', () => {
		const mapStateToProps = state => ({
			state
		});
		const ConnectedComponent = connect(mapStateToProps)(Players);
		const component = shallowWithStore(<ConnectedComponent />, store);

		expect(component).toHaveLength(1);
	});
});
