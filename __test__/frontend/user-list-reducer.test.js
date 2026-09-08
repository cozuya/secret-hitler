import { updateUserList, updateUserListDelta } from "../../src/frontend-scripts/actions/actions";
import { userList } from "../../src/frontend-scripts/reducers/sh-app";

describe("userList reducer", () => {
  it("applies versioned upserts and removals without replacing unchanged users", () => {
    const ada = { userName: "Ada", eloOverall: 1700 };
    const grace = { userName: "Grace", status: { type: "none" } };
    const initial = userList(undefined, updateUserList({ list: [ada, grace], hash: "one" }));
    const changedGrace = { userName: "Grace", status: { type: "playing", gameId: "abc" } };
    const linus = { userName: "Linus", eloOverall: 1800 };

    const next = userList(
      initial,
      updateUserListDelta({
        baseHash: "one",
        hash: "two",
        upserts: [changedGrace, linus],
        removals: ["Ada"],
      })
    );

    expect(next).toEqual({ list: [changedGrace, linus], hash: "two" });
  });
});
