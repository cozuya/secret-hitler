// Offline S24 -> S25 cutover. Default/read-only rehearsal: --dry-run. Writes require --apply.
// Stop game/account writers and the leaderboard cron before capture, and keep them stopped until
// completion. The archive is immutable; a changed source or incomplete archive fails closed.
const { createHash } = require("crypto");
const { MongoClient } = require("mongodb");
const { resolveHiddenRating } = require("../routes/socket/rating/ranked");
const { STARTING_PUBLIC_RATING } = require("../routes/socket/rating/public-ladder");
const { S25_CUTOVER_VERSION, seasonCounterFields } = require("../src/shared/season");

const VERSION = S25_CUTOVER_VERSION;
const CLOSING_SEASON = VERSION - 1;
const STATE_ID = `season${CLOSING_SEASON}-to-${VERSION}`;
const ARCHIVE_COLLECTION = `season${CLOSING_SEASON}ClosingAccounts`;
const STATE_COLLECTION = "seasonCutoverState";
const COUNTERS = Object.values(seasonCounterFields(VERSION));
const WRITE_OPTIONS = { w: "majority", j: true };
// Reporting only: existing cutoffs, never an award policy adopted by this script.
const EXISTING_THRESHOLDS = { bronze: 1737, silver: 1767, gold: 1822 };

// Raw collection reads avoid Mongoose defaults/casting and automatic index writes in --dry-run.
// Preserve the award inputs and stable identity, not authentication material or private notes/IPs.
const CAPTURE_FIELDS = [
  "_id",
  "username",
  "hashUid",
  "created",
  "isBanned",
  "isTimeout",
  "staffRole",
  "verified",
  "eloOverall",
  "eloSeason",
  "rating",
  "ratingVersion",
  "legacyEloOverallS23",
  "legacyEloSeasonS23",
  "xpOverall",
  "xpSeason",
  "isRainbowOverall",
  "isRainbowSeason",
  "dateRainbowOverall",
  "wins",
  "losses",
  "rainbowWins",
  "rainbowLosses",
  "games",
  "lastCompletedGame",
  "lastRankedGameAt",
  "eloPercentile",
  "previousDayElo",
  "previousDayXP",
  "maxElo",
  "pastElo",
  "badges",
  "gameSettings.previousSeasonAward",
  "gameSettings.hasUnseenBadge",
  "gameSettings.tournyWins",
  "gameSettings.staffIncognito",
  "gameSettings.staffDisableVisibleElo",
  "gameSettings.staffDisableVisibleXP",
  ...Array.from({ length: VERSION }, (_, i) => Object.values(seasonCounterFields(i + 1))).flat(),
];
const PROJECTION = Object.fromEntries(CAPTURE_FIELDS.map((key) => [key, 1]));

const readPath = (object, path) => {
  let value = object;
  for (const part of path.split(".")) {
    if (!value || !Object.prototype.hasOwnProperty.call(value, part)) return { exists: false };
    value = value[part];
  }
  return { exists: true, value };
};

// A typed canonical representation keeps absent/null/NaN and BSON identifiers distinguishable.
// Object key ordering must not change an archive fingerprint after a Mongo round trip.
const canonical = (value) => {
  if (value === null) return ["null"];
  if (value === undefined) return ["undefined"];
  if (typeof value === "number") return ["number", Object.is(value, -0) ? "-0" : String(value)];
  if (value instanceof Date) return ["date", String(value.getTime())];
  if (Buffer.isBuffer(value)) return ["buffer", value.toString("hex")];
  if (value?._bsontype) return ["bson", value._bsontype, value.toString()];
  if (Array.isArray(value)) return ["array", value.map(canonical)];
  if (typeof value === "object") {
    return [
      "object",
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    ];
  }
  return [typeof value, value];
};
const fingerprint = (value) =>
  createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");

const usableHidden = (account) => {
  const rating = account.rating?.overall;
  return Number.isFinite(rating?.mu) && Number.isFinite(rating?.sigma) && rating.sigma >= 0;
};
const isRecord = (value) =>
  value && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

const resetUpdate = (account) => {
  const set = {
    eloSeason: STARTING_PUBLIC_RATING,
    xpSeason: 0,
    isRainbowSeason: false,
    previousDayElo: STARTING_PUBLIC_RATING,
    previousDayXP: 0,
    ratingVersion: VERSION,
    ...Object.fromEntries(COUNTERS.map((field) => [field, 0])),
  };
  // Never replace a finite public overall total, even zero or a negative accumulator.
  if (!Number.isFinite(account.eloOverall)) set.eloOverall = STARTING_PUBLIC_RATING;
  if (account.eloPercentile == null || !isRecord(account.eloPercentile)) {
    set.eloPercentile = { seasonal: null };
  } else {
    set["eloPercentile.seasonal"] = null;
  }
  if (!usableHidden(account)) {
    // Reuse R1 without rewriting obsolete seasonal/display fields. Replace only malformed
    // containers (already archived); otherwise leaf writes leave historical raw data untouched.
    const hidden = resolveHiddenRating(account);
    if (!isRecord(account.rating)) set.rating = { overall: hidden };
    else if (!isRecord(account.rating.overall)) set["rating.overall"] = hidden;
    else {
      set["rating.overall.mu"] = hidden.mu;
      set["rating.overall.sigma"] = hidden.sigma;
    }
  }
  // R6: no ranked S25 game has occurred. Older completion/activity cannot qualify this account.
  return { $set: set, $unset: { lastRankedGameAt: "" } };
};

