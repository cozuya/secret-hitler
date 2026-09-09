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
      "Neighbor Chat - /l and /r message your nearest living neighbor to the left or right; messages are visible to you, your neighbor, and authorized moderators during the live game, and to everyone in the replay afterwards."
    );
    component.instance().createNewGame();
    expect(socket.emit).toHaveBeenLastCalledWith("addNewGame", expect.objectContaining({ neighborChat: false }));

    option().find(Switch).prop("onChange")(true);
    expect(option().find(Switch).prop("checked")).toBe(true);
    component.instance().createNewGame();
    expect(socket.emit).toHaveBeenLastCalledWith(
      "addNewGame",
      expect.objectContaining({ neighborChat: true, gameType: "ranked" })
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

  it("clears and disables Neighbor Chat when player chat is disabled", () => {
    const socket = { emit: jest.fn() };
    const component = shallow(<Creategame userList={{ list: [] }} userInfo={{ gameSettings: {} }} socket={socket} />);
    component.setState({ neighborChat: true });
    const changeChatMode = (value) => component.instance().renderPlayerChatDropdown().props.onChange({ value });
    changeChatMode("disabled");
    expect(component.state("neighborChat")).toBe(false);
    const option = component.find(".four.wide.column").filterWhere((column) => column.find(".exchange.icon").exists());
    expect(option.find(Switch).prop("disabled")).toBe(true);
    expect(option.find(Switch).prop("checked")).toBe(false);
    component.instance().createNewGame();
    expect(socket.emit).toHaveBeenLastCalledWith(
      "addNewGame",
      expect.objectContaining({ neighborChat: false, playerChats: "disabled" })
    );
    changeChatMode("enabled");
    expect(component.state("neighborChat")).toBe(false);
  });

  it.each(["Silent Game", "2R1H"])("clears Neighbor Chat for the %s preset", (preset) => {
    const component = shallow(<Creategame userList={{ list: [] }} userInfo={{ gameSettings: {} }} />);
    component.setState({ neighborChat: true });
    component.instance().presetSelector(preset);
    expect(component.state("playerChats")).toBe("disabled");
    expect(component.state("neighborChat")).toBe(false);
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

  it("does not send a stale Neighbor Chat selection with disabled player chat", () => {
    const socket = { emit: jest.fn() };
    const component = shallow(<Creategame userList={{ list: [] }} userInfo={{ gameSettings: {} }} socket={socket} />);
    component.setState({ neighborChat: true, playerChats: "disabled" });
    component.instance().createNewGame();
    expect(socket.emit).toHaveBeenLastCalledWith("addNewGame", expect.objectContaining({ neighborChat: false }));
  });
});
