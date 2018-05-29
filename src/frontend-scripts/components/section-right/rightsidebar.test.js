import React from 'react'; // eslint-disable-line
import { shallow } from 'enzyme';
import Rightsidebar from './Rightsidebar';

describe('Rightsidebar', () => {
	it('should initialize correctly', () => {
		const component = shallow(<Rightsidebar />);

		expect(component).toHaveLength(1);
	});
});
