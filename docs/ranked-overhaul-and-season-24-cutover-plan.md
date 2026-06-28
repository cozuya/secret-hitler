# Ranked System Overhaul + Season 24 Cutover

> **Status:** DEFERRED PLAN / handoff. No code changed yet.
> **Owner:** Chris (secrethitler.io).
> **Prerequisite:** finish the Render.com cutover and confirm production is stable before starting this work.
> **Target:** one coordinated **Season 24 launch** after the Render cutover. The rating engine and season must cut over together.
> **Scope:** replace the current team-averaged Elo with a per-player rating engine, close Season 23, create Season 24, migrate account rating state, preserve season awards/history, and update every rating consumer.

**Non-goals (explicitly deferred):**
- **Ranked Avalon** (and any other variant — monarchist, no-topdecking). Considered and pulled out of scope. Those modes stay casual/unranked. This plan is **vanilla SH ranked only.**
- **The Render.com infrastructure cutover.** Complete and validate that separately first. This plan only records the deployment constraints the rating/season cutover must respect afterward.

---

## 1. Problem statement

The ranking system was "done poorly." Concretely it's a **more-than-2-player, team-averaged Elo with no per-player uncertainty and a fixed K regardless of games played.** We want to redo the "assign ranking points on win/loss" function properly for the upcoming seasonal update.

---

## 2. TL;DR / recommendation