const assertUnmigrated = (account) => {
  const version = account.ratingVersion;
  if (version != null && (!Number.isInteger(version) || version < 0 || version >= VERSION)) {
    throw new Error("Unexpected cutover/rating version; cannot infer uninitialized S25 state");
  }
  if (account.lastRankedGameAt != null || COUNTERS.some((field) => account[field] != null && account[field] !== 0)) {
    throw new Error("Unmarked S25 activity/counters exist; refusing to erase possible live games");
  }
};

const currentFilter = (account) => ({
  _id: account._id,
  // Atomic compare-and-set protects the interval between verification and this account's reset.
  // Include existence checks because equality with null also matches missing fields in Mongo.
  $and: CAPTURE_FIELDS.filter((field) => field !== "_id").map((field) => {
    const saved = readPath(account, field);
    return saved.exists ? { [field]: { $exists: true, $eq: saved.value } } : { [field]: { $exists: false } };
  }),
});

const summarize = (accounts) => {
  const values = [];
  const bins = {};
  const counts = { bronze: 0, silver: 0, gold: 0, none: 0, invalid: 0 };
  const shape = {
    usableLifetimeHidden: 0,
    softSeedFromOverall: 0,
    freshHidden: 0,
    repairPublicOverall: 0,
    usableSeasonalHidden: 0,
    legacyS23SnapshotPairs: 0,
    overallDisplayMatchesPublic: 0,
    seasonDisplayMatchesPublic: 0,
    versions: {},
  };
  let total = 0;
  let banned = 0;
  for (const account of accounts) {
    total++;
    const version = account.ratingVersion;
    const versionKey = version === undefined ? "absent" : `${typeof version}:${String(version)}`;
    shape.versions[versionKey] = (shape.versions[versionKey] || 0) + 1;
    if (usableHidden(account)) shape.usableLifetimeHidden++;
    else if (Number.isFinite(account.eloOverall) && account.eloOverall > 0) shape.softSeedFromOverall++;
    else shape.freshHidden++;
    if (!Number.isFinite(account.eloOverall)) shape.repairPublicOverall++;
    // Historical raw evidence only: these retired fields answer the S24 deployment question in
    // the staging rehearsal. Neither S25 gameplay nor the cutover reset consumes their values.
    if (usableHidden({ rating: { overall: account.rating?.season } })) shape.usableSeasonalHidden++;
    if (Number.isFinite(account.legacyEloOverallS23) && Number.isFinite(account.legacyEloSeasonS23))
      shape.legacyS23SnapshotPairs++;
    if (Number.isFinite(account.eloOverall) && account.rating?.overall?.display === account.eloOverall)
      shape.overallDisplayMatchesPublic++;
    if (Number.isFinite(account.eloSeason) && account.rating?.season?.display === account.eloSeason)
      shape.seasonDisplayMatchesPublic++;
    const elo = account.eloSeason;
    if (Number.isFinite(elo)) {
      values.push(elo);
      const bin = String(Math.floor(elo / 50) * 50);
      bins[bin] = (bins[bin] || 0) + 1;
    }
    if (account.isBanned) {
      banned++;
      continue;
    }
    if (!Number.isFinite(elo)) counts.invalid++;
    else if (elo >= EXISTING_THRESHOLDS.gold) counts.gold++;
    else if (elo >= EXISTING_THRESHOLDS.silver) counts.silver++;
    else if (elo >= EXISTING_THRESHOLDS.bronze) counts.bronze++;
    else counts.none++;
  }
  values.sort((a, b) => a - b);
  const quantile = (p) =>
    values.length ? values[Math.min(values.length - 1, Math.floor(p * (values.length - 1)))] : null;
  return {
    accounts: total,
    distribution: {
      population: "all closing accounts, including banned",
      finite: values.length,
      invalidOrAbsent: total - values.length,
      min: quantile(0),
      p10: quantile(0.1),
      p25: quantile(0.25),
      median: quantile(0.5),
      p75: quantile(0.75),
      p90: quantile(0.9),
      p99: quantile(0.99),
      max: quantile(1),
      binsOf50LowerBounds: bins,
    },
    existingThresholdScenario: {
      reportingOnly: true,
      awardsWritten: 0,
      thresholds: EXISTING_THRESHOLDS,
      population: "accounts without a truthy isBanned, matching seasonCutover24 medal gating; no game-count filter",
      bannedExcluded: banned,
      exclusiveBands: counts,
    },
    populationShape: shape,
  };
};

