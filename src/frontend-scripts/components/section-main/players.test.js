import React from 'react'; // eslint-disable-line
import { shallow } from 'enzyme';
import Players from './Players';

describe('Players', () => {
	it('should initialize correctly', () => {
		const initialState = {
			passwordValue: '',
			reportedPlayer: '',
			reportTextValue: '',
			playerNotes: [],
			playerNoteSeatEnabled: false
		};

		const component = shallow(<Players />);

		expect(component.state()).toEqual(initialState);
	});
});
