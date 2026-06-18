# Regression / Bug Triage — branch `jun-17` (round 1)

**Date:** 2026-06-17
**Source:** Two agent code reviews run against branch `jun-17` (committed history + working tree vs `master`).
**Why this file exists:** During the build/dev tooling upgrade (yarn→pnpm, ESLint/Prettier→Biome+oxlint,
husky 9, CI, repo-wide reformat) the reviews surfaced a batch of **pre-existing** correctness bugs that are
**out of scope for the tooling commit**. They're captured here so they aren't lost and can be fixed in
dedicated follow-up commits.

## Scope / provenance (read this first)

- The findings below (except the two CI/hook items at the bottom) are **pre-existing** — they came in with
  earlier `jun-17` work (the zod input-hardening pass and several React component extractions), **not** the
  tooling migration.
- The reviews explicitly cleared the tooling work:
  - *"The repo-wide Biome reformat (~50k working-tree lines) is behavior-preserving — no regex/string/numeric/
    ASI/fallthrough changes; data files reformatted with zero token loss."*
  - *"The tooling migration (pnpm/biome/oxlint/husky/CI) is internally consistent."*
- **Do not bundle these into the tooling commit.** Fix as separate, focused, behavior-restoring commits with
  the relevant manual playtest (no automated gameplay coverage exists).

## ⚠️ Deploy-blockers — fix before this branch ships

These break core flows the moment the branch deploys. Both are schema-vs-client contract mismatches in the
zod hardening; the **clients match what's live, so fix the schemas** (confirm contract first).

| File:Line | Severity | Bug |
|---|---|---|
| `routes/socket/user-events/create-game.schema.js:72` | **critical** | `xpSliderValue` typed `z.string().optional()`, but the client sends `null` by default (and a `number` from the slider). `safeParse` rejects the normal create-game payload → `handleAddNewGame` returns at `create-game.js:18` → **game creation broken site-wide**. Only the typed-text XP box (a string) passes. Fix: `z.union([z.string(), z.number()]).nullable().optional()` (handler already `parseInt`s it). |
| `routes/socket/user-events/settings.schema.js:8` | **high** | `themeSchema` requires `field` (`z.string()`), but the client never sends `field` and the handler never reads it. Every theme update fails validation → `handleUpdatedTheme` returns at `settings.js:19` → **theme customization fully broken**. Fix: remove `field` (or make it optional); handler only iterates `THEME_COLOR_FIELDS`. |

## High severity

