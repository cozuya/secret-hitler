import { App } from './App';

describe('App', () => {
	it('should initialize correctly', () => {
		const initialState = {
			notesValue: '',
			playerNotesValue: ''
		};
		const component = <App />;

		expect(component.state()).toEqual(initialState);
	});
});
