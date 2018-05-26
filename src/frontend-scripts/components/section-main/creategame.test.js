import React from 'react'; // eslint-disable-line
import { shallow } from 'enzyme';
import Creategame from './Creategame';

describe('Creategame', () => {
	it('should initialize correctly', () => {
		const initialState = {
			gameName: '',
			sliderValues: [5, 10],
			experiencedmode: false,
			disablechat: false,
			disablegamechat: false,
			disableobserver: false,
			privateShowing: false,
			containsBadWord: false,
			rainbowgame: false,
			checkedSliderValues: new Array(6).fill(true),
			checkedRebalanceValues: new Array(3).fill(true),
			privateonlygame: false,
			isTourny: false,
			casualgame: false,
			blindMode: false,
			timedMode: false,
			isVerifiedOnly: false,
			timedSliderValue: [120]
		};
		const component = shallow(<Creategame />);

		expect(component.state()).toEqual(initialState);
	});
});
