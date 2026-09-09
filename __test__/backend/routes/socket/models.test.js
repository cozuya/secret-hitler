import {
  games,
  userList,
  generalChats,
  accountCreationDisabled,
  ipbansNotEnforced,
  gameCreationDisabled,
  formattedUserList,
  formattedGameList,
  buildUserListDelta,
  userListEmitter,
} from "../../../../routes/socket/models";

describe("models", () => {
  it("has a games object", () => {
    expect(!Array.isArray(games) && typeof games === "object").toBe(true);
  });

  it("has a userList array", () => {
    expect(Array.isArray(userList)).toBe(true);
  });

  it("has a generalChats object", () => {
    expect(typeof generalChats).toBe("object");
  });

  it("has a accountCreationDisabled object", () => {
    expect(typeof accountCreationDisabled).toBe("object");
  });

  it("has a ipbansNotEnforced object", () => {
    expect(typeof ipbansNotEnforced).toBe("object");
  });

  it("has a gameCreationDisabled object", () => {
    expect(typeof gameCreationDisabled).toBe("object");
  });

  it("has a formattedUserList function", () => {
    expect(typeof formattedUserList).toBe("function");
  });

  it.each([
    [{ neighborChat: true }, true],
    [{ neighborChat: false }, undefined],
    [{}, undefined],
  ])("projects Neighbor Chat only when enabled (%j)", (options, expected) => {
    const uid = "NeighborChatProjection";
    games[uid] = {
      general: { uid, ...options },
      publicPlayersState: [],
      private: {},
      gameState: {},
      trackState: {},
      customGameSettings: { enabled: false },
    };
    try {
      const row = formattedGameList().find((entry) => entry.uid === uid);
      expect(row.neighborChat).toBe(expected);
      const serialized = JSON.parse(JSON.stringify(row));
      if (expected) {
        expect(serialized.neighborChat).toBe(true);
      } else {
        expect(serialized).not.toHaveProperty("neighborChat");
      }
    } finally {
      delete games[uid];
    }
  });

  it.each([
    [0, 0],
    [-20, -20],
    [1500.9, 1500],
    [undefined, undefined],
    [null, undefined],
    [NaN, undefined],
    [Infinity, undefined],
    [-Infinity, undefined],
    ["1500", undefined],
  ])("serializes finite Elo scores without pruning zero (%p)", (value, expected) => {
    const user = { userName: "rating-serialization", eloOverall: value, eloSeason: value };
    userList.push(user);
    try {
      const serialized = JSON.parse(JSON.stringify(formattedUserList(false))).find(
        (entry) => entry.userName === user.userName
      );
      if (expected !== undefined) {
        expect(serialized.eloOverall).toBe(expected);
        expect(serialized.eloSeason).toBe(expected);
      } else {
        expect(serialized).not.toHaveProperty("eloOverall");
        expect(serialized).not.toHaveProperty("eloSeason");
      }
    } finally {
      userList.splice(userList.indexOf(user), 1);
    }
  });

  it("has a userListEmitter object", () => {
    expect(typeof userListEmitter).toBe("object");
  });

  it("builds user-list upserts and removals", () => {
    const unchanged = { userName: "Ada", status: { type: "none" } };
    const changedBefore = { userName: "Grace", status: { type: "none" } };
    const changedAfter = { userName: "Grace", status: { type: "playing", gameId: "abc" } };
    const added = { userName: "Linus", status: { type: "none" } };

    expect(
      buildUserListDelta([unchanged, changedBefore, { userName: "Removed" }], [unchanged, changedAfter, added])
    ).toEqual({
      upserts: [changedAfter, added],
      removals: ["Removed"],
    });
  });
});
