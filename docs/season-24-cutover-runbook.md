# Season 24 Cutover — Production Runbook

> Operator checklist for taking the OpenSkill rating engine + Season 24 live. Follow top to bottom.
> This reflects the code **as built**; the design rationale lives in `ranked-overhaul-and-season-24-cutover-plan.md`.

## 0. What's in this release (the moving parts)

- **New rating engine** (`routes/socket/rating/`) wired into `end-game.js` — replaces team-averaged Elo.
- **Season constants bumped to 24** (`src/frontend-scripts/constants.js`, `node-constants.js`).
- **Account schema additions** (`models/account.js`): `rating.{overall,season}.{mu,sigma,display}`,
  `winsSeason24`/`lossesSeason24`/`rainbowWinsSeason24`/`rainbowLossesSeason24`,
  `legacyEloOverallS23`/`legacyEloSeasonS23`, `ratingVersion`.
- **Migration script** `scripts/seasonCutover24.js` — you run this manually (not auto-run).
- **Leaderboard** moved to a Render **Cron Job** (`secret-hitler-leaderboard`) that writes a Mongo doc;
  the web serves it at `GET /leaderboardData.json` (`models/leaderboard.js`, `routes`/`app.js`).
- **Changelog** has a `TODO(cutover)` placeholder for the Season 23 top 10 — you fill it during the window.

**Deploy is two separate actions, in this order:** (1) run the migration script against Atlas,
(2) deploy the new build to Render. `autoDeploy` is off, so merging does NOT deploy.

---

## 1. Prep (do ahead of time, off the clock)

- [ ] Branch reviewed, merged to `main`, **build green**. Do NOT deploy yet.
- [ ] You have: Atlas connection string (`MONGO_URL`), a local checkout of the release commit with
      `pnpm install` done (the migration needs `mongoose` + `openskill` etc.), and Render dashboard access.
- [ ] **Staging dry-run:** restore a recent prod dump to a staging DB and run:
      ```
      MONGO_URL="<staging-uri>" node scripts/seasonCutover24.js --dry-run
      ```
      Confirm the printed totals look sane — **`failures: 0`**, a migrated count near the account total,
      and the printed top 10 looks right. (Dry-run computes + reports, writes nothing.)
      To re-run a staging dry-run from scratch, drop the `cutoverState` collection / re-restore the dump.

---

## 2. The maintenance window (production)

Live games are in memory and a deploy drops them, so this is a deliberate, off-peak window.

1. [ ] **Take an Atlas backup** and record the exact time (this is your rollback point).
2. [ ] **Disable game creation** via the moderation control, and confirm **remakes are gated by the same
       switch** (a remake must not start a new game).
3. [ ] **Drain:** wait until every in-progress game has finished. Confirm none are live.
4. [ ] **Run the production migration:**
       ```
       MONGO_URL="<prod-uri>" node scripts/seasonCutover24.js
       ```
       - Verify the totals: **`failures: 0`**. Ideally **`liveUpdated: 0`** (see §4 if not).
       - It prints `Season 23 top 10 (paste into Changelog.jsx)`. **Copy that list.**
       - Idempotent/resumable: if it dies partway, just run it again — stamped accounts are skipped.
5. [ ] **Fill the changelog:** paste the top 10 into the `TODO(cutover)` block in
       `src/frontend-scripts/components/section-main/Changelog.jsx` (re-add the `<h4>` + `<ol>`), commit.
6. [ ] **Deploy the Season 24 build** to Render (manual deploy). This ships the new engine, constants=24,
       and the filled changelog.
7. [ ] **Set the leaderboard cron's secret:** in the Render dashboard, on the new `secret-hitler-leaderboard`
       Cron service, set `MONGO_URL` (it's `sync:false`, same Atlas string as the web service). Optionally
       trigger a manual run now so the board isn't empty.
8. [ ] **Verify** (§3).
9. [ ] **Re-enable game creation.**

> The migration (step 4) and deploy (step 6) must be contiguous with games disabled the whole time. If a
> game completes on the *old* build after step 4, it writes old-scale Elo over the migrated state.

---

## 3. Post-deploy verification

- [ ] App is up; both season constants read **24** (frontend + backend).
- [ ] A sampled migrated veteran: `eloOverall` ≈ their pre-cutover value, `eloSeason` ≈ 1600,
      `rating.overall`/`rating.season` present, `ratingVersion: 24`, `winsSeason24` etc. = 0.
- [ ] **Play one ranked game end-to-end:** ratings move, the Elo-flavored number + deltas render in
      replay/profile, `winsSeason24`/`lossesSeason24` increment, lobby `eloMinimum` restrictions behave.
- [ ] **Play one casual/private game:** confirms it does **NOT** rate.
- [ ] A Season-23 top-10 player shows their **medal** (CSS) and the `topSeason23` **badge** (image hidden
      gracefully until art is added — see §4).
- [ ] Trigger / wait for the leaderboard cron; `GET /leaderboardData.json` returns populated boards.

---

## 4. Expected at launch (NOT bugs)

- **Seasonal Elo leaderboard is empty** until players climb past 1620 — everyone's season rating was
  cold-reset to ~1600. Normal for any rollover.
- **All leaderboard boards are empty** until the first cron run (daily 09:00 UTC, or your manual trigger).
- **`topSeason23` badge has no art** (`topSeason*.png` only exists through S17). The `Profile.jsx`
  `onError` fallback hides the broken image; the badge is still recorded. Drop in `topSeason23.png` later.
- **`liveUpdated > 0` in the migration totals** means ranked games slipped into the deploy window. Those
  accounts kept their played rating + were given their medal/badge but were NOT cold-reset — the log lists
  them by name for manual review. The window (games disabled) should make this `0`.

---

## 5. Rollback

- **Full rollback:** restore the Atlas backup from step 2.1, redeploy the previous build.
- **Targeted:** every account keeps `legacyEloOverallS23` / `legacyEloSeasonS23` (its pre-cutover Elo), so
  individual accounts can be reverted from those without a full restore.
- **Re-running the migration is safe** (idempotent via `ratingVersion`). To re-run the whole thing from
  scratch on a staging copy, drop the `cutoverState` collection and re-restore the dump first.
