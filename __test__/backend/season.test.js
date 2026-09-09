const season = require("../../src/shared/season");
const { CURRENTSEASONNUMBER: frontendSeason } = require("../../src/frontend-scripts/constants");
const { CURRENTSEASONNUMBER: backendSeason } = require("../../src/frontend-scripts/node-constants");

describe("shared season metadata", () => {
  it("keeps ESM and CommonJS consumers on the same season", () => {
    expect(frontendSeason).toBe(season.CURRENT_SEASON_NUMBER);
    expect(backendSeason).toBe(season.CURRENT_SEASON_NUMBER);
    expect(season.CURRENT_SEASON_FIELDS).toEqual(season.seasonCounterFields(backendSeason));
    // This identifies an immutable historical migration, so a new current season must not bump it.
    expect(season.OPENSKILL_MIGRATION_VERSION).toBe(24);
    expect(season.S25_CUTOVER_VERSION).toBe(25);
  });

  it("propagates a future shared-source bump to both exports and the strict schema", () => {
    const nextSeason = season.CURRENT_SEASON_NUMBER + 1;
    jest.resetModules();
    jest.doMock("../../src/shared/season", () => ({
      ...season,
      CURRENT_SEASON_NUMBER: nextSeason,
      CURRENT_SEASON_FIELDS: season.seasonCounterFields(nextSeason),
    }));
    try {
      jest.isolateModules(() => {
        expect(require("../../src/frontend-scripts/constants").CURRENTSEASONNUMBER).toBe(nextSeason);
        expect(require("../../src/shared/season").S25_CUTOVER_VERSION).toBe(25);
        expect(require("../../src/frontend-scripts/node-constants").CURRENTSEASONNUMBER).toBe(nextSeason);
        const nextAccount = require("../../models/account");
        expect(nextAccount.schema.path(`winsSeason${nextSeason}`).instance).toBe("Number");
        expect(nextAccount.schema.path(`winsSeason${nextSeason - 1}`).instance).toBe("Number");
        expect(require("../../src/shared/season").OPENSKILL_MIGRATION_VERSION).toBe(season.OPENSKILL_MIGRATION_VERSION);
      });
    } finally {
      jest.dontMock("../../src/shared/season");
      jest.resetModules();
    }
  });
});

describe("seasonal Account persistence", () => {
  let Account;
  beforeAll(() => {
    Account = require("../../models/account");
  });
  afterEach(() => jest.restoreAllMocks());

  it("retains all historical counter paths as Numbers without defaults", () => {
    for (let number = 1; number <= season.CURRENT_SEASON_NUMBER; number++) {
      for (const prefix of ["wins", "losses", "rainbowWins", "rainbowLosses"]) {
        const path = Account.schema.path(`${prefix}Season${number}`);
        expect(path.instance).toBe("Number");
        expect(path.defaultValue).toBeUndefined();
      }
    }
  });

  it("saves and hydrates the current counters and ranked timestamp through the strict schema", async () => {
    const current = season.CURRENT_SEASON_NUMBER;
    const values = {
      [`winsSeason${current}`]: 12,
      [`lossesSeason${current}`]: 8,
      [`rainbowWinsSeason${current}`]: 4,
      [`rainbowLossesSeason${current}`]: 3,
      lastRankedGameAt: new Date("2026-09-08T12:00:00.000Z"),
      winsSeason1: 10,
      [`winsSeason${current - 1}`]: 20,
    };
    // Intercept only the database boundary; Mongoose still validates, casts and serializes the save.
    const insert = jest.spyOn(Account.collection, "insertOne").mockImplementation((document, options, callback) => {
      callback(null, { insertedId: document._id });
    });
    const account = new Account({ username: "season-test", ...values, winsSeasonundefined: 999 });

    expect(Account.schema.options.strict).toBe(true);
    await account.save();

    const stored = insert.mock.calls[0][0];
    expect(stored).toMatchObject(values);
    expect(stored.winsSeasonundefined).toBeUndefined();
    const loaded = Account.hydrate(stored);
    expect(loaded.toObject()).toMatchObject(values);
    expect(loaded.lastRankedGameAt).toBeInstanceOf(Date);

    loaded[`winsSeason${current}`] += 1;
    loaded.lastRankedGameAt = new Date("2026-09-09T12:00:00.000Z");
    const update = jest
      .spyOn(Account.collection, "updateOne")
      .mockImplementation((filter, changes, options, callback) => {
        callback(null, { n: 1, nModified: 1, ok: 1 });
      });
    await loaded.save();
    expect(update.mock.calls[0][1].$set).toEqual({
      [`winsSeason${current}`]: 13,
      lastRankedGameAt: loaded.lastRankedGameAt,
    });
  });
});
