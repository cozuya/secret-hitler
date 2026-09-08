import {
  games,
  userList,
  generalChats,
  accountCreationDisabled,
  ipbansNotEnforced,
  gameCreationDisabled,
  formattedUserList,
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
