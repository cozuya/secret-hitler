import React from 'react'; // eslint-disable-line
import { shallow } from 'enzyme';
import Changelog from './Changelog';

describe('Changelog', () => {
	it('should initialize correctly', () => {
		const component = shallow(<Changelog />);

		expect(component).toHaveLength(1);
	});
});
