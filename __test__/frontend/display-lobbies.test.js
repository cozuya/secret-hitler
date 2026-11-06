import React from "react";
import { shallow } from "enzyme";
import DisplayLobbies from "../../src/frontend-scripts/components/section-main/DisplayLobbies";

const row = (overrides = {}) => ({
  uid: "lobby",
  name: "Lobby",
  flag: "none",
  gameStatus: "notStarted",
  seatedCount: 0,
  minPlayersCount: 5,
  maxPlayersCount: 7,
  excludedPlayerCount: [],
  userNames: [],
  customCardback: [],
  customCardbackUid: [],
  electionCount: 0,
  ...overrides,
});

const render = (game) => shallow(<DisplayLobbies game={game} userInfo={{}} userList={{}} />);
const tooltipFor = (wrapper, iconSelector) =>
  wrapper.find(".options-icons-container").find(iconSelector).parent().prop("data-tooltip");

describe("DisplayLobbies option icons", () => {
  it("shows the speed-mode icon for the New Player Game", () => {
    const wrapper = render(
      row({ name: "New Player Game", systemLobby: "new-player", practiceGame: true, experiencedMode: true })
    );
    expect(wrapper.find(".options-icons-container .fast.forward.icon")).toHaveLength(1);
    expect(tooltipFor(wrapper, ".fast.forward.icon")).toBe("Speed Mode");
  });

  it("says Neighbor Chat games are casual in the lobby tooltip", () => {
    const wrapper = render(row({ neighborChat: true, casualGame: true }));
    expect(tooltipFor(wrapper, ".exchange.icon")).toMatch(/always casual/i);
  });
});
