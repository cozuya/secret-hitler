import React from 'react'; // eslint-disable-line
import { shallow } from 'enzyme';
import SidebarGame from './SidebarGame';

describe('SidebarGame', () => {
	it('should initialize correctly', () => {
		const component = shallow(<SidebarGame game={{ userNames: [] }} socket={{}} />);

		expect(component).toHaveLength(1);
	});
});
