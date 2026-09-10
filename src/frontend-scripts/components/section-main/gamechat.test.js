import React from "react"; // eslint-disable-line
import { shallow } from "enzyme";
import { shallowWithStore } from "enzyme-redux";
import { createMockStore } from "redux-test-utils";
import Gamechat from "./Gamechat";
import ReplayGamechat from "./replay/ReplayGamechat";

describe("Gamechat", () => {
  it("should initialize correctly", () => {
    const initialProps = {
      loadReplay: () => {},
      toggleNotes: () => {},
      updateUser: () => {},
      notesActive: false,
    };

    const store = createMockStore(initialProps);

    const component = shallowWithStore(<Gamechat />, store);

    expect(component).toHaveLength(1);
  });

  it("renders the Neighbor Chat row and message classes without marking ordinary game chats", () => {
    const timestamp = new Date();
    const component = shallowWithStore(
      <Gamechat
        userInfo={{ userName: "Recipient", isSeated: true, gameSettings: {} }}
        userList={{ list: [] }}
        allEmotes={{}}
        socket={{ on: jest.fn(), emit: jest.fn() }}
        gameInfo={{
          general: { neighborChat: true, playerChats: "enabled" },
          gameState: { isStarted: true, isTracksFlipped: true },
          publicPlayersState: [{ userName: "Sender" }, { userName: "Recipient" }],
          chats: [
            { gameChat: true, timestamp, chat: [{ text: "An ordinary game message." }] },
            {
              gameChat: true,
              timestamp,
              chat: [{ text: "← from left (#1 Sender): " }, { text: "hello", type: "neighbor-chat" }],
            },
          ],
        }}
      />,
      createMockStore({ notesActive: false })
    ).dive({ disableLifecycleMethods: true });
    const chats = shallow(<div>{component.instance().processChats()}</div>);
    const neighbor = chats.find(".item.game-chat.neighbor-chat");
    expect(neighbor).toHaveLength(1);
    expect(neighbor.text().trim()).toBe("← from left (#1 Sender): hello");
    expect(neighbor.find(".chat-role--neighbor-chat").text().trim()).toBe("hello");
    expect(chats.find(".item.game-chat").not(".neighbor-chat").text()).toBe("An ordinary game message.");
  });

  it("mutes Neighbor Chat separately from public chat filters", () => {
    const socket = { on: jest.fn(), emit: jest.fn() };
    const component = shallowWithStore(
      <Gamechat
        userInfo={{ userName: "Recipient", isSeated: true, gameSettings: {} }}
        userList={{ list: [] }}
        allEmotes={{}}
        socket={socket}
        gameInfo={{
          general: { uid: "table", neighborChat: true },
          gameState: { isTracksFlipped: true },
          publicPlayersState: [],
          chats: [],
        }}
      />,
      createMockStore({ notesActive: false })
    ).dive({ disableLifecycleMethods: true });
    const button = component.find("button[aria-pressed]");
    expect(button.text()).toBe("Mute Neighbor Chat");
    button.simulate("click");
    expect(socket.emit).toHaveBeenCalledWith(
      "muteNeighborChat",
      { gameUid: "table", muted: true },
      expect.any(Function)
    );
    expect(component.state("showPlayerChat")).toBe(true);
    component.setProps({ gameInfo: { ...component.instance().props.gameInfo, neighborChatMuted: true } });
    expect(component.find("button[aria-pressed]").text()).toBe("Unmute Neighbor Chat");
    component.find("button[aria-pressed]").simulate("click");
    expect(socket.emit).toHaveBeenLastCalledWith(
      "muteNeighborChat",
      { gameUid: "table", muted: false },
      expect.any(Function)
    );
  });
});

describe.each([
  ["live", Gamechat],
  ["replay", ReplayGamechat],
])("Neighbor Chat in %s chat", (view, ChatComponent) => {
  const renderChat = (playerChats = "enabled") => {
    const prefix =
      view === "live" ? "← from left (#1 Sender): " : "Neighbor Chat - (#1 Sender) to right (#2 Recipient): ";
    const component = shallowWithStore(
      <ChatComponent
        userInfo={{ userName: "Recipient", isSeated: true, gameSettings: {} }}
        userList={{ list: [] }}
        allEmotes={{ ":ja:": "/emotes/ja.png" }}
        socket={{ on: jest.fn(), emit: jest.fn() }}
        gameInfo={{
          general: { neighborChat: true, playerChats },
          gameState: { isStarted: true, isTracksFlipped: true },
          publicPlayersState: [{ userName: "Sender" }, { userName: "Recipient" }],
          chats: [
            { gameChat: true, timestamp: new Date(0), chat: [{ text: "System message :ja:" }] },
            {
              gameChat: true,
              timestamp: new Date(1),
              chat: [{ text: prefix }, { text: " :ja: 7 ", type: "neighbor-chat" }],
            },
            { timestamp: new Date(2), userName: "Sender", chat: "Public player message" },
            { timestamp: new Date(3), userName: "Observer", chat: "Spectator message" },
          ],
        }}
      />,
      createMockStore({ notesActive: false })
    ).dive({ disableLifecycleMethods: true });
    return view === "replay" ? component.dive({ disableLifecycleMethods: true }) : component;
  };

  it.each(["enabled", "emotes"])("renders emotes inside the styled message with %s player chat", (mode) => {
    const component = renderChat(mode);
    const rows = shallow(<div>{component.instance().processChats()}</div>);
    const message = rows.find(".chat-role--neighbor-chat");
    expect(message.find("img").prop("src")).toBe("/emotes/ja.png");
    expect(message.text()).toContain("7");
    expect(message.text()).not.toContain(":ja:");
    expect(rows.find(".item.neighbor-chat").text()).toContain(view === "live" ? "← from left" : "Neighbor Chat -");
    expect(rows.find(".item.game-chat").not(".neighbor-chat").text()).toBe("System message :ja:");
    expect(component.instance().props.gameInfo.chats[1].chat[1].text).toBe(" :ja: 7 ");
  });

  it("keeps neighbor messages visible when game chats are hidden", () => {
    const component = renderChat();
    component.instance().handleChatFilterClick({ currentTarget: { getAttribute: () => "Game" } });
    expect(component.state("showGameChat")).toBe(false);
    const rows = shallow(<div>{component.instance().processChats()}</div>);
    expect(rows.find(".item.neighbor-chat")).toHaveLength(1);
    expect(rows.find(".item.game-chat").not(".neighbor-chat")).toHaveLength(0);
  });

  it.each([
    [true, true, true],
    [true, true, false],
    [true, false, true],
    [true, false, false],
    [false, true, true],
    [false, true, false],
    [false, false, true],
    [false, false, false],
  ])("classifies neighbor chat under Player alone (Player %s, Game %s, Observer %s)", (showPlayerChat, showGameChat, showObserverChat) => {
    const component = renderChat();
    component.setState({ showPlayerChat, showGameChat, showObserverChat });
    const rows = shallow(<div>{component.instance().processChats()}</div>);
    expect(rows.find(".item.neighbor-chat")).toHaveLength(showPlayerChat ? 1 : 0);
    expect(rows.find(".item.game-chat").not(".neighbor-chat")).toHaveLength(showGameChat ? 1 : 0);
    expect(rows.text().includes("Public player message")).toBe(showPlayerChat);
    expect(rows.text().includes("Spectator message")).toBe(showObserverChat);
  });
});
