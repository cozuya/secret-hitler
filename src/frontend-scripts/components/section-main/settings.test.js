import React from 'react'; // eslint-disable-line
import { shallow } from 'enzyme';
import Settings from './Settings';

describe('Settings', () => {
	it('should initialize correctly', () => {
		const component = shallow(<Settings userInfo={{ gameSettings: {} }} socket={{ emit: jest.fn(), on: jest.fn() }} />);

		expect(component).toHaveLength(1);
	});
});
