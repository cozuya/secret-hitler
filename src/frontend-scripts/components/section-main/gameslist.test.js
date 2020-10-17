import React from 'react'; // eslint-disable-line
import { shallow } from 'enzyme';
import GamesList from './GamesList';

describe('GamesList', () => {
	it('should initialize correctly', () => {
		const initialState = {
			filtersVisible: false,
			stickyEnabled: true,
			generalChats: {
				sticky: ''
			}
		};

		const component = shallow(<GamesList socket={{ on: () => {}, emit: () => {} }} />);

		expect(component.state()).toEqual(initialState);
	});
});
