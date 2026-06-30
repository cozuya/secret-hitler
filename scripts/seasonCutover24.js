// scripts/seasonCutover24.js — Season 23 -> 24 OpenSkill cutover migration.
//
// Idempotent / resumable: each account is stamped `ratingVersion = 24` once migrated, and a re-run
// skips those, so a partial/interrupted run is safe to repeat. Supports `--dry-run` (compute +
// report, no writes). Reads MONGO_URL (falls back to the local dev DB). Run it against a STAGING
// copy first — it rewrites every account's rating + seasonal state.
//
// Per account:
//   1. Snapshot legacy eloOverall/eloSeason into legacyEloOverallS23 / legacyEloSeasonS23 (reversible).
//   2. Seed rating.overall.mu from the old eloOverall (soft reset — overall is continuous across
//      seasons), high sigma so it re-settles; rating.season starts COLD (fresh). seedMuFromDisplay
//      is the exact inverse of displayRating, so the overall mirror comes back out ~unchanged.
//   3. Re-point the deprecated eloOverall/eloSeason mirrors at the new display values
//      (overall ~ unchanged; season -> ~1600).
//   4. Reset seasonal state: xpSeason, isRainbowSeason, seasonal percentile, daily baselines.
//   5. Initialise the Season-24 win/loss counters to 0.
// Plus a one-time global step: assign Season-23 medals (existing cutoff rules) + topSeason23 badges.
//
// Usage:
//   MONGO_URL="mongodb+srv://..." node scripts/seasonCutover24.js --dry-run
//   MONGO_URL="mongodb+srv://..." node scripts/seasonCutover24.js

const mongoose = require("mongoose");
const Account = require("../models/account");
const { awardBadgePrequeried } = require("../routes/socket/badges");
const { DEFAULT_SIGMA, displayRating, seedMuFromLegacy, freshRating } = require("../routes/socket/rating/display");

const RATING_VERSION = 24;
const CLOSING_SEASON = 23; // the season being closed out
const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017/secret-hitler-app";
const DRY_RUN = process.argv.includes("--dry-run");

// Season-23 medal cutoffs (legacy Elo scale). Applied to the PRE-cutover eloSeason, which is still on
// the old scale, so the cutoffs line up. These are the CANONICAL cutoffs for the cutover; the values
// originate in scripts/addEndofSeasonRewards.js (an old, commented-out, never-run analysis script)
// which this migration supersedes — if that script is ever revived, keep the two in sync.
const MEDAL_CUTOFF = 1737;
const SILVER_AT = MEDAL_CUTOFF + 30;
const GOLD_AT = MEDAL_CUTOFF + 85;
const TOP_N = 10;

const medalFor = (eloSeason) => {
  if (eloSeason >= GOLD_AT) return "gold";
  if (eloSeason >= SILVER_AT) return "silver";
  if (eloSeason >= MEDAL_CUTOFF) return "bronze";
  return null;
};

