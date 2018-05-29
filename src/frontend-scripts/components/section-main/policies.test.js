import React from 'react'; // eslint-disable-line
import { shallow } from 'enzyme';
import Policies from './Policies';

describe('Policies', () => {
	it('should initialize correctly', () => {
		const component = shallow(<Policies gameInfo={{ gameState: {}, trackState: {} }} />);

		expect(component).toHaveLength(1);
	});
});
