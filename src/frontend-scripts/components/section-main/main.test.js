import React from 'react'; // eslint-disable-line
import { shallow } from 'enzyme';
import Main from './Main';

describe('Main', () => {
	it('should initialize correctly', () => {
		const initialState = {
			gameFilter: {
				priv: true,
				pub: true,
				unstarted: true,
				inprogress: true,
				completed: true,
				timedMode: true,
				rainbow: true,
				standard: true
			}
		};

		const component = shallow(<Main />);

		expect(component.state()).toEqual(initialState);
	});
});
