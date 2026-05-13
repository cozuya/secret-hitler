import React from 'react'; // eslint-disable-line
import { shallow } from 'enzyme';
import Creategame from './Creategame';

describe('Creategame', () => {
	it('should initialize correctly', () => {
		const component = shallow(<Creategame userList={{ list: [] }} userInfo={{ gameSettings: {} }} />);

		expect(component).toHaveLength(1);
	});

	it('should default slowChatMode to false and slowChatSliderValue to [3]', () => {
		const component = shallow(<Creategame userList={{ list: [] }} userInfo={{ gameSettings: {} }} />);

		expect(component.state('slowChatMode')).toBe(false);
		expect(component.state('slowChatSliderValue')).toEqual([3]);
	});
});
