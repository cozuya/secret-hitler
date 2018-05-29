import React from 'react'; // eslint-disable-line
import { shallow } from 'enzyme';
import SidebarGame from './SidebarGame';

describe('SidebarGame', () => {
	it('should initialize correctly', () => {
		const component = shallow(<SidebarGame />);

		expect(component).toHaveLength(1);
	});
});
