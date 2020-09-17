import React from 'react'; // eslint-disable-line
import { shallow } from 'enzyme';
import Generalchat from './Generalchat';

describe('Generalchat', () => {
	it('should initialize correctly', () => {
		const initialState = {
			lock: false,
			badWord: [null, null],
			textLastChanged: 0,
			textChangeTimer: -1,
			chatValue: '',
			emoteHelperSelectedIndex: 0,
			emoteHelperElements: ['ja', 'nein', 'blobsweat', 'wethink', 'limes'],
			emoteColonIndex: -1,
			excludedColonIndices: [],
			generalChats: {
				list: []
			}
		};

		const component = shallow(<Generalchat socket={{ on: () => {}, emit: () => {} }} />);

		expect(component.state()).toEqual(initialState);
	});
});
