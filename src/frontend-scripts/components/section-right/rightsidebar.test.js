import React from 'react'; // eslint-disable-line
import { shallow } from 'enzyme';
import RightSidebar from './Rightsidebar';

describe('RightSidebar', () => {
	it('should initialize correctly', () => {
		const component = shallow(<RightSidebar />);

		expect(component).toHaveLength(1);
	});
});
