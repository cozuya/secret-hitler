import React from 'react'; // eslint-disable-line
import { shallow } from 'enzyme';
import Cardflinger from './Cardflinger';

describe('Cardflinger', () => {
	it('should initialize correctly', () => {
		const initialState = {
			isHovered: false,
			hoveredClass: null
		};
		const component = shallow(<Cardflinger />);

		expect(component.state()).toEqual(initialState);
	});
});
