import React from 'react'; // eslint-disable-line
import { shallow } from 'enzyme';
import Generalchat from './Generalchat';

describe('Generalchat', () => {
	it('should initialize correctly', () => {
		const initialState = {
			lock: false,
			discordEnabled: false,
			stickyEnabled: true
		};

		const component = shallow(<Generalchat />);

		expect(component.state()).toEqual(initialState);
	});
});
