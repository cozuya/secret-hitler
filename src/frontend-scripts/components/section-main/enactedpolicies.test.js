import React from 'react'; // eslint-disable-line
import { shallow } from 'enzyme';
import EnactedPolicies from './EnactedPolicies';

describe('EnactedPolicies', () => {
	it('should initialize correctly', () => {
		const component = shallow(<EnactedPolicies gameInfo={{ cardFlingerState: [], trackState: { enactedPolicies: [{}] } }} />);

		expect(component).toHaveLength(1);
	});
});
