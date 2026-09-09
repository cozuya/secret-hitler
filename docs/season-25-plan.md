# Season 25 ranked system — design, acceptance and deployment

This is the consolidated design **as implemented**, relative to base commit e7d4e0fcb824cc8e220d95f864342414f9df30cd. It describes a reviewable working tree, not a deployment or declaration of target completion. All changes remain unstaged; humans decide what to record and deploy.

**Production-state determination (§2.1) remains unresolved. MONGO_URL was absent in every Worker pass. No production query, migration, dry-run or write occurred.** All backtest results are synthetic. Passing tests do not establish what S24 ran or prove native Mongo/socket behavior.

Read alongside:

- [Acceptance traceability](season-25-acceptance.md): every target §5 criterion, exact test names and honest gaps.
- [Operator cutover runbook](season-25-cutover-runbook.md): staging, archive, production ordering, rollback and later S24 awards.
- [Backtest results](rating-backtest25-results.md) and [full precision JSON](rating-backtest25-results.json).
- [Implementation history and full consumer audit](season-25-implementation-history.md): the previous accumulated document preserved verbatim, including superseded intermediate observations.
- [Historical S24 plan](ranked-overhaul-and-season-24-cutover-plan.md) and [S24 runbook](season-24-cutover-runbook.md): preserved with explicit supersession notices, not current deployment instructions.

## 1. Findings the owner needs before acceptance

**Activity can outweigh skill.** In 32 synthetic rotating-population trials, a lower true-mu-30 player outranked a true-mu-35 player in **20/32 at 2× game volume and 32/32 at 5×**. At 5×, mean win rates were 60.22% versus 69.34%, yet public scores were 2740.75 versus 1983.63: about 9.12 percentage points less winning and 757.12 more score. The first tested majority crossing was 2×, not a universal threshold; equal-volume reversals occurred in 6/32 trials from variance.

**Tau zero becomes practically overconfident.** After 10,000 stable-skill games sigma reached 0.262. Following a true mu 25 → 45 shift, another 1,000 games only moved peer-aligned mu to **26.65**, despite 828 wins. Sigma stayed finite/nonzero: no numerical collapse, but poor adaptation. A claim that the unchanged lifetime estimator tracks substantial skill changes promptly is not supported.

**Bounds cap loss, not break-even win rate.** At maximum favoritism, public movement is +16/−24; break-even is 24/(16+24) = **60%**, not 50%. It avoids +2/−20 but still makes a favored player need more wins to climb. At neutral expectation, movement is ±20 and break-even is 50%. These are arithmetic consequences of the approved rule, not corpus estimates.

The fresh elite alt reached mean hidden mu **37.90 at 20 games**, **43.90 at 100**. Its worst opposing-player loss was −21, within the −24 bound. First public-2000 crossings took 35–63 games (median 48) and at least 33 wins (median 41; separate minima). The prescribed exact 180W/120L run ended at **2482**, versus a fixed-20 reference of 2700. These recorded multi-trial/setup-specific findings supersede earlier single-trajectory observations.

No parameter was changed in response to these findings. Acceptance and post-launch policy belong to the Controller/owner.

## 2. Architecture and public policy

The lifetime hidden estimator and public ladder have separate responsibilities:

- **Hidden:** rating.overall.mu/sigma estimates skill and uncertainty, and supplies pregame team expectation.
- **Public:** eloOverall/eloSeason are authoritative independent accumulated scores; hidden values are never converted into the displayed Elo number after bootstrap.
- **XP:** flat result-based progression independent of public movement and hidden updates.
- **Persistence:** the pure engine has no database I/O. End-game owns account fields, counters, history, messages and the normal one-save-per-resolved-account path.

The policy lives only in routes/socket/rating/public-ladder.js:

~~~text
STARTING_PUBLIC_RATING = 1500
PUBLIC_DELTA_CENTER = 20
MAX_MATCHUP_ADJUSTMENT = 4
MATCHUP_MODIFIER_SCALE = 16

modifier = clamp(Math.round((0.5 - expectedWinProbability) * 16), -4, 4)
delta = won ? 20 + modifier : -(20 - modifier)
~~~

