# Flappy Hitler

## Summary

This document describes `flappyMode` as implemented.

When enabled on a table, a policy-track endgame that reaches the **double match point** — a 4-liberal / 5-fascist board, both teams one policy from victory — transitions into a server-authoritative flappy-style minigame instead of being decided by the next card draw. Two birds — one per team — race through a shared set of pipe gaps. Control of each bird rotates between living teammates, difficulty escalates over time, and the team whose bird dies loses the game. The flappy result is the game result.

Flappy has **two visibility windows**, split by one event: the first bird to clear the first gate. Before it, pilot identities are secret and flappy can still be erased from history; after it, flappy is locked in, identities go public, and the game will end in flappy.

Everything below is implemented and verified; this is documentation, not a plan.

## Trigger

If `game.general.flappyMode` is true and, after a policy is enacted, the board is at the **double match point**:

- liberals have 4 policies, **and**
- fascists have 5 policies

then instead of continuing normal play (including any presidential power that policy would have granted), the game enters Flappy Hitler after a short delay. The suspended power is replaced entirely — flappy owns all remaining play.

**Why both, not either** (the original 2019 design intent, restored 2026-07-04): flappy exists to resolve a genuinely *close* game. Triggering on either team's match point always robbed the leading team of an earned advantage, and structurally taxed liberal wins harder (every liberal policy win passes through 4; fascists keep the flappy-free Hitler-chancellor route). At 4–5 the next enactment wins for whoever draws it — largely deck luck — so replacing that draw with a shared-pipe skill race is *fairer* than the cards. Accepted tradeoffs: flappy fires in fewer games, and at 4–5 both teams surrender their endgame tools to the race (fascists the Hitler-zone chancellor threat, liberals the veto).

The transition is scheduled via `scheduleMatchPointFlappy(game, resume)` (exported by flappy.js along with the `shouldStartMatchPointFlappy` gate, so both hook sites share one implementation). If flappy can no longer start when the delay fires (e.g. a team's last living player left during the window), the game resumes via the `resume` continuation instead of stranding the table — the election path resumes with the next election; the top-deck path resumes its `playCard` loop. The same continuation is used when a match-point flappy is cancelled at the first gate.

Hook sites (both enactment paths):

- `routes/socket/game/election.js` — the main enactPolicy if-chain, after the actual-win check and before the power branch
- `routes/socket/game/policy-powers.js` — the top-decking `playCard` loop

Gate (all must hold):

- `general.flappyMode === true` — **rated flappyMode games are intentional** (owner decision): players opt into the mode at game creation, and the match-point minigame may decide ELO, including via the coin-flip stalemate/error endings (a stalemate requires the whole table refusing to fly; the error path needs 20 consecutive tick failures). `/forceflappy` remains restricted to casual/practice/flappyMode games — a ranked table that did not opt in can't have flappy forced onto it, while a ranked *flappyMode* game can (it opted in).
- `general.flappyCancelled` is not set (see The First Gate)
- match point reached (4 liberal or 5 fascist policies)
- `canStartFlappy(game)`: game started, tracks flipped, not completed, no active flappy, not blind mode, not Avalon SH, not Monarchist SH, and both teams have at least one living player

Standard and custom SH games are supported. Non-policy endings that occur **before** match point (Hitler elected, Hitler shot, etc.) are unchanged — flappy only replaces the policy-track endgame. An actual policy-track win (5th liberal / 6th fascist) still ends the game normally; in a flappy game this can only happen after a cancellation.

## Window 1 — The First Gate (qualification)

From flappy start until a bird clears the first gate, **pilot identities are secret** — on screen and on the wire — so that a cancelled flappy leaks nothing into the resumed game.

- No names anywhere: no seat markers, no membership reveal, no named chat messages, no controller names in any emission.
- Rotation order is **random** (shuffled at start), not seat order.
- Each pilot's own client shows their **own custom cardback** on their team's bird (default cardback if they have none) plus a highlighted "YOU are in control" HUD line — a private self-recognition cue. Everyone else sees default cardbacks and "pilot hidden until the first gate".
- **Seated living players' chat is muted** (AEM exempt): a pilot could otherwise *prove* control ("watch me double-flap"), poisoning a resumed game with team information. Dead players and observers are outside the flappy mute (they can't be pilots): observers chat normally, and dead/left players get the base game's usual silent drop rather than a spurious flappy alert.
- The HUD shows `First gate - attempt N of 3` instead of the gap counter.

