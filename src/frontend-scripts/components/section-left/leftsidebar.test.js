import React from 'react'; // eslint-disable-line
import { shallow } from 'enzyme';
import LeftSidebar from './LeftSidebar';

describe('LeftSidebar', () => {
	it('should initialize correctly', () => {
		const component = shallow(<LeftSidebar />);

		expect(component).toHaveLength(1);
	});
});
