import React from "react"; // eslint-disable-line
import { shallow } from "enzyme";
import DisplayLobbies from "./DisplayLobbies";

const newPlayerRow = (overrides = {}) => ({
  uid: "NewPlayerLobby",
  name: "New Player Game",
  flag: "none",
  systemLobby: "new-player",
  gameCreatorName: null,
  gameStatus: "notStarted",
  practiceGame: true,
  seatedCount: 0,
  minPlayersCount: 5,
  maxPlayersCount: 7,
  userNames: [],
  customCardback: [],
  customCardbackUid: [],
  excludedPlayerCount: [],
  ...overrides,
});

const renderRow = (game = newPlayerRow(), userInfo = {}) =>
  shallow(<DisplayLobbies game={game} userInfo={userInfo} userList={{ list: [] }} />);

describe("DisplayLobbies", () => {
  it("should initialize correctly", () => {
    const component = shallow(
      <DisplayLobbies game={{ userNames: [], customCardback: [], customCardbackUid: [], excludedPlayerCount: [] }} />
    );

    expect(component).toHaveLength(1);
  });

  it("shows an empty intake count of 0 with the existing 5-7 range", () => {
    const row = renderRow();
    expect(row.find(".seatedcount").text().trim()).toBe("0");
    expect(row.find(".allowed-players").text().trim()).toBe("5-7");
    expect(row.find(".divider").text()).toBe("/");
    expect(row.text()).not.toMatch(/NaN|undefined|null/);
  });

  it("shows the Neighbor Chat icon and explains live privacy and public replays", () => {
    const row = renderRow(newPlayerRow({ neighborChat: true }));
    const icon = row.find(".options-icons-container .exchange.icon");
    expect(icon).toHaveLength(1);
    expect(icon.parent().prop("data-tooltip")).toBe(
      "Neighbor Chat - /l and /r message your nearest living neighbor to the left or right; messages are visible only to you, your neighbor, and authorized moderators, including after the game."
    );
    expect(icon.parent().prop("data-inverted")).toBe("");
  });

  it.each([false, undefined])("omits the Neighbor Chat icon and tooltip when the flag is %s", (neighborChat) => {
    const row = renderRow(newPlayerRow({ neighborChat }));
    expect(row.find(".exchange.icon")).toHaveLength(0);
    expect(row.find("[data-tooltip]").someWhere((span) => span.prop("data-tooltip").includes("Neighbor Chat"))).toBe(
      false
    );
    expect(row.html()).toBe(renderRow().html());
  });

  it.each([0, undefined])("preserves the tournament queue fallback with seatedCount %s", (seatedCount) => {
    const row = renderRow(
      newPlayerRow({
        systemLobby: undefined,
        isTourny: true,
        seatedCount,
        tournyStatus: { queuedPlayers: 4 },
      })
    );
    expect(row.find(".seatedcount").text().trim()).toBe("4");
    expect(row.find(".game-tournament-unstarted").text()).toBe("Tournament starting soon..");
  });

  it("retains a populated ordinary lobby's count ahead of any tournament fallback", () => {
    const row = renderRow(newPlayerRow({ systemLobby: undefined, seatedCount: 3, tournyStatus: { queuedPlayers: 4 } }));
    expect(row.find(".seatedcount").text().trim()).toBe("3");
  });

  it.each([
    [{}, "System lobby"],
    [{ systemLobby: undefined, gameCreatorName: "Human" }, "Created by: Human"],
    [{ systemLobby: undefined }, "Creator unavailable"],
  ])("shows a truthful staff creator label (%j)", (overrides, expected) => {
    const row = renderRow(newPlayerRow(overrides), { staffRole: "admin" });
    expect(row.find(".gamename-column").text()).toContain(expected);
    expect(row.text()).not.toMatch(/Created by: (null|undefined)/);
  });

  it("keeps creator details staff-only", () => {
    const row = renderRow(newPlayerRow({ systemLobby: undefined, gameCreatorName: "Human" }));
    expect(row.find(".gamename-column").text()).not.toContain("Created by:");
  });

  it("adds the path-to-Rainbow label alongside the existing name, Practice icon and range", () => {
    const row = renderRow();
    const label = row.find(".gamename-column .ui.mini.teal.label");
    expect(label.text()).toBe("Path to Rainbow");
    expect(label.prop("data-tooltip")).toBe("Earn XP toward Rainbow in this new-player Practice game.");
    expect(row.find(".gamename-column").text()).toContain("New Player Game");
    expect(row.find(".options-icons-container .chess.icon")).toHaveLength(1);
    expect(row.find(".allowed-players").text().trim()).toBe("5-7");
  });

  it.each([
    { systemLobby: undefined },
    { systemLobby: "another-type" },
    { gameStatus: "isStarted" },
    { gameStatus: "liberal" },
    { gameStatus: "fascist" },
  ])("does not add the intake badge to an ordinary or finished/started row (%j)", (overrides) => {
    expect(renderRow(newPlayerRow(overrides)).find(".ui.mini.teal.label")).toHaveLength(0);
  });

  it("renders seven empty seats with the permitted fifth through seventh seats highlighted", () => {
    const row = renderRow();
    expect(row.find(".player-small-cardback")).toHaveLength(0);
    expect(row.find(".empty-seat-icons").map((seat) => seat.text())).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
    expect(row.find(".included-player-count").map((seat) => seat.text())).toEqual(["5", "6", "7"]);
  });

  it("keeps the waiting room and its label visible to Rainbow users", () => {
    const row = renderRow(newPlayerRow(), { userName: "Rainbow", isRainbowOverall: true });
    expect(row.find(".browser-row")).toHaveLength(1);
    expect(row.find(".ui.mini.teal.label")).toHaveLength(1);
  });

  it.each([
    [{}, 0],
    [{ staffRole: "admin" }, 1],
  ])("preserves unlisted-row visibility for the viewer %j", (userInfo, visibleRows) => {
    const row = renderRow(
      newPlayerRow({ systemLobby: undefined, isUnlisted: true, gameCreatorName: "Human" }),
      userInfo
    );
    expect(row.find(".browser-row")).toHaveLength(visibleRows);
  });
});
