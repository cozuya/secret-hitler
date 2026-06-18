# Zod-Hardening Plan — Socket `user-events` Handlers

## Context

`moderation.js` is the pilot (done): a `*.schema.js` file defines the wire payload,
`safeParse` runs once at handler entry, failure logs + early-returns, and string
fields get `.default('')` so downstream `.substr`/`.trim`/`.length` cannot throw.
This doc plans the same treatment across the rest of `routes/socket/user-events/`.

**Goal:** zod every `user-events` handler and **replace all inline payload guards**
(both the in-handler ad-hoc checks and the boundary checks in `routes.js`) with a
per-file schema. The older non-zod `crash-hardening-plan.md` has been deleted — its
game-action guards are superseded by this zod track.

## Method (same for every file)

1. Add `routes/socket/user-events/<file>.schema.js` exporting one schema.
2. `safeParse` at the top of the handler; on `!success`, `console.log(issues)` + `return`
   (or `callback({ success:false })` where a callback exists). Never throw back into the
   socket.io listener — it isn't try/catch-wrapped, so a throw kills the whole process.
3. `.passthrough()` for the first landing, tighten to `.strict()` later.
4. Add a focused `<file>.schema.test.js` (reject known crashers, accept real payloads,
   assert string defaults).
5. Where `routes.js` already does an inline boundary check (e.g. `playerReport` comment
   length), fold that rule into the schema and leave the boundary check until the schema
   is proven, then remove it in a follow-up.

## The surface

| File                      | Handler(s)                                                      | Wire fields read                                                                                                             | Auth gate                                          | Crash risk | Notes                                                                                                                                                                                                                                                                                                                    |
| ------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `moderation.js`           | handleModerationAction                                          | userName, ip, comment, action, …                                                                                             | AEM                                                | **DONE**   | Pilot landed                                                                                                                                                                                                                                                                                                             |
| `chat.js` (364)           | handleNewGeneralChat, handleAddNewGameChat (both `async`)       | chat (only true wire inputs: `chat`, + `uid` for game chat; userName/timestamp/staffRole/hiddenUsername are set server-side) | authenticated (+ `!isRestricted`)                  | **DONE**   | Type guards (`typeof data.chat`) folded into `generalChatSchema`/`gameChatSchema`. Length/empty/anti-spam-regex content rules left in the handlers (trim semantics differ between the two).                                                                                                                              |
| `create-game.js` (432)    | handleAddNewGame (`async`), handleUpdateWhitelist               | ~60 fields: counts, sliders, customGameSettings, gameName, flags, whitelistPlayers                                           | authenticated (+ `!isRestricted`)                  | **DONE**   | `createGameSchema` (counts/gameName/sliders/arrays) + `customGameSettingsSchema` (nested numeric shape) + `updateWhitelistSchema`. Fixed the two live crashes: tourny `data.general` (now `newGame.general`) and unchecked `whitelistPlayers`. `fascistCount`-vs-playerCount stays in the handler (needs derived state). `xpSliderValue` regression fixed (now `z.union([z.string(), z.number()]).nullable().optional()`); the singular-vs-plural `excludedPlayerCount` regression fixed too. |
| `player-reports.js` (131) | handlePlayerReport                                              | reason, comment, uid, reportedPlayer, userName                                                                               | authenticated, ≥2 games                            | **DONE**   | Schema folds in the `routes.js:552` comment guard + the in-handler `reason` regex; `reportedPlayer` now required (kills the `.split(' ')` crash).                                                                                                                                                                        |
| `mod-dms.js` (187)        | handleOpenChat, handleAddNewModDMChat                           | aemMember, userName, chat                                                                                                    | AEM (but `modDMsAddChat` is **any authenticated**) | **DONE**   | `openChatSchema` (aemMember/userName strings) + `modDMChatSchema` (chat string). `handleCloseChat`/`handleUnsubscribeChat` read nothing off the wire (passport from `socket.handshake`) — no schema needed.                                                                                                              |
| `join-game.js` (100)      | updateSeatedUser                                                | uid, password                                                                                                                | authenticated + in-game                            | **DONE**   | Schema requires `uid` string, `password` optional string; replaced the `BAD DATA` log-guard.                                                                                                                                                                                                                             |
| `settings.js` (171)       | handleUpdatedTheme, handleUpdatedGameSettings, handleUpdatedBio | field, isPrivate, theme, bio, blacklist                                                                                      | authenticated                                      | **DONE**   | `themeSchema` (replaced inline guards + removed debug logs), `bioSchema` (replaced `typeof` guard), `gameSettingsSchema` object-gate + `blacklistSchema` (replaced manual blacklist typeof checks). `themeSchema` regression fixed — the bogus required `field` key was removed; it now validates the five `THEME_COLOR_FIELDS`.                                                                                                                      |
| `claim.js` (358)          | handleAddNewClaim                                               | claim, claimState                                                                                                            | authenticated + in-game                            | **DONE**   | `claimSchema` (optional strings) parsed at top. Return contract (`true`/`false`/undefined) preserved for the chat.js caller.                                                                                                                                                                                             |
| `remake-game.js` (353)    | handleUpdatedRemakeGame                                         | remakeStatus                                                                                                                 | authenticated + in-game                            | **DONE**   | `remakeSchema` object-gate; `remakeStatus` left permissive so a forged value can't block a vote.                                                                                                                                                                                                                         |
| `leave-game.js` (348)     | handleUserLeaveGame                                             | isRemake                                                                                                                     | authenticated + in-game                            | **DONE**   | `leaveGameSchema` object-gate; `isRemake` unconstrained so a forged value can't block a leave.                                                                                                                                                                                                                           |
| `mod-modals.js` (244)     | handleSubscribeModChat, handleGameFreeze, handleModPeek\*       | (uid via `findGame`, else `game`/`modUserName`)                                                                              | AEM                                                | **SKIP**   | Handlers don't receive `data`; the wire fields (`uid`, `modName`) are extracted and guarded in `routes.js`. Nothing to validate inside the handlers.                                                                                                                                                                     |
| `util.js` (72)            | checkUserStatus                                                 | — (socket, callback)                                                                                                         | —                                                  | **SKIP**   | No wire payload.                                                                                                                                                                                                                                                                                                         |
| `flappy-hitler.js` (49)   | handleFlappyEvent                                               | type, team                                                                                                                   | in-game                                            | **SKIP**   | Dead code — `return;` on the first line. Don't harden dead code.                                                                                                                                                                                                                                                         |
| `player-notes.js` (25)    | handleUpdatedPlayerNote                                         | userName, notedUser, note                                                                                                    | authenticated                                      | **SKIP**   | Broken wiring: declared `(socket, data)` but called `(socket, passport, data)`, and the frontend emit is commented out (`Playernotes.jsx:75`). Fix the wiring (or delete) separately — not a zod task.                                                                                                                   |

