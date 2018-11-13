import React from 'react'; // eslint-disable-line
import { shallow } from 'enzyme';
import Cardflinger from './Cardflinger';

describe('Cardflinger', () => {
	it('should initialize correctly', () => {
		const initialState = {
			isHovered: false,
			hoveredClass: null
		};
		const component = shallow(
			<Cardflinger userInfo={{ userName: '' }} gameInfo={{ cardFlingerState: [], publicPlayersState: [], general: { status: '' }, gameState: { phase: '' } }} />
		);

		expect(component.state()).toEqual(initialState);
	});
});
