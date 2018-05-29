import React from 'react'; // eslint-disable-line
import { shallow } from 'enzyme';
import Profile from './Profile';

describe('Profile', () => {
	it('should initialize correctly', () => {
		const initialState = {
			bioStatus: 'displayed',
			bioValue: '',
			blacklistClicked: false,
			blacklistShown: false
		};

		const component = shallow(<Profile />);

		expect(component.state()).toEqual(initialState);
	});
});
