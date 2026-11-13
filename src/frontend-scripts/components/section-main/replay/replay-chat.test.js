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
const render = (username = "Bob", canReview = false, savedGame = archive()) => {
  const data = replayForViewer(savedGame, username, canReview, { includeAllNeighborChats: true });
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
const toggle = (wrapper, filter) =>
  wrapper.find(`[data-filter='${filter}']`).simulate("click", { currentTarget: { getAttribute: () => filter } });

describe("private conversations in replay chat", () => {
  it.each([
    [null, false, 3],
    ["Stranger", false, 3],
    ["Alice", false, 3],
    ["Bob", false, 3],
    ["Reviewer", true, 3],
  ])("defaults to public chat and lets %s view all replay whispers (reviewer: %s)", (username, canReview, count) => {
    const wrapper = render(username, canReview);
    expect(wrapper.find(".replay-whisper")).toHaveLength(0);
    expect(wrapper.find(".replay-whisper-filter").text()).toContain(`Show whispers (${count})`);
    expect(wrapper.find(".replay-whisper-filter").prop("aria-pressed")).toBe(false);
    expect(wrapper.find(".replay-public-filter").text()).toContain("Hide public chat");
    expect(wrapper.find(".replay-public-filter").prop("aria-pressed")).toBe(true);
    expect(chatText(wrapper)).toContain("Public message");
    expect(chatText(wrapper)).not.toContain("First private message");
    toggle(wrapper, "Whispers");
    expect(wrapper.find(".replay-whisper")).toHaveLength(count);
    expect(chatText(wrapper)).toContain("Unrelated secret");
    expect(chatText(wrapper)).toContain("First private message");
    expect(wrapper.find(".replay-chat-privacy").text()).toContain("visible to everyone in replays");
  });

  it("shows directions, renders emotes and keeps recipient reporting available", () => {
    const wrapper = render();
    toggle(wrapper, "Whispers");
    expect(wrapper.find(".replay-whisper-label").at(0).text()).toBe("Whisper · #1 Alice → #2 Bob");
    expect(wrapper.find(".chat-role--neighbor-chat").at(1).find("img").prop("src")).toBe("/emotes/ja.png");
    const reports = wrapper.find(NeighborChatReport);
    expect(reports).toHaveLength(3);
    expect(reports.at(0).dive().find("button")).toHaveLength(1);
    expect(reports.at(1).dive().isEmptyRender()).toBe(true);
    expect(reports.at(2).dive().isEmptyRender()).toBe(true);
  });

  it.each([
    [false, true],
    [true, true],
    [true, false],
    [false, false],
  ])("independently shows whispers %s and public chat %s", (showWhispers, showPublicChat) => {
    const wrapper = render();
    if (showWhispers) toggle(wrapper, "Whispers");
    if (!showPublicChat) toggle(wrapper, "Public");
    expect(wrapper.find(".replay-whisper")).toHaveLength(showWhispers ? 3 : 0);
    expect(chatText(wrapper).includes("Public message")).toBe(showPublicChat);
    expect(wrapper.find(".replay-whisper-filter").prop("aria-pressed")).toBe(showWhispers);
    expect(wrapper.find(".replay-public-filter").prop("aria-pressed")).toBe(showPublicChat);
    expect(wrapper.find(".replay-chat-empty")).toHaveLength(!showWhispers && !showPublicChat ? 1 : 0);
  });

  it("preserves public filters and chat history when toggling channels back and forth", () => {
    const wrapper = render();
    const original = JSON.stringify(wrapper.instance().props.gameInfo);
    toggle(wrapper, "Player");
    toggle(wrapper, "Whispers");
    expect(chatText(wrapper)).not.toContain("Public message");
    expect(wrapper.find(".replay-whisper")).toHaveLength(3);
    toggle(wrapper, "Public");
    toggle(wrapper, "Public");
    expect(wrapper.state("showPlayerChat")).toBe(false);
    expect(chatText(wrapper)).not.toContain("Public message");
    toggle(wrapper, "Whispers");
    expect(wrapper.find(".replay-whisper")).toHaveLength(0);
    toggle(wrapper, "Player");
    expect(chatText(wrapper)).toContain("Public message");
    const history = wrapper.instance().props.gameInfo.chats;
    const order = history.map((chat) => chat.timestamp);
    wrapper.instance().processChats();
    expect(history.map((chat) => chat.timestamp)).toEqual(order);
    expect(JSON.stringify(wrapper.instance().props.gameInfo)).toBe(original);
  });

  it("provides an honest empty state when the archive has no neighbor chats", () => {
    const wrapper = render("Stranger", false, { ...archive(), neighborChats: [] });
    toggle(wrapper, "Whispers");
    toggle(wrapper, "Public");
    expect(wrapper.find(".replay-chat-empty").text()).toBe("No messages available in this view.");
    expect(chatText(wrapper)).not.toContain("Public message");
  });

  it("hides broadcasts and staff messages along with all other public chat", () => {
    const savedGame = archive();
    savedGame.chats.push(
      { userName: "Admin", timestamp: 4, isBroadcast: true, chat: "Public broadcast" },
      { userName: "Moderator", timestamp: 5, staffRole: "moderator", chat: "Public staff message" }
    );
    const wrapper = render("Stranger", false, savedGame);
    expect(wrapper.find(".broadcast-chat")).toHaveLength(1);
    expect(chatText(wrapper)).toContain("Public staff message");
    toggle(wrapper, "Whispers");
    toggle(wrapper, "Public");
    expect(wrapper.find(".broadcast-chat")).toHaveLength(0);
    expect(chatText(wrapper)).not.toContain("Public staff message");
    expect(wrapper.find(".replay-whisper")).toHaveLength(3);
  });

  it("applies the whisper toggle to older messages without participant metadata", () => {
    const legacy = whisper("legacy", "Alice", "Bob", "Legacy private message", 1);
    delete legacy.neighborChat;
    const wrapper = render(null, false, { ...archive(), neighborChats: [legacy] });
    expect(chatText(wrapper)).not.toContain("Legacy private message");
    toggle(wrapper, "Whispers");
    expect(wrapper.find(".replay-whisper")).toHaveLength(1);
    expect(chatText(wrapper)).toContain("Legacy private message");
    toggle(wrapper, "Whispers");
    expect(chatText(wrapper)).not.toContain("Legacy private message");
  });

  it("keeps normal replays' existing public chat controls without extra channel buttons", () => {
    const wrapper = render("Stranger", false, { ...archive(), neighborChat: false, neighborChats: [] });
    expect(wrapper.find(".replay-whisper-filter")).toHaveLength(0);
    expect(wrapper.find(".replay-public-filter")).toHaveLength(0);
    expect(chatText(wrapper)).toContain("Public message");
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

  it("advertises the full archived whisper count", () => {
    const wrapper = shallow(<ReplayWrapper replay={{ status: "LOADING" }} />, { disableLifecycleMethods: true });
    wrapper.setState({ gameData: replayForViewer(archive(), "Bob", false, { includeAllNeighborChats: true }) });
    expect(wrapper.find(".displaychats").text()).toBe("Show chats · 3 whispers");
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
