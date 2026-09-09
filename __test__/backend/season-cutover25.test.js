const clone = require("lodash/cloneDeep");
const { ObjectID } = require("mongodb");
const {
  runCutover,
  resetUpdate,
  summarize,
  fingerprint,
  parseArgs,
  PROJECTION,
  STATE_ID,
  ARCHIVE_COLLECTION,
  STATE_COLLECTION,
} = require("../../scripts/seasonCutover25");
const { resolveHiddenRating } = require("../../routes/socket/rating/ranked");
const { S25_CUTOVER_VERSION: VERSION, seasonCounterFields } = require("../../src/shared/season");

const get = (object, path) => path.split(".").reduce((value, key) => value?.[key], object);
const set = (object, path, value) => {
  const parts = path.split(".");
  const key = parts.pop();
  let target = object;
  for (const part of parts) {
    if (!target[part]) target[part] = {};
    target = target[part];
  }
  target[key] = clone(value);
};
const matches = (document, filter) =>
  Object.entries(filter).every(([path, condition]) => {
    if (path === "$and") return condition.every((part) => matches(document, part));
    const value = get(document, path);
    if (condition && Object.prototype.hasOwnProperty.call(condition, "$exists")) {
      if ((value !== undefined) !== condition.$exists) return false;
      return (
        !Object.prototype.hasOwnProperty.call(condition, "$eq") || fingerprint(value) === fingerprint(condition.$eq)
      );
    }
    return fingerprint(value) === fingerprint(condition);
  });
const project = (document) => {
  const result = {};
  for (const path of Object.keys(PROJECTION))
    if (get(document, path) !== undefined) set(result, path, get(document, path));
  return result;
};

// A deterministic collection boundary, not a Mongo server. Operations yield before settling and
// record ordering; source changes can be injected exactly between verification and updateOne.
const makeDb = (initialAccounts) => {
  const rows = { accounts: clone(initialAccounts), [ARCHIVE_COLLECTION]: [], [STATE_COLLECTION]: [] };
  const writes = [];
  const beforeWrite = jest.fn();
  const collections = {};
  for (const name of Object.keys(rows)) {
    collections[name] = {
      countDocuments: jest.fn(async () => rows[name].length),
      findOne: jest.fn(async (filter) => clone(rows[name].find((row) => matches(row, filter)) || null)),
      find: jest.fn((filter, options = {}) => {
        let documents = rows[name]
          .filter((row) => matches(row, filter))
          .map((row) => (options.projection ? project(row) : clone(row)));
        let i = 0;
        const cursor = {
          sort: () => {
            documents = documents.sort((a, b) => String(a._id).localeCompare(String(b._id)));
            return cursor;
          },
          next: jest.fn(async () => documents[i++] || null),
          close: jest.fn(async () => {}),
        };
        return cursor;
      }),
      insertOne: jest.fn(async (document, options) => {
        await beforeWrite(name, "insert", document);
        if (rows[name].some((row) => matches(row, { _id: document._id }))) throw new Error("duplicate key");
        rows[name].push(clone(document));
        writes.push({ name, type: "insert", document: clone(document), options });
        return { insertedId: document._id };
      }),
      updateOne: jest.fn(async (filter, update, options) => {
        await beforeWrite(name, "update", update, filter);
        const row = rows[name].find((document) => matches(document, filter));
        if (!row) return { matchedCount: 0 };
        for (const [path, value] of Object.entries(update.$set || {})) set(row, path, value);
        for (const path of Object.keys(update.$unset || {})) {
          const parts = path.split(".");
          const key = parts.pop();
          const target = parts.length ? get(row, parts.join(".")) : row;
          if (target) delete target[key];
        }
        writes.push({ name, type: "update", filter: clone(filter), update: clone(update), options });
        return { matchedCount: 1 };
      }),
    };
  }
  return { db: { collection: (name) => collections[name] }, rows, writes, beforeWrite, collections };
};

