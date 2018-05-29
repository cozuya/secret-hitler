import React from 'react'; // eslint-disable-line
import { shallow } from 'enzyme';
import Tracks from './Tracks';

describe('Tracks', () => {
	it('should initialize correctly', () => {
		const initialState = {
			remakeStatus: false,
			remakeStatusDisabled: false,
			timedModeTimer: ''
		};

		const component = shallow(<Tracks gameInfo={{ general: {}, publicPlayersState: [], cardFlingerState: [], trackState: {}, gameState: {} }} />);

		expect(component.state()).toEqual(initialState);
	});
});