## Suggested sequencing

| Phase | File(s)                                                   | Why this order                                                                                                                                                                          |
| ----- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 ✓   | moderation.js                                             | Done — establishes the pattern.                                                                                                                                                         |
| 2 ✓   | player-reports.js + join-game.js                          | Done — small, one confirmed crash fixed (`reportedPlayer.split`), inline guards folded into schemas.                                                                                    |
| 3 ✓   | chat.js                                                   | Done — type guards folded into schemas; the two `async` handlers can no longer crash the process on a non-string `chat`.                                                                |
| 4 ✓   | create-game.js                                            | Done — schema types counts/sliders/`customGameSettings`/`whitelistPlayers`; both live crashes (tourny `data.general`, unchecked whitelist) fixed. **All HIGH-risk files now complete.** |
| 5 ✓   | mod-dms.js                                                | Done — `openChatSchema` + `modDMChatSchema`; the two no-`data` handlers left as-is.                                                                                                     |
| 6 ✓   | settings.js, claim.js, remake-game.js, leave-game.js      | Done — schemas added; inline type guards (bio, theme, blacklist) replaced.                                                                                                              |
| —     | mod-modals.js, flappy-hitler.js, player-notes.js, util.js | Skip (no `data` param / dead / broken / no payload).                                                                                                                                    |

**All payload-bearing `user-events` handlers are now zod-guarded.** Two landed with **regressions** caught in review (`create-game.js` `xpSliderValue`, `settings.js` `themeSchema` `field`) — **both fixed** (2026-06-18), see `REGRESSION_BUG_TRIAGE_JUN17-1.md`. Remaining work is the cross-cutting follow-ups below (unhandledRejection logger, `.passthrough()` → `.strict()` tightening, player-notes wiring).

## `routes/socket/game/` handlers — DONE

