import Enzyme from "enzyme";
import Adapter from "enzyme-adapter-react-16";

// Mongoose logs a one-line "jsdom environment" advisory on require, once per suite. It's benign
// for our tests; filter just that message so it doesn't drown the output. (Run before models load.)
const originalWarn = console.warn.bind(console);
console.warn = (...args) => {
  if (typeof args[0] === "string" && args[0].includes("trying to test a Mongoose app")) return;
  originalWarn(...args);
};

const { globalSettingsClient } = require("../routes/socket/models");

Enzyme.configure({ adapter: new Adapter() });

Object.defineProperty(window.document, "getElementById", {
  value: () => ({ classList: {} }),
});

afterAll(() => {
  globalSettingsClient.quit();
});
