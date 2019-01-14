import React from 'react'; // eslint-disable-line
import { shallow } from 'enzyme';
import Main from './Main';

describe('Main', () => {
	it('should initialize correctly', () => {
		const component = shallow(<Main userInfo={{}} />);

		expect(component).toHaveLength(1);
	});
});