The gameplay handlers receive `data` straight from the wire (guarded only by `findGame`/
`ensureInGame` in `routes.js`); the wire fields themselves were untyped, so a forged value
could crash the whole process. Each handler file now has a sibling `*.schema.js` and a
`safeParse` at handler entry (same pattern as `user-events`). The client always emits a
numeric index/selection or boolean vote plus `uid`, so the schemas don't reject real play.

| File | Schema fields | Handlers guarded | Extra existence guards added |
| ---- | ------------- | ---------------- | ---------------------------- |
| `assassination.js` | `playerIndex` int | selectPlayerToAssassinate | `if (!target) return` (fixes the documented forged-`playerIndex` crash) |
| `election-util.js` | `chancellorIndex` int | selectChancellor | none — integer typing makes the existing `>= playerCount`/`< 0` bounds hold |
| `election.js` | `vote` bool, `selection` int | selectVoting, selectPresidentVoteOnVeto, selectChancellorVoteOnVeto, selectPresidentPolicy, selectChancellorPolicy | none |
| `policy-powers.js` | `playerIndex` int, `vote` bool | selectPartyMembershipInvestigate, selectPartyMembershipInvestigateReverse, selectSpecialElection, selectPlayerToExecute, selectBurnCard | `if (!seatedPlayers[playerIndex]) return` **before locking the phase** (reverse-investigate + special-election); `selectPlayerToExecute` relies on its existing `!selectedPlayer` bounds guard, `selectPartyMembershipInvestigate` on its existing top-of-handler seat check |

The no-`data` powers (`policyPeek`, `policyPeekAndDrop`, `investigateLoyalty`,
`showPlayerLoyalty`, `specialElection`, `executePlayer`, `selectPolicies`, `selectOnePolicy`)
read nothing off the wire — no schema needed. Schema typing kills type-confusion crashes;
out-of-range-but-integer indices are still the handler's job (the existence guards above).
Tests: `__test__/backend/routes/socket/game-schemas.schema.test.js`.

## Express XHR routes — DONE

Lower-severity than sockets (Express turns a synchronous throw in a handler into a 500, not a
process crash), but the GET-by-id/username routes fed `req.query`/`req.body` straight into a
Mongoose query, where Express/qs hands an object/array for `?id[$ne]=`-style input — NoSQL
operator injection (and a `findById` CastError). Each input-reading handler now `safeParse`s
the relevant `req` part against a schema in `routes/index.schema.js` / `routes/accounts.schema.js`;
on failure it returns the route's existing not-found / error response. Happy paths unchanged
(schemas only reject malformed *types*; `.passthrough()` keeps unknown flags).

- `routes/index.js`: `/profile` (username), `/gameSummary` · `/modThread` · `/gameJSON` (id),
  `/upload-cardback` (image).
- `routes/accounts.js`: `/account/signup`, `/account/change-password`, `/account/add-email`,
  `/account/change-email`, `/oauth-select-username`. (`/account/reset-password` and
  `verification.js` already had `typeof` string guards — left as-is.)
- Two latent bugs fixed in passing: `/gameSummary` `.catch((err) => debug(err))` (undefined
  `debug` → unhandledRejection) → `console.debug`; `/upload-cardback` catch logged `err`
  instead of the caught `error`.

Tests: `__test__/backend/routes/express-schemas.schema.test.js`.

## Cross-cutting follow-ups (separate tickets)

- ✅ **`unhandledRejection` / `uncaughtException` logger** — **DONE (2026-06-18)** in `bin/dev.js`:
  log-and-exit (registering the handlers overrides Node's default crash, so it exits to avoid
  continuing on half-mutated state; it never swallows).
- ✅ **`player-notes.js`** — **DONE (2026-06-18)**: deleted the broken-wiring handler, its barrel
  + `routes.js` registration, and the fully-commented `Playernotes.jsx` (the dead emit lived there).
  The read path (`getPlayerNotes`/`sendPlayerNotes`) is left intact.
- **Tighten `.passthrough()` → `.strict()`** across all schemas once each has run in prod. *(open)*
- **As each file lands,** delete its inline guards (in-handler ad-hoc checks and the matching
  `routes.js` boundary checks) — but only once the schema covers the same rule. Done so far for
  `playerReport` (the `routes.js` comment guard) and `updateSeatedUser` (the `BAD DATA` block).
