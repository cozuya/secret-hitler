import React from 'react'; // eslint-disable-line
import { shallow } from 'enzyme';
import Reports from './Reports';

describe('Reports', () => {
	it('should initialize correctly', () => {
		const initialState = {
			reports: [],
			sortType: 'date',
			sortDirection: 'descending'
		};

		const component = shallow(<Reports socket={{ emit: jest.fn(), on: jest.fn() }} />);

		expect(component.state()).toEqual(initialState);
	});
});