const makeAccounts = () =>
  Array.from({ length: 12 }, (_, i) => ({
    _id: new ObjectID(String(i + 1).padStart(24, "0")),
    username: `closing-${i}`,
    hashUid: `hash-${i}`,
    eloSeason: 1700 + i * 20,
    eloOverall: 1800 + i * 20,
    ratingVersion: 24,
    rating: { overall: { mu: 25 + i, sigma: 2, display: 1700 }, season: { mu: 23, sigma: 1, display: 1800 } },
    xpSeason: 123,
    xpOverall: 456,
    isRainbowSeason: true,
    isRainbowOverall: true,
    eloPercentile: { seasonal: 0.9, overall: 0.8 },
    previousDayElo: 1900,
    previousDayXP: 100,
    winsSeason24: 30,
    lossesSeason24: 20,
    rainbowWinsSeason24: 4,
    rainbowLossesSeason24: 3,
    winsSeason1: 100,
    wins: 200,
    losses: 180,
    games: ["a", "b", "c", "d"],
    lastCompletedGame: new Date("2026-09-07T00:00:00Z"),
    isBanned: i === 11,
    badges: [{ id: "historical", dateAwarded: new Date("2025-01-01T00:00:00Z") }],
    gameSettings: { previousSeasonAward: "silver", hasUnseenBadge: true, playerNotes: ["private"] },
    maxElo: 2000,
    pastElo: [{ date: new Date("2026-09-07T00:00:00Z"), value: 1900 }],
    salt: "not-to-be-archived",
    hash: "not-to-be-archived",
    signupIP: "not-to-be-archived",
  }));

