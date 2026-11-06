import React from "react";
import { shallow } from "enzyme";
import Game from "../../src/frontend-scripts/components/section-main/Game";

jest.mock("../../src/frontend-scripts/components/reusable/playSound", () => jest.fn());

const players = (n) => Array.from({ length: n }, (_, i) => ({ userName: `p${i + 1}` }));

const game = ({ uid = "game-1", count = 0, general = {} } = {}) => ({
  general: { uid, status: "", ...general },
  gameState: {},
  publicPlayersState: players(count),
  chats: [],
});

const mount = (gameInfo) => {
  const socket = { emit: jest.fn(), on: jest.fn(), off: jest.fn(), removeListener: jest.fn() };
  return shallow(<Game gameInfo={gameInfo} userInfo={{ userName: "viewer" }} socket={socket} userList={{}} />);
};

describe("Game empty-game redirect", () => {
  beforeEach(() => {
    window.location.hash = "#/table/game-1";
  });

  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  const stayedOnTable = () => expect(window.location.hash).toBe("#/table/game-1");
  const redirected = () => expect(window.location.hash).toBe("#/");

  it("does not redirect a 0-player system lobby on mount", () => {
    mount(game({ general: { systemLobby: "new-player" } }));
    stayedOnTable();
  });

  it("does not redirect a 0-player system lobby on update", () => {
    const wrapper = mount({});
    wrapper.setProps({ gameInfo: game({ general: { systemLobby: "new-player" } }) });
    wrapper.setProps({ gameInfo: game({ general: { systemLobby: "new-player", status: "tick" } }) });
    stayedOnTable();
  });

  it("does not redirect when the last player leaves a system lobby", () => {
    const wrapper = mount(game({ count: 1, general: { systemLobby: "new-player" } }));
    wrapper.setProps({ gameInfo: game({ count: 0, general: { systemLobby: "new-player" } }) });
    stayedOnTable();
  });

  it("does not redirect when opening an already-empty normal lobby", () => {
    const wrapper = mount({});
    wrapper.setProps({ gameInfo: game() });
    wrapper.setProps({ gameInfo: game({ general: { status: "Waiting for more players.." } }) });
    stayedOnTable();
  });

  it("does not redirect when switching from a populated game to a different empty game", () => {
    const wrapper = mount(game({ uid: "other", count: 3 }));
    wrapper.setProps({ gameInfo: game() });
    stayedOnTable();
  });

  it("redirects when a normal game goes from 1 player to 0", () => {
    const wrapper = mount(game({ count: 1 }));
    wrapper.setProps({ gameInfo: game({ count: 0 }) });
    redirected();
  });

  it("redirects when a normal game goes from several players to 0", () => {
    const wrapper = mount(game({ count: 7 }));
    wrapper.setProps({ gameInfo: game({ count: 0 }) });
    redirected();
  });

  it("redirects a remade New Player game (no systemLobby) when it empties", () => {
    const wrapper = mount(game({ count: 2 }));
    wrapper.setProps({ gameInfo: game({ count: 0 }) });
    redirected();
  });

  describe("tournament round 0 (unchanged)", () => {
    const tourny = (queuedPlayers, count = 0) =>
      game({ count, general: { isTourny: true, tournyInfo: { round: 0, queuedPlayers } } });

    it("redirects when the queue is empty", () => {
      const wrapper = mount(tourny([{ userName: "a" }]));
      wrapper.setProps({ gameInfo: tourny([]) });
      redirected();
    });

    it("redirects on any update with an empty queue, even with no previous queue", () => {
      const wrapper = mount({});
      wrapper.setProps({ gameInfo: tourny([]) });
      wrapper.setProps({ gameInfo: tourny(undefined) });
      redirected();
    });

    it("does not redirect while players are queued and no one is seated", () => {
      const wrapper = mount(tourny([{ userName: "a" }]));
      wrapper.setProps({ gameInfo: tourny([{ userName: "a" }, { userName: "b" }]) });
      stayedOnTable();
    });
  });

  it("redirects a later-round tournament game whose players all left", () => {
    const later = (count) => game({ count, general: { isTourny: true, tournyInfo: { round: 1 } } });
    const wrapper = mount(later(4));
    wrapper.setProps({ gameInfo: later(0) });
    redirected();
  });
});
