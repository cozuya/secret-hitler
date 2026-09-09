import React from "react"; // eslint-disable-line
import { connect } from "react-redux";
import { createMockStore } from "redux-test-utils";
import { shallowWithStore } from "enzyme-redux";
import Players from "./Players";
import { shallow, mount } from "enzyme";

describe("Players", () => {
  let store;

  beforeEach(() => {
    store = createMockStore({});
  });

  it("should initialize correctly", () => {
    const mapStateToProps = (state) => ({
      state,
    });
    const ConnectedComponent = connect(mapStateToProps)(Players);
    const component = shallowWithStore(<ConnectedComponent />, store);

    expect(component).toHaveLength(1);
  });
});

describe("previous government labels", () => {
  it.each([
    ["wasPresident", "Prev. P", "Previous president"],
    ["wasChancellor", "Prev. C", "Previous chancellor"],
  ])("labels %s without relying on avatar graphics", (status, text, title) => {
    const players = new Players.WrappedComponent({
      gameInfo: { publicPlayersState: [{ previousGovernmentStatus: status }] },
    });
    const label = shallow(players.renderPreviousGovtToken(0));
    expect(label.text()).toBe(text);
    expect(label.prop("title")).toBe(title);
    expect(label.hasClass("government-token")).toBe(false);
  });

  it.each([undefined, "isPresident", "unknown"])("does not invent a previous office for %s", (status) => {
    const players = new Players.WrappedComponent({
      gameInfo: { publicPlayersState: [{ previousGovernmentStatus: status }] },
    });
    expect(players.renderPreviousGovtToken(0)).toBeUndefined();
  });
});

describe("replay seat row focus", () => {
  let wrapper, host, row, notifyResize, observer;
  const originalResizeObserver = window.ResizeObserver;

  beforeEach(() => {
    observer = { observe: jest.fn(), disconnect: jest.fn() };
    window.ResizeObserver = jest.fn((callback) => {
      notifyResize = callback;
      return observer;
    });
    host = document.createElement("div");
    document.body.appendChild(host);
    wrapper = mount(
      <Players.WrappedComponent
        isReplay
        socket={{ on: jest.fn(), off: jest.fn() }}
        userInfo={{}}
        userList={{}}
        gameInfo={{ general: {}, gameState: {}, trackState: {}, publicPlayersState: [] }}
      />,
      { attachTo: host }
    );
    row = host.querySelector(".players");
    Object.defineProperties(row, {
      clientWidth: { configurable: true, value: 600 },
      scrollWidth: { configurable: true, value: 900 },
    });
  });

  afterEach(() => {
    if (wrapper.length) wrapper.unmount();
    host.remove();
    window.ResizeObserver = originalResizeObserver;
  });

  it("adds focus and scroll instructions only when the rendered row can scroll", () => {
    row.style.overflowX = "hidden";
    window.dispatchEvent(new Event("resize"));
    expect(row.hasAttribute("tabindex")).toBe(false);
    expect(row.hasAttribute("aria-label")).toBe(false);

    row.style.overflowX = "auto";
    window.dispatchEvent(new Event("resize"));
    expect(row.tabIndex).toBe(0);
    expect(row.getAttribute("aria-label")).toContain("scroll horizontally");
    row.focus();

    // A wide layout can leave focus on the row after removing it from the tab order.
    row.style.overflowX = "hidden";
    window.dispatchEvent(new Event("resize"));
    expect(row.hasAttribute("tabindex")).toBe(false);
    expect(row.hasAttribute("aria-label")).toBe(false);
  });

  it("rechecks overflow when the available panel width or replay content changes", () => {
    row.style.overflowX = "auto";
    notifyResize();
    expect(observer.observe).toHaveBeenCalledWith(row);
    expect(row.tabIndex).toBe(0);

    Object.defineProperty(row, "clientWidth", { configurable: true, value: 900 });
    notifyResize();
    expect(row.hasAttribute("tabindex")).toBe(false);

    Object.defineProperty(row, "scrollWidth", { configurable: true, value: 1200 });
    wrapper.setProps({ gameInfo: { ...wrapper.props().gameInfo } });
    expect(row.tabIndex).toBe(0);
    wrapper.unmount();
    expect(observer.disconnect).toHaveBeenCalledTimes(1);
  });

  it("does not turn live-game seats into a keyboard scroll control", () => {
    row.style.overflowX = "auto";
    notifyResize();
    expect(row.tabIndex).toBe(0);
    wrapper.setProps({ isReplay: false });
    expect(row.hasAttribute("tabindex")).toBe(false);
    expect(row.hasAttribute("aria-label")).toBe(false);
  });
});