describe("S25 offline cutover", () => {
  it("captures every raw closing account before resetting anything, preserving later award inputs", async () => {
    const original = makeAccounts();
    const fixture = makeDb(original);
    fixture.beforeWrite.mockImplementation(async (name) => {
      if (name !== "accounts") return;
      expect(fixture.rows[ARCHIVE_COLLECTION]).toHaveLength(original.length);
      expect(fixture.rows[STATE_COLLECTION][0]).toMatchObject({ phase: "captured", accountCount: original.length });
      expect(fixture.rows[STATE_COLLECTION][0].hash).toMatch(/^[0-9a-f]{64}$/);
    });
    const result = await runCutover({ db: fixture.db, dryRun: false, log: jest.fn() });
    expect(result).toMatchObject({ failures: 0, reset: 12, phase: "complete" });
    expect(fixture.rows[STATE_COLLECTION][0]._id).toBe(STATE_ID);
    fixture.rows.accounts.forEach((account, i) => {
      expect(account.eloSeason).toBe(1500);
      expect(account.eloOverall).toBe(original[i].eloOverall);
      expect(account.rating).toEqual(original[i].rating);
      expect(account.ratingVersion).toBe(VERSION);
      expect(account.xpSeason).toBe(0);
      expect(account.xpOverall).toBe(456);
      expect(account.isRainbowSeason).toBe(false);
      expect(account.isRainbowOverall).toBe(true);
      expect(account.eloPercentile).toEqual({ seasonal: null, overall: 0.8 });
      expect(account.previousDayElo).toBe(1500);
      expect(account.previousDayXP).toBe(0);
      expect(account.lastRankedGameAt).toBeUndefined();
      expect(account.lastCompletedGame).toEqual(original[i].lastCompletedGame);
      for (const field of Object.values(seasonCounterFields(VERSION))) expect(account[field]).toBe(0);
      expect(account.winsSeason1).toBe(100);
      expect(account.winsSeason24).toBe(30);
      expect(account.gameSettings).toEqual(original[i].gameSettings);
      expect(account.badges).toEqual(original[i].badges);
      expect(account.maxElo).toBe(2000);
      expect(account.pastElo).toEqual(original[i].pastElo);
      const archived = fixture.rows[ARCHIVE_COLLECTION][i];
      expect(archived.snapshot).toEqual(project(original[i]));
      expect(archived.snapshot.salt).toBeUndefined();
      expect(archived.snapshot.hash).toBeUndefined();
      expect(archived.snapshot.signupIP).toBeUndefined();
      expect(archived.snapshot.gameSettings.playerNotes).toBeUndefined();
      expect(archived.snapshot.eloSeason).toBe(original[i].eloSeason);
      expect(archived.hash).toBe(fingerprint(archived.snapshot));
    });
    const closingAfterReset = fixture.rows[ARCHIVE_COLLECTION].map((entry) => entry.snapshot);
    expect(summarize(closingAfterReset)).toEqual(summarize(original));
    expect(fixture.writes.every((write) => write.options.w === "majority" && write.options.j)).toBe(true);
  });

  it("is a zero-write no-op on rerun, including after accounts have played S25 games", async () => {
    const fixture = makeDb(makeAccounts());
    await runCutover({ db: fixture.db, dryRun: false, log: jest.fn() });
    fixture.rows.accounts[0].eloSeason = 1640;
    fixture.rows.accounts[0].winsSeason25 = 7;
    fixture.rows.accounts[0].lastRankedGameAt = new Date();
    const after = clone(fixture.rows);
    const writes = fixture.writes.length;
    const result = await runCutover({ db: fixture.db, dryRun: false, log: jest.fn() });
    expect(result).toMatchObject({ failures: 0, skipped: 12, reset: 0, phase: "complete" });
    expect(fixture.rows).toEqual(after);
    expect(fixture.writes).toHaveLength(writes);
  });

  it("migrates mixed legacy/OpenSkill evidence per account without assuming a population-wide history", async () => {
    const original = makeAccounts();
    delete original[0].ratingVersion; // Valid hidden state is preserved even without a migration marker.
    delete original[1].rating; // Version 24 alone is insufficient evidence of a usable pair.
    delete original[2].rating;
    delete original[2].ratingVersion;
    delete original[2].eloOverall;
    original[3].rating.overall.sigma = -1;
    original[4].rating = null;
    original[5].eloOverall = 0;
    delete original[5].rating.overall;
    original[6].eloOverall = -100;
    delete original[6].rating.overall;
    const fixture = makeDb(original);
    expect(await runCutover({ db: fixture.db, dryRun: false, log: jest.fn() })).toMatchObject({
      failures: 0,
      reset: 12,
    });
    fixture.rows.accounts.forEach((account, i) => {
      expect(account.rating.overall).toMatchObject(resolveHiddenRating(original[i]));
      expect(account.eloOverall).toBe(Number.isFinite(original[i].eloOverall) ? original[i].eloOverall : 1500);
      expect(account.eloSeason).toBe(1500);
      expect(account.ratingVersion).toBe(VERSION);
      if (original[i].rating?.season) expect(account.rating.season).toEqual(original[i].rating.season);
    });
    expect(fixture.rows.accounts[0].rating).toEqual(original[0].rating);
    expect(fixture.rows[ARCHIVE_COLLECTION][3].snapshot.rating.overall.sigma).toBe(-1);
    expect(fixture.rows[ARCHIVE_COLLECTION][2].snapshot.eloOverall).toBeUndefined();
  });

  it("dry-runs with zero writes and prints distribution, population evidence and existing thresholds only", async () => {
    const original = makeAccounts();
    const fixture = makeDb(original);
    const log = jest.fn();
    const result = await runCutover({ db: fixture.db, log });
    expect(result).toMatchObject({ dryRun: true, failures: 0, wouldReset: 12 });
    expect(fixture.writes).toHaveLength(0);
    expect(fixture.beforeWrite).not.toHaveBeenCalled();
    expect(fixture.rows.accounts).toEqual(original);
    const report = log.mock.calls[0][1];
    expect(report.distribution).toMatchObject({ finite: 12, min: 1700, max: 1920 });
    expect(report.existingThresholdScenario).toMatchObject({
      reportingOnly: true,
      awardsWritten: 0,
      thresholds: { bronze: 1737, silver: 1767, gold: 1822 },
      bannedExcluded: 1,
      exclusiveBands: { bronze: 2, silver: 3, gold: 4, none: 2, invalid: 0 },
    });
    expect(report.populationShape.usableLifetimeHidden).toBe(12);
  });

  it("resumes interrupted capture without rewriting its immutable entries", async () => {
    const fixture = makeDb(makeAccounts());
    let inserted = 0;
    fixture.beforeWrite.mockImplementation(async (name) => {
      if (name === ARCHIVE_COLLECTION && ++inserted === 4) throw new Error("archive unavailable");
    });
    const failed = await runCutover({ db: fixture.db, dryRun: false, log: jest.fn() });
    expect(failed.failures).toBe(1);
    expect(fixture.writes.filter((write) => write.name === "accounts")).toHaveLength(0);
    const preserved = clone(fixture.rows[ARCHIVE_COLLECTION]);
    fixture.beforeWrite.mockImplementation(async () => {});
    const resumed = await runCutover({ db: fixture.db, dryRun: false, log: jest.fn() });
    expect(resumed).toMatchObject({ failures: 0, reset: 12 });
    expect(fixture.rows[ARCHIVE_COLLECTION].slice(0, 3)).toEqual(preserved);
  });

  it("resumes a partial reset without destroying a completed account's new S25 state", async () => {
    const fixture = makeDb(makeAccounts());
    fixture.beforeWrite.mockImplementation(async (name, type, update, filter) => {
      if (name === "accounts" && String(filter._id).endsWith("02")) throw new Error("account unavailable");
    });
    expect(await runCutover({ db: fixture.db, dryRun: false, log: jest.fn() })).toMatchObject({
      failures: 1,
      reset: 11,
    });
    fixture.rows.accounts[0].eloSeason = 1600;
    fixture.rows.accounts[0].winsSeason25 = 5;
    fixture.rows.accounts[0].lastRankedGameAt = new Date();
    const preserved = clone(fixture.rows.accounts[0]);
    fixture.beforeWrite.mockImplementation(async () => {});
    const beforeRehearsal = fixture.writes.length;
    const log = jest.fn();
    expect(await runCutover({ db: fixture.db, dryRun: true, log })).toMatchObject({
      failures: 0,
      skipped: 11,
      wouldReset: 1,
    });
    expect(fixture.writes).toHaveLength(beforeRehearsal);
    expect(log.mock.calls[0][1].distribution.min).toBe(1700);
    expect(await runCutover({ db: fixture.db, dryRun: false, log: jest.fn() })).toMatchObject({
      failures: 0,
      reset: 1,
      skipped: 11,
    });
    expect(fixture.rows.accounts[0]).toEqual(preserved);
  });

  it.each([
    "source drift",
    "archive tamper",
    "missing archive",
    "new account",
    "manifest tamper",
    "missing manifest",
  ])("blocks resets after %s", async (failure) => {
    const fixture = makeDb(makeAccounts());
    fixture.beforeWrite.mockImplementation(async (name) => {
      if (name === "accounts") throw new Error("pause before reset");
    });
    await runCutover({ db: fixture.db, dryRun: false, log: jest.fn() });
    fixture.beforeWrite.mockImplementation(async () => {});
    if (failure === "source drift") fixture.rows.accounts[0].eloSeason++;
    if (failure === "archive tamper") fixture.rows[ARCHIVE_COLLECTION][0].snapshot.eloSeason++;
    if (failure === "missing archive") fixture.rows[ARCHIVE_COLLECTION].pop();
    if (failure === "new account") fixture.rows.accounts.push({ _id: "new", username: "new" });
    if (failure === "manifest tamper") fixture.rows[STATE_COLLECTION][0].hash = "wrong";
    if (failure === "missing manifest") fixture.rows[STATE_COLLECTION].length = 0;
    const writes = fixture.writes.length;
    const result = await runCutover({ db: fixture.db, dryRun: false, log: jest.fn() });
    expect(result.failures).toBeGreaterThan(0);
    expect(result.reset).toBe(0);
    expect(fixture.writes).toHaveLength(writes);
  });

  it("rejects a concurrent account change atomically at the reset write", async () => {
    const fixture = makeDb(makeAccounts());
    fixture.beforeWrite.mockImplementation(async (name, type, update, filter) => {
      if (name === "accounts" && String(filter._id).endsWith("01")) fixture.rows.accounts[0].eloSeason++;
    });
    const result = await runCutover({ db: fixture.db, dryRun: false, log: jest.fn() });
    expect(result).toMatchObject({ failures: 1, reset: 11 });
    expect(fixture.rows.accounts[0].eloSeason).toBe(1701);
    expect(fixture.rows.accounts[0].ratingVersion).toBe(24);
    expect(fixture.rows[ARCHIVE_COLLECTION][0].snapshot.eloSeason).toBe(1700);
    expect(fixture.rows[STATE_COLLECTION][0].phase).toBe("captured");
  });

  it("cannot reset until the complete-capture manifest write succeeds", async () => {
    const fixture = makeDb(makeAccounts());
    fixture.beforeWrite.mockImplementation(async (name, type) => {
      if (name === STATE_COLLECTION && type === "update") throw new Error("manifest unavailable");
    });
    expect(await runCutover({ db: fixture.db, dryRun: false, log: jest.fn() })).toMatchObject({
      failures: 1,
      reset: 0,
    });
    expect(fixture.rows[ARCHIVE_COLLECTION]).toHaveLength(12);
    expect(fixture.rows[STATE_COLLECTION][0].phase).toBe("capturing");
    expect(fixture.writes.filter((write) => write.name === "accounts")).toHaveLength(0);
    fixture.beforeWrite.mockImplementation(async () => {});
    expect(await runCutover({ db: fixture.db, dryRun: false, log: jest.fn() })).toMatchObject({
      failures: 0,
      reset: 12,
    });
  });

  it("detects orphan capture entries during a zero-write rehearsal", async () => {
    const fixture = makeDb(makeAccounts());
    fixture.beforeWrite.mockImplementation(async (name, type) => {
      if (name === STATE_COLLECTION && type === "update") throw new Error("pause before manifest");
    });
    await runCutover({ db: fixture.db, dryRun: false, log: jest.fn() });
    fixture.rows.accounts[0]._id = new ObjectID();
    fixture.beforeWrite.mockImplementation(async () => {});
    const writes = fixture.writes.length;
    expect(await runCutover({ db: fixture.db, dryRun: true, log: jest.fn() })).toMatchObject({ failures: 1, reset: 0 });
    expect(fixture.writes).toHaveLength(writes);
  });

  it.each([
    { ratingVersion: VERSION },
    { ratingVersion: VERSION + 1 },
    { lastRankedGameAt: new Date() },
    { winsSeason25: 1 },
  ])("refuses ambiguous/already active S25 input without a completed capture: %j", async (extra) => {
    const fixture = makeDb([{ _id: "unsafe", username: "unsafe", ...extra }]);
    const result = await runCutover({ db: fixture.db, dryRun: false, log: jest.fn() });
    expect(result.failures).toBe(1);
    expect(result.reset).toBe(0);
    expect(fixture.writes.filter((write) => write.name === "accounts")).toHaveLength(0);
  });
});

