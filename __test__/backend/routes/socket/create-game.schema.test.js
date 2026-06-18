import {
  createGameSchema,
  customGameSettingsSchema,
  updateWhitelistSchema,
} from "../../../../routes/socket/user-events/create-game.schema";

const validCustom = () => ({
  enabled: true,
  deckState: { lib: 6, fas: 11 },
  trackState: { lib: 0, fas: 0 },
  fascistCount: 1,
  hitlerZone: 1,
  vetoZone: 5,
  powers: [null, null, null, null, null],
});

describe("createGameSchema", () => {
  it("accepts a minimal valid payload and passes through unknown flags", () => {
    const res = createGameSchema.safeParse({
      gameName: "testgame",
      xpSliderValue: null,
      isTourny: true,
      blindMode: false,
    });
    expect(res.success).toBe(true);
    expect(res.data.isTourny).toBe(true);
  });

  it("requires a valid gameName", () => {
    expect(createGameSchema.safeParse({}).success).toBe(false); // missing
    expect(createGameSchema.safeParse({ gameName: "" }).success).toBe(false); // empty
    expect(createGameSchema.safeParse({ gameName: "x".repeat(21) }).success).toBe(false); // too long
    expect(createGameSchema.safeParse({ gameName: "bad name 💥🔥" }).success).toBe(false); // illegal chars
  });

  it("coerces numeric-string player counts to integers", () => {
    const res = createGameSchema.safeParse({ gameName: "g", minPlayersCount: "5", maxPlayersCount: "8" });
    expect(res.success).toBe(true);
    expect(res.data.minPlayersCount).toBe(5);
    expect(res.data.maxPlayersCount).toBe(8);
  });

  it("allows absent/null counts (handler defaults + clamps them)", () => {
    expect(createGameSchema.safeParse({ gameName: "g" }).success).toBe(true);
    expect(createGameSchema.safeParse({ gameName: "g", minPlayersCount: null }).success).toBe(true);
  });

  it("rejects non-integer, object, and junk-string counts", () => {
    expect(createGameSchema.safeParse({ gameName: "g", minPlayersCount: 5.5 }).success).toBe(false);
    expect(createGameSchema.safeParse({ gameName: "g", minPlayersCount: {} }).success).toBe(false);
    expect(createGameSchema.safeParse({ gameName: "g", maxPlayersCount: "abc" }).success).toBe(false);
  });

  it("accepts string/number/null xpSliderValue (the real client payloads) but rejects objects", () => {
    expect(createGameSchema.safeParse({ gameName: "g", xpSliderValue: null }).success).toBe(true); // default: XP limit off
    expect(createGameSchema.safeParse({ gameName: "g", xpSliderValue: 50 }).success).toBe(true); // from the slider
    expect(createGameSchema.safeParse({ gameName: "g", xpSliderValue: "50" }).success).toBe(true); // from the typed box
    expect(createGameSchema.safeParse({ gameName: "g", xpSliderValue: {} }).success).toBe(false); // junk
  });

  it("rejects an object noTopdecking", () => {
    expect(createGameSchema.safeParse({ gameName: "g", noTopdecking: {} }).success).toBe(false);
    expect(createGameSchema.safeParse({ gameName: "g", noTopdecking: 1 }).success).toBe(true);
  });

  it("rejects a non-array excludedPlayerCount", () => {
    expect(createGameSchema.safeParse({ gameName: "g", excludedPlayerCount: 5 }).success).toBe(false);
    expect(createGameSchema.safeParse({ gameName: "g", excludedPlayerCount: [6, 7] }).success).toBe(true);
  });
});

describe("customGameSettingsSchema", () => {
  it("accepts a valid settings object", () => {
    expect(customGameSettingsSchema.safeParse(validCustom()).success).toBe(true);
  });

  it("coerces numeric strings to integers", () => {
    const res = customGameSettingsSchema.safeParse({ ...validCustom(), deckState: { lib: "6", fas: "11" } });
    expect(res.success).toBe(true);
    expect(res.data.deckState.lib).toBe(6);
  });

  it("applies the legacy fax -> fas fallback", () => {
    const res = customGameSettingsSchema.safeParse({ ...validCustom(), deckState: { lib: 6, fax: 11 } });
    expect(res.success).toBe(true);
    expect(res.data.deckState.fas).toBe(11);
  });

  it("enforces deck/track ranges", () => {
    expect(customGameSettingsSchema.safeParse({ ...validCustom(), deckState: { lib: 9, fas: 11 } }).success).toBe(
      false
    ); // lib > 8
    expect(customGameSettingsSchema.safeParse({ ...validCustom(), deckState: { lib: 5, fas: 5 } }).success).toBe(false); // sum < 13
    expect(customGameSettingsSchema.safeParse({ ...validCustom(), hitlerZone: 6 }).success).toBe(false);
  });

  it("requires vetoZone > trackState.fas", () => {
    expect(
      customGameSettingsSchema.safeParse({ ...validCustom(), trackState: { lib: 0, fas: 5 }, vetoZone: 5 }).success
    ).toBe(false);
    expect(
      customGameSettingsSchema.safeParse({ ...validCustom(), trackState: { lib: 0, fas: 3 }, vetoZone: 4 }).success
    ).toBe(true);
  });

  it("validates the powers array (length 5, known powers or null)", () => {
    expect(customGameSettingsSchema.safeParse({ ...validCustom(), powers: [null, null, null, null] }).success).toBe(
      false
    ); // length 4
    expect(
      customGameSettingsSchema.safeParse({ ...validCustom(), powers: ["banana", null, null, null, null] }).success
    ).toBe(false);
    const res = customGameSettingsSchema.safeParse({
      ...validCustom(),
      powers: ["investigate", "", "null", "bullet", null],
    });
    expect(res.success).toBe(true);
    expect(res.data.powers).toEqual(["investigate", null, null, "bullet", null]);
  });

  it("rejects object-injection on numeric fields", () => {
    expect(customGameSettingsSchema.safeParse({ ...validCustom(), fascistCount: {} }).success).toBe(false);
    expect(customGameSettingsSchema.safeParse({ ...validCustom(), deckState: { lib: {}, fas: 11 } }).success).toBe(
      false
    );
  });
});

describe("updateWhitelistSchema", () => {
  it("accepts a valid whitelist update", () => {
    expect(updateWhitelistSchema.safeParse({ uid: "g1", whitelistPlayers: ["a", "b"] }).success).toBe(true);
    expect(updateWhitelistSchema.safeParse({ uid: "g1", whitelistPlayers: [] }).success).toBe(true);
  });

  it("rejects a non-array or non-string-array whitelist (prevents the delayed join crash)", () => {
    expect(updateWhitelistSchema.safeParse({ uid: "g1", whitelistPlayers: 5 }).success).toBe(false);
    expect(updateWhitelistSchema.safeParse({ uid: "g1", whitelistPlayers: [1, 2] }).success).toBe(false);
    expect(updateWhitelistSchema.safeParse({ uid: "g1" }).success).toBe(false);
  });

  it("rejects a missing uid", () => {
    expect(updateWhitelistSchema.safeParse({ whitelistPlayers: ["a"] }).success).toBe(false);
  });
});
