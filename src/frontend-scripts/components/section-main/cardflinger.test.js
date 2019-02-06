import React from 'react'; // eslint-disable-line
import { shallow } from 'enzyme';
import CardFlinger from './Cardflinger';

describe('CardFlinger', () => {
	it('should initialize correctly', () => {
		const initialState = {
			isHovered: false,
			hoveredClass: null
		};
		const component = shallow(
			<CardFlinger userInfo={{ userName: '' }} gameInfo={{ cardFlingerState: [], publicPlayersState: [], general: { status: '' }, gameState: { phase: '' } }} />
		);

		expect(component.state()).toEqual(initialState);
	});
});