- **Adopt an OpenSkill (TrueSkill-family, MIT-licensed) per-player rating model**, replacing the team-averaged Elo. It fixes all three defects and is the structurally correct model for an N-player, two-**asymmetric**-team, team-outcome game. (Rationale + why-not-Glicko in §4.)
- **Write the rater as one pure function**, run once for `overall` and once for `season` — no DB writes inside it (today's `rateEloGame` saves mid-loop, which is why it's untestable).
- **Preserve the per-size team-balance bias** (today's `winnerBiasPoints`) — it's the best asset in the current system. Re-express it in the new model (performance offset / phantom player).
- **Keep an Elo-flavored *display* number** (rescaled `μ − 3σ`) so the community still sees familiar ~1500–2500 ratings even though the engine changed. Decouple "what's computed" from "what's shown."
- **Cut over at the Season 23 → 24 boundary** with a purpose-built, idempotent migration script: capture final standings and awards, snapshot legacy ratings, initialize new fields, reset seasonal state, and start everyone at high uncertainty.
- **Treat launch as a short maintenance window**, not a normal hot deploy. Stop new games, let active games finish, run the migration, then deploy the Season 24 build immediately.

---

## 3. Current state — findings

**The function:** `routes/socket/util.js:302` — `rateEloGame(game, accounts, winningPlayerNames)`. Helpers: `winnerBiasPoints` (`:273`), `probToEloPoints` (`:270`). Only caller: `routes/socket/game/end-game.js:308`, gated at `:295` so only non-private/casual/custom/practice/unlisted games are rated.

**What it does, per finished ranked game:**
1. `k = playerCount * (rainbow ? 9 : 4)` — one team-level budget (`util.js:311`).
2. Take the **mean** rating of each team (`util.js:318–321`).
3. One team-level surprise `p = 1 / (1 + 10^((avgWin − avgLose + bias)/400))` (`util.js:328`).
4. Every winner gets `change = p · (k / winningSize)`; every loser `p · (−k / losingSize)` (`util.js:337–339`).
5. Run all of that **twice**, independently, for `eloOverall` and `eloSeason`. Derive XP from the change, set rainbow flags, and `account.save()` **inside the loop** (`util.js:333–365`).

**Good parts — preserve these:**
- **`winnerBiasPoints`** encodes the known Liberal/Fascist win-rate imbalance per player count (+ the 6p/7p/9p2f rebalances) and injects it inside the sigmoid so ratings stay conserved on lopsided matchups. Genuine asset.
- **Zero-sum per game** (winners gain exactly `p·k`, losers lose `p·k`).
- Rainbow games move ~2.25× faster; season + overall tracked independently.

**The defects:**
- **An individual's own rating never enters their own update** (`change` depends only on team means + team size). **Two teammates 1000 points apart get the identical point change.** This is the core "team-averaged" flaw.
- **No per-player uncertainty** — a 1600 newbie and a 1600 veteran move identically.
- **Fixed K regardless of games played** — new players converge as slowly as veterans. (There isn't even a stored games-played counter; only `wins + losses`, `models/account.js:92–187`.)
- **Untested** — `__test__/.../util.test.js:8` only asserts the function exists. The math is untested, partly *because* it mixes computation with `account.save()` I/O.

### 3.1 What “creating a new season” currently means

There is no `Season` model, collection, creation API, or database record. A new season is currently created by coordinating several independent pieces:

- Bump `CURRENTSEASONNUMBER` in both `src/frontend-scripts/constants.js` and `src/frontend-scripts/node-constants.js`.
- Add four explicitly enumerated account fields for the new season:
  `winsSeason24`, `lossesSeason24`, `rainbowWinsSeason24`, and `rainbowLossesSeason24`.
- Reset shared seasonal state (`eloSeason`, `xpSeason`, `isRainbowSeason`, leaderboard baselines).
- Capture the prior season's standings and assign awards.
- Update the changelog and any season-description copy.

The account schema currently stops at Season 23. Bumping only the constants would make the dynamically named Season 24 win/loss fields absent from the strict Mongoose schema, so those counters cannot be trusted to persist.

---

## 4. The decision — OpenSkill, and why

**Chosen model: OpenSkill** (Weng–Lin Bayesian approximation of TrueSkill; MIT-licensed; JS port available; supports teams + weights). Each player carries `(μ, σ)`; display a conservative `μ − 3σ`.

**Why a TrueSkill-family model over "fix the Elo" or Glicko-2:**
- It's the **model designed for this exact shape**: N players, two teams, team outcome, **unequal team sizes** (SH always has a smaller fascist side — 3v2, 4v3, 6v4…). Team strength is a *combination* of member skills, not a mean — so {2400,1300} ≠ {1850,1850}.
- **Per-player σ** gives uncertainty *and* a self-tuning update size (large while σ is high, shrinking as the player settles) — fixing "no uncertainty" and "fixed K" in one principled stroke, no games-played counter needed.
- **Glicko-2 was the runner-up.** It keeps an Elo-like scalar (gentle migration) and injects bias trivially as an opponent offset — but it's fundamentally a 1v1 model, so it can only handle our teams by collapsing the enemy team into a *mean* pseudo-opponent. That reintroduces the very averaging we're removing, and it fudges unequal team sizes. Since we're **already** taking a season cutover + account-model changes, the migration advantage that favored Glicko doesn't pay for the model compromise.
- **License caveat:** use **OpenSkill**, *not* Microsoft TrueSkill (TS1 patented, TS2 proprietary).

**Honest expectation-setting:** SH outcomes are very noisy (hidden roles, social play, card luck), so per-game accuracy gains over a careful Elo are real but modest. The decisive wins are: **structurally correct for asymmetric teams, no aggregation hack, and per-player uncertainty.**

---

## 5. Architecture

Replace `rateEloGame` with a small rating module, e.g. `routes/socket/rating/`:

- **`rate.js`** — pure `computeRatingUpdates(accounts, winningPlayerNames, game)`; returns per-user `{ muΔ, sigmaΔ, displayΔ }` for **season + overall** (one function, run per track — kills the current copy-paste; see `util.js` author's own TODO at `:367`). **No `.save()` inside.** The caller in `end-game.js` applies the deltas and persists once.
- **`bias.js`** — the `winnerBiasPoints` equivalent, expressed as a **performance offset** (recommended) or a **phantom player** on the weaker team, keyed by player count + rebalance flags.
- **`display.js`** — `μ−3σ → Elo-flavored` rescale (pick `C` + offset so a fresh, settled player lands near the historical ~1600 feel).

> Forward-compat note (not a deliverable): keeping this rater pure + parameterized means a per-mode rating *pool* could be added cheaply later if a variant ever goes ranked. Out of scope here — recorded only so the seam isn't surprising.

---

## 6. Implementation plan

### 6.1 Engine
- Add `openskill` (MIT) to `package.json` (pnpm). Pure JS, no build step — no `pnpm.onlyBuiltDependencies` entry needed.
- Implement `rate.js` / `bias.js` / `display.js` as above.
- Unit-test `rate.js` against hand-worked cases + OpenSkill reference vectors (it's pure now, so this is finally easy): symmetric matchups, lopsided matchups, bias direction per size, σ shrinking with games, unequal team sizes (3v2…6v4).

### 6.2 Swap the live path
- `end-game.js:308`: replace `rateEloGame(...)` with `applyRatingUpdates(computeRatingUpdates(...))`.
- Port the `winnerBiasPoints` numbers (`util.js:273–300`) into `bias.js`.
- Keep the rainbow speed-up as a per-game multiplier (today's `rainbow ? 9 : 4`).
- Delete `rateEloGame` from `util.js` once nothing references it; update `util.test.js`.

### 6.3 Account model changes (`models/account.js`)
Store `(mu, sigma)` per `{season, overall}`, plus a cached display value for fast leaderboard reads. Sketch:

```js
rating: {
  overall: { mu, sigma, display },
  season:  { mu, sigma, display },
}
```

- Keep `pastElo`/`maxElo`-style history if we still want graphs (today: `account.js:221–222`).
- Add the four Season 24 win/loss fields listed in §3.1.
- **Don't** delete `eloOverall`/`eloSeason` immediately. Snapshot the genuinely old values into explicit legacy fields, then keep `eloOverall`/`eloSeason` as deprecated mirrors of the new display rating for Season 24. The new `(μ, σ)` fields are authoritative, but the mirrors reduce cutover risk for lobby restrictions, colors, badges, profiles, scripts, and leaderboards.

### 6.4 Bias, display, leaderboards, rewards
- **Bias:** SH already has a calibrated table (`winnerBiasPoints`), so this is a **port**, not a fresh calibration. *Optional* re-validation: a script can stream `GameSummary` and recompute empirical good-vs-evil win-rate by player count to sanity-check the ported offsets against current meta — nice-to-have, not required.
- **Display:** Elo-flavored `μ−3σ` everywhere ratings render. Audit readers of `eloOverall`/`eloSeason`/`eloPercentile`: `Profile.jsx`, `Leaderboards.jsx`, `Playerlist.jsx`, `UserPopup.jsx`, `user-requests.js`.
- **Rewards coupling — decide (see §7):** rainbow (XP), season awards, `topSeason` badges all read these numbers. While here, fix the **stale rainbow threshold**: the ranked path uses `xp ≥ 10` (`util.js:354`) but the XP-only branch still uses `xp ≥ 50` (`end-game.js:577,582`).

### 6.5 Season cutover & migration

**Code-side season creation:**

1. Bump both `CURRENTSEASONNUMBER` constants from 23 to 24.
2. Add `winsSeason24`, `lossesSeason24`, `rainbowWinsSeason24`, and `rainbowLossesSeason24` to `models/account.js`.
3. Add the new rating and legacy snapshot fields.
4. Add a Season 24 changelog entry containing the final Season 23 top 10.
5. Correct the stale help text claiming seasons last three months and start at the first of the year.

**Migration script requirements, in order:**

1. Capture final Season 23 standings before modifying any ratings.
2. Assign `gameSettings.previousSeasonAward` using the agreed Season 23 eligibility and medal rules.
3. Award `topSeason23` badges and preserve each top-10 placement.
4. Snapshot each account's pre-cutover `eloOverall` and `eloSeason` into explicit legacy fields.
5. Initialize `rating.overall` from the agreed old-Elo transform and initialize `rating.season` cold. Use high `σ` for both so the first ~10–15 games re-settle quickly.
6. Populate the deprecated `eloOverall` / `eloSeason` mirrors from the new display values.
7. Reset `xpSeason = 0`, `isRainbowSeason = false`, seasonal percentile, and daily leaderboard baselines.
8. Initialize Season 24 counters to zero if explicit initialization is preferred over first-write defaults.
9. Record a migration marker/version so rerunning the script is harmless.
10. Print verification totals: accounts scanned, migrated, skipped/already migrated, awards assigned, badges assigned, and failures.

The script must support `MONGO_URL`, await every write, exit non-zero on failure, and offer a dry-run mode. It should run against a staging copy before production.

### 6.6 Existing scripts are not suitable

- `scripts/assignBaseElo.js` uses `findOne()` before `.cursor()`, can affect at most one account, does not await saves, and never closes the connection on success.
- `scripts/addEndofSeasonRewards.js` currently only reports threshold buckets; the award writes are commented out, its cutoff is stale, and it does not assign top-five variants.
- `scripts/eloReset.js` is a historical full-system reset. It also rewrites overall Elo/XP and profile statistics, so it is much broader than a recurring season transition.
- All three hardcode localhost instead of using the production `MONGO_URL`.

Use a new purpose-built Season 24/OpenSkill migration script rather than modifying and executing these scripts in place.

### 6.7 Leaderboard deployment gap

`scripts/retrieveLeaderboardData.js` reads old Elo fields, stores daily baselines on accounts, and writes to `/var/www/secret-hitler/public/leaderboardData.json`. That path belongs to the old host and is incompatible with the Render deployment. No scheduler for this script exists in the repository.

Before Season 24 launches, decide where leaderboard generation runs on Render and where `leaderboardData.json` is stored. Update it to read the new display rating and reset `previousDayElo` / `previousDayXP` during migration so the first daily board does not show reset artifacts.

---

## 7. Open decisions (need owner call — recommendation given)

| # | Decision | Recommendation |
|---|----------|----------------|
| 1 | OpenSkill model variant | **Thurstone–Mosteller / Bradley–Terry (2-team)**; Plackett–Luce is overkill (we never have >2 teams). Tunable later. |
| 2 | Bias injection method | **Performance offset** per team (cleanest); phantom player if the lib makes offsets awkward. |
| 3 | Elo-flavored display rescale | **Yes** — keeps community-familiar numbers despite the engine swap. |
| 4 | μ seeding at cutover | Seed `rating.overall.μ` from a transform of old Elo (soft reset); `season` cold. High σ either way. |
| 5 | Rewards (rainbow/XP/awards) | Keep XP/rainbow as-is (mode-agnostic). Just confirm thresholds + percentile read from the new display value. |
| 6 | Zero-sum property | **Drop it** (OpenSkill ratings are absolute skill estimates; pool total drifts). More correct; leaderboards become "best estimated," not "most farmed." |
| 7 | Season 23 medal rules | Define bronze/silver/gold thresholds, top-five variants, minimum games, banned-user treatment, and hidden-rating treatment before writing the migration. |
| 8 | XP calculation | Decide whether ranked XP remains derived from display-rating movement or becomes a fixed win/loss award. The new engine's deltas do not have the old Elo scale by default. |
| 9 | Leaderboard job on Render | Choose the scheduler and durable output location before launch. |

---

## 8. Testing & verification

There is **no automated gameplay coverage** and this is live production — be conservative.
- **Unit:** exhaustively test the now-pure `computeRatingUpdates` (cases listed in §6.1). Validate against OpenSkill reference vectors.
- **Migration:** run the cutover script against a **staging copy** of the DB; verify counts, badge snapshots, and that no account is left without new `rating` fields.
- **Manual playtest (no e2e exists):** play one SH game end-to-end on staging; confirm ratings move sensibly, the display number renders, and casual/private games do **not** rate.
- Confirm a Season 24 ranked result persists all four Season 24 counter types as applicable and does not modify Season 23 counters.
- Confirm previous-season medals and `topSeason23` badges render for migrated users.
- Confirm the first post-reset leaderboard run does not report the reset itself as a daily gain/loss.
- `node --check` touched backend files; run `npx jest __test__/backend/routes/socket/` for the focused suites.

### 8.1 Production rollout runbook

Render runs one instance because all live games are held in memory, and a deploy restarts that process and drops every live game. `autoDeploy` is disabled. The season/rating launch therefore needs a deliberate maintenance sequence:

1. Take an Atlas backup and record the exact Season 23 cutoff time.
2. Run the migration in dry-run mode against a recent staging copy.
3. Disable game creation through the moderation control.
4. Wait for every existing game to finish. Remakes must also remain disabled through the same gate.
5. Capture/export final Season 23 standings.
6. Run the production migration and verify its totals.
7. Immediately deploy the Season 24/OpenSkill build.
8. Verify the application is running with both season constants at 24 and sample migrated accounts are readable.
9. Play one ranked game end-to-end and verify rating, XP, counters, replay messages, profiles, lobby restrictions, and leaderboards.
10. Verify a casual/private game does not rate.
11. Re-enable game creation.

The migration and deploy must be contiguous. If the Season 23 server is allowed to finish another ranked game after standings are captured or accounts are migrated, it can write an old-Elo result into the new state.

---

## 9. Risks & rollback

- **Live games, no e2e.** Land behind the season bump so there's a clean before/after; keep legacy Elo fields read-only for a season so nothing that reads them breaks mid-flight.
- **Split-version writes during rollout.** The old server and migrated database must not be active together. Mitigate with the maintenance sequence in §8.1.
- **Non-idempotent migration.** A partial run could duplicate awards or overwrite snapshots. Require a per-account migration marker and make all badge/award operations rerunnable.
- **Bias mis-port** skews ratings. Mitigate with wide σ at cutover + the optional re-validation pass (§6.4).
- **Reward/threshold drift.** Audit every reader of `elo*`/`eloPercentile`/rainbow before cutover (§6.4).
- **Leaderboard job missing on Render.** Resolve the scheduler and output path before launch.
- **Rollback:** the cutover script must be re-runnable / reversible from the snapshot; keep the pre-cutover dump.

---

## 10. Secondary cleanups to fold in (in the blast radius)

- **Separate math from persistence:** today `rateEloGame` mutates accounts and calls `account.save()` inside its loop (`util.js:333–365`); `end-game.js` then re-iterates and saves again — untestable + double-write risk. The new pure-function design fixes this.
- **Kill the season/overall copy-paste** (`util.js` TODO at `:367`) — the engine runs one function per track.
- **Stale rainbow threshold:** `xp ≥ 50` lingers in the XP-only branch (`end-game.js:577,582`) after the ranked path moved to `xp ≥ 10`.
- **Drifted experiment script:** `scripts/rate-test.js` uses an old `k = size*3` + hardcoded bias, out of sync with prod — update or delete.
- **Broken recurring reset script:** replace `scripts/assignBaseElo.js`; do not rely on its `findOne().cursor()` path.
- **Stale season copy:** update the help text that says seasons last three months and start at the first of the year.

---

## 11. File / line index (entry points)

| Area | Location |
|------|----------|
| Rating function (to replace) | `routes/socket/util.js:302` (`rateEloGame`); bias `:273`; sigmoid `:328`; per-player change `:337`; copy-paste TODO `:367` |
| Rating call site + gate | `routes/socket/game/end-game.js:308` (call), `:295` (gate), `:563–584` (XP-only branch, stale `xp≥50`) |
| Account rating fields | `models/account.js:195–196` (elo), `:211–222` (percentile/maxElo/pastElo), `:92–187` (wins/losses) |
| Optional bias re-validation data | `models/game-summary/index.js` (`players[].role`, `logs[]`); winner logic in `models/game-summary/buildEnhancedGameSummary.js` |
| Season number | `src/frontend-scripts/constants.js`, `src/frontend-scripts/node-constants.js` (`CURRENTSEASONNUMBER`) |
| Migration prior art | `scripts/eloReset.js` |
| Broken seasonal reset | `scripts/assignBaseElo.js` |
| Stale rewards dry-run | `scripts/addEndofSeasonRewards.js` |
| Old-host leaderboard generator | `scripts/retrieveLeaderboardData.js` |
| Season 24 account counters | `models/account.js` after the Season 23 fields |
| Season history/copy | `src/frontend-scripts/components/section-main/Changelog.jsx`, `Main.jsx` |
| Deploy constraints | `render.yaml` (`numInstances: 1`, `autoDeploy: false`) |
| Display readers to audit | `Profile.jsx`, `Leaderboards.jsx`, `Playerlist.jsx`, `UserPopup.jsx`, `routes/socket/user-requests.js` |