| File:Line | Bug | Failure scenario |
|---|---|---|
| `routes/socket/game/assassination.js:93` | `selectPlayerToAssassinate` dereferences `target.role` with no validation of `data.playerIndex` and no zod schema. | Any socket can emit `selectedPlayerToAssassinate {playerIndex: 99}` (`routes.js:800`, `game/` handlers not yet zod'd). `target = seatedPlayers[99]` is undefined → `target.role.cardName` throws `TypeError`. Listeners aren't try/catch-wrapped and there's no `uncaughtException` handler → **whole Node process crashes, every live game ends.** |
| `routes/socket/models.js:74` | Typo `module.exportsstaffList` (missing dot) — exported `staffList` is never populated. | `master` had `const staffList = [];`. Branch writes `const staffList = (module.exportsstaffList = [])`; `getStaffList()` sets `module.exports.staffList = []` (a different array) and populates only the closure var. `user-requests.js` destructures the always-empty `module.exports.staffList` (lines 21/35) → **staff never identified**, staff-only userlist enrichment never fires. |
| `routes/socket/user-events/create-game.js:43` | Handler reads `data.excludedPlayerCounts` (plural); client sends `excludedPlayerCount` (singular). | `master` read singular (`user-events.js:624`). `Array.isArray(data.excludedPlayerCounts)` is false → else branch pushes every count in `[min,max]`, `excludes` ends up `[]`. A host who unchecks '6' in a 5–8 custom game **still gets 6-player games**. Regression from master. |
| `scripts/eloReset.js:288` | `eachAsync` callback doesn't return its `Profile.findOne(...).then(...)` chain → cursor drains without awaiting; `mongoose.connection.close()` runs while saves are pending. | Season ELO reset: top-level `.then()` closes the connection mid-flight, aborting most pending saves → **ELO/XP/rainbow reset persists for only a nondeterministic subset of accounts** (silently corrupted season-reset migration). Same un-awaited-save class in `scripts/convertBlacklistFormat.js` (lower impact). |

## Medium severity

| File:Line | Bug | Notes |
|---|---|---|
| `routes/socket/commands.js:617` | `forceskip`'s `while (chancellor === -1)` loop has no fallback → infinite loop if no eligible chancellor exists. | A mod runs `/forceskip` in a low-pop late game where every living non-president candidate is term-limited → loop never terminates → **blocks the single-threaded event loop for all games.** |
| `models/profile/utils.js:262` | `account.save()` on a possibly-null `account` inside a fire-and-forget promise with no `.catch`. | `Account.findOne({username}).then(account => { checkBadgesGamesPlayed(...); account.save(); })`. If the account was deleted/renamed while the profile exists, `account` is null → `TypeError` as unhandled rejection → **process crash** (no `unhandledRejection` handler). |
| `src/frontend-scripts/components/reusable/UserPopup.jsx:54` | Report-failure callback references undefined `reponse` (typo for `response`). | Server responds `{success:false, error}` → `setErrorMessage(reponse.error)` → `ReferenceError`; error never displays and callback throws. |
| `src/frontend-scripts/components/section-main/Profile.jsx:798` | Blacklist-delete emits `requestUserlist` (lowercase l); server listens for `requestUserList` (capital L). | No matching handler (`routes.js:330`) → **player list never refreshes** after deleting a blacklist row (only the 500ms `forceUpdate` fires). |
| `src/frontend-scripts/components/section-main/Leaderboards.jsx:44` | Top-level guard checks only `seasonalLeaderboardElo.length`, hiding all other populated boards when that one is empty. | Early in a season `seasonalLeaderboardElo` is `[]` but daily/XP/rainbow boards have data → whole page renders 'No Leaderboard Data'. `master` guarded on the sum of multiple lists. |
| `webpack/webpack.config.prod.js:64` | Production CSS minification dropped: `master` used `css-loader { minimize: true }`; new pipeline uses `MiniCssExtractPlugin` + css-loader with **no CSS minimizer** (`optimization.minimizer` only has UglifyJSPlugin). | `pnpm build` emits `style-main.css` unminified → **every visitor downloads full-size CSS**. Add `css-minimizer`/`cssnano`. |
| `src/frontend-scripts/components/section-main/GameChatItem.jsx:209` | Newly extracted component references `canSeeIncognito`, never declared or passed as a prop. | Latent only because nothing imports the component yet. When wired in and rendered for a moderator/Incognito chat → `ReferenceError`, chat render crashes. Original `Gamechat.jsx:819` computes it locally; extraction dropped it. |
| `__test__/backend/routes/socket/create-game.schema.test.js:55` | Tests assert the wrong client contract — test singular `excludedPlayerCount`, never test `xpSliderValue: null` — so they pass green while masking the create-game deploy-blocker and the singular/plural bug. | Fix the tests alongside the schema so they exercise the real payload (`xpSliderValue: null`, singular `excludedPlayerCount`). |

## Low severity

| File:Line | Bug |
|---|---|
| `scripts/retrieveLeaderboardData.js:24` | `dailyXPDifference` defaults `previousDayXP` to `1600` (an ELO baseline) instead of `0`, copy-pasted from the ELO line. An active account with no `previousDayXP` computes `xpSeason - 1600` (negative) → wrong daily-XP board the first day the feature runs. |

## Below the cut (real, lower-impact — noted, not yet itemized as bugs)

- `routes/socket/user-events/flappy-hitler.js` — fully dead (leading `return;`). Already noted in CLAUDE.md.
- `routes/socket/user-events/player-notes.js` — still mis-wired: declared `(socket, data)` but called
  `(socket, passport, data)`. Already noted in CLAUDE.md.
- `routes/socket/user-events/mod-modals.js:261` — can crash on empty `remakeData`.
- `models/game-summary/buildEnhancedGameSummary.js:111` — marks everyone a loser if a final turn lacks `enactedPolicy`.
- `src/frontend-scripts/components/section-main/Settings.jsx:515` — `getAltThemeColors` produces `hsl(NaN…)` if a non-hsl color reaches it.
- `src/frontend-scripts/components/section-main/CardFlinger.jsx:108` — leaks key listeners (re-`.bind` on removal).

These overlap with the Biome `info`-level findings currently surfaced by `pnpm lint` (noUnreachable in
`flappy-hitler.js` / `moderation.js` / `routes.js`, `noDuplicateElseIf` in `accounts.js`, `noDebugger` in
`dumpGames.js`, `noFallthroughSwitchClause` in `claim.js`).

## Tooling-review items (from the focused review)

| Item | File:Line | Status |
|---|---|---|
| **P1** — `biome format . --check` is invalid in Biome 2.4 (`--check is not expected in this context`) → CI formatting step fails every run. | `.github/workflows/node.js.yml:43` | **Fixed** — changed to `biome format .`. |
| **P2** — `.husky/pre-commit` runs `pnpm lint:fix` then `git add -u`, which can stage unrelated tracked edits into a commit. | `.husky/pre-commit:7-8` | **Left as-is** by decision — it mirrors the reference project's hook and folds `lint:fix` output into the commit; commits are human-driven. |

## Suggested order of follow-up commits

1. **Deploy-blockers** — `create-game.schema.js` + its test, then `settings.schema.js`. (Confirm contract; fix schemas, not clients.)
2. **High crashers** — `assassination.js` (add zod / bounds check), `models.js` typo, `create-game.js` plural-key regression, `eloReset.js` await.
3. **Medium** — batch the UI typos (`UserPopup`, `Profile` emit casing), `Leaderboards` guard, `forceskip` loop, `profile/utils.js` null guard, webpack CSS minifier, `GameChatItem` prop.
4. **Low / below-the-cut** — fold into the ongoing dead-code/zod cleanup.