The first gate is a **qualification round**, not sudden death, and gets **10px of extra gap clearance** (every attempt's first gate, pre-lock only):

- A bird that crashes (pipe or floor) freezes in place; the game waits for the other bird's first-gate result.
- **Both fail** → the field resets and control passes to the **next pilot pair** (one per team; fascists, the smaller team, wrap). Announced anonymously: "Neither bird cleared the first gate and the next pilots take flight. (attempt N)". Every field reset (attempt or sudden-death) re-arms the spawn timer so fresh pilots get a full runway, and reset birds re-center by the **live** config (birds grow with difficulty).
- **Attempts scale with table size**: `maxAttempts = floor(livingPlayers / 2)` — equal to liberalCount − 1 for every standard composition (2 attempts / 1 reset in 5p, 3 in 6–7p, 4 in 8–9p, 5 in 10p), but derived **only from public information** (deaths are public). Deriving it from the hidden liberal count would leak executed players' alignment through the observable cancellation threshold itself, not just the data. When all attempts fail, flappy is cancelled entirely (see below). The HUD and chat show only the current attempt number.
- Pre-lock **leaver handoffs get no per-bird grace** (a single bird visibly leveling off on the tick a player's public leftGame flag flips would correlate the secret pilot to a seat and reveal their team). Instead, a pre-lock handoff of a **live** bird triggers a **symmetric full-field reset** — both birds re-center with fresh grace, pipes clear, full runway — so the incoming pilot doesn't inherit a doomed mid-fall bird and lose one of the team's limited attempts to a run they never had a fair shot at. A symmetric reset names no team (it reveals at most "the leaver was a pilot"). Dead-bird handoffs don't reset: that would undo a legitimate crash and let a crashed pilot refund the attempt by leaving. Accepted trade: a pilot facing an imminent crash could leave the game to refund the run — leaving a (typically rated) game costs far more than one attempt.
- The chat mute covers **all seated players** — including staff (a seated staff pilot could self-identify) and leavers — and the **claims path** (`handleAddNewClaim`) is guarded too, since claims post named gamechat and would otherwise bypass the mute. The mute also covers **site-wide general chat** (`handleNewGeneralChat`) — it's a player-attributed public channel, so a seated pilot could otherwise prove control there ("watch the liberal bird double-flap now"). The game-chat mute sits **after** slash-command and `@mod` routing in `handleAddNewGameChat`, so only messages that would actually reach public chat are muted: commands (private commandChats) and properly-routed `@mod` pings work for every seated player, while anything that falls through — including a malformed multiline `@mod` message that fails the routing regex — is blocked. (A prefix-based carve-out *before* routing was tried and was bypassable exactly that way.) Commands with **public** output need their own guards — `/ping` posts named public chat and is disabled for the whole flappy phase. The anonymity predicate itself is the shared `isFlappyPreLock` export — one source of truth for chat, claims, and any future channel; never inline a copy.
- **One clears while the other crashed** → the clearing team **wins the game immediately**; identities go public via the normal end-game reveal.
- **Both clear** → locked in (Window 2).

### Cancellation

After all first-gate attempts fail, what happens depends on how flappy started:

- **Match-point flappy: the deck decides, immediately.** One policy is topdecked onto the 4–5 board, which ends the game for whichever team's policy it is (chat: `...the top card of the deck decides the game.` → `The deck decides: a X policy is enacted.`). This is what makes the first gate a real decision instead of a formality: refusing to fly trades the skill race for a card-count-informed gamble on the deck — and it removes the asymmetry where "returning to normal play" at 4–5 favored fascists (live Hitler-zone chancellor route). Exception: an **abandoned** match-point table is never topdeck-completed (no rating games for empty tables) — but it does not resume normal play on rejoin either. The 4–5 trigger already fired and is only checked at enactment time, so resuming would let a mass-disconnect during the secret first-gate window **skip the flappyMode endgame entirely** (an escape hatch for a team that fears the race). Instead the pre-flappy board view is restored and flappy **re-enters on rejoin** via `scheduleMatchPointFlappy`, which retries every 2s while abandoned, self-terminates when the abandonment GC deletes the game, and falls back to the resume continuation if flappy can no longer start (e.g. a whole team left for good). Identities never leaked, so the fresh first gate is clean. (Continuations are never run on an abandoned table in any path — an empty table must not play itself to a rated result; the timed-mode `/forceflappy` cancel defers its election the same way.)
- **`/forceflappy`: returns to normal play** (chat: `Flappy Hitler cancelled due to neither first player clearing the first gate, returning to normal last round play.`) — the game wasn't at a deciding board, so the exact pre-flappy state restores as described below.

In both cases:
- `general.flappyCancelled` is set **only for a genuine match-point cancellation** — not by a cancelled `/forceflappy` (an admin toy run shouldn't consume the event the flappyMode game is built around) and not by an **abandonment** cancel (that table never used its event; a rejoined game keeps its flappy). `/forceflappy` itself still works after any cancellation.
- On the **restore paths**, `game.flappyState` is removed entirely — it rides on every `gameUpdate` via `secureGame`, so leaving even a "cancelled" husk behind would keep broadcasting flappy metadata into the resumed hidden-role game. On the **topdeck ending** it deliberately survives as a `finished` husk with the deck's winner: the game ends while still in the `flappyHitler` phase, so the husk is both the winner overlay for connected clients and the render seed for anyone who refreshes post-game (a nulled seed would strand them on the waiting-for-server screen).
- resume:
  - match-point-triggered flappy: ends by topdeck as above. The hook site's `resume` continuation is now used only when flappy **can't start** at the transition (deferred fire finds it unstartable) and for the **abandoned-table** cancel — in those cases the pre-flappy phase/status are restored **first** (the top-deck continuation never sets a phase, and leaving `flappyHitler` strands clients on the frozen canvas), then play resumes (a throwing continuation falls back to an election)
  - `/forceflappy`-triggered flappy: the exact pre-flappy phase/status/pending action is restored — except in **timed mode**, where a fresh election is started instead with the **same president** (via startElection's special-election parameter; startFlappy destroyed the pending timer and per-phase re-arming is inline at real transitions only)
- if the tick loop fails 20 consecutive times pre-lock, flappy cancels itself through this same path (with an error message) rather than leaving the table wedged in the `flappyHitler` phase
- Nothing identifying was ever shown or sent, so the resumed game inherits zero information. The only private knowledge is each pilot's own "I had control and failed a gate."

## Window 2 — Locked In (the race)

A bird clearing the first gate is the point of no return: flappy will decide the game, so there is nothing left to protect and identities go public. Chat re-opens (announced in gamechat), pilots are named, and:

- The bird sprite becomes the pilot's **actual role card, exact art variant included** — everyone watches the liberal card race the fascist (or Hitler) card, and the lock-in unmasking is the dramatic beat. This reveals pilots' roles as rotations proceed, which is fine: flappy now inevitably ends in the full `completeGame` role reveal.
- HUD shows `controlled by X`; a pulsing plane marker (blue liberal / red fascist) sits on the current pilots' seats.
- Standard instant-death rules: a bird dying ends the game, the other team wins.
- If both birds die on the **same tick** mid-race (e.g. both smack the face of the same gate — a real draw, since both lanes share pipe positions): sudden-death reset with the same pilots, and the chat warns "the next draw passes control." A **second consecutive draw by the same pair** hands both birds to the next pilots — so a colluding pair can't stall the game with endless draws. Both a scheduled rotation **and any gap progress** clear the warning (consecutive means consecutive). If the whole table refuses to fly, `2 × liberalCount` **consecutive** post-lock draws end the game by an announced coin flip ("Due to no one flying, winning is determined by a coin flip") — the draw counter resets whenever a gap is passed, so an actively contested game can never be coin-flipped. A **sustained** post-lock tick error (20 consecutive failed ticks — single transient throws just skip the tick) also ends by coin flip: pilot roles are already public, so resuming a hidden-role game is not an option.
- Control rotates to the next living teammate every 3 passed gaps; the rotation-triggering pipe is drawn **gold** in both lanes. Rotations are announced by name. A pilot who leaves the table hands off immediately.
- **Handoff grace**: for 1000ms after any fresh pair of hands takes the bird (rotation, leaver handoff, resets, flappy start), velocity is zeroed and gravity runs at 40% — the bird sags gently so the incoming pilot can orient while keeping descent control. The grace ends early the moment they flap. (Added because testing showed handoffs, not pipes, were the #1 cause of death; zero-gravity grace was tried first and rejected — it altitude-locks the bird and halved the skilled-play ceiling.)
- **Difficulty escalates** on a fixed rotation cadence — every `liberalCount` scheduled rotations, i.e. roughly each time every liberal has had a turn (counted per rotation event, not per actual controller change, so a team down to one living player still escalates) — cycling through four escalations forever: pipes 10% faster (`spawnMs *= 0.9`, which also shortens each turn) → gap 10% smaller → birds 10% bigger → gravity 10% stronger. Floors/caps: `spawnMs >= 500`, `gapSize >= birdHeight + 30`, bird growth capped so it fits the current gap, `gravity <= 0.9`. Long games get very hard; each bump is announced.

When one bird dies: normal end-game reveal → `completeGame(game, winner)`. Stats/ELO record the flappy winner as the game winner. **Profile win/loss and enhanced summaries need special handling**: they derive the winner from the policy logs (last enacted policy / Hitler events), which a flappy outcome can contradict — so every flappy ending stamps `gameSetting.flappyWinner` on the game summary (`endFlappyIntoGameCompletion`), and both `buildEnhancedGameSummary` and `EnhancedGameSummary.isWinner` prefer that field when present. Legacy summaries lack it and fall through to the old derivation. The winner gamechat line is completeGame's alone — flappy pushes its flavor lines (crash, deck-decides) but never a second "X win the game."

## State Model

Controller truth is **private** (never serialized to clients):

```js
game.private.flappyControl = {
  liberal: { controllerOrder, controllerIndex, controllerUserName },
  fascist: { ... },
}
```

`game.flappyState` (public, rides on `gameUpdate`; the truth for reconnects):

```js
flappyState: {
  isActive, status,            // 'running' | 'finished' | 'cancelled'
  winningTeam,                 // null until finished
  lockedIn,                    // false during the first-gate window
  failedAttempts, maxAttempts, // first-gate attempts (maxAttempts = liberalCount - 1)
  passedGapCount,
  liberalRotationCount, difficultyLevel, startedAt,
  liberal: { bird: { y, velocity, alive, graceTicks },
             controllerUserName, controllerRole },   // <- ONLY present when lockedIn
  fascist: { ... },
  pylons: [{ id, x, gapTop, gapBottom, counted, isRotator }],
  config: { tickMs, spawnMs, gravity, flapVelocity, maxFallVelocity,
            laneHeight, laneWidth, birdX, birdWidth, birdHeight,
            pylonWidth, pylonSpeed, gapSize, graceMs, graceGravityMult }
}
```

- `controllerRole` is `{ cardName, icon }` — the client renders `/images/cards/<cardName><icon>.png` as the bird.
- `config` is a per-game copy of `FLAPPY_CONFIG` (mutated by difficulty escalation).
- Timer ids live in `game.private.flappyTimers` as **numbers** via `setInterval(...)[Symbol.toPrimitive]()`. Never store Node `Timeout` objects on the game object — they are cyclic, `JSON.stringify(game)` in `testGameObject` throws, and in dev that crashes the server through an unconfigured Discord webhook.
- **Every flappy timer callback is wrapped in try/catch** (tick, spawn, match-point transition, end-game reveal): `bin/dev.js` turns any uncaught throw into `process.exit(1)`, killing every live game on the server. The tick additionally tolerates transient errors (recovery only after 20 consecutive failures).
- **External transitions are respected via one shared predicate** (`isFlappyGameLive`): every timer/tick entry point — the tick, the match-point transition, and the delayed completion — bails if the game was completed (mod force-end), remade, abandoned, or deleted/replaced in the registry. An abandoned table must never run to a coin-flip `completeGame` that rates ELO for players who left; a mod-ended game must never get a phantom election or a second recording. `cleanupFlappy` (the external-stop path) settles both liveness fields (`isActive` answers "may a new flappy start?", `status` answers "what is this run doing?" — every terminal path must set both) and broadcasts a final `cancelled` snapshot so clients stop cleanly. Remakes explicitly reset `flappyState`/`flappyCancelled` (deep-cloning them would silently kill the feature in the remade game).
- **A moderator freeze pauses flappy in place** — no physics, no spawns, no flaps, no match-point transition (it retries every 2s until unfrozen or dead) — and the run resumes when unfrozen. `canStartFlappy` deliberately does **not** check freezes: the match-point hook calls it at the enactment instant, and a freeze active at that moment must not permanently skip the trigger (the scheduled transition waits freezes out). `/forceflappy` refuses frozen games with its own explicit check. **Post-lock abandonment pauses the same way as a freeze** — physics *and* pylon spawning stop (spawning while physics is paused would stack an unpassable wall of pipes at the spawn edge for a rejoiner) — and the pending transition/completion retry timers are intentionally *not* registered in `flappyTimers` (a teardown's `clearFlappyTimers` must never orphan a decided game unrecorded); their registry-identity guards self-terminate them within one 2s cycle of the game's deletion.
- Nothing secret may ever live on `game.flappyState` — it is serialized wholesale on every `gameUpdate`. Controller truth, rotation order, and anything hidden-team-derived belong in `game.private.flappyControl`.
- `game.private.preFlappy` holds the cancellation snapshot: `{ phase, clickActionInfo, status, fromMatchPoint }`.

## Socket Protocol

Incoming (`flappyEvent`, zod-validated by `flappy-hitler.schema.js`):

```js
{ uid: string, type: 'flap' }
```

The acting user comes from the socket session, never the payload. The engine additionally validates: flappy active and running, phase is `flappyHitler`, user seated / alive / not left, user is their team's **current pilot** (checked against private control), and their bird is alive.

Outgoing:

- `gameUpdate` — phase transitions, chats, announcements. Any flappy path that pushes gamechat (lock-in, rotations, difficulty, draws, attempts) must send a **full** update (`noChats=false`): chats pushed onto `game.chats` are silently dropped from `noChats` sends and would otherwise only arrive in the end-of-game dump. Per-gap status ticks without chat stay `noChats`.
- `flappyUpdate` — a frame snapshot every tick (~20/sec), emitted **per-socket**, not room-wide: the base snapshot is anonymous, and only the two current pilots receive an added `youControl: 'liberal'|'fascist'` flag. Pre-lock snapshots carry no controller names or roles; post-lock they carry both. Anonymity is enforced at the emission layer — a client reading raw websocket frames learns nothing.

Observers receive everything and cannot flap. Reconnecting players are seeded from `flappyState` on `gameUpdate` and receive live frames (including their `youControl` flag if they are a pilot) immediately.

## Client Rendering

`Flappy.jsx` is render-only:

- one canvas, two lanes (blue liberal / orange fascist), replacing the Tracks area while `phase === 'flappyHitler'`
- **snapshot interpolation**: the server ticks at 20Hz; the client renders one snapshot behind and lerps birds/pylons toward the latest — smooth motion for ~50ms of imperceptible display latency
- bird sprite: pre-lock, own cardback for the pilot / default for everyone else; post-lock, the pilot's role card
- dead birds render faded (first-gate wait)
- input: click/tap the canvas or Space (ignored while focus is in an input/textarea/contentEditable, so typing in chat neither loses spaces nor flaps the typist's bird)

`Players.jsx` adds the plane seat markers, keyed off `flappyState.<team>.controllerUserName` — which only exists post-lock, so markers appear exactly when identities are public. (Colors need `!important` — an `#main i.icon` theme rule wins otherwise.)

## Files

- `routes/socket/game/flappy.js` — engine: windows, qualification, rotation, difficulty, cancellation, per-socket emission, input validation, cleanup
- `routes/socket/user-events/flappy-hitler.js` + `flappy-hitler.schema.js` — thin zod-validated wrapper for `flappyEvent`
- `routes/socket/user-events/chat.js` — first-gate-window chat mute
- `routes/socket/routes.js` — event registration
- `routes/socket/game/election.js`, `routes/socket/game/policy-powers.js` — match-point hooks
- `routes/socket/game/end-game.js` — flappy timer cleanup in `saveAndDeleteGame` (inlined to avoid a require cycle)
- `routes/socket/commands.js` — `/forceflappy`
- `src/frontend-scripts/components/section-main/Flappy.jsx`, `Game.jsx`, `Players.jsx`
- `src/scss/players.scss` — controller marker

Require-cycle note: flappy requires `end-game` (completeGame) and `common` (startElection); election/policy-powers require flappy. No cycle — do not add a flappy require to end-game or common.

## Dev Tooling

- `/forceflappy` — AEM-only chat command, ships in production like the other `/force*` commands. Forces a started, eligible **casual, practice, or flappy-mode** game straight into flappy (never tournaments — ranked results and brackets shouldn't be decided by a force-started minigame; the auto match-point trigger already requires `flappyMode`) — but only from the stable waiting phases (`selectingChancellor`, or `voting` while votes are genuinely outstanding; forcing is blocked both while ballots are still being dealt — the phase flips to `voting` before the delayed ballot setup runs — and once the last ballot is in, when the tally chain is running): other phases have untracked multi-step animation timeouts that would keep firing underneath flappy. This allowlist is admin-tool scoping, not a general fix for the codebase's untracked transition timers. Additionally, `selectChancellor`, `selectVoting`, and the delayed ballot-setup timeout now carry their own phase guards, so a stale nomination, ballot, or ballot-deal arriving *after* flappy starts is rejected rather than mutating the table underneath the engine. The timed-mode cancel restart also clears aborted-vote leftovers (`pendingChancellorIndex`, the `selectChancellor` lock, ballot cardFlingers, pending-chancellor status) — `startElection` resets none of those, and without clearing them the next nomination would be rejected and the table would wedge.
- `scripts/flappyHarness.js` — headless 5-player harness. Signs in the quick-login accounts, creates and starts a real game, auto-pilots both birds (tracking the private `youControl` signal per client), and asserts pre-lock wire anonymity and the chat-mute window. Requires `pnpm create-accounts` + `pnpm assign-local-mod`, and a server **restarted after** assigning the mod (staff roles are cached at boot).
  - `node scripts/flappyHarness.js` — /forceflappy path: lock-in, rotation, difficulty, chat mute/reopen, anonymity checks
  - `DEMO_SECONDS=600 ...` — keeps both birds alive so you can watch in a browser
  - `MATCHPOINT=1 ...` — creates a custom game starting at 3 liberal policies and plays real rounds until the 4th liberal policy auto-triggers flappy
  - `TEST_CANCEL=1 ...` — nobody flaps; asserts the scaling attempts (2 in the 5p harness game) with advancing pilot pairs, then cancellation and state restore (combine with `MATCHPOINT=1` to also assert the game then plays to a normal win with no flappy restart)
  - `PILOT_MS=<ms> PILOT_ERR=<px> ...` — degrade the autopilot's reaction time and aim to simulate human skill tiers for balance testing

## Known Limitations

- **Stale in-flight actions are guarded point-wise, not systemically**: `selectVoting` and `selectChancellor` carry phase guards, and `/forceflappy` is phase-restricted, but other normal-game handlers/timeout chains are not individually flappy-aware. The systemic fix would be a per-game generation/epoch counter bumped on entering `flappyHitler` (stale callbacks bail on mismatch) — deferred; the currently reachable paths are covered.
- A flappyMode game can legitimately end without flappy ever firing (Hitler elected/shot before match point) — intentional; flappy only replaces the policy-track endgame.
- A custom game configured to **start at the 4–5 double match point** (`trackState.lib: 4` is legal; `fas: 5` is not — the veto-zone constraint caps fascist starts at 4) never arms flappy: the trigger evaluates after enactments, and the first enactment goes straight into a win branch. Accepted as degenerate — such a game is one enactment long by construction.
- Abandonment handling depends on the window, because a rejoin can clear `timeAbandoned` before the GC sweeps and state a returning table needs must survive: **pre-lock** it cancels through the full cancel path (nothing identifying was shown — the resurrected table resumes hidden-role play); **post-lock** it *pauses* like a freeze (pilots were publicly named, so cancelling back to hidden-role play would leak alignments; nobody-returns = GC sweeps an unrated, uncompleted game, matching normal abandonment); **during the post-win reveal delay** it does *not* block completion (the winner is already decided — decided games record even if everyone walks out); **during the match-point transition delay** it retries every 2s like a freeze rather than dropping the continuation.

- Replays do not understand the `flappyHitler` phase.
- Mobile is untested beyond the canvas scaling to its container.
- Pre-lock, a pilot without a custom cardback sees the default cardback (same as everyone) — their only cue is the highlighted "YOU are in control" text. New players may miss handoffs; a louder cue (sound/flash) may be needed.
- No sounds specific to flappy.
- Input latency is one server tick (~50ms) plus interpolation delay; if controls feel laggy with real players, the lever is `tickMs` 50 → 25, not anything client-side.
- Whether this is actually a good game for 7 people is an open experiment.
