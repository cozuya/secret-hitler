import React from 'react'; // eslint-disable-line no-unused-vars
import renderer from 'react-test-renderer';
import {App} from '../../src/frontend-scripts/components/App.jsx';

describe('components', () => {
	describe('<App />', () => {
		it('renders correctly', () => {
			document.body.innerHTML = '<div class="test" id="game-container"></div>';

			const tree = renderer.create( <App redux={{}} />).toJSON();

			expect(tree).toMatchSnapshot();
		});
	});
});