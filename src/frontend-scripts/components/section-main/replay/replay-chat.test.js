import React from "react";
import { shallow } from "enzyme";
import ConnectedReplayGamechat, { ReplayGamechat } from "./ReplayGamechat";
import { ReplayWrapper } from "./Replay";
import NeighborChatReport from "../../reusable/NeighborChatReport";
import socket from "../../../socket";
import buildEnhancedGameSummary from "../../../../../models/game-summary/buildEnhancedGameSummary";
import buildReplay from "../../../replay/buildReplay";
import fixture from "../../../../../__test__/mocks/mockGameSummary";
import { replayForViewer } from "../../../../../routes/socket/neighbor-chat";

const whisper = (id, sender, recipient, text, timestamp) => ({
  gameChat: true,
  timestamp,
  chat: [{ text: `Neighbor Chat - ${sender} to ${recipient}: ` }, { type: "neighbor-chat", text }],
  neighborChat: { id, sender, recipient },
});
const archive = () => ({
  uid: "table",
  neighborChat: true,
  chats: [{ userName: "Alice", timestamp: 0, chat: "Public message" }],
  neighborChats: [
    whisper("one", "Alice", "Bob", "First private message", 1),
    whisper("two", "Bob", "Alice", "Reply :ja:", 2),
    whisper("three", "Carol", "Dave", "Unrelated secret", 3),
  ],
});
const render = (username = "Bob", canReview = false) => {
  const data = replayForViewer(archive(), username, canReview);
  return shallow(
    <ReplayGamechat
      userInfo={{ userName: username, gameSettings: {} }}
      userList={{ list: [] }}
      allEmotes={{ ":ja:": "/emotes/ja.png" }}
      gameInfo={{ general: data, chats: data.chats, publicPlayersState: [{ userName: "Alice" }, { userName: "Bob" }] }}
    />,
    { disableLifecycleMethods: true }
  );
};
const chatText = (wrapper) => shallow(<div>{wrapper.instance().processChats()}</div>).text();

describe("private conversations in replay chat", () => {
  it.each([
    [null, false, 0],
    ["Stranger", false, 0],
    ["Alice", false, 2],
    ["Bob", false, 2],
    ["Reviewer", true, 3],
  ])("only displays and counts authorized whispers for %s (reviewer: %s)", (username, canReview, count) => {
    const wrapper = render(username, canReview);
    expect(wrapper.find(".replay-whisper")).toHaveLength(count);
    expect(wrapper.find(".replay-whisper-filter").text()).toContain(`(${count})`);
    if (!canReview) expect(chatText(wrapper)).not.toContain("Unrelated secret");
    if (!count) expect(chatText(wrapper)).not.toContain("First private message");
    if (!username) expect(wrapper.find(".replay-chat-privacy").text()).toContain("Log in");
  });

  it("shows directions, renders emotes and keeps recipient reporting available", () => {
    const wrapper = render();
    expect(wrapper.find(".replay-whisper-label").at(0).text()).toBe("Whisper · #1 Alice → #2 Bob");
    expect(wrapper.find(".chat-role--neighbor-chat").at(1).find("img").prop("src")).toBe("/emotes/ja.png");
    const reports = wrapper.find(NeighborChatReport);
    expect(reports).toHaveLength(2);
    expect(reports.at(0).dive().find("button")).toHaveLength(1);
    expect(reports.at(1).dive().isEmptyRender()).toBe(true);
  });

  it("switches between all chat and whispers without losing filters or mutating history", () => {
    const wrapper = render();
    const original = JSON.stringify(wrapper.instance().props.gameInfo);
    wrapper.find("[data-filter='Whispers']").simulate("click", { currentTarget: { getAttribute: () => "Whispers" } });
    expect(wrapper.find("[data-filter='Whispers']").prop("aria-pressed")).toBe(true);
    expect(chatText(wrapper)).not.toContain("Public message");
    expect(wrapper.find(".replay-whisper")).toHaveLength(2);
    wrapper.instance().handleChatFilterClick({ currentTarget: { getAttribute: () => "Whispers" } });
    expect(chatText(wrapper)).toContain("Public message");
    const history = wrapper.instance().props.gameInfo.chats;
    const order = history.map((chat) => chat.timestamp);
    wrapper.instance().processChats();
    expect(history.map((chat) => chat.timestamp)).toEqual(order);
    expect(JSON.stringify(wrapper.instance().props.gameInfo)).toBe(original);
  });

  it("provides an honest empty state for an unrelated viewer's private-only view", () => {
    const wrapper = render("Stranger");
    wrapper.instance().handleChatFilterClick({ currentTarget: { getAttribute: () => "Whispers" } });
    expect(wrapper.find(".replay-chat-empty").text()).toBe("No messages available in this view.");
    expect(chatText(wrapper)).not.toContain("Public message");
  });
});

describe("replay chat switching", () => {
  const ready = (id = "generic-game") => {
    const game = buildEnhancedGameSummary({ ...fixture, _id: id });
    return { status: "READY", game, ticks: buildReplay(game), position: 0 };
  };

  it("opens the chat panel even when no archived messages are available", () => {
    const wrapper = shallow(<ReplayWrapper replay={ready()} userInfo={{}} userList={{ list: [] }} to={jest.fn()} />, {
      disableLifecycleMethods: true,
    });
    wrapper.find(".displaychats").simulate("click");
    expect(wrapper.find("Replay").dive().find(ConnectedReplayGamechat)).toHaveLength(1);
    expect(wrapper.find("Replay").dive().find("ReplayControls")).toHaveLength(0);
  });

  it("advertises only the whispers supplied to the viewer", () => {
    const wrapper = shallow(<ReplayWrapper replay={{ status: "LOADING" }} />, { disableLifecycleMethods: true });
    wrapper.setState({ gameData: replayForViewer(archive(), "Bob", false) });
    expect(wrapper.find(".displaychats").text()).toBe("Show chats · 2 whispers");
  });

  it("rejects delayed transcript replies for a different replay and clears old chat when switching", () => {
    let receive;
    const on = jest.spyOn(socket, "on").mockImplementation((event, handler) => {
      if (event === "replayGameData") receive = handler;
    });
    const emit = jest.spyOn(socket, "emit").mockImplementation(() => {});
    const off = jest.spyOn(socket, "off").mockImplementation(() => {});
    try {
      const wrapper = shallow(<ReplayWrapper replay={ready("first")} />, { disableLifecycleMethods: true });
      wrapper.instance().componentDidMount();
      receive({ uid: "first", chats: [{ chat: "First replay" }] });
      receive({ uid: "other", chats: [{ chat: "Wrong replay" }] });
      expect(wrapper.state("gameData").chats).toEqual([{ chat: "First replay" }]);
      const previous = wrapper.instance().props;
      wrapper.setProps({ replay: ready("second") });
      wrapper.instance().componentDidUpdate(previous);
      expect(wrapper.state("gameData")).toEqual({});
      expect(emit).toHaveBeenCalledWith("getReplayGameData", "second");
      receive({ uid: "first", chats: [{ chat: "Delayed first replay" }] });
      expect(wrapper.state("gameData")).toEqual({});
      receive({ uid: "second", chats: [{ chat: "Second replay" }] });
      expect(wrapper.state("gameData").chats).toEqual([{ chat: "Second replay" }]);
      wrapper.unmount();
    } finally {
      on.mockRestore();
      emit.mockRestore();
      off.mockRestore();
    }
  });
});
