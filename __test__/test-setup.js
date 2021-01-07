import Enzyme from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
const { globalSettingsClient } = require('../routes/socket/models');

Enzyme.configure({ adapter: new Adapter() });

Object.defineProperty(window.document, 'getElementById', {
	value: () => ({ classList: {} })
});

afterAll(() => {
	globalSettingsClient.quit();
});
