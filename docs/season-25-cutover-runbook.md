# Season 25 cutover — operator runbook

This is the current runbook. The [S24 runbook](season-24-cutover-runbook.md) is retained as history and is superseded. This work has executed **no production query, dry-run, apply, award assignment or deployment**. The steps below belong to the operator after code review and staging acceptance.

## Preconditions and evidence

- Use the reviewed S25 tree with Node 24.12+ and pnpm. Do not deploy the season-number bump into live S24 traffic before cutover. Both web processes and the cron must use the matching revision.
- Supply the intended database using the operator's secret mechanism in MONGO_URL; never put its URI in a tracked file or log. The cutover has a local-development fallback when the variable is absent, so verify the logged connection source/database before any rehearsal or apply. Absence was never treated as permission to use that fallback during this work.
- Verify a recent full BSON backup can be restored, including account/game/summary/leaderboard data. Record its capture time and known deployed revision. Keep the untouched backup and protect the later closing archive as operator data.
- Production-state question §2.1 is **unresolved**. The first staging dry-run of a provenance-verified production restore supplies version/pair/distribution/display-match evidence as a by-product. Inspect it and relevant recent S24 records before concluding legacy/OpenSkill/mixed. The report is evidence, not an automatic historical-deployment verdict; record unresolved if it remains insufficient.
- Reserve enough time based on the full staging population. The script streams full records but performs multiple indexed round trips per account. It is an offline migration, not a database-wide transaction or server lock.

## Staging rehearsal

1. Restore the backup to an isolated staging database. Disable game creation **and remakes**, drain all live games, then stop every writer: game servers, registration, administrative account changes, moderation jobs and the leaderboard cron. Run only one cutover process. Do not rely on the migration's comparison checks as a substitute for this drain.
2. Run read-only rehearsal in the foreground:

   ~~~powershell
   rtk node scripts/seasonCutover25.js --dry-run
   ~~~

   Dry-run is also the default. It creates no archive, index or marker and performs no database writes. Unknown/repeated/conflicting flags fail before connection.
3. Retain the report: account count, finite/invalid S24 seasonal distribution (min/max, quantiles, 50-point histogram), ratingVersion counts, valid lifetime/seasonal pairs, S23 snapshots, hidden-display/public exact matches, R1 soft/fresh bootstrap counts, and absent/nonfinite public-overall repairs. Record source provenance and resolve or retain §2.1 explicitly.
4. Inspect the **report-only** award scenario for existing 1737 / 1767 / 1822 thresholds, with exclusive bronze/silver/gold counts and banned/invalid exclusions. This adopts no policy and writes no awards. S25 launch does not wait for new S24 award thresholds.
5. After accepting the rehearsal evidence and repair counts, apply on staging:

   ~~~powershell
   rtk node scripts/seasonCutover25.js --apply
   ~~~

   Require exit 0, zero failures and phase complete. Setup/archive/source/reset errors produce failure totals and nonzero exit. Do not promote a partial result.
6. Verify all closing accounts are captured before reset; raw snapshots reproduce the original standings/distribution and retained later-award inputs. Verify the archive count/digest, finite overall values, lifetime skill, historical counters/max/history/awards, exact seasonal reset and absent initial lastRankedGameAt. Verify actual majority/journal acknowledgement on the staging Mongo deployment.
7. Repeat dry-run and apply. A completed manifest must produce no writes and report the original archived S24 distribution even after staging S25 games or new registrations. On a separate disposable restore, rehearse interruption/resume during capture and reset. Preserve archive/manifest together; never erase or hand-edit them to force success.
8. Perform manual checks M1–M7 in the [acceptance record](season-25-acceptance.md), including real sockets, saved replay/public and XP messages, missing-account handling, strict Mongo persistence and browser fallbacks. Do not treat the unit suites as a substitute.

## What apply does

The native-driver script uses projected raw documents, not Mongoose defaults. It requests majority acknowledgement and journaling and awaits writes/cursor/client closure.

