import React from 'react'; // eslint-disable-line
import { shallow } from 'enzyme';
import Moderation from './Moderation';

describe('Moderation', () => {
	it('should initialize correctly', () => {
		const initialState = {
			selectedUser: '',
			userList: [],
			gameList: [],
			actionTextValue: '',
			log: [],
			playerListState: 0,
			broadcastText: '',
			playerInputText: '',
			resetServerCount: 0,
			logCount: 1,
			modLogToday: false,
			nonSeasonalSetStats: false,
			logSort: {
				type: 'date',
				direction: 'descending'
			},
			userSort: {
				type: 'username',
				direction: 'descending'
			},
			gameSort: {
				type: 'username',
				direction: 'descending'
			},
			filterModalVisibility: false,
			filterValue: '',
			showActions: true,
			showGameIcons: true,
			tableCollapsed: false,
			lagMeterStatus: ''
		};

		const component = shallow(<Moderation socket={{ on: jest.fn(), emit: jest.fn() }} />);

		expect(component.state()).toEqual(initialState);
	});
});
