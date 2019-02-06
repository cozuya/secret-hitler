import React from 'react'; // eslint-disable-line
import { shallow } from 'enzyme';
import LeftSidebar from './Leftsidebar';

describe('LeftSidebar', () => {
	it('should initialize correctly', () => {
		const component = shallow(<LeftSidebar />);

		expect(component).toHaveLength(1);
	});
});
