import React from "react";
import { shallow } from "enzyme";
import Select from "react-select";
import Creategame from "../../src/frontend-scripts/components/section-main/Creategame";

const mount = () => {
  const socket = { emit: jest.fn(), on: jest.fn(), off: jest.fn() };
  const wrapper = shallow(
    <Creategame socket={socket} userInfo={{ userName: "Creator", gameSettings: {} }} userList={{ list: [] }} />
  );
  return { wrapper, socket };
};

// The Game Type dropdown is the Select whose options include "ranked".
const gameTypeSelect = (wrapper) =>
  wrapper.find(Select).filterWhere((select) => (select.prop("options") || []).some((o) => o.value === "ranked"));

const neighborChatSwitch = (wrapper) =>
  wrapper
    .find(".create-game-switch")
    .filterWhere((sw) => sw.closest(".column").find("h4").first().text().startsWith("Neighbor Chat"));

const submitted = (socket) => socket.emit.mock.calls.find(([event]) => event === "addNewGame")[1];

describe("Creategame Neighbor Chat is always casual", () => {
  it("shows and submits Casual, and locks Game Type, while Neighbor Chat is on", () => {
    const { wrapper, socket } = mount();
    expect(gameTypeSelect(wrapper).prop("value").value).toBe("ranked");
    expect(gameTypeSelect(wrapper).prop("isDisabled")).toBe(false);

    neighborChatSwitch(wrapper).prop("onChange")(true);
    wrapper.update();

    expect(gameTypeSelect(wrapper).prop("value").value).toBe("casual");
    expect(gameTypeSelect(wrapper).prop("isDisabled")).toBe(true);
    expect(wrapper.find(".neighbor-chat-casual-note").text()).toBe("Neighbor Chat games are always casual.");
    expect(neighborChatSwitch(wrapper).closest(".column").find("h4").first().text()).toMatch(/always casual/);

    wrapper.instance().createNewGame();
    expect(submitted(socket)).toMatchObject({ gameType: "casual", neighborChat: true });
  });

  it("turns a Practice selection casual while on and restores it when Neighbor Chat is switched off", () => {
    const { wrapper, socket } = mount();
    wrapper.setState({ gameType: "practice" });
    neighborChatSwitch(wrapper).prop("onChange")(true);
    wrapper.update();
    expect(gameTypeSelect(wrapper).prop("value").value).toBe("casual");

    neighborChatSwitch(wrapper).prop("onChange")(false);
    wrapper.update();
    expect(gameTypeSelect(wrapper).prop("value").value).toBe("practice");
    expect(gameTypeSelect(wrapper).prop("isDisabled")).toBe(false);
    expect(wrapper.find(".neighbor-chat-casual-note")).toHaveLength(0);

    wrapper.instance().createNewGame();
    expect(submitted(socket)).toMatchObject({ gameType: "practice", neighborChat: false });
  });

  it("resets emote-only chat when switching back to a ranked selection", () => {
    const { wrapper } = mount();
    neighborChatSwitch(wrapper).prop("onChange")(true);
    wrapper.setState({ playerChats: "emotes" });
    neighborChatSwitch(wrapper).prop("onChange")(false);
    expect(wrapper.state("playerChats")).toBe("enabled");
  });

  it.each([
    "ranked",
    "practice",
  ])("keeps silent Neighbor Chat casual and restores the prior %s selection when disabled", (gameType) => {
    const { wrapper, socket } = mount();
    wrapper.setState({ gameType, neighborChat: true, playerChats: "disabled" });
    expect(gameTypeSelect(wrapper).prop("value").value).toBe("casual");
    expect(gameTypeSelect(wrapper).prop("isDisabled")).toBe(true);
    expect(wrapper.find(".neighbor-chat-casual-note").text()).toBe("Neighbor Chat games are always casual.");
    wrapper.instance().createNewGame();
    expect(submitted(socket)).toMatchObject({ gameType: "casual", neighborChat: true, playerChats: "disabled" });

    neighborChatSwitch(wrapper).prop("onChange")(false);
    expect(gameTypeSelect(wrapper).prop("value").value).toBe(gameType);
    expect(gameTypeSelect(wrapper).prop("isDisabled")).toBe(false);
    expect(wrapper.state("playerChats")).toBe("disabled");
    socket.emit.mockClear();
    wrapper.instance().createNewGame();
    expect(submitted(socket)).toMatchObject({ gameType, neighborChat: false, playerChats: "disabled" });
  });

  it("keeps a Custom game Custom with Neighbor Chat on", () => {
    const { wrapper } = mount();
    wrapper.setState({
      gameType: "custom",
      customGameSettings: { ...wrapper.state("customGameSettings"), enabled: true },
      neighborChat: true,
    });
    expect(gameTypeSelect(wrapper).prop("value").value).toBe("custom");
    expect(wrapper.find(".neighbor-chat-casual-note")).toHaveLength(0);
  });
});
