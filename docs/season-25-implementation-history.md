# Historical Season 25 implementation record

This preserves the pre-consolidation audit and assignment checkpoints verbatim below, including superseded observations and deferred-work notes. It is historical evidence, not the current deployment plan. Use [the consolidated Season 25 plan](season-25-plan.md), [acceptance traceability](season-25-acceptance.md), and [operator runbook](season-25-cutover-runbook.md) for current instructions. Earlier single-trajectory backtest figures are superseded by [the recorded multi-trial results](rating-backtest25-results.md).

---

# Season 25 ranked overhaul: production evidence and consumer audit

Audit date: 2026-09-08. Source base: `e7d4e0fcb824cc8e220d95f864342414f9df30cd`, plus the four
unstaged files from the accepted `s25-rating-core` assignment. This document records the
investigation in `s25-prod-state-audit`, attempt 1, with subsequent decisions and implementation
recorded below. The original audit changed no product code or thresholds.
Line references describe that source snapshot and will move as implementation proceeds.

Approved S25 anchors: public seasonal start 1500; ordinary movement centered on 20 and bounded to
16–24 points in either direction; one lifetime hidden estimator; first 10 S25 ranked games
provisional; main Season leaderboard requires at least 20 S25 ranked games and activity within
14 days. Eligibility never decays the stored score. This audit proposes no replacement policy.

## Controller decisions and current implementation checkpoint

The initial rulings were supplied with `s25-season-constants-schema`, attempt 1; later rulings are
identified below. They supersede the audit's earlier open questions in their stated scope:

- **R1 — lifetime hidden bootstrap (D1):** use `rating.overall` when `mu` and `sigma` are finite
  and `sigma >= 0`. Otherwise, if `eloOverall` is finite and positive, use the existing display/legacy
  inverse (`seedMuFromLegacy`) at `DEFAULT_SIGMA`. Otherwise use `freshRating()`. This soft seed
  applies even while production history is unresolved; it is not evidence that public Elo was an
  OpenSkill display. Never use `rating.season` as a seed or migration marker. The later ranked-path
  rewrite and S25 cutover must use this policy. Assignment 4 implements it in the new pure engine;
  assignment 5 integrates end-game, and assignment 6 reuses the same helper in the cutover.
- **R2 — board visibility:** eligibility is determined by account state and the board-generation
  query. Visible re-entry at the **next cron run is accepted**. Preserve the snapshot architecture;
  test the eligibility predicate, not real-time render freshness. The existing daily schedule and
  60-second HTTP cache remain relevant operational details, not a request for a board redesign.
- **R3 — seasonal score floor:** remove the old `> 1620` condition in the later eligibility work.
  The approved requirements (at least 20 S25 ranked games and ranked activity within 14 days)
  supersede it. It must not remain an additional filter. This is not a D3 threshold adjustment.
- **R4 — lobby restrictions:** retain the existing create/join AND/OR asymmetry and all thresholds.
  The creator slider's possible `max < min` after a reset is a follow-up, not a fix in this work.
- **R5 — S24 script retirement (assignment 6):** `seasonCutover24.js` is superseded once the S25
  cutover exists. Keep it unchanged in this pass; the following cleanup removes it together with
  the old display machinery. Do not preserve its replayability by retaining obsolete live schema.
- **R6 — initial ranked activity (assignment 6):** leave `lastRankedGameAt` unset at cutover; do
  not backfill from prior completion/activity. Everybody starts with zero S25 ranked games and
  therefore fails the 20-game eligibility condition already. The 14-day window cannot be binding
  at launch; absence correctly means no ranked S25 game yet.
- **R7 — activity sources (assignment 8):** Seasonal Elo uses `lastRankedGameAt`; casual/practice
  completion cannot restore ranked eligibility. Daily Elo/XP movement deliberately keeps
  `lastCompletedGame`, since general recent activity and casual XP belong on the daily boards.

