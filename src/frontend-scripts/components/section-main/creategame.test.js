import React from "react"; // eslint-disable-line
import { shallow } from "enzyme";
import Switch from "react-switch";
import Creategame from "./Creategame";

describe("Creategame", () => {
  it("should initialize correctly", () => {
    const component = shallow(<Creategame userList={{ list: [] }} userInfo={{ gameSettings: {} }} />);

    expect(component).toHaveLength(1);
  });

  it("defaults Neighbor Chat off, explains replay visibility, and sends the selected flag", () => {
    const socket = { emit: jest.fn() };
    const component = shallow(<Creategame userList={{ list: [] }} userInfo={{ gameSettings: {} }} socket={socket} />);
    const option = () =>
      component.find(".four.wide.column").filterWhere((column) => column.find(".exchange.icon").exists());
    const neighborRow = component.find(".row").filterWhere((row) => row.find(".exchange.icon").exists());
    expect(neighborRow).toHaveLength(1);
    expect(neighborRow.find(".four.wide.column")).toHaveLength(1);
    expect(component.state("neighborChat")).toBe(false);
    expect(option().find(Switch).prop("checked")).toBe(false);
    expect(option().find("h4").text()).toBe(
      "Neighbor Chat - /l and /r message your nearest living neighbor to the left or right, or use their seat number (for example /4); messages are visible only to you, your neighbor, and authorized moderators, including after the game. Neighbor Chat games are always casual."
    );
    component.instance().createNewGame();
    expect(socket.emit).toHaveBeenLastCalledWith("addNewGame", expect.objectContaining({ neighborChat: false }));

    option().find(Switch).prop("onChange")(true);
    expect(option().find(Switch).prop("checked")).toBe(true);
    component.instance().createNewGame();
    expect(socket.emit).toHaveBeenLastCalledWith(
      "addNewGame",
      // Neighbor Chat games are always casual: a Ranked selection submits as Casual.
      expect.objectContaining({ neighborChat: true, gameType: "casual" })
    );
  });

  it.each(["blindMode", "avalonSH", "monarchistSH"])("allows Neighbor Chat with %s", (mode) => {
    const socket = { emit: jest.fn() };
    const component = shallow(<Creategame userList={{ list: [] }} userInfo={{ gameSettings: {} }} socket={socket} />);
    component.setState({ [mode]: true });
    const toggle = component
      .find(".four.wide.column")
      .filterWhere((column) => column.find(".exchange.icon").exists())
      .find(Switch);
    expect(toggle.prop("disabled")).toBeFalsy();
    toggle.prop("onChange")(true);
    component.instance().createNewGame();
    expect(socket.emit).toHaveBeenCalledWith("addNewGame", expect.objectContaining({ neighborChat: true }));
  });

  it("keeps Neighbor Chat selected when public player chat is disabled", () => {
    const socket = { emit: jest.fn() };
    const component = shallow(<Creategame userList={{ list: [] }} userInfo={{ gameSettings: {} }} socket={socket} />);
    component.setState({ neighborChat: true });
    const changeChatMode = (value) => component.instance().renderPlayerChatDropdown().props.onChange({ value });
    changeChatMode("disabled");
    expect(component.state("neighborChat")).toBe(true);
    const option = component.find(".four.wide.column").filterWhere((column) => column.find(".exchange.icon").exists());
    expect(option.find(Switch).prop("disabled")).toBeFalsy();
    expect(option.find(Switch).prop("checked")).toBe(true);
    expect(option.text()).toContain("Public chat stays disabled");
    component.instance().createNewGame();
    expect(socket.emit).toHaveBeenLastCalledWith(
      "addNewGame",
      expect.objectContaining({ neighborChat: true, playerChats: "disabled" })
    );
    changeChatMode("enabled");
    expect(component.state("neighborChat")).toBe(true);
  });

  it.each([
    ["Silent Game", false],
    ["Silent Game", true],
    ["2R1H", false],
    ["2R1H", true],
  ])("preserves the Neighbor Chat selection for the %s preset (selected: %s)", (preset, neighborChat) => {
    const component = shallow(<Creategame userList={{ list: [] }} userInfo={{ gameSettings: {} }} />);
    component.setState({ neighborChat });
    component.instance().presetSelector(preset);
    expect(component.state("playerChats")).toBe("disabled");
    expect(component.state("neighborChat")).toBe(neighborChat);
  });

  it.each(["ranked", "practice"])("lets a silent %s game enable Neighbor Chat afterwards", (gameType) => {
    const socket = { emit: jest.fn() };
    const component = shallow(<Creategame userList={{ list: [] }} userInfo={{ gameSettings: {} }} socket={socket} />);
    component.setState({ gameType });
    component.instance().renderPlayerChatDropdown().props.onChange({ value: "disabled" });
    expect(component.state("neighborChat")).toBe(false);
    const option = () =>
      component.find(".four.wide.column").filterWhere((column) => column.find(".exchange.icon").exists());
    expect(option().find(Switch).prop("disabled")).toBeFalsy();
    option().find(Switch).prop("onChange")(true);
    component.instance().createNewGame();
    expect(socket.emit).toHaveBeenLastCalledWith(
      "addNewGame",
      expect.objectContaining({ neighborChat: true, playerChats: "disabled", gameType: "casual" })
    );
  });

  it("restores the default-off Neighbor Chat selection after Reset", () => {
    const socket = { emit: jest.fn() };
    const component = shallow(<Creategame userList={{ list: [] }} userInfo={{ gameSettings: {} }} socket={socket} />);
    const toggle = () =>
      component
        .find(".four.wide.column")
        .filterWhere((column) => column.find(".exchange.icon").exists())
        .find(Switch);
    toggle().prop("onChange")(true);
    expect(component.state("neighborChat")).toBe(true);
    component.instance().presetSelector("Reset");
    expect(component.state("neighborChat")).toBe(false);
    expect(toggle().prop("checked")).toBe(false);
    component.instance().createNewGame();
    expect(socket.emit).toHaveBeenLastCalledWith("addNewGame", expect.objectContaining({ neighborChat: false }));
  });

  it("sends independent Neighbor Chat and disabled public chat flags", () => {
    const socket = { emit: jest.fn() };
    const component = shallow(<Creategame userList={{ list: [] }} userInfo={{ gameSettings: {} }} socket={socket} />);
    component.setState({ neighborChat: true, playerChats: "disabled" });
    component.instance().createNewGame();
    expect(socket.emit).toHaveBeenLastCalledWith(
      "addNewGame",
      expect.objectContaining({ neighborChat: true, playerChats: "disabled" })
    );
  });
});
