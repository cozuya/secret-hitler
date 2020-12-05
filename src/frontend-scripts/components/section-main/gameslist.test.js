import React from 'react'; // eslint-disable-line
import { shallow } from 'enzyme';
import GamesList from './GamesList';

describe('GamesList', () => {
	it('should initialize correctly', () => {
		const initialState = {
			filtersVisible: false,
			stickyEnabled: true
		};

		const component = shallow(<GamesList />);

		expect(component.state()).toEqual(initialState);
	});
});
