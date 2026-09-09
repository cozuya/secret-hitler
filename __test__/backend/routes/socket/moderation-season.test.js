const Account = require("../../../../models/account");
const ModAction = require("../../../../models/modAction");
const { CURRENT_SEASON_NUMBER, seasonCounterFields } = require("../../../../src/shared/season");
const { handleModerationAction } = require("../../../../routes/socket/user-events/moderation");

describe("moderation season counter edits", () => {
  const originalIo = global.io;

  beforeEach(() => {
    global.io = { sockets: { sockets: {} } };
    jest.spyOn(ModAction.prototype, "save").mockResolvedValue();
  });

  afterEach(() => {
    global.io = originalIo;
    jest.restoreAllMocks();
  });

  describe.each([
    ["wins", "setWins"],
    ["losses", "setLosses"],
    ["rainbowWins", "setRWins"],
    ["rainbowLosses", "setRLosses"],
  ])("%s counter", (counter, action) => {
    it.each([
      [3, "+2", 5, 12],
      [0, "-3", -3, 7],
      [undefined, "-3", -3, 7],
    ])("applies %s %s to the current season and preserves historical seasons", async (initial, adjustment, expected, lifetime) => {
      const currentKey = seasonCounterFields(CURRENT_SEASON_NUMBER)[counter];
      const previousKey = seasonCounterFields(CURRENT_SEASON_NUMBER - 1)[counter];
      const account = { [counter]: 10, [currentKey]: initial, [previousKey]: 7, save: jest.fn() };
      jest.spyOn(Account, "findOne").mockImplementation((query, callback) => {
        if (callback) callback(null, account);
        else return Promise.resolve(account);
      });

      handleModerationAction(
        { emit: jest.fn() },
        { user: "admin" },
        { userName: "player", action: { type: `${action}${adjustment}` } },
        false,
        [],
        ["admin"]
      );
      await Promise.resolve();

      expect(account[counter]).toBe(lifetime);
      expect(account[currentKey]).toBe(expected);
      expect(account[previousKey]).toBe(7);
      expect(Object.keys(account).some((key) => key.endsWith("Seasonundefined"))).toBe(false);
      expect(account.save).toHaveBeenCalled();
    });
  });

  it("keeps a nonseasonal edit limited to the lifetime counter", async () => {
    const currentKey = seasonCounterFields(CURRENT_SEASON_NUMBER).wins;
    const account = { wins: 10, [currentKey]: 3, save: jest.fn() };
    jest.spyOn(Account, "findOne").mockImplementation((query, callback) => {
      if (callback) callback(null, account);
      else return Promise.resolve(account);
    });

    handleModerationAction(
      { emit: jest.fn() },
      { user: "admin" },
      { userName: "player", action: { type: "setWins+2", isNonSeason: true } },
      false,
      [],
      ["admin"]
    );
    await Promise.resolve();

    expect(account.wins).toBe(12);
    expect(account[currentKey]).toBe(3);
  });
});