- **season24ClosingAccounts:** immutable per-account records keyed by original _id, with version/capture time/hash and raw snapshot. Every closing account is included, not only top 10 or award-qualified accounts.
- **seasonCutoverState / season24-to-25:** version, initial count, capture/reset phase and ordered account-ID/snapshot digest. Phases are capturing, captured and complete. S25_CUTOVER_VERSION stays 25 independently of future season bumps.
- Snapshots retain stable ID/name/hashUid, public and raw hidden state/version, S23 snapshots, S1–S25 counters, XP/Rainbow, activity, game references, ban/staff/verification, max/history, percentiles, baselines, badges and relevant award/visibility settings. Authentication secrets, IPs and private notes are excluded. Future policies needing other facts still require the full backup.
- All snapshots, count/digest and uninitialized source accounts must verify before the captured manifest allows the first reset. Existing archive records are compared/reused, never overwritten.
- Each reset uses captured field values/existence in an atomic compare-and-set filter and stamps ratingVersion 25 in that same update. Drift, missing/corrupt capture, changed membership, future/unknown markers or unmarked S25 activity fails closed. A partial reset resumes only unfinished accounts.
- Reset eloSeason to **1500**, xpSeason to **0**, isRainbowSeason to **false**, seasonal percentile to **null**, previousDayElo/XP to **1500/0**, and the four S25 counters to **0**. Unset lastRankedGameAt, without backfilling from lastCompletedGame.
- Preserve every finite numeric eloOverall (including zero/negative), every valid lifetime mu/sigma pair (including sigma zero), historical counters, lifetime XP/Rainbow, max/history, awards/badges and other settings. Invalid/absent public overall initializes to 1500 after capture and is counted.
- If hidden lifetime state is unusable, R1 preserves the established inverse soft seed from positive finite overall; otherwise use fresh mu 25 / sigma 25/3. No global assumption about what S24 ran controls this choice.
- Retired raw rating.season/display data remains in Mongo and the archive. The S25 schema no longer admits new writes to those paths; the cutover does not destructively unset them.
- **No S24 awards are assigned.** Completed state is a verified zero-write no-op on later runs, not another seasonal reset.

## Production maintenance and ordering

After the staging evidence and code are reviewed, the operator repeats the rehearsal/apply sequence with the intended production database and a fresh verified full backup. This document does not itself execute or authorize the Worker to perform those writes.

1. Disable creation/remakes, drain games and stop **all** account/game writers and cron. Keep the old code stopped. Record the closing cutoff and backup revision.
2. Run dry-run, review counts/repairs and preserved S24 evidence, then explicit apply. Verify zero failures/complete and the raw archive before allowing any S25 game.
3. Export/backup **both** closing archive and manifest together; verify restoration, and keep the full pre-cutover backup. Do not publish account-identifying archive records in the repository.
4. Load the reviewed S25 code and refresh process/account/user-list state while traffic remains closed. Do not run the old S24 cron again.
5. Regenerate the leaderboard snapshot against reset S25 state:

   ~~~powershell
   rtk node scripts/retrieveLeaderboardData.js
   ~~~

   It must replace leaderboards/current, even with an empty Seasonal Elo board. Until someone has 20 S25 ranked games, that empty board is correct. Daily reset movement should be zero. Existing lifetime recent-Rainbow rows may remain; seasonal XP starts empty.
6. Invalidate/refresh the existing 60-second HTTP snapshot cache, restart processes as required, then reopen and verify real client behavior. The retained Render cron is daily at 09:00 UTC; re-entry occurs at the next successful refresh, not immediately upon a ranked win.
7. Monitor account-save errors, archive evidence, public delta bounds, eligibility counts and replay persistence. Run a recent-window **read-only** corpus backtest with the actual environment, keeping measured counterfactual replay separate from synthetic results.

## Failure and rollback

Keep traffic stopped on capture drift, missing evidence, unexpected S25 activity, failed writes or a nonzero exit. Investigate with the unchanged archive/full backup. Resume the same reviewed script after correcting the operational cause; do not remove markers to force replay.

For full rollback before admitting S25 traffic, restore the verified full pre-cutover database and matching previous code/cron together. Retain the closing capture outside the restore for investigation. After S25 games exist, restoring S24 would discard new play: stop and plan reconciliation explicitly rather than pretending that rollback is lossless. This script offers no reverse migration.

## S24 awards — separate later assignment

The owner supplies and approves numeric medal thresholds plus population/eligibility/tie rules. A separately reviewed award procedure uses immutable snapshots and stable account IDs, with its own preview, idempotency and approval. Existing-threshold counts are diagnostic only. Do not rerun the seasonal reset to award medals or erase the capture. Unresolved medals never block S25 initialization.

Related: [design/decisions](season-25-plan.md), [acceptance checks](season-25-acceptance.md), [backtest evidence](rating-backtest25-results.md), [historical implementation audit](season-25-implementation-history.md).
