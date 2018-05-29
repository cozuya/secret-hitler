import React from 'react'; // eslint-disable-line
import { shallow } from 'enzyme';
import Leftsidebar from './Leftsidebar';

describe('Leftsidebar', () => {
	it('should initialize correctly', () => {
		const component = shallow(<Leftsidebar />);

		expect(component).toHaveLength(1);
	});
});
