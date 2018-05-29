import React from 'react'; // eslint-disable-line
import { shallow } from 'enzyme';
import Gamechat from './Gamechat';

describe('Gamechat', () => {
	it('should initialize correctly', () => {
		const initialState = {
			chatFilter: 'All',
			lock: false,
			claim: '',
			playersToWhitelist: [],
			notesEnabled: false
		};

		const component = shallow(<Gamechat />);

		expect(component.state()).toEqual(initialState);
	});
});
