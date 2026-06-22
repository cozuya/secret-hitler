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

## ⚠️ Deploy-blockers — ✅ BOTH FIXED (2026-06-18)

These broke core flows the moment the branch deployed. Both were schema-vs-client contract mismatches in the
zod hardening; the clients match what's live, so the **schemas** were fixed (not the clients).

| File:Line | Severity | Bug | Status |
|---|---|---|---|
| `routes/socket/user-events/create-game.schema.js:74` | **critical** | `xpSliderValue` typed `z.string().optional()`, but the client sends `null` by default (and a `number` from the slider). `safeParse` rejected the normal create-game payload → `handleAddNewGame` returned at `create-game.js:18` → **game creation broken site-wide**. | ✅ Fixed — now `z.union([z.string(), z.number()]).nullable().optional()`. |
| `routes/socket/user-events/settings.schema.js:8` | **high** | `themeSchema` required `field` (`z.string()`), but the client never sends `field` and the handler never reads it. Every theme update failed validation → `handleUpdatedTheme` returned at `settings.js:19` → **theme customization fully broken**. | ✅ Fixed — `field` removed; schema validates the five `THEME_COLOR_FIELDS`. |

## High severity — ✅ ALL FIXED (2026-06-18)

| File:Line | Bug | Failure scenario | Status |
|---|---|---|---|
| `routes/socket/game/assassination.js:93` | `selectPlayerToAssassinate` dereferences `target.role` with no validation of `data.playerIndex` and no zod schema. | Any socket can emit `selectedPlayerToAssassinate {playerIndex: 99}` (`routes.js:800`). `target = seatedPlayers[99]` is undefined → `target.role.cardName` throws `TypeError`. Listeners aren't try/catch-wrapped and there's no `uncaughtException` handler → **whole Node process crashes, every live game ends.** | ✅ Fixed — `assassinateSchema` (`playerIndex` int) + `if (!target) return`. Part of the `game/` zod pass; see `zod-hardening-plan.md`. |
| `routes/socket/models.js:74` | Typo `module.exportsstaffList` (missing dot) — exported `staffList` is never populated. | `master` had `const staffList = [];`. Branch wrote `const staffList = (module.exportsstaffList = [])`; `getStaffList()` set `module.exports.staffList = []` (a different array) and populated only the closure var. `user-requests.js` destructures the always-empty `module.exports.staffList` (lines 21/35) → **staff never identified**, staff-only userlist enrichment never fired. | ✅ Fixed — `module.exports.staffList` shares one array with the closure; `getStaffList` now clears + repopulates it in place (destructured reference stays valid). |
| `routes/socket/user-events/create-game.js:43` | Handler read `data.excludedPlayerCounts` (plural); client sends `excludedPlayerCount` (singular). | `master` read singular. `Array.isArray(data.excludedPlayerCounts)` was false → else branch pushed every count in `[min,max]`, `excludes` ended up `[]`. A host who unchecks '6' in a 5–8 custom game **still got 6-player games**. | ✅ Fixed — handler now reads singular `data.excludedPlayerCount` (matches `Creategame.jsx`/`App.jsx`). |
| `scripts/eloReset.js:288` | `eachAsync` callback didn't return its `Profile.findOne(...).then(...)` chain → cursor drained without awaiting; `mongoose.connection.close()` ran while saves were pending. | Season ELO reset: top-level `.then()` closed the connection mid-flight, aborting most pending saves → **ELO/XP/rainbow reset persists for only a nondeterministic subset of accounts**. | ✅ Fixed — callback returns the chain; `profile.save()`/`acc.save()` converted to awaited promises. ⚠️ Same un-awaited-save class still open in `scripts/convertBlacklistFormat.js` (lower impact, not yet fixed). |

## Medium severity — ✅ ALL RESOLVED (2026-06-18)

