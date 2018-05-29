import React from 'react'; // eslint-disable-line
import { shallow } from 'enzyme';
import DisplayLobbies from './DisplayLobbies';

describe('DisplayLobbies', () => {
	it('should initialize correctly', () => {
		const component = shallow(<DisplayLobbies game={{ userNames: [], customCardback: [], customCardbackUid: [], excludedPlayerCount: [] }} />);

		expect(component).toHaveLength(1);
	});
});
