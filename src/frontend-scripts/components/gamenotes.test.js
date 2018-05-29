import React from 'react'; // eslint-disable-line
import { shallow } from 'enzyme';
import Gamenotes from './Gamenotes';

describe('Gamenotes', () => {
	it('should initialize correctly', () => {
		const initialState = {
			top: 110,
			left: 690,
			width: 400,
			height: 320,
			isResizing: false
		};
		const component = shallow(<Gamenotes />);

		expect(component.state()).toEqual(initialState);
	});
});