**Seasonal user-list contract: investigated and resolved, not a defect.** The Controller confirmed
in assignment 5 that [formattedUserList](../routes/socket/models.js#L138) maps the four suffixed
internal counters to the frontend's unsuffixed wire keys, and `git show HEAD:routes/socket/models.js`
confirms that mapping already existed for S24. No owner decision or UI repair is pending for this
finding. The in-memory account/list shape and emitted wire shape deliberately differ.

**Assignment 3 checkpoint:** [src/shared/season.js](../src/shared/season.js) owns current season **25**,
the historical S24 OpenSkill migration identity, and seasonal counter-name construction. Both legacy
frontend/backend constant exports delegate to it. The strict Account schema derives Number paths
for every season from 1 through the current season, retaining historical fields and their absent
defaults; it also admits `lastRankedGameAt` as a Date. End-game, user-list, settings and moderation
counter access follows the shared names. Historical S24 and S17 scripts retain their original
season scope while using the same name helper.

The live rating engine's migration threshold remains **24**, explicitly pinned pending the later
end-game rewrite. Advancing the current season must not reinterpret an S24 account with missing
seasonal hidden state. No hidden/public rating math, XP calculation, ranked-mode gate, leaderboard
eligibility, or lobby threshold changes in this checkpoint. `lastRankedGameAt` has no writer yet.

**Deployment ordering:** this tree already tags games and updates counters for S25. It must not
serve production traffic until the later S25 cutover implementation and remaining ranked overhaul
are ready, S24 is drained and archived, and the operator runs the cutover before admitting traffic.
The cutover is not implemented or executed by assignment 3. Do not use `seasonCutover24.js` for S25.
Account resets also require the planned process/cache refresh; the schema/constant bump alone is
not a deployable ranked overhaul.

## 1. Production-state determination: unresolved

**`MONGO_URL` was absent from the Worker's process environment. No production access was available
through the assigned connection mechanism. No Mongo connection or database query was attempted.**
The presence of an S24 OpenSkill implementation in this checkout does not establish what production ran.
Neither `main` nor the local S24 changelog is deployment evidence.

The actual environment check was:

```powershell
rtk node -e 'console.log(JSON.stringify({mongoUrlPresent: Boolean(process.env.MONGO_URL)}))'
```

Observed output:

```json
{"mongoUrlPresent":false}
```

| Measurement | Observation in this pass |
| --- | --- |
| Connection attempts / database queries / production writes | 0 / 0 / 0 |
| Production accounts or games examined | 0; population size is unknown, not zero |
| `ratingVersion` presence, population rate and value distribution | Not measured |
| Valid `rating.overall` / `rating.season` `(mu, sigma)` population | Not measured |
| `legacyEloOverallS23` / `legacyEloSeasonS23` population | Not measured |
| S24 win/loss/rainbow counters and S24 game activity | Not measured |
| Seasonal / overall Elo histogram, quantiles and range | Not measured |
| Hidden `display` versus public Elo equality / transform round-trip | Not measured |
| Evidence of complete, partial, mixed or absent S24 migration | Unresolved |

No connection string, username list, inferred histogram, or synthetic result is presented as
production evidence. No local database fallback, environment-file credential search, migration,
award script, or backtest was run.

### Evidence needed when the read-only connection is supplied

This is a query plan, **not a log of queries executed**. Use raw collection reads with explicit
field projections, `find`, `countDocuments`, and read-only `aggregate` stages. Exclude `$out` and
`$merge`; do not import application boot code or invoke migration entry points.

1. Count all accounts and group `ratingVersion` by BSON type and exact value, including missing/null.
2. Cross-tab that version with presence and validity of each hidden `(mu, sigma)` pair, each hidden
   `display`, and both S23 snapshots. Presence alone is weaker than finite numeric values; negative
   sigma is invalid. Separate unversioned accounts with valid hidden state from wholly unseeded ones.
3. Count accounts with populated S24 counters and with positive `winsSeason24 + lossesSeason24`;
   sum the counters. Inspect recent `games` records filtered by `season: 24`, their ranked-mode
   flags, winner, date and player count. Account activity and completed-game data should corroborate.
4. Produce Elo histograms (for example, fixed 50-point bins), min/max and quantiles for all numeric
   accounts and separately S24-active accounts, then cross-tab by version/hidden-state validity.
   Counts in the 1790–1840 area are a discriminator to inspect, not proof by themselves.
5. For accounts with usable data, count exact matches and mismatch-size buckets for
   `rating.overall.display` versus `eloOverall`, `rating.season.display` versus `eloSeason`, and
   `round(1600 + 24*(mu - 25))` versus each stored display. Report denominator and missing/invalid
   counts, not only a match percentage. Correlation without the direct write relationship is weaker evidence.
6. Record actual aggregate outputs, query definitions, query time and scope. Conclude
   `established-OpenSkill`, `established-legacy`, or `unresolved`. A mixed population must retain its
   measured breakdown; a majority is not permission to treat every account alike.

### Cutover consequences independent of the answer

The following follow directly from the approved target and do not require a global guess about S24:

- Capture S24 closing data durably **before the first destructive reset**. Capture the full relevant
  population, raw pre-reset seasonal/overall values, hidden state and version, S24 counters, eligibility
  and ban state, prior award/badge state, and stable account identity. Preserve enough to resolve ties,
  renamed accounts and later award decisions. Keep personal identifiers in the protected operator
  archive, not in this public plan. A top-10 list or aggregate histogram alone is insufficient.
- Reset public `eloSeason` to 1500 exactly; retain an account's existing finite numeric `eloOverall`
  unchanged. Reset S25 seasonal XP/rainbow/percentile/daily baselines, initialize the four S25 counters,
  and initialize dedicated ranked eligibility state. Do not convert S24 seasonal Elo into S25 Elo.
- Preserve every valid lifetime hidden `(mu, sigma)` pair regardless of whether `ratingVersion` was
  stamped. Removing `rating.season` and hidden `display` fields must happen only after their archival
  capture. S24 counters and S23 snapshots remain historical data.
- Make capture and per-account S25 initialization resumable and idempotent. A completed S25 marker
  must prevent a rerun from erasing S25 games. Preserve archive completeness evidence across retries;
  an archive failure must prevent reset writes. Coordinate the ranked-game drain and the cron rollout.
- Separate S24 capture from awards. Report the S24 distribution and counts at the existing
  1737 / 1767 / 1822 medal cutoffs in dry-run; do not apply new thresholds. Deferred medals do not
  block S25 initialization. A later award action needs the operator's explicit values and approval.

Per-account distinctions still matter:

| Account evidence | Safe consequence / unresolved decision |
| --- | --- |
| Valid lifetime hidden pair, with or without version 24 | Preserve it exactly; do not reseed based on the population-wide conclusion. |
| Version 24 but hidden state missing/corrupt | Version alone is not a usable estimate. Archive original values, then follow R1: soft-seed from finite positive public overall, otherwise use fresh hidden state. |
| No usable hidden pair and finite public Elo | Preserve public overall numerically. R1 resolves hidden bootstrap: positive overall soft-seeds through the existing inverse at DEFAULT_SIGMA; zero/negative overall yields fresh hidden state. This does not reinterpret the preserved public score. |
| Missing/non-finite public overall | There is no current finite number to preserve. Choose an explicit initialization/repair rule and record its count in dry-run; do not silently treat this as a normal migration. |
| Already initialized for S25 | Keep post-cutover score, counters, XP and activity. Resume archival/operational work without replaying destructive resets. |
| Unknown future version or inconsistent migration evidence | Report and handle explicitly; do not downgrade it by assuming version 24 everywhere. |

In particular, the S24 script's test for `rating.season.mu` is not an S25-live-game discriminator:
valid S24 accounts may already have that field. Nor may `ratingVersion: 24` be treated as proof that
the hidden pair is present. The new cutover needs S25-specific completion evidence.

## 2. Inventory method and count

Initial discovery used:

```powershell
rtk rg -l 'eloSeason|eloOverall' -g '!pnpm-lock.yaml' -g '!HANDOFF.md' -g '!AGENTS.md' -g '!CLAUDE.md'
rtk proxy git grep -l -E 'eloSeason|eloOverall'
```

The tracked-file check returned **36 distinct files**: 32 code/script files, two tests, and two
historical plan/runbook documents. The first inventory table enumerates all 36. The new S25 core
files add no direct match for these two field names. The count is for direct textual references,
including comments; it is not the size of the full dependency surface.

Further `rg -n` searches covered `rating`, its helpers and aliases; `ratingVersion`;
`CURRENTSEASONNUMBER` and `currentSeasonNumber`; literal and dynamically constructed seasonal
counter names; `previousDayElo`, `maxElo`, `pastElo`, `eloPercentile`, `eloMinimum`, `eloSliderValue`,
`disableSeasonal`, `lastCompletedGame`, `lastRankedGameAt`, `PLAYERCOLORS`, `previousSeasonAward`,
`topSeason`, `libElo`, `fasElo`, replay chat builders, and leaderboard payload/HTTP/cron wiring.
Adjacent code was read to distinguish writers, readers, historical scripts and comments.

Actions below mean **No change** to the contract, **Mechanical** season/default/import work,
**Approved change** to implement an already approved behavior, **Decision** for an unresolved
interpretation, or **Evidence-dependent** where production/per-account data is needed. These are
implications from the original source snapshot; no code changed in that audit. Assignment 3 progress
and controlling R1-R4 decisions are recorded above; these historical line references are not current
implementation status.

### All 36 direct public-rating references

| # | Source / lines | Current read or write | S25 implication |
| --- | --- | --- | --- |
| 1 | [models/account.js](../models/account.js#L188):188–224, 239–250 | Defines S24 counters, public ratings, S23 snapshots, version, both hidden tracks/displays, daily baseline, activity, percentile, max/history. Public Elo fields have no defaults; max defaults to 1600. | **Approved change:** add strict-schema S25 counters and ranked timestamp; public numbers become authoritative; retain lifetime hidden pair, remove seasonal hidden/display after capture. **Mechanical/Decision:** fresh defaults and invalid/missing overall handling must agree across consumers; preserve history. |
| 2 | [routes/index.js](../routes/index.js#L296):296–321 | Attaches public Elo, max, history and percentile to profile responses; supplies several truthy-value fallbacks to 1600 and honors staff visibility flags. | **Mechanical:** align S25 display defaults; preserve explicit zero and historical values. **No change:** response names and visibility semantics; do not substitute hidden state. |
| 3 | [routes/socket/badges.js](../routes/socket/badges.js#L12):12–19, 130–147 | `ELO_BADGES` 1800–2300; `checkBadgesELO` checks overall public Elo. Header describes the old display scale and planned retuning. | **No threshold change (D3).** Retain overall-score checks and existing badges. **Mechanical:** remove obsolete display/retuning description when integrating. See section 4. |
| 4 | [routes/socket/game/end-game.js](../routes/socket/game/end-game.js#L415):415–505, 508–589 | Rates two tracks; writes hidden state and public mirrors; maintains max/history, XP, counters, last completion, user-list copies, and replay/per-viewer Elo messages. | **Approved change:** compute from pre-update lifetime skill, apply one faction delta to both public totals, single normal hidden update, independent XP, S25 counters and ranked timestamp; persist each account once. Preserve mode gates, visibility and ordinary teardown. |
| 5 | [routes/socket/game/start-game.js](../routes/socket/game/start-game.js#L231):231–297 | Asynchronously averages public overall/seasonal Elo into `libElo`/`fasElo` summary objects, fallback 1600. | **No change:** these summaries describe public scores, not hidden expectations. **Mechanical:** fresh-score fallbacks. **Integration risk:** unchecked missing-account dereferences and unhandled query rejection; the query is not awaited before builder construction. Do not mistake these values for the new pre-game predictor input. |
| 6 | [routes/socket/models.js](../routes/socket/models.js#L164):164–175, 188–241, 344 | Prunes/broadcasts public Elo and current-season counter aliases; broadcasts lobby Elo minimum; delta user-list transport. | **Mechanical:** shared season constant/default handling, preserve a valid zero rating. **No change:** public wire names and delta transport. Optional provisional metadata needs explicit plumbing here. |
| 7 | [routes/socket/rating/display.js](../routes/socket/rating/display.js#L24):24–60 | Fresh hidden defaults plus 1600/24 public display transform and inverse legacy seeding. | **Approved change:** remove its live public-display role. **Mechanical:** relocate/retain hidden defaults needed by `bias.js`/`predict.js`. **R1 / historical support:** retain the inverse for the chosen soft bootstrap and S24 tooling; deleting the entire file blindly breaks imports. |
| 8 | [routes/socket/rating/rate.js](../routes/socket/rating/rate.js#L15):15–64, 77–169 | Reads per-track hidden state or seeds from public Elo; compares version 24; applies Rainbow mu multiplier; returns two hidden displays and their deltas. | **Approved change:** one lifetime hidden update, no Rainbow evidence multiplier, public changes from ladder module. **Mechanical:** shared season/migration metadata and decoupled XP constants. **R1:** missing hidden bootstrap is resolved above. Existing raw-sum bias is not the normalized public predictor. |
| 9 | [routes/socket/user-events/create-game.js](../routes/socket/user-events/create-game.js#L62):62–70, 192 | Rejects creation if either finite public rating is below a truthy requested slider minimum; parses it and stores `general.eloMinimum`. | **No change (D3):** preserve current create-gate semantics and public inputs. Creation differs from joining; section 4 records the launch effect and unset-value caveat. |
| 10 | [routes/socket/user-events/join-game.js](../routes/socket/user-events/join-game.js#L49):49–52, 77 | A seat passes the Elo gate when no limit exists or either public rating meets it; carries prior-season medal. | **No change (D3):** keep the OR comparison and public fields. Lifetime score can preserve join access immediately after the seasonal reset. |
| 11 | [routes/socket/user-events/settings.js](../routes/socket/user-events/settings.js#L2):2, 75, 106–145 | Stores `disableSeasonal`; reconstructs a staff-incognito user-list entry with public ratings and dynamic season counters. | **Mechanical:** fix the stale season import during season consolidation: `currentSeasonNumber` is imported from models but not exported there, producing `winsSeasonundefined` etc. **No change:** preference/permission semantics. |
| 12 | [routes/socket/user-requests.js](../routes/socket/user-requests.js#L218):218–236; constant at 27 | Builds initial in-memory user record with public ratings, prior medal and current season counters. | **Mechanical:** consume the shared S25 metadata. **No change:** existing public-field names; add provisional metadata only if an agreed UI needs it. |
| 13 | [scripts/addEndofSeasonRewards.js](../scripts/addEndofSeasonRewards.js#L10):10–45 | Legacy read/report loop at 1737 / 1767 / 1822; award/reset writes are commented out; excludes accounts by `isBanned: {$exists:false}`. | **No change / historical:** not a launch award command. Future S24 report must label the existing thresholds and use captured S24 inputs. Ban-field absence is not equivalent to `isBanned != true`; preserve raw ban state for later policy. |
| 14 | [scripts/assignBaseElo.js](../scripts/assignBaseElo.js#L9):9–16 | Legacy writer resets seasonal Elo to 1600, seasonal XP and Rainbow. | **No change / do not use for S25:** lacks archive, S25 idempotency and target reset semantics. Historical script retirement is separate from this audit. |
| 15 | [scripts/dump-curelo.js](../scripts/dump-curelo.js#L24):24–43 | Exports `[eloOverall, eloSeason]`, filtering >=25 lifetime wins and >=25 losses, banned users and exactly 1600; skips falsy scores. | **No change / historical:** not an unbiased S24 population audit and not the new backtest. Its 1600 filter and zero exclusion need explicit reconsideration if reused. |
| 16 | [scripts/eloReset.js](../scripts/eloReset.js#L226):226–253; warning at 3–7 | Preserves an old overall value in a badge, awards historical top-season badges, resets both public fields to 1600 without hidden reset. | **No change / do not run:** contradicts S25 overall preservation and archive requirements. Do not mechanically convert this historical reset into the S25 migration. |
| 17 | [scripts/rating/clearRatings.js](../scripts/rating/clearRatings.js#L14):14–15 | Old seasonal reset to 1600 with unawaited saves. | **No change / do not use:** superseded operational approach; cannot be the resumable S25 cutover. |
| 18 | [scripts/rating/cozRatings.js](../scripts/rating/cozRatings.js#L31):31–58 | Experimental old-Elo average/bias calculation; reads both tracks with 1600 fallback. Its account loop currently computes locals without saving a result. | **No change / historical:** not the S25 estimator or a measured backtest; do not adopt its raw public-rating model. |
| 19 | [scripts/rating/hexRatings.js](../scripts/rating/hexRatings.js#L32):32–77 | Replays legacy Elo formula, writes overall and conditionally current-season public Elo, saves accounts. | **No change / do not run on target data:** old writer; new read-only harness must keep simulated state outside live accounts. Its dynamic season import would otherwise follow a future bump. |
| 20 | [scripts/rating/nthRatings.js](../scripts/rating/nthRatings.js#L79):79–131 | Uses individual influence weights and public ratings, writes both tracks and saves; dynamic current season. | **No change / historical:** incompatible with faction-uniform public awards and read-only backtesting. Do not reuse its contribution heuristic. |
| 21 | [scripts/rating/printRatings.js](../scripts/rating/printRatings.js#L9):9–14 | Sorts seasonal Elo and prints top 25 public seasonal/overall scores. | **No change:** field semantics remain public; add numeric handling only if deliberately reviving this operator tool. Output is a member list, unsuitable for this aggregate evidence document. |
| 22 | [scripts/retrieveLeaderboardData.js](../scripts/retrieveLeaderboardData.js#L26):26–94 | Daily activity scan/baseline rollover; season board uses lifetime `games.2` plus Elo >1620; XP/Rainbow boards share scan; all boards top 20. | **Approved change:** S25 season-board eligibility must use S25 ranked counters and 14-day ranked activity, not lifetime games or the old score floor. **Mechanical:** daily 1500 baseline with finite checks. Keep XP/Rainbow eligibility separate. **R2:** next-cron visibility is accepted. Daily XP activity remains separate, section 5. |
| 23 | [scripts/seasonCutover24.js](../scripts/seasonCutover24.js#L28):28–45, 53–78, 97–199 | Version 24 / closing 23, top-10 archive, immediate medals, hidden seeding, public mirror rewrite, S24 counters, seasonal resets; live-update backstop. | **Approved change:** separate S25 script with full S24 archive and reset semantics; no new S24 medal policy. **R1:** account bootstrap is resolved above. Keep historical S24 support intelligible instead of retagging historical numbers to 25. |
| 24 | [scripts/testUserListPruning.js](../scripts/testUserListPruning.js#L29):29–40, 71–74 | Old pruning experiment copies public values and S2/S3 counters, later deletes values. | **No change / historical fixture:** not runtime S25 wire logic. Do not blindly rename historical experiment seasons. |
| 25 | [src/frontend-scripts/components/reusable/UserPopup.jsx](../src/frontend-scripts/components/reusable/UserPopup.jsx#L238):238–244 | Displays public overall and seasonal Elo, each defaulting to 1600 for falsy values, subject to visibility flags. | **Mechanical:** S25/fresh fallback semantics, preserving numeric zero; **No change:** hidden values stay hidden and visibility stays intact. |
| 26 | [src/frontend-scripts/components/section-main/Creategame.jsx](../src/frontend-scripts/components/section-main/Creategame.jsx#L1279):47, 630–972, 1119, 1279–1355, 1933–1941 | Elo-limited presets/defaults, slider 1600–2100, max=min(public tracks,2100), typed input and validation; `disableSeasonal` affects rendering. | **R4 / D3:** preserve gates and thresholds; record the inverted slider range as a follow-up without fixing it here. |
| 27 | [src/frontend-scripts/components/section-main/DisplayLobbies.jsx](../src/frontend-scripts/components/section-main/DisplayLobbies.jsx#L224):224–226, 390–400 | Shows Elo minimum; enriches seated cards with public ratings from user list for `PLAYERCOLORS`. | **No change:** retain public fields and limits; reflect reset through refreshed user-list data. |
| 28 | [src/frontend-scripts/components/section-main/Players.jsx](../src/frontend-scripts/components/section-main/Players.jsx#L687):300–367, 459, 687–694 | Colors/medals and client seat-gate precheck using either public score. | **No change (D3):** preserve OR semantics and modal; historical medal display remains separate from S25 score. |
| 29 | [src/frontend-scripts/components/section-main/Profile.jsx](../src/frontend-scripts/components/section-main/Profile.jsx#L79):79–80, 283–318, 511–520 | Public Elo table with 1600 fallback, stored badge art/text and selected-track color. | **Mechanical:** fresh fallbacks. **No change:** public values and historical badges. Missing `topSeason24` art needs separate operator/UI consideration; current image-error fallback hides unavailable art. |
| 30 | [src/frontend-scripts/components/section-right/Playerlist.jsx](../src/frontend-scripts/components/section-right/Playerlist.jsx#L82):82–112, 260–314, 529–581 | Selects public track, sorts Rainbow/experienced users by Elo, displays win rate only after >9 games, derives toggle color from Elo with 1600 fallback. | **Mechanical:** fallback handling. **No change:** this online list is not the main Season leaderboard. **Decision:** existing 10-game display behavior may support provisional UI, but Rainbow XP is not ranked-game eligibility. |
| 31 | [src/frontend-scripts/constants.js](../src/frontend-scripts/constants.js#L42):42, 65–119 | Frontend season constant 24 and public-score `PLAYERCOLORS`; clamps score to 1500–2100, 5-point grades, gates on Rainbow and staff settings. | **Mechanical:** shared S25 constant. **No color retuning:** 1500 starts at grade zero; preserve staff/Rainbow/preference behavior. No runtime import of this frontend season export was found. |
| 32 | [src/frontend-scripts/node-constants.js](../src/frontend-scripts/node-constants.js#L41):41, 64–118 | Backend season constant and parallel `PLAYERCOLORS` implementation. | **Mechanical:** consolidate season authority; preserve color behavior and import compatibility. Avoid a second independently edited season value. |
| 33 | [__test__/backend/routes/socket/rating/rate.test.js](../__test__/backend/routes/socket/rating/rate.test.js#L1):1–230 | Pins current S24 display, dual-track, legacy-seeding, Rainbow multiplier and rating invariants. | **Approved change:** replace obsolete live-engine expectations alongside integration; retain meaningful historical conversion tests if the S24 migration remains supported. Keep accepted S25 math tests. |
| 34 | [__test__/frontend/user-list-reducer.test.js](../__test__/frontend/user-list-reducer.test.js#L6):6–10 | Numeric public Elo fixtures for transport/update behavior. | **No change:** 1700/1800 remain valid public scores; avoid renaming fixtures merely to match a new starting value. |
| 35 | [docs/ranked-overhaul-and-season-24-cutover-plan.md](ranked-overhaul-and-season-24-cutover-plan.md#L131):131–143, 268–296 | Historical S24 design, hidden display migration and season/version checklist. | **No rewrite of history:** retain as S24 context; the S25 plan/runbook supersedes its operational advice for S25. It is not evidence of deployment. |
| 36 | [docs/season-24-cutover-runbook.md](season-24-cutover-runbook.md#L11):11–12, 72–74, 100 | Historical field names, rollout verification and rerun instructions. | **No mechanical season replacement:** write S25-specific operational instructions later; preserve S24 rollback/history context and its needed conversion helpers. |

### Additional dependencies beyond the 36 literal matches

| Source / lines | Dependency and implication |
| --- | --- |
| [app.js](../app.js#L94):94–110 | Reads `leaderboards/current` and returns its payload at `/leaderboardData.json` before static files. **No shape change needed**, but old-season cached/persisted payload must be replaced at cutover. It does not query current account eligibility. |
| [models/leaderboard.js](../models/leaderboard.js#L8):8–24 | Mixed payload and canonical five empty board arrays. **No change** if wire shape stays the same; season metadata/freshness safeguards would be an explicit integration choice. |
| [routes/cached-json.js](../routes/cached-json.js#L3):3–23 | Default 60-second cache, 10-second error retry, serves last successful payload on error. **No math change**; include cache and stale-error behavior in cutover/refresh validation. |
| [render.yaml](../render.yaml#L117):117–136, 138–150 | Separate leaderboard cron at `0 9 * * *`; stats cron at 09:30 UTC. **Operational coordination required** for cutover and board freshness; neither service has been invoked or changed. |
| [src/frontend-scripts/components/section-main/Leaderboards.jsx](../src/frontend-scripts/components/section-main/Leaderboards.jsx#L18):18–26, 39–46, 56–90 | Fetches JSON with no-store; reads generic `elo`/`dailyEloDifference` and numeric formatting, not hidden fields. **No math change**; update explanatory copy for approved eligibility if added. Cache bypass in the browser does not recompute the server's daily snapshot. |
| [routes/accounts.js](../routes/accounts.js#L311):311, 526; [models/account.js](../models/account.js#L35):35 | Two registration paths set `disableSeasonal: true`; account schema stores it. **No preference change. Mechanical:** ensure post-cutover new accounts receive the agreed fresh public/hidden defaults as well as migrated accounts. |
| [src/frontend-scripts/components/section-main/Settings.jsx](../src/frontend-scripts/components/section-main/Settings.jsx#L929):37, 86, 929–931; [Main.jsx](../src/frontend-scripts/components/section-main/Main.jsx#L78):78 | Stores/toggles seasonal view; records selected Elo view in analytics. **No change:** view choice selects public track, never hidden track. |
| [routes/socket/user-events/settings.schema.js](../routes/socket/user-events/settings.schema.js#L1):1; [create-game.schema.js](../routes/socket/user-events/create-game.schema.js#L1):1 | Passthrough schema boundaries. **No change in this audit**; the literal `eloSliderValue` field is not explicitly defined by create-game schema, so inline parsing/comparison is still relevant. Do not claim this is already a fully typed restriction. |
| [src/frontend-scripts/components/section-main/Tracks.jsx](../src/frontend-scripts/components/section-main/Tracks.jsx#L269):269–275, 384–386 | Displays lobby minimum from game data. **No change (D3)**. |
| [src/frontend-scripts/components/section-main/Colors.jsx](../src/frontend-scripts/components/section-main/Colors.jsx#L35):35; [src/scss/profile.scss](../src/scss/profile.scss#L1):1–63; [players.scss](../src/scss/players.scss#L1):1–69; [style-dark.scss](../src/scss/style-dark.scss#L975):975–1021 | Color legend and Elo gradient classes; knots 1500, 1600, 1849/1850, 1900, 2000, 2100. **No retuning:** public 1500 begins at the low end and >2100 saturates. Generated CSS follows these sources. |
| [src/frontend-scripts/components/section-right/Generalchat.jsx](../src/frontend-scripts/components/section-right/Generalchat.jsx#L452):452–474; [section-main/Gamechat.jsx](../src/frontend-scripts/components/section-main/Gamechat.jsx#L912):912–966; [GameChatItem.jsx](../src/frontend-scripts/components/section-main/GameChatItem.jsx#L29):29, 184–186; [replay/ReplayGamechat.jsx](../src/frontend-scripts/components/section-main/replay/ReplayGamechat.jsx#L294):294–325 | Indirect public-color and prior-medal consumers via `PLAYERCOLORS`/user list/chat metadata. **No change:** preserve preferences and stored replay text; do not retrofit historical replay results with S25 points. |
| [routes/socket/commands.js](../routes/socket/commands.js#L463):463; [user-events/create-game.js](../routes/socket/user-events/create-game.js#L296):296; [join-game.js](../routes/socket/user-events/join-game.js#L77):77; [remake-game.js](../routes/socket/user-events/remake-game.js#L189):189 | Copy `previousSeasonAward` into player/chat state. **No new award logic**; coordinate old medal display with deferred S24 assignment rather than awarding from post-reset scores. |
| [src/frontend-scripts/components/section-main/Changelog.jsx](../src/frontend-scripts/components/section-main/Changelog.jsx#L14):14–23 | S24 announcement plus commented placeholder for S23 top 10. **Approved change later:** explain S25 public movement/eligibility; use captured closing standings if publishing S24 results. Historical sections are not deployment evidence and should not be silently rewritten. |
| [models/game.js](../models/game.js#L13):13–15; [routes/socket/game/end-game.js](../routes/socket/game/end-game.js#L63):63–66, 95, 115–117, 136 | Stores season and Elo minimum; builds saved-game chat stream by concatenating replay chats. **Mechanical:** shared S25 tag; **No change:** preserve old season tags and public lobby minimum. |
| [models/game-summary/index.js](../models/game-summary/index.js#L43):43–50; [GameSummaryBuilder.js](../models/game-summary/GameSummaryBuilder.js#L8):8–30, 58–72 | Persist/carry `libElo` and `fasElo` objects containing public overall/season averages. **No hidden-field conversion.** Summary schema has no season field or per-player pre-game hidden rating snapshot; a backtest must not treat summary averages as individual hidden state. |
| [routes/socket/game/end-game.js](../routes/socket/game/end-game.js#L152):152–161, 166–220, 381, 436–444, 491–504 | Builds signed Elo/XP text; first saves the game before account lookup creates delta chats; later teardown updates the saved game. **Approved integration validation:** ensure bounded deltas are persisted and visible in reload/replay, including after teardown; account save success alone does not establish replay persistence. |
| [models/profile/index.js](../models/profile/index.js#L22):22–65; [models/profile/utils.js](../models/profile/utils.js#L121):121–149, 277–287 | Independent profile match/action statistics, not S25 ranked counters or hidden estimates. **No change:** do not infer 20-ranked-game eligibility from these lifetime/mode buckets. API rating enrichment is separately listed above. |
| [scripts/retrieveGameData.js](../scripts/retrieveGameData.js#L5):5, 66–187; [assignHashuidsToPlayers.js](../scripts/assignHashuidsToPlayers.js#L8):8, 101–222 | Current-season statistics comparisons use the backend constant. **Mechanical:** follow consolidated S25 season metadata, preserve historical `game.season`. These are not account-ranking writers. |
| [scripts/elo-tiers.js](../scripts/elo-tiers.js#L7):7–21; [eloRestructure.js](../scripts/eloRestructure.js#L3):3–24 | Read the positional seasonal value from `out/data.json`; restructure writes another local file. **No change / historical:** consume the old exporter without literal public-field names, not an empirical S25 harness. |
| [scripts/rate-test.js](../scripts/rate-test.js#L1):1–43; [scripts/rating/readme.md](../scripts/rating/readme.md#L1):1–2; [allGames.js](../scripts/rating/allGames.js#L1):1 | Legacy interactive Elo formula and old experiment documentation/DB replay loop. **No change / historical:** not S25 tests or authorized production actions. |
| [routes/socket/util.js](../routes/socket/util.js#L402):402 onward | Ranked-mode labeling mirrors end-game eligibility. **No gameplay-mode change:** keep labels consistent when integrating; public-ladder eligibility is separate from whether a game is ranked. |
| [src/frontend-scripts/reducers/sh-app.js](../src/frontend-scripts/reducers/sh-app.js#L1):1 onward | Generic user-list updates carry the unchanged public fields. **No rating algorithm change**; keep full/delta update behavior covered by the existing reducer test. |
| [routes/socket/rating/bias.js](../routes/socket/rating/bias.js#L24):24–127 | Priors, rebalance precedence and existing raw-sum offset; imports fresh defaults. **No prior changes**; retain/rehome defaults and distinguish hidden-update bias from normalized public prediction. |
| [routes/socket/rating/predict.js](../routes/socket/rating/predict.js#L4):4–86; [public-ladder.js](../routes/socket/rating/public-ladder.js#L3):3–27 | Accepted S25 pure core; imports hidden defaults, not public values. **No math change in this pass**; container guards/caching notes below. |
| [__test__/backend/routes/socket/rating/predict.test.js](../__test__/backend/routes/socket/rating/predict.test.js#L1):1 onward; [public-ladder.test.js](../__test__/backend/routes/socket/rating/public-ladder.test.js#L1):1 onward | Accepted invariant coverage added by assignment 1. **Preserve** while wiring account/bootstrap/season behavior; pure tests do not establish persistence, UI or migration correctness. |

## 3. Field-level migration checklist

| Field family | Writers/readers that govern the change | Required consequence |
| --- | --- | --- |
| `eloSeason`, `eloOverall` | End-game, migration, account schema; 36-file table | Authoritative public scores; S25 seasonal 1500, numeric overall preserved, identical bounded game delta. Keep wire names. |
| `rating.overall.{mu,sigma}` | `rate.js`, end-game, S24 migration; S25 predictor input | One lifetime hidden estimator, never reset at season boundary. Bootstrap only when no usable estimate exists, with explicit per-account handling. |
| `rating.season`, both `rating.*.display` | Account schema, `rate.js`, end-game, S24 script/tests | Archive, remove from live S25 state/updates; public UI consumers already use public fields. Historical S24 helper/test compatibility is a separate dependency. |
| `ratingVersion` and season constants | Account, rate version 24, S24 script version 24/closing 23, frontend/backend current 24; settings' broken alias | Consolidate future season authority without reinterpreting historical migration versions. Ensure strict-schema field names and dynamic readers agree. |
| `winsSeason24` / `lossesSeason24` / Rainbow family | Account:188–191; S24 script:192–195; current-season dynamic reads/writes | Preserve S24 fields and values as history; add S25 family rather than rename away S24. New ranked eligibility uses S25 wins+losses. |
| `previousDayElo`, `previousDayXP` | Account:192–193; leaderboard:36–48; cutover:158–160, 187–189 | Initialize S25 baseline to 1500/0 to prevent a reset-sized daily delta. Subsequent rollover stays numeric and independent of lifetime score. Avoid treating zero as missing. |
| `maxElo`, `pastElo` | Account:249–250; end-game:476–477; profile route:297–304 | Continue tracking public lifetime totals after each delta; preserve history at cutover. Fresh maximum/default must not invent a 1600 high for a fresh 1500 score. |
| `eloPercentile.{seasonal,overall}` | Account:239–242; cutover resets seasonal; profile API reads | Reset seasonal at cutover; preserve overall historical value. No active percentile calculation/writer was found in the checkout, so a displayed value is not newly recomputed by this overhaul. Current Profile JSX does not directly render these fields. |
| `eloMinimum`, `eloSliderValue` | Create/join, lobby wire/store, frontend slider/precheck/labels | D3: no threshold retuning, no AND/OR eligibility changes, no substitution of hidden skill. New public scale affects who qualifies. |
| `disableSeasonal` / `disableElo` / staff visibility | Account/settings, frontend selected-track readers, per-viewer chat | Keep viewing and visibility preferences. With equal per-game deltas, selected track changes totals but not the signed S25 game movement. These preferences do not select a hidden estimator. |
| `lastCompletedGame` / new `lastRankedGameAt` | Account:196; end-game:565; leaderboard daily scan:26 | Add/stamp the dedicated ranked timestamp only when ranked rating applies. Do not backfill S25 qualification from old completion timestamps. See the source/target mismatch in section 5. |
| `isRainbowSeason`, `xpSeason`, lifetime XP/Rainbow | End-game:32–46 and 606; account:243–247; leaderboard:68–72 | Reset seasonal carryover; keep XP result-based and independent. Casual/practice XP may unlock Rainbow, so Rainbow is not evidence of S25 ranked-game eligibility. |
| Prior medal and badges | Account gameSettings/badges; badge helpers; S24 cutover; player/chat/profile readers | Preserve closing inputs, delay unresolved S24 awards, retain historical badges. Decide presentation of previous-season medal while awards are pending rather than implicitly re-awarding. |

## 4. D3 threshold implications: audit only

`ELO_BADGES` remains exactly **1800, 1900, 2000, 2100, 2200, 2300**, and checks **overall** public
Elo. Existing players retain their overall number and already-earned badges at S25 cutover; the
seasonal reset alone therefore neither newly qualifies nor disqualifies them for overall thresholds.
Future earning pace follows accumulated bounded public points, not the compressed hidden display.

For a score starting at 1500, the following are arithmetic comparisons, not forecasts or retuning:

| Threshold | Points above 1500 | Net wins at an illustrative exactly +/-20 per result | Minimum wins with no losses even at +24 every win |
| --- | ---: | ---: | ---: |
| 1800 | 300 | 15 | 13 |
| 1900 | 400 | 20 | 17 |
| 2000 | 500 | 25 | 21 |
| 2100 | 600 | 30 | 25 |
| 2200 | 700 | 35 | 30 |
| 2300 | 800 | 40 | 34 |

Real modifiers and losses change the trajectory. This table does not claim a new account's overall
bootstrap is already implemented or settle the missing-overall decision in section 1.

Lobby restriction behavior is intentionally recorded precisely:

- **Joining:** `minimum <= eloSeason OR minimum <= eloOverall`, or no limit. A veteran whose
  overall score exceeds the limit can still join after their season resets to 1500.
- **Creating:** for populated numeric fields, creation rejects if **either** score is below the
  requested limit; effectively both must meet it. A veteran at overall 1900 / season 1500 can join
  a 1700 lobby but cannot create it under the current backend rule. Do not "fix" that asymmetry in
  an S25 cleanup under D3.
- **Creator UI:** slider minimum/default is 1600, maximum is `min(2100, seasonal, overall)`, and the
  High ELO preset is 1700. All seasonal ratings being 1500 can produce a rendered slider with
  `max=1500 < min=1600` when the overall rating makes the control visible. The reset makes this
  existing mismatch common. R4 records this as a follow-up and leaves the slider unchanged;
  lowering the 1600 restriction threshold is not authorized.
- **Unset input caveat:** create's `<` comparisons can pass when rating fields are undefined
  (NaN comparison), whereas join's `<=` comparisons do not establish qualification from undefined
  values. `eloSliderValue` is not explicitly typed by the create schema. This is existing
  eligibility/input-hardening debt, not permission to alter authz or limits in this audit.
- The number 1600 is both a presentation default and a lobby threshold in different places.
  Replacing all occurrences with 1500 would change D3 behavior. Treat them individually.

Color mapping also stays fixed. Scores <=1500 use the lowest color grade and scores >=2100 the
highest; the gradient includes the 1849/1850 transition. Seasonal colors restart at the low end
subject to Rainbow gating, while overall colors preserve current scores. These are UI implications,
not recommendations to retune colors or badges.

The old Season leaderboard floor **>1620** is separate from D3's lobby/badge thresholds. The approved
S25 leaderboard design replaces it with the 20-ranked-game and 14-day activity criteria; retaining
the old floor would silently add an unapproved extra eligibility requirement.

## 5. Findings requiring care in later work

1. **Production remains unresolved.** The environment prerequisite was unavailable, so no claim
   about complete migration, legacy Elo, or a mixed production population is established. Per-account
   preservation and a full closing archive reduce dependency on that answer. R1 now specifies the
   hidden bootstrap independently of the unresolved population history.
2. **S24 preservation is more than copying the old top-10 step.** The existing script snapshots only
   ten ranked entries globally and awards medals immediately. S25 must preserve all information
   needed for later awards, block destructive reset until capture is complete, and decouple awards
   from initialization. Reusing the old `rating.season` backstop would misclassify S24 state as S25 activity.
3. **There is a source/target mismatch about `lastCompletedGame`.** The target's explanatory text
   says casual/practice/custom games also touch it. In this checkout the only assignment found is
   [end-game.js:565](../routes/socket/game/end-game.js#L565), inside the ranked branch; the XP-only
   branch at 597–619 does not stamp it. This does not establish historical production semantics.
   The approved requirement for a dedicated `lastRankedGameAt` remains unchanged. Also, the current
   daily XP board's activity scan may omit XP-only players; correcting that is a separate decision,
   not grounds to count casual play as ranked activity.
4. **Season consolidation exposed two broken consumers.** The original audit found settings'
   nonexistent `currentSeasonNumber` import, which rebuilt undefined-suffix season keys. Assignment 3
   also found the same import in moderation's seasonal counter edits; those edits could not persist
   the intended seasonal counter under the strict schema. Both now use shared current-season keys,
   with regressions for all four counters. No moderation permission rule changed. The S17
   `retroactivelyAddGames.js` script was also missed by the adjacent inventory; its historical scope
   remains 17, with counter-name construction now delegated to the helper.
5. **Daily snapshot versus immediate re-entry.** The main board is recomputed daily at 09:00 UTC,
   then served through a 60-second web cache. A qualifying game restores the account's eligibility
   state immediately, but under existing infrastructure it may not restore visible board membership
   until the next cron. Likewise a player may remain on a stale snapshot beyond the 14-day cutoff.
   R2 accepts this snapshot latency and keeps the existing board architecture. Tests must assert
   the eligibility predicate, not render freshness. Old S24 payloads must
   not remain visible indefinitely at cutover or during stale-cache error fallback. The online
   `userList` and its broadcast cache also need refresh/reconnect/restart after account resets;
   changing Mongo fields alone does not refresh the creator's in-memory gate inputs or visible scores.
6. **Rating fallbacks are observable behavior.** Public fields have no schema defaults today and
   new registration defaults are mostly settings/XP. A cutover alone does not cover accounts created
   afterward. `|| 1600` and truthiness-based pruning can also misdisplay/drop a legitimate zero
   score; the approved delta policy supplies no score floor. Preserve historical overall/max/history
   while making new-account and seasonal defaults consistent. Do not use hidden mu to render Elo.
7. **Pre-game public summary values are not pre-game hidden snapshots.** Start-game's account query
   is asynchronous and its missing-account dereferences can throw; `GameSummaryBuilder` keeps the
   average objects by reference, so completion of that query affects what later gets published.
   Historical summary averages must not be used as individual hidden initial state in the backtest.
8. **Replay persistence has a second phase.** Initial `saveGame` constructs its chat snapshot before
   account rating queries append delta chats; `saveOrUpdateGame` refreshes it at teardown. The later
   end-game tests need to cover actual stored/reloaded public delta chats, not just the in-memory array.
9. **A broad hidden-display deletion breaks historical tooling/default imports.** Four production
   source files directly define/write/read hidden display state: account schema, `rate.js`,
   `end-game.js`, and `seasonCutover24.js`; the conversion implementation and tests also depend on it.
   `bias.js` and accepted `predict.js` need the default mu/sigma helpers currently housed in
   `display.js`. Separate those concerns and preserve historical S24 support deliberately.
10. **The provisional threshold is not an existing global filter.** Online player-list Rainbow
    grouping is XP-based and its >9 win/loss rule only controls win-rate display. The main leaderboard
    has different filters. Optional provisional UI should explicitly use S25 ranked counts; it must
    not redefine lobby eligibility or all online-list ordering.

### Carry-forward notes from accepted assignment 1, updated by assignment 4

- The shared comparison now guards absent game metadata, non-array rosters, non-Map ratings,
  invalid factions, missing names and duplicate seats. Prediction falls back to the configuration
  prior; the new engine returns no update for an unpartitionable roster or invalid outcome. The
  later integration must still construct the full roster and distinguish missing accounts.
- Prior quantiles now memoize by prior value, so the 48-step bisection runs only on the first use
  of each non-neutral configured prior. No prediction formula or prior value changed.

## 6. Original assignment 2 validation and implementation boundary

The audit pass changed only this document. The accepted S25 core files remain untouched and unstaged.
No source, schema, script, test, threshold, eligibility rule or production database was modified.
No overall-target completion or live-deployment claim is made by this audit.

Validation for this pass (all shell commands invoked through `rtk`):

- `pnpm test`: exit 0; **380/380 tests, 61/61 suites**, no snapshots, 12.818 seconds reported.
- `pnpm lint`: exit 0; Biome checked 297 files in 85 ms, no fixes; oxlint completed successfully.
- `pnpm build`: exit 0; Vite 8.0.16 transformed 1966 modules and built in 1.07 seconds. The same
  warnings observed in assignment 1 remain: crown-6.png, crown-6-captain.png and season_badges.png
  unresolved at build time, plus the >500 kB chunk-size warning.
- Source-reference check: all 83 relative file links resolve and their starting line anchors exist.
  The inventory contains all 36 direct-reference files; Markdown table column counts were checked.
- `git diff --check`: exit 0. Existing tracked and staged diffs are empty. This new document is
  unstaged, alongside the four unchanged additions from assignment 1. No commit or HEAD change.

No backend syntax check or new unit test is needed for this documentation-only increment. Database
queries remain unexecuted; the three green gates establish repository health, not production state.

## 7. Assignment 3 validation and remaining integration

- The settings regression was added and run **before** the fix. It failed with all four expected
  S24 counter keys missing from the staff-incognito rebuild (1 failed test, exit 1). After routing
  through the shared source it passes with S25 keys and rejects undefined-suffix keys.
- `pnpm test --runInBand`: exit 0; **391/391 tests, 64/64 suites**, no snapshots, 21.801 seconds.
  New coverage exercises all four moderation counters and the nonseasonal edit flag; ESM/CommonJS
  agreement and a simulated future bump; all historical strict-schema counter paths; actual
  Mongoose save serialization, hydration, and update serialization for the S25 fields; and the
  existing rating fallback at both the historical migration version and the current version.
  Database collection methods are stubbed in persistence tests; no database was contacted.
- `pnpm lint`: exit 0; Biome checked 301 files, no fixes, and oxlint passed.
- `pnpm build`: exit 0; Vite transformed 1967 modules and built in 1.01 seconds. The same three
  unresolved image references and >500 kB bundle warning remain; shared CommonJS metadata bundles
  successfully through the frontend ESM re-export.
- `node --check` passed for all 11 changed backend/shared CommonJS files. `git diff --check` passed.
  All work remains unstaged; HEAD is unchanged. No migration or production command ran.

Manual integration validation remains unperformed: on an isolated development database, finish
ranked standard and Rainbow games with both winning and losing accounts, confirm only S25 seasonal
counters advance (S1-S24 remain intact), and verify the current-season user list after reconnect and
staff-incognito toggling. Check that casual/practice games retain their existing counter behavior.
The later ranked-path rewrite must cover its own new timestamp and rating semantics before rollout.

## 8. Assignment 4: pure normalized ranked engine

[ranked.js](../routes/socket/rating/ranked.js) is deliberately alongside the still-live `rate.js`.
It has no database I/O, account mutation or socket globals. The caller first invokes
`resolveHiddenRatings(accounts)` (R1, once per named account), then
`computeRankedUpdates(game, ratings, seatedRoster)` on that pre-game Map and the full seated roster.
The result maps each resolvable seated username to `{ overall: { mu, sigma }, change, changeSeason,
xpChange, xpChangeSeason }`. It contains no seasonal hidden estimate or hidden display value.
Unresolved seats contribute fresh placeholders and get no output; accounts outside the roster get
no output. The caller owns public totals, eligibility, counters, timestamps and persistence.

### Normalization and update derivation

For each independent lifetime skill `S_i ~ N(mu_i, sigma_i^2)`, set `a_i = 1/n_faction`.
The comparison uses faction averages and their variances:

```text
M_F = sum_F(a_i * mu_i)           V_F = sum_F(a_i^2 * sigma_i^2)
M_L = sum_L(a_i * mu_i)           V_L = sum_L(a_i^2 * sigma_i^2)
beta = DEFAULT_SIGMA / 2         C^2 = 2*beta^2 + V_F + V_L
q = fascistWinPrior(game)        z = (M_F - M_L)/C + Phi^-1(q)
P(F wins) = Phi(z)               P(L wins) = 1 - Phi(z)
```

`buildTeamComparison` in `predict.js` supplies this geometry and the pre-game probabilities to both
the public predictor and the updater. The new engine consumes it once. Team means are summed after
scaling by their largest absolute value; sigmas use `hypot`. This keeps extreme finite stored
numbers representable while preserving the accepted predictor tests.

OpenSkill v5's default Plackett-Luce update uses a logistic comparison, while the accepted public
predictor is Gaussian. The new engine explicitly uses **Thurstone-Mosteller Full**, which uses the
Gaussian likelihood. The supported import is `openskill/models`; Jest 24 needs an explicit subpath
mapper because its resolver predates package exports. The mapper hardcodes the internal
`node_modules/openskill/dist/models/index.cjs` path; check and update it when upgrading OpenSkill.
A changed layout fails Jest resolution loudly rather than silently selecting another model.
No dependency version changes.

Transform each player's coordinates for the OpenSkill call:

```text
sigma_input_i = a_i * sigma_i / C     beta_input = beta / C
mu_input_i = z/n_F for F, 0 for L
```

This preserves each player's normalized variance and makes the input faction means sum to `z` and
zero. Individual means may be recentered this way because the likelihood only depends on faction
sums; the individual prior means are restored by applying only the resulting deltas. The input
performance difference has variance `(V_F + V_L + 2*beta^2)/C^2 = 1`, so the actual update likelihood
is `Phi(z)`, exactly the shared predictor. A regression feeds the **actual arguments passed to
OpenSkill's rate** into OpenSkill's own `predictWin` and compares both faction probabilities across
5p-10p, rebalance variants, Rainbow and both outcomes. This is independent of a probability merely
returned by our helper.

The call uses `epsilon=0` (no draw margin), `tau=0` (no uncertainty inflation absent from the
pre-game comparison), and `gamma=1` (Gaussian marginal moment update, without the library's default
team-dependent damping). With `s=+1` for a fascist win and `s=-1` otherwise, the marginal update is:

```text
t = s*z                         v(t) = phi(t)/Phi(t)
h(t) = v(t)*(v(t)+t)
delta_mu_i = sign_i * a_i * sigma_i^2/C * v(t)
sigma_new_i^2 = sigma_i^2 * (1 - (a_i*sigma_i/C)^2 * h(t))
```

Here `sign_i=+1` for a winner and `-1` for a loser. The implementation restores mean deltas by
`n_faction*C` and sigma by the output/input sigma ratio, retaining OpenSkill's numerical variance
floor. Zero sigma remains fixed. If an extreme finite value makes a player's arithmetic
unrepresentable, that player's pre-game pair is retained; public deltas stay bounded and other
players' finite updates are preserved. No hidden value is multiplied by the Rainbow factor.

At equal individual uncertainty and neutral prior, signed faction-total mean movements cancel.
Every player's average movement over equally likely opposite results is zero. A member of a smaller
faction carries greater individual weight `1/n`; this changes information per member, not a faction
win advantage. Holding faction means and their variances fixed across different headcounts yields
the same faction-mean update. Tests cover these distinctions, common skill shifts, and an independent
closed-form Gaussian posterior at `z=0`.

**Modelling consequence for Controller review:** the new engine is Gaussian rather than the old
default logistic updater, uses the exact marginal variance factor rather than default gamma
damping, and adds no per-game tau. Its hidden learning/uncertainty trajectories therefore differ
from S24; the later synthetic/real backtest must evaluate them. This is an explicit model choice
to make the update agree with the approved Gaussian predictor, not a claim of empirical calibration.
No public threshold, faction prior or bound was retuned. Implementation details were checked against
the installed OpenSkill 5.0.1 `rate.cjs` and `models/thurstone-mosteller-full.cjs`; the project's
[model documentation](https://github.com/philihp/openskill.js#alternative-models) describes the model options.

Public awards are calculated once per faction from the pre-game probabilities before the hidden
update. `change` and `changeSeason` are identical. XP reuses the unchanged `xpAward` from the old
engine: normal win 2, Rainbow win 5, any loss 1, equal across lifetime/season. Neither XP nor hidden
evidence is scaled by the public delta. The old engine, its tests, end-game, schema, cutover and all
frontend files are unchanged by this assignment. Integration and deployment remain pending.

### Assignment 4 validation

- `pnpm test --runInBand`: exit 0; **437/437 tests, 65/65 suites**, no snapshots, 18.645 seconds.
  The new engine contributes 46 tests, including parameterized 5p-10p/configuration matrices.
  The accepted predictor tests and unchanged old-engine tests pass.
- `pnpm lint`: exit 0; Biome checked 303 files in 85 ms with no fixes; oxlint passed.
- `pnpm build`: exit 0; 1967 modules transformed, 935 ms. The same three unresolved image
  references and >500 kB warning remain.
- `node --check` passed for `ranked.js` and `predict.js`; `git diff --check` passed. A native Node
  smoke invocation also loaded the supported model subpath and returned a finite five-player update.
- Focused testing initially exposed Jest 24's subpath-resolution limitation and a tiny equal-mean
  rounding discrepancy in scaled summation. Both were corrected before the green full-suite run.

Only `ranked.js`, its new test, the shared predictor, the Jest model-subpath mapper in `package.json`,
and this document changed in assignment 4. The work remains unstaged with no HEAD movement.
No account was saved, no database was contacted, and no empirical backtest or live gameplay test was
performed; these are mathematical/unit-test results for an engine not yet used by end-game.

## 9. Assignment 5: end-game integration

The earlier checkpoints above describe their respective passes. The current ranked path in
[end-game.js](../routes/socket/game/end-game.js) now resolves lifetime hidden inputs once, supplies
the **full seated roster** to `computeRankedUpdates`, and adds its bounded faction delta to each
account's existing `eloOverall` and `eloSeason`. It writes only `rating.overall.mu` and
`rating.overall.sigma`; the old seasonal hidden state and both stored display values remain
untouched until the archival cleanup. The old engine remains available for the next assignment
and historical tests, but end-game no longer calls `computeRatingUpdates`.

Each applied rating gets one shared game timestamp in `lastRankedGameAt` and its `pastElo` entry.
`maxElo` and `pastElo` use public overall values. XP remains a separate result-based award, with
normal/Rainbow ranked wins worth 2/5 and losses 1. Mode gates, casual/practice flat XP, promotion
thresholds, badges, W/L and S25 counter behavior, and the existing ranked-branch-only
`lastCompletedGame` write remain in place. Each returned seated account is saved once after these
mutations. Public deltas populate replay and viewer chat; unresolved accounts retain their team
placeholder but no longer produce fictitious `+0.0` account-delta lines.

**Live fresh-score fallback:** public fields currently have no schema defaults. End-game uses the
approved fresh S25 score of 1500 only when that public field has no finite number, then applies the
delta. Every finite overall or seasonal score, including zero and negatives, is preserved and
incremented. This does not reset an existing finite overall value or use hidden state for public
display. Controller review should distinguish this live fallback from the still-pending archival
cutover's explicit repair/counting policy for missing or corrupt historical public values. The
schema's existing `maxElo: 1600` default is unchanged in this assignment; fresh-account defaults
still need consolidation in the later cleanup, without resetting established maxima/history.

Assignment 6 accepts the live fallback, including preserving finite zero/negative totals. The
cutover below applies the same 1500 initialization only where no finite overall number exists and
reports that repair population explicitly before an operator applies it.

**Malformed containers:** the guard is at entry, before the ordinary completion path dereferences
`general` or iterates the roster. A missing/non-object `general` or non-array seated roster skips
all account updates, marks the game ended, clears its known timers, saves recoverable replay data
under the registry's UID, removes the corrupt table, and returns connected players to the lobby.
It deliberately avoids reconstructing teams for rating or leaving a malformed table to crash
the ordinary broadcast/collector. If a replay already exists, its known metadata and missing live
roster are preserved; repeated teardown does not insert a duplicate. With no stored replay, an
unrecoverable roster produces an empty player partition in the new partial replay, and missing
metadata cannot be recovered. Persist failures are logged and clients are still released. Normal
completion still follows the existing delayed teardown and two-phase replay-save sequence.

**Controller review note, accepted without rework:** this recovery adds substantial logic to a
particularly sensitive file for a state that well-formed games cannot reach. A reviewer may
reasonably prefer reducing it to log-and-release. The entry guard does **not** validate
`game.publicPlayersState`, which the normal completion path subsequently dereferences. This is
remaining container-hardening scope, not a claim that the current guard validates every game field.

### Controller observations and required backtest outputs

The following are **Controller-reported independent synthetic checks from assignment 5**, not
production measurements or a Worker-run empirical backtest:

- With `tau=0`, sigma moved from 8.333 initially to 2.935 after 100 games and 1.766 after 300.
  The Controller accepted the model choice. Keep `tau` as a recommended post-launch tunable;
  the later backtest must explicitly report sigma trajectories across activity/skill cohorts,
  including how shrinking uncertainty affects adaptation to changing skill.
- A fresh elite alternate account moved hidden mu from 25 to 38.8 by game 10 and 43.8 by game 20
  against true skill 45. Across 40 straight losses the worst settled opponent public loss was
  exactly -20. This supports the intended bounded public exposure while hidden skill learns.
- A 60% win-rate player reached public 2165 over 300 simulated games. With ordinary movement
  near +/-20, the ladder is approximately `1500 + 20 * (wins - losses)`: a 55% player over 500
  games can outrank a 70% player over 100. That is an accepted consequence of the approved
  accumulator design, not a defect to adjust in this pass. The backtest must **quantify activity
  versus skill**: compare score/rank across game-count and win-rate/true-skill cohorts, and report
  rank reversals attributable to volume. Do not treat calibration or bounded single-game losses
  alone as evidence that activity does not dominate the ladder.

### Manual playtest before deployment

On an isolated development database, finish standard and Rainbow ranked games with both faction
outcomes. Record pre/post public totals, XP, lifetime hidden pair, S25 counters and timestamps;
verify equal bounded signed public deltas on both tracks, correct XP/promotion, and one history
entry. Toggle seasonal/overall display and hide Elo for one viewer; verify chat and public user-list
values, then let teardown finish and reload the replay. Repeat for silent ranked, casual silent,
practice, private, custom and unlisted games to verify their existing ranked/XP eligibility. A
missing account must leave the remaining team's geometry intact. No live gameplay or production
database validation has been performed by this assignment.

### Assignment 5 validation

- `pnpm test --runInBand`: exit 0; **455/455 tests, 66/66 suites**, no snapshots, 19.303 seconds.
  The 18 new tests call the real `completeGame` entry point with actual Mongoose documents and
  intercept Account/Game collection writes. They assert the serialized lifetime hidden leaf
  updates, equal public deltas, XP, timestamps, counters, single account saves and viewer choices.
  Replay coverage checks both insert and teardown update payloads and hydrates the resulting
  stored document. Nonrated modes, absent accounts, absent public/hidden fields, zero/negative
  totals, unpartitionable rosters, invalid winners, malformed containers and DB failures are covered.
  The old `rate.js` tests remain green.
- `pnpm lint`: exit 0; Biome checked 304 files in 95 ms without fixes; oxlint passed.
- `pnpm build`: exit 0; Vite transformed 1967 modules and built in 965 ms. The same three
  unresolved image references and >500 kB bundle warning remain.
- `node --check routes/socket/game/end-game.js` and `git diff --check`: exit 0. The focused
  integration suite passes independently. Initial fixture assertions were corrected for the
  schema's unset Rainbow flags and Mongoose array wrappers; no production behavior was changed
  to satisfy those assertions.
- This pass changes only `end-game.js`, the new `end-game-ranked.test.js`, and this plan.
  All work remains unstaged, including prior passes; HEAD is still
  `e7d4e0fcb824cc8e220d95f864342414f9df30cd`. No migration, production query or deployment ran.

## 10. Assignment 6: rehearsable S24 capture and S25 initialization

[scripts/seasonCutover25.js](../scripts/seasonCutover25.js) uses the native Mongo driver, without
importing Account models or starting application code. `--dry-run` is the default; **`--apply`
is required for writes**. Unknown, repeated or conflicting flags are rejected before connecting.
The script reads `MONGO_URL`, with the existing local-development database fallback when absent.
Connection logs identify the source and database name, never the URI. Every write and cursor/client
close is awaited. Writes request majority acknowledgement and journaling. Setup, archive, source
verification and account failures report nonzero failure totals and make the CLI exit nonzero.

### Archive format and completeness boundary

Two separate Mongo collections hold the closing evidence:

- **`season24ClosingAccounts`:** one immutable record per closing account, keyed by its original
  `_id`, with `version`, `capturedAt`, `hash`, and `snapshot`. The raw snapshot preserves stable ID,
  username/hashUid, creation date, public season/overall numbers, all raw hidden rating data and
  version, S23 snapshots, S1-S24 counters (and any pre-existing S25 counters), lifetime/season XP
  and Rainbow state, completion/ranked activity, full game references, ban/timeout/staff/verified
  status, percentiles, daily baselines, maximum/history, badges and the existing award-related and
  visibility settings. Account secrets, IPs, authentication hashes/salts and private player notes
  are explicitly excluded by the projection. This remains operator data, not a public artifact.
- **`seasonCutoverState`, `_id: "season24-to-25"`:** schema/version, initial account count, phase
  (`capturing`, `captured`, `complete`), timestamps, and a SHA-256 digest of all ordered account IDs
  and snapshot hashes. The fixed `S25_CUTOVER_VERSION` in `src/shared/season.js` supplies version
  25 independently of future current-season bumps. Accounts receive `ratingVersion: 25` only
  in the same atomic update that applies their reset.

The archive contains **every closing account**, including banned, inactive, unrated, and accounts
below existing thresholds. It is not a top-N list or a rounded aggregate. Standings can be sorted
later from raw `snapshot.eloSeason`, ties can be examined using stable IDs/history, eligibility can
be recomputed from the retained account evidence, and old awards/badges can be distinguished from
new ones. The raw lifetime/seasonal ratings and original version remain available regardless of
what the next schema cleanup removes. A policy depending on facts outside these account fields
would still need the operator's full database backup; this archive does not invent future policy.

No account reset begins until all account snapshots have been durably captured, their hashes/count
verified, and every uninitialized current account compared with its archive. Only then does the
script persist `phase: captured`. A failed archive insert, missing record, changed source, corrupt
manifest or failed phase write prevents resets. Existing archive entries are compared and reused;
they are never overwritten on resume. Fingerprints distinguish BSON identity, dates, absent/null
and nonfinite numbers, and ignore ordinary object-key ordering.

Each reset uses an atomic compare-and-set filter over captured values and field existence, closing
the per-account read/write race. A mismatch leaves that account unchanged and reports failure.
Successful account writes are marked individually, so a partial reset resumes the remaining
accounts while preserving completed accounts' later S25 scores, counters and activity. A completed
manifest makes later runs a zero-write no-op after archive verification, including accounts created
after the cutover. During incomplete work, changed membership or an unarchived account fails closed.
Unknown/future versions and unmarked S25 activity also stop the reset; seasonal hidden presence is
never mistaken for an S25 game or completion marker.

**Operational limit:** this is an offline migration, not a database-wide transaction or a lock on
the game server. Stop every writer and run one cutover process at a time. The checks detect observed
changes and each reset is conditional; they cannot substitute for draining games and stopping
registration, moderation/account edits and the leaderboard cron. Full records stream through
cursors, while small reporting inputs remain in memory. Per-account archive verification entails
multiple indexed round trips, so measure runtime on the staging copy before choosing a maintenance
window. A single oversized/unwritable archive record stops capture rather than allowing its reset.

### Per-account reset and evidence

Every finite numeric public overall value is left unchanged, including zero/negative values.
Absent/nonfinite overall values initialize to 1500 after capture, and their count is reported.
Every valid lifetime hidden pair, including sigma zero and a pair without a version marker, is
left untouched. If that pair is unusable, the script calls the existing R1 `resolveHiddenRating`:
positive finite public overall soft-seeds with the existing inverse; otherwise hidden state is
fresh. It does not infer what the entire production population ran. Old seasonal hidden/display
data are retained in live accounts in this pass as well as the archive; cleanup is a separate pass.

The update resets public seasonal Elo to exactly 1500, seasonal XP to zero, seasonal Rainbow to
false, seasonal percentile to null, daily baselines to 1500/0, and the four S25 counters to zero.
R6 removes `lastRankedGameAt` for initial state, but does not backfill it or touch
`lastCompletedGame`. Historical counters, public overall/max/history, lifetime XP/Rainbow,
badges, existing awards and other settings are preserved. The marker and changes are one awaited
Mongo update per uninitialized account. A failure leaves the manifest incomplete for a safe retry.

### Rehearsal output; no award adoption

The report labels whether closing values come from the still-unmodified source or the immutable
archive. After a partial/completed reset it always reports archived S24 values, never a mixed
S24/S25 distribution. It prints account count, finite/invalid seasonal counts, min/max,
p10/p25/median/p75/p90/p99, and a histogram with 50-point lower-bound bins. It also prints the
observed version distribution, valid lifetime/seasonal hidden counts, R1 soft/fresh bootstrap
counts, missing/nonfinite overall repair count, S23 snapshot-pair count, and exact hidden-display
matches to public fields. These are observations, not proof of a historical deployment.

The only award scenario uses the **existing 1737/1767/1822 cutoffs**, with exclusive bronze/silver/
gold counts, lower/invalid counts and banned exclusions. Its label states the old script's medal
population rule: no truthy `isBanned`, no game-count filter. These are **reporting-only counts**;
`awardsWritten` is zero. No candidate cutoff or new threshold policy is introduced, and neither
medals nor badges are assigned. All closing records remain available for a different later
operator-approved eligibility or tie policy.

### Exact operator runbook (not executed by this assignment)

1. Prepare a fresh, access-controlled staging restore of the closing database. Verify that the
   backup restores successfully, and retain the untouched full backup alongside the later archive.
   Configure that staging database through the process's `MONGO_URL` using the operator's normal
   secret mechanism; do not paste a URI into the repository or run log. Check the connection-source
   and database-name log against the intended staging target.
2. On staging, stop game/account writers and the leaderboard cron. Drain in-flight games and
   prevent new games, registrations and administrative account changes. Record the deployed code
   revision and that the input is S24 closing state, without any unmarked S25 games.
3. Rehearse, inspect distribution/old-cutoff counts/population shape, and review any proposed
   overall repair counts. This command performs zero database writes, including no archive/index
   creation:

   ```powershell
   rtk node scripts/seasonCutover25.js --dry-run
   ```

4. Apply on staging and keep the process in the foreground. A zero exit, zero failures and
   `phase: complete` are required:

   ```powershell
   rtk node scripts/seasonCutover25.js --apply
   ```

5. Verify preserved overall/hidden/history/awards, the archive count/digest, exact seasonal reset
   and unset ranked timestamp against the untouched restore. Repeat both commands to confirm the
   completed no-op behavior and original S24 reporting. Rehearse interruption/resume on another
   disposable restore; keep the archive and manifest together and rerun the same `--apply` command.
   Do not erase or hand-edit a failed manifest/archive to force a pass. On source drift, missing
   evidence or unexpected S25 activity, keep traffic stopped and investigate using the backup.
6. Only after the remaining S25 schema/default/leaderboard work and staging gameplay checks are
   accepted, schedule the production maintenance window. Take and verify a fresh full backup,
   drain/stop every writer again, configure the intended database, and repeat the same rehearsal,
   review, apply and verification sequence. This document describes the operator steps; this
   Worker assignment does not authorize or perform production writes.
7. Export/backup both archive collections together using the deployment's standard BSON backup
   tooling and verify they can be restored. Keep the full pre-cutover backup. The archive is
   the later award source; do not derive S24 standings from the now-reset live seasonal scores.
8. **S24 awards slot in as a separate later operator action.** Review the archived distribution
   and existing-cutoff counts, explicitly supply/approve award cutoffs plus eligibility/tie rules,
   and run a separately reviewed award procedure against those immutable snapshots and stable IDs.
   This script has no award mode. S25 initialization does not depend on resolving those awards,
   and pending awards must not cause a second seasonal reset or deletion of the capture.
9. Before reopening S25 traffic, perform the separately planned leaderboard regeneration/cache
   invalidation and process/user-list refresh. Do not restart the old cron or serve an old S24
   snapshot as an S25 board. Then run the ranked/nonrated manual playtests in section 9 and verify
   eligibility after actual S25 games. This assignment changes neither board eligibility nor caches.

**Environment result for assignment 6:** `MONGO_URL` was absent. No connection, read-only rehearsal
query, production access or migration was attempted. CLI help/invalid-argument checks exit before
connecting. The automated database-boundary fixtures establish sequencing and updates, not live
Mongo durability or production population shape; an actual staging rehearsal remains required.

### Assignment 6 validation

- `pnpm test --runInBand`: exit 0; **488/488 tests, 67/67 suites**, no snapshots, 18.959 seconds.
  The 33 new tests exercise the complete capture/verify/reset flow with asynchronous collection
  fixtures, plus exact reset payloads and raw-value fingerprints. They cover a population larger
  than ten, retained later-award inputs, mixed legacy/OpenSkill evidence, zero-write dry-runs,
  interrupted capture and reset, preservation of completed S25 games, archive/manifest corruption,
  membership/source changes, atomic update conflicts, a failed capture-manifest write, unknown
  versions and unmarked S25 activity. The shared-season tests pin the historical S25 marker across
  a simulated future season bump.
- `pnpm lint`: exit 0; Biome checked 306 files in 80 ms without fixes; oxlint passed.
- `pnpm build`: exit 0; 1967 modules, 940 ms. Existing unresolved crown-6.png,
  crown-6-captain.png and season_badges.png references and the >500 kB bundle warning remain.
- `node --check scripts/seasonCutover25.js` and `git diff --check`: exit 0.
  CLI `--help` exits 0 and misspelled `--dryrun` exits 1 with a failure total, both before any
  connection. No real `--dry-run` or `--apply` connection was invoked.
- This pass changes only the new cutover script/test, shared season metadata and its existing
  test, and this document. S24 tooling, account schema, end-game, rating math, frontend, board
  eligibility and backtest are unchanged by this pass. Everything remains unstaged; HEAD remains
  `e7d4e0fcb824cc8e220d95f864342414f9df30cd`.


## 11. Assignment 7: hidden/public schema and module cleanup

The account schema now admits only `rating.overall.mu` and `rating.overall.sigma` as hidden
state. Both remain Numbers without defaults, preserving R1's ability to distinguish a missing
estimate. Public `eloOverall`/`eloSeason` are independent accumulators. `maxElo` defaults to
the shared `STARTING_PUBLIC_RATING` (1500), with explicit stored values, including zero/null,
preserved.

**Mongoose behavior correction:** strict schema construction and `document.set()` exclude the
retired season/display paths from new data, but Mongoose 5 hydration does **not** discard unknown
stored fields. They remain accessible through `get()` and `toObject()`. Defaults also apply
when hydrating an absent path, not only at account creation. Tests exercise both facts using the
real Account model and intercepted insert/update boundaries. This pass does not remove old Mongo
subfields or mass-update missing maxima. Live ranked saves change only the two hidden leaves and
do not rewrite historical season/display values.

### Consumer audit and changes

The audit searched runtime code, scripts, tests and frontend source for the old module names,
exports, dotted/optional-chained hidden fields and dynamic `rating[track]` access, then traced
literal CommonJS dependencies. References in earlier sections of this document and the original
S24 plan describe their historical source snapshot; they are not current operational entrypoints.

| Consumer | Action in this pass |
| --- | --- |
| `models/account.js` | Removed seasonal hidden/display schema paths; kept the lifetime pair and historical snapshots/version; shared 1500 maximum default. |
| `routes/socket/game/end-game.js` | XP import now comes from `rating/xp.js`; corrected related comments. No gameplay or persistence logic change in this pass. |
| `routes/socket/rating/ranked.js` | Imports hidden defaults/R1 seed from `hidden-rating.js`, XP from `xp.js`; corrected obsolete integration-stage comment. Numerical code unchanged. |
| `routes/socket/rating/predict.js` | Hidden defaults import renamed; predictor unchanged. |
| `routes/socket/rating/bias.js` | Hidden defaults import renamed. Priors unchanged. Raw-sum calibration helpers retained as historical support and explicitly labeled as unused by S25 updates. |
| `scripts/seasonCutover25.js` | Still obtains R1 indirectly through `ranked.js`. Repairs valid object containers through lifetime leaf writes; replaces only malformed root/overall containers with a fresh pair. Never copies retired fields into an account update. |
| `__test__/backend/season.test.js` | Removed the obsolete `SEASON_MIGRATED_VERSION` alias import; historical version/future-bump checks read `OPENSKILL_MIGRATION_VERSION` directly from shared metadata. |
| Rating predictor/ranked tests | Renamed defaults imports; ported the old all-headcount common-shift matrix into `ranked.test.js`. |
| End-game integration tests | Hydrate real raw legacy documents, so removed schema paths are still present in the compatibility fixtures. Assert retired data remain untouched and absent hidden state does not recreate a season/display. |
| Cutover tests | Apply dotted reset payloads and verify R1 output, historical preservation and absence of obsolete account-write paths. |
| `routes/socket/badges.js` | Comment now describes public accumulators and pending distribution review. No threshold change. |
| `scripts/retrieveLeaderboardData.js` | Replaced the stale proposed `DISPLAY_BASE` import with the pending public-ladder/eligibility TODO. Runtime behavior unchanged. |
| `scripts/eloReset.js` | Corrected comments claiming the public fields were deprecated mirrors/a reset would be a no-op. Historical reset behavior and data table unchanged. |

The removed `display.js` is replaced by `hidden-rating.js`, exporting only `DEFAULT_MU`,
`DEFAULT_SIGMA`, `freshRating`, and `seedMuFromLegacy`. The inverse still uses exactly
`25 + (legacyElo - 1600) / 24` for positive finite seeds. Historical base/scale constants
are private; `displayRating`, `seedMuFromDisplay`, `DISPLAY_BASE` and `DISPLAY_SCALE` have
no remaining consumers and are no longer exported. These constants cannot be mistaken for public
rating tuning.

`xp.js` has no dependency on the public ladder or hidden estimator. Its exact old award formula
still yields ordinary win 2, Rainbow win 5, and either loss 1. A test makes importing the
public-delta module throw while checking all four XP outcomes.

The superseded `rating/rate.js`, its `rate.test.js`, and `scripts/seasonCutover24.js` are
deleted. Before deletion, remaining XP/default imports and the sole external migration-alias
reader (`season.test.js`) were relocated. A final code search found no executable import of
the retired modules or exports. The frontend Changelog retains an existing commented S24
operator-template mention; it is not rendered or imported and frontend work is outside this pass.
The S25 report also retains the old script's name in a historical population-rule label.

**Deliberate historical-read exception:** `seasonCutover25.summarize` still reads raw
`rating.season` and `rating.*.display` solely to count observed S24 deployment evidence.
Archive capture/comparison also preserves the raw rating object. Removing these reads would
discard the accepted assignment-6 rehearsal evidence. No live rating consumer or account reset
uses those retired values to compute new skill/public scores. They are not admitted back into
the schema. Archive inserts intentionally retain historical fields, distinct from account writes.

The first staging rehearsal now answers target **§2.1 as a by-product**: observed versions,
usable lifetime/seasonal hidden state, display/public matches and population counts come from
the same cutover report. No bespoke production investigation is needed for those observations.
No production state has been established yet, and observed shapes alone do not prove exactly
which deployment produced them.

### Historical maintenance/analysis scripts retained

| Script | Audit result; reason retained |
| --- | --- |
| `scripts/rating/allGames.js` | Historical game iterator; no account hidden-field access. |
| `scripts/rating/clearRatings.js` | Historical public seasonal reset to 1600; no hidden writes. |
| `scripts/rating/printRatings.js` | Prints public overall/season values; no hidden reads. |
| `scripts/rating/cozRatings.js` | Incomplete old public-Elo experiment; calculates values but does not persist the account loop. Not an S25 engine. |
| `scripts/rating/hexRatings.js` | Historical public-Elo recalculation; writes only public rating fields. |
| `scripts/rating/nthRatings.js` | Historical influence-weighted experiment; writes only public rating fields. |
| `scripts/assignBaseElo.js` | Historical 1600 public-season/XP/Rainbow reset; no hidden writes. |
| `scripts/dump-curelo.js` | Historical public-Elo export with fixed filters; no hidden reads/writes. |
| `scripts/addEndofSeasonRewards.js` | Historical public-Elo band report with commented award writes; no hidden access. |
| `scripts/eloReset.js` | Historical public/XP/Rainbow/profile reset and award data, not an S25 migration; comments corrected only. |
| `scripts/retrieveLeaderboardData.js` | Active public-field cron; old eligibility/baselines deliberately await the next assignment. |

None imports the deleted engine or display module. Historical constants and data semantics are
not silently modernized into S25 tooling. These scripts remain unsuitable substitutes for the
reviewed S25 cutover, irrespective of whether they still load.

### Retired-test coverage

- The prior/variant precedence test and six raw-sum calibration cases moved to `bias.test.js`.
  The six equal-skill common-shift cases moved to `ranked.test.js`, testing both winners and
  lifetime hidden deltas/sigma plus public-delta invariance.
- Existing ranked tests cover unequal skill/common-shift invariance, winner-up/loser-down learning,
  uncertainty-dependent hidden movement and sigma contraction, missing/corrupt hidden fallback,
  finite outputs, missing-account placeholders, fixed zero uncertainty, and pre-game public awards.
  Public-ladder tests independently cover the underdog/favorite direction.
- Existing ranked/end-game tests plus new `xp.test.js` preserve Rainbow progression. The old
  Rainbow **hidden-mu multiplier** assertion is intentionally retired: S25 already tests identical
  hidden results for ordinary/Rainbow games.
- The old 1600 display rendering, sigma-dependent public movement and separate seasonal hidden
  learning/migration assertions describe removed behavior. They are replaced by public-accumulator
  independence and R1 lifetime bootstrap coverage, not transplanted into S25.
- New `hidden-rating.test.js` pins the unchanged legacy inverse with explicit numerical examples,
  invalid-seed fallback and independent fresh objects. New `account-rating-schema.test.js`
  checks schema paths, strict construction/set/save, absent maximum defaults, preserved stored
  maxima, and hydration/save behavior for retired raw fields.

### Assignment 7 validation and limits

- Focused rating/schema/cutover/end-game tests: **194/194, 10/10 suites**.
- Full `pnpm test --runInBand`: **491/491 tests, 70/70 suites**, exit 0, 20.137 seconds.
- `pnpm lint`: exit 0; Biome checked 308 files in 90 ms, oxlint passed.
- `pnpm build`: exit 0; 1967 modules in 979 ms. Existing crown-6.png,
  crown-6-captain.png, season_badges.png and >500 kB bundle warnings remain.
- Literal require-resolution audit and `node --check`: **62 local modules**, no failures,
  starting from all listed maintenance scripts, the S25 cutover, end-game and Account.
- Native require-time smoke: **12 scripts loaded**, no errors, with Mongoose connection/query
  boundaries stubbed to empty results and filesystem output blocked. This is startup/import
  compatibility evidence, not a data-bearing replay or proof that historical algorithms work.
  The initial diagnostic harness incorrectly made its cursor thenable; separating query/cursor
  stubs resolved those harness-only `cursor.next` errors. No product fix was needed.
- `git diff --check`: exit 0. No real database connection, migration, production access or
  gameplay session was run. On staging, verify a fresh maximum is 1500, existing maxima survive,
  ordinary/Rainbow XP remains 2/5 per win and 1 per loss, and ranked saves preserve old raw fields
  while changing only lifetime mu/sigma. The broader section-9 playtests still apply.
- Board eligibility, backtest, production rollout and distribution-dependent thresholds remain
  outside this increment. All work remains unstaged; HEAD remains
  `e7d4e0fcb824cc8e220d95f864342414f9df30cd`.


## 12. Assignment 8: ranked eligibility, daily movement and provisional display

`src/shared/season.js` now owns `PROVISIONAL_RANKED_GAMES = 10`,
`SEASON_LEADERBOARD_MIN_GAMES = 20`, and `SEASON_LEADERBOARD_ACTIVE_DAYS = 14`.
No duplicate season number or lifetime games-array gate determines eligibility.

The pure `rankedSeasonEligibility(account, nowMs)` in
`src/shared/ranked-eligibility.js` returns
`{ rankedGames, provisional, active, eligible }`:

- `rankedGames` sums the current shared-map wins/losses. Rainbow games already increment these
  totals; the separate Rainbow counters must not be added again. Missing/null counters mean zero.
  An invalid, negative, fractional, or overflowed counter pair fails closed to zero; strings are
  not coerced into qualification.
- `provisional` is true for 0–9 completed ranked games and false after the tenth.
- `active` requires a valid Date in `lastRankedGameAt` at or after
  `nowMs - 14 * 24 * 60 * 60 * 1000`. The boundary is inclusive. The cron captures one cutoff
  at its start; a newer result arriving during the scan remains active rather than being rejected
  for being later than that captured clock. The predicate does not use `lastCompletedGame`.
- `eligible` requires at least 20 games, active ranked status, and a non-truthy ban flag.
  No public score is read or changed by this function. The cron separately excludes nonfinite
  scores so it can safely publish numbers, but valid 1500, lower, zero and negative scores qualify.
- `rankedProgress(wins, losses)` is the shared count/provisional subset used by the predicate and
  frontend wire aliases. It has no clock or I/O dependency.

### Cron and progression boards

`refreshLeaderboards({ nowMs = Date.now(), log = console.log } = {})` is the testable refresh
export from `scripts/retrieveLeaderboardData.js`. The normal CLI still connects using
`MONGO_URL` (or its existing localhost fallback), refreshes, and closes in `finally`. Import
alone no longer starts a connection or exits a process. CLI failures log and set a nonzero exit.

The ranked seasonal board consumes the pure predicate. The old `> 1620` floor and
`games.2` gate are gone. Daily movement still queries general completion in the last 24 hours
per R7. Missing/nonfinite daily Elo baselines use shared 1500; XP uses zero. Finite zero/negative
baselines are preserved. Nonfinite values/differences cannot poison published boards. Baseline
saves are awaited for every recently active account, including banned/ineligible accounts,
preserving rollover behavior. A failed individual baseline save is logged and isolated as before;
that account may repeat its movement on retry.

**Progression-board conclusion:** Seasonal XP and “Most recent rainbow players” remain independent
of ranked-game qualification/inactivity. XP can come from casual/practice games; lifetime Rainbow
achievement is not evidence of ranked skill or current-season participation. Seasonal XP retains
its existing `xpSeason > 10` cutoff. Recent Rainbow retains `isRainbowOverall` and descending
`dateRainbowOverall` ordering, with epoch fallback for absent/invalid dates. Both exclude banned
accounts. Removing the shared lifetime-three-game gate also removes that incidental restriction
from these two boards: a qualifying XP/Rainbow player no longer needs three recorded lifetime games.
This is deliberate; neither progression board represents a fully ranked Seasonal Elo participant.

The second scan uses lean projected records containing only board inputs. Both scans stream
cursors; each of the five arrays retains only its top 20 rows throughout the scan. The final
single-document payload, sorting directions, HTTP route, cache and Render schedule are unchanged.
Ranked inactivity changes visibility only; public totals never decay.

### Provisional surface

Both aggregated and legacy online player-list layouts now append a compact `P` to a provisional
seasonal score, with an accessible “Provisional seasonal rating” label and a tooltip explaining
the fewer-than-10 rule. The marker uses existing total seasonal wins/losses wire aliases, even in
the Rainbow filter. No API field, stylesheet, ranking/grouping change or component redesign was
needed. It disappears at ten games, while main-board qualification still waits until twenty.
Overall scores, win/loss display and staff-hidden rating surfaces receive no marker.

That score renderer also uses shared 1500 for absent values and preserves finite zero/negative
scores. The profile's older 1600 fallbacks (`routes/index.js:299–316` and `Profile.jsx:79–80`)
and the player-list toggle-color fallback (`Playerlist.jsx:113`) remain outside this pass.
They remain an existing consumer-audit follow-up, not a claim that every public surface is updated.

### Cutover and verification notes

After successful capture/reset, the operator must run the **new** cron against S25 account state
before reopening traffic and replace the persisted `leaderboards/current` payload. An empty
Seasonal Elo board is correct until somebody has 20 S25 ranked games; it must overwrite the old
S24 board. With reset baselines 1500/0, recently active reset accounts report zero movement, not
a fabricated -100. Lifetime recent-Rainbow rows may remain, while seasonal XP starts empty.
Do not run the new cron on S24 state before cutover or restart the obsolete cron code afterward.
Refresh/invalidate the existing web snapshot cache as already required by the runbook.

Visible re-entry remains at the next successful cron run (R2); `render.yaml` still schedules it
at 09:00 UTC daily. This pass does not make account changes immediately refresh the served board.
A scan/publication failure is fatal to that invocation; account-level baseline-save failures retain
the prior isolated logging behavior. No actual cron, database connection or production write was
performed here.

Validation after the timing-edge correction:

- `pnpm test --runInBand`: exit 0, **538/538 tests in 73/73 suites**, 18.244 seconds.
  The three new suites add 47 tests: eligibility boundaries/invalid state/future season bump;
  actual refresh selection, activity-source separation, ranking and rollover; and both provisional
  UI layouts, the 9/10 boundary, Rainbow filter, visibility settings and finite-score handling.
- `pnpm lint`: exit 0; Biome checked 312 files in 86 ms, oxlint passed.
- `pnpm build`: exit 0; 1969 modules, 962 ms. Existing crown-6.png,
  crown-6-captain.png, season_badges.png and >500 kB bundle warnings remain.
- Native VM CLI smoke with database boundaries stubbed: import performs no connection/query/write;
  success performs two scans and one publication then closes; connection/publication failures
  close and yield exit code 1. No live credentials or server were used.
- `node --check` passed for the two shared modules, cron and two backend test files.
  Component tests and the build validate JSX; a live browser/gameplay session was not run.
  Staging should verify the `P` marker in both layouts, absence of stale S24 rows, and re-entry
  after a qualifying ranked game followed by cron refresh.
- End-game, cutover, thresholds, lobby gates, deployment configuration and backtest are unchanged
  by this increment. Final documentation consolidation and the commented Changelog S24 reference
  remain for the later documentation pass.


## 13. Assignment 9: read-only backtest and synthetic findings

**MONGO_URL was absent; no corpus connection/read or empirical measurement occurred.**
The new [backtest results](rating-backtest25-results.md) and
[full precision JSON](rating-backtest25-results.json) record the actual production-engine experiments,
seed/configuration, every target §4.11 metric, all three community failure modes, and owner-reviewed
tuning recommendations. Every results table is explicitly labeled SYNTHETIC. Run
`rtk node scripts/ratingBacktest25.js`; `--help` lists bounded sizing and corpus date-window options.

The default run uses seed 250925, 240 players, 12,000 population games, 32 trials per scenario,
and a 10,000-game stable career followed by 1,000 changed-skill games. Two native runs emitted
byte-identical JSON. The harness imports the actual ranked/predict/public-ladder/bias/hidden-rating
modules, applies their returned updates in memory, and exposes no database write mode. If MONGO_URL
is supplied later it performs a bounded chronological GameSummary read and clearly labels that
result as counterfactual S25 replay of recorded outcomes, with cold-start and identity limitations.

Principal findings, all synthetic:

- Lower true mu 30 versus 35 reversed public rank in 20/32 trials at 2× volume and 32/32 at 5×.
  At 5× the lower player's mean WR was 60.22% versus 69.34%, but mean score was 2740.75 versus
  1983.63. Activity can overwhelm skill under the approved accumulator; 2× is the first tested
  majority crossing, not a universal onset. The prescribed exact 60% / 300-game run ended at 2482.
- With unchanged tau = 0, the career sigma reached 2.586 at 100, 1.502 at 300, 0.836 at 1,000,
  and 0.262 at 10,000. After true mu changed 25 → 45, another 1,000 games only moved aligned
  mu to 26.650. No numerical collapse occurred, but skill-change tracking was poor.
- Fresh elite alts reached mean mu 37.90 at 20 games and 43.90 at 100; the earlier single-run
  43.8-at-20 reference did not generalize here. Worst opponent loss was −21, within −24.
  First public-2000 crossings required at least 35 games and 33 wins (separate minima).
- Settled elite players facing average peers got +16/−24; balanced elite and ordinary lobbies
  got +18…+22 / −22…−19. Neither produced +2/−20; high public score alone did not suppress awards.
- Every public update stayed within +16…+24 / −24…−16. The population's final scores ranged
  −2350…5490, and game-25 score correlated 0.559 with subsequent game-26–50 win rate.

The results recommend owner review of volume policy and lifetime uncertainty refresh, plus post-launch
placement and faction calibration monitoring. No public center/bound, tau, provisional/eligibility
value, threshold, production state, end-game, cutover or leaderboard implementation changed here.
The model-matched synthetic world is optimistic and does not establish production calibration.

Validation: `pnpm lint` passed (315 files), `pnpm build` passed (1969 modules; existing missing-image
and large-chunk warnings remain), and `node --check scripts/ratingBacktest25.js` passed.
`git diff --check` passed. Final full tests: **566/566 tests in 74/74 suites**, exit 0, 19.014 seconds. The new harness suite
adds 28 tests. No live database or gameplay verification was run; no application behavior changed
in this measurement pass.