JavaScript Math.round supplies the tie behavior. Nonfinite/non-number expectation falls back to 0.5; finite out-of-range input remains clamped. Wins are +16…+24 and losses −24…−16, including Rainbow. The two public tracks receive the same signed amount per game; only their prior totals differ.

Every faction member receives that faction's same award. No guns, investigations, policies, role card within a faction, chat or other individual contribution affects public points. The engine uses the full seated roster and **pre-game** hidden state; post-game mu cannot feed that game's modifier. Missing/nonfinite public totals start at 1500; finite zero/negative totals are valid. Public scores have no floor or decay.

New accounts may have absent public schema fields until first rating; their public presentation and first-game baseline are 1500. maxElo's absent schema default is 1500; existing finite maxima and pastElo history are retained.

## 3. Exact hidden model, normalization and priors

The installed OpenSkill defaults are mu 25 and sigma 25/3. R1 resolution is:

1. Preserve a lifetime pair with finite mu/sigma and sigma ≥ 0, regardless of ratingVersion.
2. Otherwise, positive finite public overall soft-seeds mu = 25 + (eloOverall−1600)/24 at default sigma.
3. Otherwise, use a fresh pair. Never use seasonal hidden state as a seed or migration marker.

The inverse's 1600/24 constants are fixed historical bootstrap semantics, not public tuning knobs and not evidence that production ran an OpenSkill display.

Each faction member has weight a_i = 1/n_faction. The shared predictor and updater use:

~~~text
M_F = sum_F(a_i * mu_i)           V_F = sum_F(a_i^2 * sigma_i^2)
M_L = sum_L(a_i * mu_i)           V_L = sum_L(a_i^2 * sigma_i^2)
beta = DEFAULT_SIGMA / 2         C^2 = 2*beta^2 + V_F + V_L
q = fascistWinPrior(game)
z = (M_F - M_L)/C + Phi^-1(q)
P(F wins) = Phi(z)               P(L wins) = 1 - Phi(z)
~~~

Each faction's total skill weight is one. Unequal headcount therefore creates no advantage at equal per-player means. Individual uncertainty contributes to the variance of the mean, not raw team-sum variance. Greater uncertainty attenuates skill differences toward the **configuration prior**, not necessarily 50%.

The equivalent performance offset C × Phi^-1(q) adjusts with uncertainty, preserving q in fresh and settled equal-skill lobbies and under common mu shifts. The old raw-sum bias offset is retained for historical calibration helpers but is not used in S25 prediction/update. Numerically scaled sums and hypot avoid overflow for extreme finite stored values.

Configured fascist priors are unchanged:

| Configuration | Prior |
| --- | --- |
| Base 5 / 6 / 7 / 8 / 9 / 10 players | .518 / .455 / .525 / .478 / .604 / .543 |
| rebalance6p or rebalance7p | .5 |
| rebalance9p2f | .55, before general 9p neutralization |
| rebalance9p or rerebalance9p | .5 |

These are implementation constants, not newly measured real-world balance estimates. The 9p 2f flag changes the deck, not faction sizes; faction count includes Hitler.

The engine explicitly uses OpenSkill's **Thurstone–Mosteller Full** Gaussian likelihood, consistent with the predictor. It transforms the call to a unit-variance comparison:

~~~text
mu_input_i = z/n_F for F, 0 for L
sigma_input_i = a_i * sigma_i / C
beta_input = beta / C
rank = [1,2] for an F win, otherwise [2,1]
epsilon = 0; tau = 0; gamma = () => 1
~~~

It then restores each individual's original mean plus the returned delta scaled by n_faction × C; sigma uses the output/input sigma ratio and cannot inflate. The corresponding Gaussian marginal moments are:

~~~text
t = outcomeSign * z
v = phi(t)/Phi(t)
h = v*(v+t)
delta_mu_i = winnerLoserSign * a_i * sigma_i^2/C * v
sigma_new_i^2 = sigma_i^2 * (1 - (a_i*sigma_i/C)^2*h)
~~~

OpenSkill's numerical variance floor remains. Zero uncertainty is fixed; unrepresentable per-player arithmetic retains that pre-game pair. Missing accounts remain fresh placeholders in the full faction geometry but receive no persistence output. Invalid/duplicated/empty roster partitions return no ranked work rather than guessing faction membership.

