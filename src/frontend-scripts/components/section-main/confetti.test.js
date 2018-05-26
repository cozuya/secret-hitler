import React from 'react'; // eslint-disable-line
import { shallow } from 'enzyme';
import Confetti from './Confetti';

describe('Confetti', () => {
	it('should initialize correctly', () => {
		const component = shallow(<Confetti />);

		expect(component).toHaveLength(1);
	});
});
