import React from 'react'; // eslint-disable-line
import { shallow } from 'enzyme';
import Playerlist from './Playerlist';

describe('Playerlist', () => {
	it('should initialize correctly', () => {
		const initialState = {
			userListFilter: 'all'
		};

		const component = shallow(<Playerlist />);

		expect(component.state()).toEqual(initialState);
	});
});