Rainbow applies **one normal hidden update**. It never multiplies hidden evidence or public points. XP remains normal win 2, Rainbow win 5, any loss 1; the existing casual/practice XP-only path keeps normal 2/1 pacing and existing Rainbow-promotion behavior.

The strict schema admits only rating.overall.mu/sigma. Old raw Mongo rating.season/display fields can still hydrate and are preserved, but live updates set only the two lifetime leaves. Deleting schema paths is not a database-wide unset.

## 4. End-game integration and season state

The ranked path resolves the seated roster and pre-game account pairs, builds normalized expectation, fixes one public delta per faction, updates lifetime hidden state, adds the same delta to both public totals, applies XP independently, updates S25 counters/activity/history, saves each resolved account once and emits public Elo/XP messages. Replay chat is checked again after teardown persistence.

Missing accounts do not shrink team shape. Invalid outcome/partition or malformed containers cannot manufacture rating. Malformed-container handling preserves recoverable replay metadata, releases the table and clients, and skips account updates. Lookup/save failures are logged through existing localized error paths; there is no blanket exception swallow or transaction across the whole game.

Ranked eligibility still excludes private, casual, custom, practice and unlisted games; an otherwise ranked silent game stays ranked. Existing XP-only and no-progression mode gates remain. lastRankedGameAt is stamped only when ranked updates actually apply, while lastCompletedGame remains the general completion source.

src/shared/season.js centralizes current season **25**, its four counter field names and the 10/20/14 constants. Historical OpenSkill migration identity remains **24**, and immutable S25 cutover identity remains **25**, independent of future current-season bumps. The strict Account schema retains Number counter paths for seasons 1 through current. Existing suffixed internal counters still map to unsuffixed frontend wire aliases; this mapping was already present in the base and is not a new wire contract.

## 5. Cutover and S24 preservation

The [operator runbook](season-25-cutover-runbook.md) is the authoritative current procedure. The native-driver script defaults to dry-run; explicit --apply is the only write mode. It validates options before connecting, awaits operations, reports failures with nonzero exit and requests majority/journal acknowledgement.

Before any reset it captures **every** closing account in season24ClosingAccounts and verifies an ordered count/digest in seasonCutoverState / season24-to-25. Snapshots preserve raw public/hidden/version/history/counter/activity/award inputs and stable identity; no top-N truncation. Capture failure, source drift or missing/corrupt archive prevents resets. Atomic per-account compare-and-set and completion markers make interrupted resets resumable without erasing later S25 activity. This requires an offline fully drained database; it is not a writer lock.

Apply resets seasonal public to 1500, season XP/Rainbow/percentile, daily baselines to 1500/0 and S25 counters to zero; lastRankedGameAt is initially unset. Finite public overall, valid lifetime hidden state, historical counters, lifetime progression, max/history and awards remain. Absent/nonfinite overall initializes to 1500 after capture and is reported. R1 handles only unusable hidden pairs.

Dry-run reports S24 distribution and the existing 1737/1767/1822 award-count scenario with zero awards written. **No new threshold or award assignment exists here.** S25 initialization does not depend on resolving medals. The immutable archive and full backup preserve evidence for a separate owner-approved award procedure.

§2.1 remains unresolved because no live URI was supplied. The first staging rehearsal on a verified production restore supplies relevant evidence; it does not automatically establish historical deployment and may need recent S24 records/additional investigation. No implementation choice assumes a population-wide legacy/OpenSkill answer.

## 6. Leaderboards, provisional display and inactivity

The first 10 current-season ranked games are provisional (0–9). A compact accessible P appears beside seasonal Elo in both player-list layouts, disappearing after game 10. Overall scores and win/loss surfaces do not receive it.

Main Seasonal Elo requires at least 20 current-season wins+losses, ranked activity within an inclusive 14-day window and no truthy ban. Malformed counters/activity fail closed. The old >1620 floor and lifetime games.2 gate are removed; finite 1500, zero and negative scores can qualify. No stored rating decays. A returning ranked player reappears at the next successful cron refresh, not immediately. Casual/practice activity alone cannot restore this board.