| File:Line | Bug | Status |
|---|---|---|
| `routes/socket/commands.js:617` | `forceskip`'s `while (chancellor === -1)` loop had no fallback → infinite loop if no eligible chancellor exists, **blocking the single-threaded event loop for all games.** | ✅ Fixed — loop bounded to one full pass; aborts with a chat message ("no eligible player to force a chancellor pick to") if none found. |
| `models/profile/utils.js:262` | `account.save()` on a possibly-null `account` inside a fire-and-forget promise with no `.catch` → `TypeError` as an **unhandled rejection → process crash** if the account was deleted/renamed while the profile exists. | ✅ Fixed — `if (!account) return` guard + a `.catch((err) => debug(err))` on the (intentionally floating) inner promise. |
| `src/frontend-scripts/components/reusable/UserPopup.jsx:54` | Report-failure callback referenced undefined `reponse` (typo) → `ReferenceError`; error never displayed. | ✅ Fixed — `reponse` → `response`. |
| `src/frontend-scripts/components/section-main/Profile.jsx:798` | Blacklist-delete emitted `requestUserlist` (lowercase l); server listens for `requestUserList` → **player list never refreshed** after deleting a blacklist row. | ✅ Fixed — emit corrected to `requestUserList`. |
| `src/frontend-scripts/components/section-main/Leaderboards.jsx:44` | Top-level guard checked only `seasonalLeaderboardElo.length`, hiding all other populated boards when that one is empty (whole page → 'No Leaderboard Data'). | ✅ Fixed — `hasLeaderboardData` now ORs all five board lengths (matches master's combined-set guard). |
| `webpack/webpack.config.prod.js:64` | Production CSS minification dropped in the webpack pipeline. | ✅ N/A — the webpack build was **removed** in the Vite migration; Vite minifies CSS by default in production and `vite.config.mjs` does not disable it. No action needed. |
| `src/frontend-scripts/components/section-main/GameChatItem.jsx:209` | Newly extracted component referenced `canSeeIncognito`, never declared or passed as a prop → latent `ReferenceError` when the component is eventually wired in. | ✅ Fixed — `userInfo` added as a prop and `canSeeIncognito` computed inside, mirroring `Gamechat.jsx:819`. (Component still unused; this makes it correct for when it lands.) |
| `__test__/backend/routes/socket/create-game.schema.test.js:55` | Tests asserted the wrong client contract — masked the create-game deploy-blocker and the singular/plural bug. | ✅ Fixed — the test now exercises `xpSliderValue: null / 50 / "50" / {}` and singular `excludedPlayerCount`. |

## Low severity — ✅ RESOLVED (2026-06-18)

| File:Line | Bug | Status |
|---|---|---|
| `scripts/retrieveLeaderboardData.js:24` | `dailyXPDifference` defaulted `previousDayXP` to `1600` (an ELO baseline) instead of `0` → wrong daily-XP board the first day the feature runs. | ✅ Fixed — `|| 0`. |
| `scripts/convertBlacklistFormat.js` | Same un-awaited-`eachAsync`-save class as `eloReset.js`. | ✅ Fixed — `return account.save()` + `mongoose.connection.close()`. |

## Below the cut — mostly resolved (2026-06-18)

- ✅ `routes/socket/user-events/player-notes.js` — **deleted** (broken wiring + dead, fully-commented `Playernotes.jsx` emit). Barrel + `routes.js` registration removed; read path left intact.
- ✅ `routes/socket/user-events/mod-modals.js:261` — **fixed** (optional-chaining guards so a remakes peek can't crash on absent/partial `remakeData`).
- ✅ `src/frontend-scripts/components/section-main/Settings.jsx:515` — **fixed** (`getAltThemeColors` NaN-guards and falls back to default theme colors).
- ✅ `src/frontend-scripts/components/section-main/CardFlinger.jsx:108` — **fixed** (bind key handlers once so unmount removal matches; no listener leak).
- ✅ `models/profile/utils.js` + `routes/socket/models.js` — the dead `profiles` LRU cache + `cache` option plumbing **deleted** (it was write-only and unread).
- ⚠️ `models/game-summary/buildEnhancedGameSummary.js:111` — **STILL OPEN (deferred — needs domain input).** When the final turn has no `enactedPolicy` and no earlier win condition matched, `winningTeam` is `null`, so `isWinner` (line 179) marks **everyone** a loser. The safe fix requires knowing the intended winner in that edge state (it affects real game records / ELO), so it was left rather than guessed. **Full write-up + resolution options: `docs/NO_WINNER_ISSUE.md`.**
- `routes/socket/user-events/flappy-hitler.js` — fully dead (leading `return;`). Already noted in CLAUDE.md (intentionally kept).

These overlap with the Biome `info`-level findings currently surfaced by `pnpm lint` (noUnreachable in
`flappy-hitler.js` / `moderation.js` / `routes.js`, `noDuplicateElseIf` in `accounts.js`, `noDebugger` in
`dumpGames.js`, `noFallthroughSwitchClause` in `claim.js`).

## Tooling-review items (from the focused review)

| Item | File:Line | Status |
|---|---|---|
| **P1** — `biome format . --check` is invalid in Biome 2.4 (`--check is not expected in this context`) → CI formatting step fails every run. | `.github/workflows/node.js.yml:43` | **Fixed** — changed to `biome format .`. |
| **P2** — `.husky/pre-commit` runs `pnpm lint:fix` then `git add -u`, which can stage unrelated tracked edits into a commit. | `.husky/pre-commit:7-8` | **Left as-is** by decision — it mirrors the reference project's hook and folds `lint:fix` output into the commit; commits are human-driven. |

## Suggested order of follow-up commits

1. ✅ **Deploy-blockers** — `create-game.schema.js` + its test, then `settings.schema.js`. **Done.**
2. ✅ **High crashers** — `assassination.js` (zod + bounds check), `models.js` typo, `create-game.js` plural-key regression, `eloReset.js` await. **Done (2026-06-18).** Also done in the same pass: the rest of the `routes/socket/game/` zod hardening and the Express XHR zod hardening — see `zod-hardening-plan.md`.
3. ✅ **Medium** — UI typos (`UserPopup`, `Profile` emit casing), `Leaderboards` guard, `forceskip` loop, `profile/utils.js` null guard, `GameChatItem` prop, and the `create-game.schema.test.js` contract. **Done (2026-06-18).** Webpack CSS minifier was N/A (build moved to Vite).
4. **Low / below-the-cut** *(open)* — fold into the ongoing dead-code/zod cleanup. Includes `scripts/convertBlacklistFormat.js` (same un-awaited-save class as `eloReset.js`) and the `retrieveLeaderboardData.js` XP baseline.