describe("cutover per-account evidence and reporting", () => {
  it.each([
    { eloOverall: 2000, ratingVersion: 24 },
    { eloOverall: 1800 },
    { eloOverall: 0 },
    { eloOverall: -100 },
    { eloOverall: NaN },
    { eloOverall: Infinity },
    {},
    { eloOverall: 1900, rating: { overall: { mu: 40, sigma: -1, display: 555 }, season: { mu: 100 } } },
    { eloOverall: 1900, rating: null },
    { eloOverall: 1900, rating: { overall: null, season: { mu: 100 } } },
  ])("bootstraps missing/corrupt hidden state through R1: %j", (account) => {
    const before = clone(account);
    const update = resetUpdate(account);
    const after = clone(account);
    for (const [path, value] of Object.entries(update.$set)) set(after, path, value);
    expect(after.rating.overall).toMatchObject(resolveHiddenRating(account));
    const hiddenWrites = Object.fromEntries(Object.entries(update.$set).filter(([path]) => path.startsWith("rating.")));
    for (const path of Object.keys(hiddenWrites)) {
      expect(["rating.overall", "rating.overall.mu", "rating.overall.sigma"]).toContain(path);
    }
    if (update.$set.rating) expect(update.$set.rating).toEqual({ overall: resolveHiddenRating(account) });
    if (hiddenWrites["rating.overall"]) expect(hiddenWrites["rating.overall"]).toEqual(resolveHiddenRating(account));
    if (Number.isFinite(account.eloOverall)) expect(update.$set.eloOverall).toBeUndefined();
    else expect(update.$set.eloOverall).toBe(1500);
    if (account.rating?.season) expect(after.rating.season).toEqual(account.rating.season);
    if (account.rating?.overall?.display !== undefined)
      expect(after.rating.overall.display).toBe(account.rating.overall.display);
    expect(account).toEqual(before);
  });

  it("does not touch valid lifetime skill, even without a version or with zero sigma", () => {
    const update = resetUpdate({ eloOverall: 0, rating: { overall: { mu: 42, sigma: 0, display: 123 } } });
    expect(Object.keys(update.$set).filter((path) => path === "rating" || path.startsWith("rating."))).toEqual([]);
    expect(update.$set.eloOverall).toBeUndefined();
    expect(update.$unset).toEqual({ lastRankedGameAt: "" });
  });

  it("distinguishes raw missing/null/nonfinite values and preserves BSON identity in hashes", () => {
    expect(new Set([{}, { x: null }, { x: NaN }, { x: Infinity }, { x: -Infinity }].map(fingerprint)).size).toBe(5);
    const id = new ObjectID();
    expect(fingerprint({ id, x: 1 })).toBe(fingerprint({ x: 1, id: new ObjectID(id.toHexString()) }));
    expect(fingerprint({ id })).not.toBe(fingerprint({ id: id.toHexString() }));
  });

  it("uses exactly the existing reporting bands, excludes banned, and counts invalid scores", () => {
    const report = summarize([1736, 1737, 1766, 1767, 1821, 1822, null, NaN].map((eloSeason) => ({ eloSeason })));
    expect(report.existingThresholdScenario.exclusiveBands).toEqual({
      none: 1,
      bronze: 2,
      silver: 2,
      gold: 1,
      invalid: 2,
    });
    expect(report.distribution).toMatchObject({ finite: 6, invalidOrAbsent: 2 });
  });

  it("requires explicit apply and rejects misspelled/conflicting flags", () => {
    expect(parseArgs([]).dryRun).toBe(true);
    expect(parseArgs(["--dry-run"]).dryRun).toBe(true);
    expect(parseArgs(["--apply"]).dryRun).toBe(false);
    expect(parseArgs(["--help"]).help).toBe(true);
    expect(() => parseArgs(["--dryrun"])).toThrow();
    expect(() => parseArgs(["--apply", "--dry-run"])).toThrow();
  });
});
