import React from 'react'; // eslint-disable-line
import { shallow } from 'enzyme';
import Main from './Main';

describe('Main', () => {
	it('should initialize correctly', () => {
		const initialState = {
			gameFilter: {
				priv: false,
				pub: false,
				unstarted: false,
				inprogress: false,
				completed: false,
				timedMode: false,
				rainbow: false,
				standard: false,
				customgame: false,
				casualgame: false
			},
			showNewPlayerModal: Boolean(window.hasNotDismissedSignupModal),
			newPlayerModalPageIndex: 0,
			stickyEnabled: true
		};

		const component = shallow(<Main userInfo={{}} />);

		expect(component.state()).toEqual(initialState);
	});
});
