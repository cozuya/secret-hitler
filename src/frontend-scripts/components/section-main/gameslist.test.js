import React from "react"; // eslint-disable-line
import { shallow } from "enzyme";
import GamesList from "./GamesList";
import DisplayLobbies from "./DisplayLobbies";

const rows = () => [
  { uid: "intake", name: "New Player Game", seatedCount: 0, gameStatus: "notStarted", systemLobby: "new-player" },
  { uid: "regular", name: "Regular", seatedCount: 6, gameStatus: "notStarted" },
  { uid: "private", name: "Private", seatedCount: 3, gameStatus: "notStarted", private: true },
  { uid: "rainbow", name: "Rainbow", seatedCount: 5, gameStatus: "notStarted", rainbowgame: true },
  {
    uid: "started-intake",
    name: "New Player Game",
    seatedCount: 3,
    gameStatus: "isStarted",
    systemLobby: "new-player",
  },
  { uid: "started-regular", name: "Started", seatedCount: 5, gameStatus: "isStarted" },
  { uid: "completed", name: "Completed", seatedCount: 7, gameStatus: "liberal" },
];

const ordered = (gameList, user = {}, gameFilter = {}) => {
  const component = shallow(
    <GamesList
      gameList={gameList}
      userInfo={{ userName: "Viewer" }}
      userList={{ list: [{ userName: "Viewer", isRainbowOverall: false, ...user }] }}
      gameFilter={gameFilter}
    />
  );
  return component.find(DisplayLobbies).map((row) => row.prop("game").uid);
};

describe("GamesList", () => {
  it("should initialize correctly", () => {
    const initialState = {
      filtersVisible: false,
    };

    const component = shallow(<GamesList />);

    expect(component.state()).toEqual(initialState);
  });

  it.each([false, true])("pins waiting intake for a non-Rainbow user (private account %s)", (isPrivate) => {
    expect(ordered(rows(), { isPrivate })[0]).toBe("intake");
  });

  it.each([false, true])("does not alter Rainbow-user ordering (private account %s)", (isPrivate) => {
    const games = rows();
    const withoutMarkers = games.map((game) => ({ ...game, systemLobby: undefined }));
    const order = ordered(games, { isRainbowOverall: true, isPrivate });
    expect(order).toEqual(ordered(withoutMarkers, { isRainbowOverall: true, isPrivate }));
    expect(order[0]).toBe(isPrivate ? "private" : "rainbow");
    expect(order.indexOf("intake")).toBeGreaterThan(order.indexOf("regular"));
  });

  it.each([
    false,
    true,
  ])("keeps the current game first, even when already started (Rainbow user %s)", (isRainbowOverall) => {
    const games = rows().map((game) => ({ ...game, userNames: game.uid === "started-regular" ? ["Viewer"] : [] }));
    const order = ordered(games, { isRainbowOverall });
    expect(order[0]).toBe("started-regular");
    expect(order[1]).toBe(isRainbowOverall ? "rainbow" : "intake");
  });

  it("does not prioritize started New Player cohorts within the in-progress rows", () => {
    const games = rows().filter((game) => game.gameStatus === "isStarted");
    expect(ordered(games)).toEqual(["started-regular", "started-intake"]);
  });

  it.each([
    { isRainbowOverall: false },
    { isRainbowOverall: false, isPrivate: true },
    { isRainbowOverall: true },
    { isRainbowOverall: true, isPrivate: true },
  ])("preserves relative ordering of all ordinary rows (%j)", (user) => {
    const games = rows();
    expect(ordered(games, user).filter((uid) => uid !== "intake")).toEqual(
      ordered(
        games.filter((game) => game.uid !== "intake"),
        user
      )
    );
  });

  it("leaves unknown-user ordering unchanged and keeps intake visible", () => {
    const component = shallow(<GamesList gameList={rows()} userInfo={{}} userList={{ list: [] }} />);
    expect(component.find(DisplayLobbies).map((row) => row.prop("game").uid)).toEqual([
      "rainbow",
      "regular",
      "intake",
      "private",
      "started-regular",
      "started-intake",
      "completed",
    ]);
  });

  it("respects the existing unstarted filter instead of forcing intake into a filtered list", () => {
    expect(ordered(rows(), {}, { unstarted: true })).toEqual(["started-regular", "started-intake", "completed"]);
  });
});