Daily Elo/XP deliberately uses lastCompletedGame, retaining nonranked XP behavior. Missing/nonfinite Elo baseline uses 1500; finite zero/negative baselines survive. XP baseline is zero. The cron streams account scans, keeps each board's top 20, awaits baseline saves, then publishes leaderboards/current. Individual baseline-save failures remain logged/isolated; publication failure fails the invocation.

Seasonal XP retains xpSeason > 10, recent Rainbow retains lifetime achievement/date ordering, and both exclude banned users. Removing the shared three-lifetime-game gate also removes that incidental restriction from these two progression boards. Neither is governed by ranked 20-game/14-day qualification.

The daily Render schedule (09:00 UTC) and 60-second HTTP cache remain. At cutover the new cron must replace the S24 snapshot, including an empty S25 Seasonal Elo board, before reopening traffic.

## 7. Decisions and remaining owner choices

| Decision | As built |
| --- | --- |
| D1 | One lifetime hidden estimator, valid state never reset. |
| D2 | Public Elo authoritative; hidden display/season writes and obsolete live engine removed after consumer audit. |
| D3 | Badge/lobby thresholds and public-rating gate semantics unchanged; implications documented below. |
| D4 | Read-only backtest; real corpus only when MONGO_URL supplied, otherwise explicitly synthetic. |
| D5 | Capture all S24 closing award evidence now; choose thresholds and assign awards separately later. |
| R1 | Valid lifetime pair → fixed legacy inverse soft seed → fresh pair, in that order. |
| R2 | Ranked board visibility returns at the next successful cron; snapshot architecture retained. |
| R3 | Remove old Seasonal Elo >1620 floor; no substitute score threshold. |
| R4 | Keep create/join AND/OR asymmetry and slider thresholds; inverted slider range remains follow-up. |
| R5 | Supersede and retire seasonCutover24.js; retain historical data and documents. |
| R6 | Leave initial lastRankedGameAt unset; no general-activity backfill. |
| R7 | Ranked board uses lastRankedGameAt; daily movement keeps lastCompletedGame. |

Open owner/operational decisions are substantial skill-drift handling, activity-versus-skill policy, post-launch calibration, actual §2.1 determination, S24 medal thresholds/eligibility/ties, and staging/deployment acceptance. No new threshold is inferred from a synthetic distribution. Publication of closing standings or a new player-facing launch announcement also needs verified results; no placeholder winner list was added.

## 8. Consumer audit and remaining 1600 literals