// Keep only small reporting inputs in memory; full records and game histories stream through cursors.
const reportInput = (account) => ({
  eloSeason: account.eloSeason,
  eloOverall: account.eloOverall,
  isBanned: account.isBanned,
  ratingVersion: account.ratingVersion,
  rating: account.rating,
  legacyEloOverallS23: account.legacyEloOverallS23,
  legacyEloSeasonS23: account.legacyEloSeasonS23,
});

const runCutover = async ({ db, dryRun = true, log = console.log }) => {
  const accounts = db.collection("accounts");
  const archive = db.collection(ARCHIVE_COLLECTION);
  const states = db.collection(STATE_COLLECTION);
  const totals = { captured: 0, reset: 0, skipped: 0, failures: 0 };
  let phase = "preflight";
  try {
    let state = await states.findOne({ _id: STATE_ID });
    if (
      state &&
      (state.schema !== 1 || state.version !== VERSION || !["capturing", "captured", "complete"].includes(state.phase))
    ) {
      throw new Error("Unknown archive manifest; refusing to overwrite it");
    }
    const reportRows = [];
    if (!state || state.phase === "capturing") {
      phase = "capture";
      const count = await accounts.countDocuments({});
      if (state && state.accountCount !== count)
        throw new Error("Account population changed during capture; keep writers stopped");
      if (!state) {
        if (await archive.countDocuments({})) throw new Error("Archive exists without its manifest");
        state = {
          _id: STATE_ID,
          schema: 1,
          version: VERSION,
          phase: "capturing",
          accountCount: count,
          startedAt: new Date(),
        };
        if (!dryRun) await states.insertOne(state, WRITE_OPTIONS);
      }
      const cursor = accounts.find({}, { projection: PROJECTION }).sort({ _id: 1 });
      let existingCount = 0;
      try {
        for (let account = await cursor.next(); account; account = await cursor.next()) {
          assertUnmigrated(account);
          const hash = fingerprint(account);
          const existing = await archive.findOne({ _id: account._id });
          if (existing) existingCount++;
          if (
            existing &&
            (existing.hash !== hash || fingerprint(existing.snapshot) !== hash || existing.version !== VERSION)
          ) {
            throw new Error(
              "Closing account differs from its immutable archive; capture cannot be repaired by overwriting it"
            );
          }
          if (!existing && !dryRun) {
            await archive.insertOne(
              { _id: account._id, version: VERSION, capturedAt: new Date(), hash, snapshot: account },
              WRITE_OPTIONS
            );
          }
          totals.captured++;
          if (dryRun) reportRows.push(reportInput(account));
        }
      } finally {
        await cursor.close();
      }
      if (totals.captured !== count || (await accounts.countDocuments({})) !== count)
        throw new Error("Account population changed during capture");
      if ((await archive.countDocuments({})) !== (dryRun ? existingCount : count)) {
        throw new Error("Archive contains accounts outside the closing population");
      }
      if (dryRun) {
        log("[cutover25] closing S24 rehearsal (live source; no resets have begun)", summarize(reportRows));
        return { ...totals, dryRun, phase, wouldReset: count };
      }
    }

    phase = "verify archive";
    const digest = createHash("sha256");
    let archivedCount = 0;
    const archiveCursor = archive.find({}).sort({ _id: 1 });
    try {
      for (let entry = await archiveCursor.next(); entry; entry = await archiveCursor.next()) {
        if (
          entry.version !== VERSION ||
          fingerprint(entry.snapshot) !== entry.hash ||
          fingerprint(entry._id) !== fingerprint(entry.snapshot?._id)
        ) {
          throw new Error("Archive entry is corrupt or belongs to another cutover");
        }
        digest.update(`${fingerprint(entry._id)}:${entry.hash}\n`);
        archivedCount++;
        reportRows.push(reportInput(entry.snapshot));
      }
    } finally {
      await archiveCursor.close();
    }
    const hash = digest.digest("hex");
    if (archivedCount !== state.accountCount || (state.phase !== "capturing" && state.hash !== hash)) {
      throw new Error("Archive completeness/hash verification failed; no resets allowed");
    }
    log("[cutover25] immutable closing S24 archive", summarize(reportRows));
    if (state.phase === "complete") {
      totals.skipped = archivedCount;
      phase = "complete";
      return { ...totals, dryRun, phase };
    }

    phase = "verify source";
    if ((await accounts.countDocuments({})) !== state.accountCount)
      throw new Error("Account population changed; archive no longer covers every account");
    const sourceCursor = accounts.find({}, { projection: PROJECTION }).sort({ _id: 1 });
    let sourceCount = 0;
    let wouldReset = 0;
    try {
      for (let account = await sourceCursor.next(); account; account = await sourceCursor.next()) {
        sourceCount++;
        const entry = await archive.findOne({ _id: account._id });
        if (!entry) throw new Error("Account missing from closing archive");
        if (account.ratingVersion === VERSION && state.phase === "captured") continue;
        assertUnmigrated(account);
        if (fingerprint(account) !== entry.hash)
          throw new Error("Unmigrated account changed since capture; no reset permitted");
        wouldReset++;
      }
    } finally {
      await sourceCursor.close();
    }
    if (sourceCount !== state.accountCount) throw new Error("Account population changed during verification");
    if (dryRun) {
      totals.skipped = sourceCount - wouldReset;
      return { ...totals, dryRun, phase, wouldReset };
    }
    if (state.phase === "capturing") {
      const result = await states.updateOne(
        { _id: STATE_ID, phase: "capturing" },
        { $set: { phase: "captured", hash, capturedAt: new Date() } },
        WRITE_OPTIONS
      );
      if (result.matchedCount !== 1) throw new Error("Archive manifest changed concurrently");
    }

    phase = "reset";
    const resetCursor = accounts.find({}, { projection: PROJECTION }).sort({ _id: 1 });
    try {
      for (let account = await resetCursor.next(); account; account = await resetCursor.next()) {
        if (account.ratingVersion === VERSION) {
          totals.skipped++;
          continue;
        }
        try {
          assertUnmigrated(account);
          const entry = await archive.findOne({ _id: account._id });
          if (!entry || entry.hash !== fingerprint(account))
            throw new Error("Account changed after archive verification");
          const result = await accounts.updateOne(currentFilter(account), resetUpdate(account), WRITE_OPTIONS);
          if (result.matchedCount !== 1) throw new Error("Account changed concurrently; reset was not applied");
          totals.reset++;
        } catch (error) {
          totals.failures++;
          log("[cutover25] account reset failed", { accountId: String(account._id), reason: error.message });
        }
      }
    } finally {
      await resetCursor.close();
    }
    if (
      totals.reset + totals.skipped + totals.failures !== state.accountCount ||
      (await accounts.countDocuments({})) !== state.accountCount
    ) {
      throw new Error("Account population changed during reset; do not reopen traffic");
    }
    if (!totals.failures) {
      const result = await states.updateOne(
        { _id: STATE_ID, phase: "captured", hash },
        { $set: { phase: "complete", completedAt: new Date() } },
        WRITE_OPTIONS
      );
      if (result.matchedCount !== 1) throw new Error("Completion manifest changed concurrently");
      phase = "complete";
    }
  } catch (error) {
    totals.failures++;
    log("[cutover25] stopped", { phase, reason: error.message });
  } finally {
    log("[cutover25] totals", { ...totals, dryRun, phase });
  }
  return { ...totals, dryRun, phase };
};

