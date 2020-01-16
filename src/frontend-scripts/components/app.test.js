import React from 'react'; // eslint-disable-line
import { App } from './App';
import Enzyme, { shallow } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';

Enzyme.configure({ adapter: new Adapter() });

describe('App', () => {
	it('should initialize correctly', () => {
		const initialState = {
			notesValue: '',
			alertMsg: {
				data: null,
				type: null
			},
			allEmotes: [],
			notesValue: '',
			warnings: null
		};
		const component = shallow(<App userInfo={{ gameSettings: {} }} />);

		expect(component.state()).toEqual(initialState);
	});
});
