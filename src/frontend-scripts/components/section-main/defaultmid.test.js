import React from 'react'; // eslint-disable-line
import { shallow } from 'enzyme';
import Defaultmid from './Defaultmid';

describe('Defaultmid', () => {
	it('should initialize correctly', () => {
		// const component = shallow(<Defaultmid userList={{ list: [] }} userInfo={{ gameSettings: {} }} />);
		const component = shallow(<Defaultmid />);

		expect(component.state()).toEqual(initialState);
	});
});
