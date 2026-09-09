const Account = require("../../../../models/account");
const { userList } = require("../../../../routes/socket/models");
const { CURRENTSEASONNUMBER } = require("../../../../src/frontend-scripts/node-constants");

jest.mock("../../../../routes/socket/user-requests", () => ({ sendUserList: jest.fn() }));

const { sendUserList } = require("../../../../routes/socket/user-requests");
const { handleUpdatedGameSettings } = require("../../../../routes/socket/user-events/settings");

describe("staff-incognito user-list rebuild", () => {
  afterEach(() => {
    userList.length = 0;
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("preserves all current-season counters under their suffixed keys", async () => {
    const counters = {
      [`winsSeason${CURRENTSEASONNUMBER}`]: 7,
      [`lossesSeason${CURRENTSEASONNUMBER}`]: 5,
      [`rainbowWinsSeason${CURRENTSEASONNUMBER}`]: 3,
      [`rainbowLossesSeason${CURRENTSEASONNUMBER}`]: 2,
    };
    const account = {
      username: "staff",
      staffRole: "admin",
      gameSettings: { isPrivate: false, staffIncognito: false },
      ...counters,
      save: jest.fn((callback) => callback()),
    };
    jest.spyOn(Account, "findOne").mockResolvedValue(account);
    userList.push({ userName: "staff", ...counters });

    handleUpdatedGameSettings({ emit: jest.fn() }, { user: "staff" }, { staffIncognito: true });
    await Promise.resolve();

    expect(userList).toHaveLength(1);
    expect(userList[0]).toMatchObject({ userName: "staff", staffIncognito: true, ...counters });
    expect(Object.keys(userList[0]).some((key) => key.endsWith("Seasonundefined"))).toBe(false);
    expect(sendUserList).toHaveBeenCalled();
  });
});