const main = async () => {
  await mongoose.connect(MONGO_URL);
  console.log(`[cutover] connected — ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE"}`);

  // Step 1: capture the Season-23 final top 10 (by season Elo) ONCE, BEFORE any account writes, and
  // persist it to a small state doc. A resumable rerun (after a partial run already reset some top
  // accounts to ~1600) MUST reuse this pristine list — recomputing from the now-mutated eloSeason
  // would promote non-top users into the badge set and changelog. Require >= 3 games so a fluke can't
  // take a slot. (To re-run the whole migration from scratch on staging, drop `cutoverState` first.)
  const stateColl = mongoose.connection.db.collection("cutoverState");
  let topState = await stateColl.findOne({ _id: "s23top10" });
  if (!topState) {
    const topDocs = await Account.find({
      isBanned: { $ne: true },
      "games.2": { $exists: true },
      eloSeason: { $ne: null },
    })
      .sort({ eloSeason: -1 })
      .limit(TOP_N)
      .select("username eloSeason")
      .lean();
    topState = {
      _id: "s23top10",
      entries: topDocs.map((d, i) => ({ username: d.username, placement: i + 1, elo: Math.round(d.eloSeason) })),
    };
    if (!DRY_RUN) await stateColl.insertOne(topState);
  }
  const topPlacement = new Map(topState.entries.map((e) => [e.username, e.placement]));
  console.log(`[cutover] Season ${CLOSING_SEASON} top ${TOP_N} (paste into Changelog.jsx):`);
  topState.entries.forEach((e) => console.log(`  ${e.placement}. ${e.username}: ${e.elo}`));

  // Step 2: migrate every account.
  const totals = {
    scanned: 0,
    migrated: 0,
    skipped: 0,
    liveUpdated: 0,
    gold: 0,
    silver: 0,
    bronze: 0,
    topBadges: 0,
    failures: 0,
  };

  const cursor = Account.find({}).cursor();
  for (let acc = await cursor.next(); acc != null; acc = await cursor.next()) {
    totals.scanned++;
    try {
      if (acc.ratingVersion === RATING_VERSION) {
        totals.skipped++;
        continue;
      }

      const oldEloOverall = acc.eloOverall;
      const oldEloSeason = acc.eloSeason;

      // Awards FIRST — before the live-update backstop below — so a top-10 player who slipped a ranked
      // game into the deploy window still gets their medal + badge instead of being skipped entirely.
      // Clear last season's medal for EVERYONE (incl. banned, so a banned former medalist doesn't
      // carry a stale medal into Season 24); only the NEW award/badge assignment is gated on !isBanned.
      acc.gameSettings = acc.gameSettings || {};
      acc.gameSettings.previousSeasonAward = "";
      if (!acc.isBanned) {
        // For a live-updated account, end-game has already overwritten eloSeason with the new ~1600
        // display scale, so oldEloSeason (captured above) is NOT the S23 value — but end-game snapshots
        // the pre-clobber legacy season Elo into legacyEloSeasonS23, so prefer that. For a normal,
        // not-yet-migrated account legacyEloSeasonS23 is unset and oldEloSeason is still the legacy value.
        const seasonEloForMedal = Number.isFinite(acc.legacyEloSeasonS23) ? acc.legacyEloSeasonS23 : oldEloSeason;
        const medal = Number.isFinite(seasonEloForMedal) ? medalFor(seasonEloForMedal) : null;
        if (medal) {
          acc.gameSettings.previousSeasonAward = medal;
          totals[medal]++;
        }
        const placement = topPlacement.get(acc.username);
        if (placement) {
          // NOTE: badge art only exists through season 17; there is no topSeason23.png yet, so until
          // one is added the Profile.jsx <img onError> fallback hides the (broken) image. The badge
          // data is still recorded here — drop in the PNG to reveal it.
          awardBadgePrequeried(
            acc,
            `topSeason${CLOSING_SEASON}`,
            `You were Rank ${placement} of Season ${CLOSING_SEASON}.`,
            `Season ${CLOSING_SEASON} Top 10`
          );
          totals.topBadges++;
        }
      }

      // Deploy-order safety net: if a ranked game completed on the new live engine before the migration
      // reached this account, end-game already wrote its rating.season (preserved from the legacy season
      // — see getRating) but left ratingVersion unset, so "rating.season present but ratingVersion unset"
      // means a live update. We must NOT cold-reset the rating or zero the Season-24 counters (that would
      // erase the game), so those are left exactly as the live engine wrote them. But the seasonal
      // CARRYOVER fields below (S23 season XP, rainbow flag, seasonal percentile, daily baseline) are
      // unrelated to the rating and would otherwise bleed S23 state through all of S24, so we still reset
      // them — and stamp ratingVersion so a resumed run treats this account as migrated. The S23
      // medal/badge were already awarded above (from legacyEloSeasonS23, snapshotted by end-game). The
      // maintenance window (creation disabled, games drained) should make this path unreachable; it
      // exists so a window slip degrades gracefully instead of silently losing a game or a season.
      if (acc.rating && acc.rating.season && Number.isFinite(acc.rating.season.mu)) {
        totals.liveUpdated++;
        console.log(
          `[cutover] LIVE-UPDATE — ${acc.username}: rating + S24 counters preserved, seasonal carryover reset`
        );

        // Reset seasonal carryover only. xpSeason=0 also drops the single live game's season XP, which is
        // negligible next to retaining the full S23 total; the rating and S24 win/loss counters stay.
        acc.xpSeason = 0;
        acc.isRainbowSeason = false;
        if (acc.eloPercentile) acc.eloPercentile.seasonal = null;
        acc.previousDayElo = acc.eloSeason;
        acc.previousDayXP = 0;
        acc.ratingVersion = RATING_VERSION;

        if (!DRY_RUN) await acc.save();
        continue;
      }

      // Snapshot legacy Elo (so the cutover is reversible from the dump + these fields).
      acc.legacyEloOverallS23 = oldEloOverall;
      acc.legacyEloSeasonS23 = oldEloSeason;

      // Seed overall from legacy Elo (soft reset, high sigma); season cold. seedMuFromLegacy is the
      // SAME helper getRating uses, so a script-migrated veteran and a live-seeded one match exactly.
      const overallMu = seedMuFromLegacy(oldEloOverall);
      const seasonFresh = freshRating();
      acc.rating = acc.rating || {};
      acc.rating.overall = { mu: overallMu, sigma: DEFAULT_SIGMA, display: displayRating(overallMu) };
      acc.rating.season = { mu: seasonFresh.mu, sigma: seasonFresh.sigma, display: displayRating(seasonFresh.mu) };
      acc.markModified("rating");

      // Re-point the deprecated mirrors at the new display values (overall ~ unchanged; season -> ~1600).
      acc.eloOverall = acc.rating.overall.display;
      acc.eloSeason = acc.rating.season.display;

      // Reset seasonal state.
      acc.xpSeason = 0;
      acc.isRainbowSeason = false;
      if (acc.eloPercentile) acc.eloPercentile.seasonal = null;
      acc.previousDayElo = acc.eloSeason; // so the first daily leaderboard isn't a giant reset delta
      acc.previousDayXP = 0;

      // Initialise Season-24 counters.
      acc.winsSeason24 = 0;
      acc.lossesSeason24 = 0;
      acc.rainbowWinsSeason24 = 0;
      acc.rainbowLossesSeason24 = 0;

      acc.ratingVersion = RATING_VERSION;

      if (!DRY_RUN) await acc.save();
      totals.migrated++;
    } catch (err) {
      totals.failures++;
      console.log(`[cutover] FAILED for ${acc && acc.username}: ${err && err.message}`);
    }
  }

  console.log("[cutover] totals:", JSON.stringify(totals, null, 2));
  await mongoose.connection.close();
  if (totals.failures > 0) {
    console.log(`[cutover] completed WITH ${totals.failures} failures — investigate before deploying.`);
    process.exit(1);
  }
  console.log(`[cutover] ${DRY_RUN ? "dry run" : "migration"} complete.`);
  process.exit(0);
};

// Only run when invoked directly (so the pure helpers can be imported/tested without connecting).
if (require.main === module) {
  main().catch((err) => {
    console.log("[cutover] fatal:", err);
    process.exit(1);
  });
}

module.exports = { medalFor };
