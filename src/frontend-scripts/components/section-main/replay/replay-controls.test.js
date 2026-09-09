import React from "react";
import { shallow, mount } from "enzyme";
import { List } from "immutable";
import ReplayControls from "./ReplayControls";
import { ReplayWrapper } from "./Replay";

const renderControls = (overrides = {}) => {
  const playback = {
    hasNext: true,
    hasPrev: true,
    hasLegislation: true,
    hasAction: true,
    toBeginning: jest.fn(),
    toEnd: jest.fn(),
    nextTick: jest.fn(),
    prevTick: jest.fn(),
    nextPhase: jest.fn(),
    prevPhase: jest.fn(),
    toElection: jest.fn(),
    toLegislation: jest.fn(),
    toAction: jest.fn(),
    toTurn: jest.fn(),
    ...overrides,
  };
  const wrapper = shallow(
    <ReplayControls
      turnsSize={25}
      turnNum={7}
      phase="election"
      description={[]}
      playback={playback}
      deck={List()}
      userInfo={{}}
    />
  );
  return { wrapper, playback };
};

it("lets mobile users choose any turn without crowded slider marks", () => {
  const { wrapper, playback } = renderControls();
  const turnNav = wrapper.find("TurnNav").dive();
  expect(turnNav.find("option")).toHaveLength(25);
  expect(turnNav.find("select").prop("value")).toBe(8);
  turnNav.find("select").simulate("change", { target: { value: "25" } });
  expect(playback.toTurn).toHaveBeenCalledWith(24);
});

it("wires mobile phase shortcuts to the existing playback actions", () => {
  const { wrapper, playback } = renderControls({ hasAction: false });
  const buttons = wrapper.find(".phase-shortcuts button");
  buttons.at(0).simulate("click");
  buttons.at(1).simulate("click");
  expect(playback.toElection).toHaveBeenCalledTimes(1);
  expect(playback.toLegislation).toHaveBeenCalledTimes(1);
  expect(buttons.at(2).prop("disabled")).toBe(true);
});

it("labels playback controls and disables movement past the replay boundaries", () => {
  const { wrapper } = renderControls({ hasNext: false, hasPrev: false });
  const buttons = wrapper.find("Playback").dive().find("button");
  expect(buttons).toHaveLength(6);
  buttons.forEach((button) => {
    expect(button.prop("aria-label")).toBeTruthy();
    expect(button.prop("disabled")).toBe(true);
  });
});

it("leaves arrow keys to the focused turn selector", () => {
  const { wrapper, playback } = renderControls();
  const mounted = mount(wrapper.find("Playback").getElement());
  const control = document.createElement("select");
  document.body.appendChild(control);
  control.focus();
  document.dispatchEvent(new KeyboardEvent("keydown", { keyCode: 39 }));
  expect(playback.nextTick).not.toHaveBeenCalled();
  control.blur();
  document.dispatchEvent(new KeyboardEvent("keydown", { keyCode: 39 }));
  expect(playback.nextTick).toHaveBeenCalledTimes(1);
  mounted.unmount();
  control.remove();
});

it.each([
  ["desktop fitting row", "hidden", 600, 600, false],
  ["clipped desktop row", "hidden", 900, 600, false],
  ["mobile fitting row", "auto", 600, 600, false],
  ["scrollable mobile row", "auto", 900, 600, true],
])("preserves the appropriate keyboard behavior for a %s", (_name, overflowX, scrollWidth, clientWidth, scrollable) => {
  const { wrapper, playback } = renderControls();
  const mounted = mount(wrapper.find("Playback").getElement());
  const row = document.createElement("section");
  row.className = "players";
  row.tabIndex = 0;
  row.style.overflowX = overflowX;
  Object.defineProperties(row, { scrollWidth: { value: scrollWidth }, clientWidth: { value: clientWidth } });
  document.body.appendChild(row);
  row.focus();

  document.dispatchEvent(new KeyboardEvent("keydown", { keyCode: 39 }));
  expect(playback.nextTick).toHaveBeenCalledTimes(scrollable ? 0 : 1);
  document.dispatchEvent(new KeyboardEvent("keydown", { keyCode: 37 }));
  expect(playback.prevTick).toHaveBeenCalledTimes(scrollable ? 0 : 1);
  // H/J/K/L and shifted arrows remain replay shortcuts even while the seat row can scroll.
  for (const keyCode of [72, 74, 75, 76]) document.dispatchEvent(new KeyboardEvent("keydown", { keyCode }));
  document.dispatchEvent(new KeyboardEvent("keydown", { keyCode: 39, shiftKey: true }));
  expect(playback.prevPhase).toHaveBeenCalledTimes(1);
  expect(playback.prevTick).toHaveBeenCalledTimes(scrollable ? 1 : 2);
  expect(playback.nextTick).toHaveBeenCalledTimes(scrollable ? 1 : 2);
  expect(playback.nextPhase).toHaveBeenCalledTimes(2);
  mounted.unmount();
  row.remove();
});

it("keeps replay display toggles in a wrapping toolbar and preserves their state changes", () => {
  const wrapper = shallow(<ReplayWrapper replay={{ status: "LOADING" }} />, { disableLifecycleMethods: true });
  wrapper.setState({ legacyReplay: false });
  expect(wrapper.find(".replay-actions button")).toHaveLength(4);
  wrapper.find(".displaychats").simulate("click");
  wrapper.find(".displayroles").simulate("click");
  wrapper.find(".displaydeck").simulate("click");
  expect(wrapper.state()).toMatchObject({ chatsShown: true, hiddenInfoShown: false, deckShown: true });
});