The [historical audit](season-25-implementation-history.md#2-inventory-method-and-count) preserves all 36 original direct public-rating references plus indirect consumers. All now use public values or remain explicitly historical. The final sweep changed profile/API/max/history fallback, Profile Elo cells, UserPopup Elo, Playerlist toggle color, and start-game summary averages to shared STARTING_PUBLIC_RATING, preserving finite zero/negative values. A missing summary account retains its seat at the public baseline; the pre-existing asynchronous lookup timing remains.

No hidden display/live-old-engine imports remain. The removed Changelog comment referred to an obsolete S23-winners TODO and deleted S24 migration; historical visible changelog entries remain historical.

Every remaining source 1600 category is intentional:

| Consumer | Why retained |
| --- | --- |
| hidden-rating.js LEGACY_SEED_BASE | R1's fixed historical inverse; changing it would alter established bootstrap semantics. |
| Creategame.jsx presets, visibility, min/max validation and associated fallback calculations | Part of the 1600–2100 public lobby restriction control, not a displayed account default. D3/R4 preserve this coupled behavior. |
| Changelog.jsx historical slider announcement | Record of an earlier threshold change, not a current rating default. |
| src/scss/players.scss, profile.scss, style-dark.scss color stops | Presentation scale anchors (including 1500/1600/1849/1850…2100), unchanged tuning. |
| scripts/assignBaseElo.js, eloReset.js, rating/clearRatings.js | Historical destructive 1600 reset tools; never use for S25. |
| scripts/rating/cozRatings.js, hexRatings.js, nthRatings.js | Historical alternative-rating/replay algorithms and bootstrap values; not the live S25 engine. |
| scripts/dump-curelo.js | Legacy non-default-score analysis filter, not an S25 corpus query. |
| scripts/addEndofSeasonRewards.js commented reset | Inert historical S17 reward/reset example, not current cutover code. |
| Test fixtures and historical/synthetic numeric data | Arbitrary stored scores/history or recorded experiment values; not public default declarations. |

D3 threshold consumers remain: ELO_BADGES in routes/socket/badges.js uses overall public values at 1800–2300; create-game.js rejects when either public score falls below the requested minimum, while join-game.js and Players.jsx admit when either score meets it. Creategame.jsx presets/slider/validation retain 1600–2100. Tracks.jsx displays the stored lobby minimum. Profile/player/chat badge, color and medal displays keep their existing scales and historical award meanings.

After the seasonal reset, an established overall score can preserve join access while creation still fails its other-track comparison. The creator slider can have maximum below minimum when seasonal is 1500; R4 deliberately defers that repair. Badges may become easier to accumulate through volume and colors saturate at their existing upper stops; neither authorizes threshold changes.

## 9. Deliberate behavior changes visible to players

Relative to the base branch, not a claim about unknown production deployment:

- Ranked Elo becomes bounded faction-uniform accumulated points, replacing hidden-display jumps; overall and seasonal per-game changes match. Rainbow no longer multiplies hidden/public rating evidence.
- S25 seasonal public scores reset to 1500 with new seasonal counters/XP/Rainbow state; finite overall scores and lifetime hidden knowledge remain.
- Public score can keep climbing through accumulated results or fall below zero; high score alone does not shrink an award. Favoritism can still mean +16/−24 and 60% break-even.
- Seasonal board requires 20 games and ranked activity within 14 days, removes the old score/lifetime-array floors, and restores visibility on the next cron without decay.
- Seasonal scores display P until 10 ranked games; XP/recent-Rainbow boards lose the incidental three-lifetime-game floor.
- Absent maxElo defaults to 1500. Missing public display/summary values now use 1500 rather than 1600; finite zero/negative scores display correctly.
- New games, current-season settings/user-list/moderation access use S25 counters while historical counters remain. Malformed completion containers release the table without fabricated account updates; unresolved accounts retain team shape.
- S24 medals are deferred pending a separate owner decision; existing award/badge state is preserved, not re-awarded automatically.

XP award amounts, existing Rainbow progression threshold, game mode rating gates, lobby/badge/color thresholds and historical records are unchanged from the base. Existing normal role/policy mechanics are intended to remain unchanged; actual gameplay verification is still pending.

## 10. Material changes and test inventory

| Area | Files |
| --- | --- |
| Pure rating engine | routes/socket/rating/public-ladder.js, hidden-rating.js, predict.js, ranked.js, xp.js; bias.js imports/calibration support; removed rate.js and display.js. |
| Account/season | models/account.js; src/shared/season.js and ranked-eligibility.js; frontend constants.js and node-constants.js. |
| Runtime/public consumers | routes/socket/game/end-game.js and start-game.js; routes/index.js; routes/socket/models.js, user-requests.js, badges.js, user-events/settings.js and moderation.js; Playerlist.jsx, Profile.jsx, UserPopup.jsx and Changelog.jsx. |
| Cutover/boards/maintenance | scripts/seasonCutover25.js, retrieveLeaderboardData.js; historical eloReset.js and retroactivelyAddGames.js use shared historical counter names; removed seasonCutover24.js. |
| Measurement | scripts/ratingBacktest25.js; results Markdown/JSON. |
| Tooling | package.json adds the Jest 24 openskill/models subpath mapper; dependencies unchanged. |
| Documentation | This plan, S25 runbook, acceptance record, preserved implementation history, and supersession notices in the two S24 documents. |

New/changed tests: public-ladder, hidden-rating, predict, ranked, bias and xp under __test__/backend/routes/socket/rating/; removed obsolete rate.test.js. Added account-rating-schema, season, season-cutover25, ranked-eligibility, leaderboard-refresh and rating-backtest25 backend suites; end-game-ranked/settings/moderation-season socket suites; frontend playerlist-provisional suite. The final pass strengthens the end-game fixture's exact XP chat/visibility/persisted replay assertions without adding a new test count. The acceptance document names the precise test for each claim.

## 11. Validation, backtest and limits

Final checks: pnpm test --runInBand passed **566/566 tests in 74/74 suites** (18.612 seconds); pnpm lint passed (Biome 315 files plus oxlint); pnpm build passed (1969 modules, 965 ms). Existing missing crown-6.png, crown-6-captain.png, season_badges.png and >500 kB bundle warnings remain. node --check passed for routes/index.js, start-game.js, public-ladder.js and the strengthened end-game test. git diff --check passed. The focused end-game fixture passed 18/18 tests, including exact ordinary/Rainbow XP messages and persisted replay. The original baseline was 319 tests/59 suites; the preceding implementation checkpoint was 566 tests/74 suites. Existing component smoke tests do not prove rendering correctness.

Backtest default: seed 250925, population 240, 12,000 games, 32 scenario trials, 10,000 stable career games plus 1,000 changed-skill games. It drives the production modules, not locally copied formulas. The model-matched synthetic world is optimistic. Final public range was −2350…5490; game-25 public rating correlated 0.559 with games-26–50 win rate. All §4.11 distributions/trajectories/faction/configuration/convergence outputs are [recorded separately](rating-backtest25-results.md).

The final comment-only policy cleanup changed an engine fingerprint, so the JSON was regenerated and compared excluding engine hashes: **every measurement was unchanged**. Corpus mode remains unavailable, not empty or empirically validated.

Known limitations: no production-state answer, live Mongo/corpus, staging restore/apply, actual socket/browser gameplay or cron/cache deployment check. The single-game save path is not a multi-account transaction. Cutover requires all writers stopped. Game-summary public averages still use the pre-existing asynchronous query. The Jest OpenSkill subpath mapping depends on the installed v5 package layout and needs review on upgrades. No blanket exception handling, unrelated authz change, infrastructure deployment or new feature was introduced.

## 12. Proposed human commit sequence

No files have been staged and no commit/branch/HEAD action occurred. These are proposed review units in dependency order; verify each selected tree before the human commits it.

1. **Add normalized lifetime skill and bounded public rating primitives.** Add hidden-rating/public-ladder/predict/ranked/xp modules, bias import adaptation, their new unit suites and the package.json Jest mapper. Keep old rate/display modules and their old tests in this first unit so existing callers remain coherent.
2. **Integrate Season 25 progression, safe cutover and ranked eligibility.** Land the shared season/eligibility metadata, Account schema, all runtime/consumer changes, S25 cutover and cron, historical-script counter references, and associated schema/cutover/handler/UI/board tests. Retire old rate/display, old rate tests and seasonCutover24 together. The season bump, writers, schema and offline cutover deliberately stay in one unit: splitting them creates incompatible field/version behavior. This tree must not serve S24 traffic before the operator cutover.
3. **Record S25 backtest evidence and deployment acceptance.** Add the read-only harness and tests, results artifacts and all consolidated/historical documentation. It depends on the actual final engine from the earlier units.

Each proposed unit has a coherent code purpose; intermediate trees have not been materialized/staged/tested separately in this session. The final full tree is the validated artifact. Do not use pnpm ca to verify without review: that existing convenience script stages files.

## 13. Recommended post-launch tuning and operator-only steps

Keep current ±20/±4, tau=0, 10/20/14, priors, ELO_BADGES and eloMinimum unchanged in this work. After actual S25 games:

- Measure score by games played and subsequent win rate before selecting rating-based thresholds. Changing the public center or season length changes spread, not the basic volume bias; caps/decay/alternate ordering are owner policy.
- Prioritize a separate uncertainty-refresh experiment (process noise, sigma floor or time-based uncertainty), preserving predictor/update consistency. The 10,000-game shift test supports investigation, not a chosen numeric replacement.
- Monitor placement error/calibration at 10/20/50/100; leaving provisional status does not prove hidden convergence.
- Validate faction priors by player count/rebalance against a recent corpus. Synthetic data generated with those priors cannot independently endorse them.
- Preserve the bounded public contract unless owner-reviewed evidence supports a policy change; its safety bound passed elite and ordinary scenarios.

Operator-only: provenance-verified staging restore and dry-run evidence, full backup/restore check, creation/remake disable and drain of all writers, explicit staging then production apply after review, archive/manifest backup, matching S25 code/cron ordering, empty-board regeneration and cache invalidation, real-client checks, and a separate later S24 award assignment with explicit owner thresholds. No production mutation or award approval is inferred from completion of this coding work.
