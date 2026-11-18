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
    expect(tooltipFor(wrapper, ".exchange.icon")).toMatch(/seat number \(for example \/4\)/);
  });

  describe("Neighbor Chat icon placement", () => {
    // Each direct child span of the icon group, labelled by its icon (or "timer").
    const iconOrder = (wrapper) =>
      wrapper
        .find(".options-icons-container")
        .children()
        .map((span) => {
          if (span.find(".hourglass.icon").exists()) return "timer";
          const icon = span.find("i").first();
          return icon.exists() ? icon.prop("className").replace(/ icon$/, "") : span.text().trim();
        });

    it("sits inside the option icon group, next to the other mode icons and left of the timer", () => {
      const wrapper = render(
        row({
          casualGame: true,
          blindMode: true,
          experiencedMode: true,
          avalonSH: { withPercival: false },
          noTopdecking: 1,
          neighborChat: true,
          timedMode: 120,
          flappyMode: true,
        })
      );
      expect(wrapper.find(".options-icons-container .exchange.icon")).toHaveLength(1);
      expect(wrapper.find(".exchange.icon").closest(".options-icons-container")).toHaveLength(1);
      expect(iconOrder(wrapper)).toEqual([
        "handshake",
        "hide",
        "fast forward",
        "shield",
        "gavel",
        "exchange",
        "plane",
        "timer",
      ]);
    });

    it("stays directly left of the timer in a minimal Neighbor Chat row", () => {
      const order = iconOrder(
        render(row({ casualGame: true, experiencedMode: true, neighborChat: true, timedMode: 90 }))
      );
      expect(order).toEqual(["handshake", "fast forward", "exchange", "timer"]);
    });
  });
});