const parseArgs = (args) => {
  if (
    args.some((arg) => !["--dry-run", "--apply", "--help"].includes(arg)) ||
    new Set(args).size !== args.length ||
    (args.includes("--dry-run") && args.includes("--apply"))
  )
    throw new Error("Use --dry-run (default), --apply, or --help");
  return { dryRun: !args.includes("--apply"), help: args.includes("--help") };
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(
      "Usage: node scripts/seasonCutover25.js [--dry-run | --apply]\nStop all writers before --apply. See docs/season-25-plan.md."
    );
    return;
  }
  const client = await MongoClient.connect(process.env.MONGO_URL || "mongodb://localhost:27017/secret-hitler-app", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
  });
  try {
    const db = client.db();
    console.log("[cutover25] connection", {
      source: process.env.MONGO_URL ? "MONGO_URL" : "local development fallback",
      database: db.databaseName,
      dryRun: options.dryRun,
    });
    const result = await runCutover({ db, dryRun: options.dryRun });
    if (result.failures) process.exitCode = 1;
  } finally {
    await client.close();
  }
};

if (require.main === module) {
  main().catch(() => {
    // Driver errors can include connection details; never print the URI/credentials in a run log.
    console.error("[cutover25] fatal setup/connection error; check arguments, connectivity and database access");
    console.error("[cutover25] totals", { failures: 1, phase: "setup/connection" });
    process.exitCode = 1;
  });
}

module.exports = {
  runCutover,
  resetUpdate,
  summarize,
  fingerprint,
  parseArgs,
  PROJECTION,
  STATE_ID,
  ARCHIVE_COLLECTION,
  STATE_COLLECTION,
};
