# Flappy Hitler MVP Spec

## Summary

This document describes a practical MVP plan for adding `flappyMode` to the game.

When enabled on a table, a game that would normally end by policy track victory will instead transition into a short server-authoritative minigame. Two birds, one per team, race through flappy-style gaps. Control of each team's bird rotates between living teammates every 3 passed gaps. The team whose bird dies loses the game.

This spec intentionally excludes `flappyOnlyMode`. That idea is dropped for now.

## Goals

- Make `flappyMode` real and shippable.
- Keep the implementation small enough to fit this codebase.
- Reuse existing game UI and socket patterns where they are good enough.
- Avoid adding major dependencies unless a real need appears.
- Make the feature testable locally without needing to play a full normal game every time.

## Non-Goals

- No `flappyOnlyMode`.
- No attempt to preserve the old client-authoritative prototype.
- No replay support in MVP.
- No support in MVP for non-policy win paths:
  - Hitler elected
  - Hitler shot
  - Merlin assassination
  - other variant-specific terminal states
- No blind mode support in MVP.
- No Avalon SH / Monarchist SH support in MVP.
- No mobile-specific polish beyond "works well enough to test".

## Why This Shape

The abandoned implementation already proved that canvas rendering, scrolling pylons, click-to-flap, and socket delivery are workable in this repo. What it did not solve was authority, state ownership, end-game integration, controller rotation, reconnect behavior, or safe activation.

For MVP, the main design decision is:

- server owns simulation
- client only renders and sends input

This is the simplest way to avoid a game-deciding minigame being cheat-prone or desynced.

## MVP Rules

### Trigger

If `game.general.flappyMode` is true, and the game would otherwise end because:

- liberals reached 5 policies, or
- fascists reached 6 policies

then instead of calling `completeGame(...)`, the game enters flappy mode.

### Flappy Start

On flappy start:

- the game enters a new phase, e.g. `gameState.phase = 'flappyHitler'`
- a new `game.flappyState` object is created
- living players are partitioned by team
- team membership becomes publicly visible
- control is assigned to one player per team
- the regular tracks area is replaced by the flappy view
- normal game actions are blocked

### Core Gameplay

- There are two lanes, one for liberals and one for fascists.
- Each lane has one bird.
- Each team's currently controlling player can flap for that team.
- A flap applies an impulse to that team's bird.
- Gravity and obstacle movement are simulated on the server.
- Pylons scroll from right to left.
- Each pylon has a gap.
- If a bird hits a pylon or leaves vertical bounds, that team loses immediately.

### Control Rotation

- There is a global passed-gap counter in `flappyState`.
- Every 3 passed gaps, control rotates to the next living player on each team.
- Rotation order is deterministic and stable for the duration of flappy.
- If a team has only one living player, control never changes for that team.

### End

When one team dies:

- flappy simulation stops
- the normal end-game reveal / `completeGame(game, winner)` flow runs
- the winning team is the team whose bird survived

## Scope Gate

MVP only enables flappy when all of the following are true:

- `general.flappyMode === true`
- game is standard SH or custom SH only
- game is not blind mode
- game is not Avalon SH
- game is not Monarchist SH
- game-ending condition is policy-track victory

If any of those conditions are false, existing behavior remains unchanged.

## State Model

### New / Updated Fields

Add a `flappyState` object on the in-memory game object. Initial draft:

```js
flappyState: {
  isActive: true,
  status: 'running', // running | finished
  winningTeam: null,
  passedGapCount: 0,
  tickIntervalId: null,
  spawnIntervalId: null,
  startedAt: number,
  liberal: {
    controllerOrder: string[],
    controllerIndex: number,
    controllerUserName: string,
    bird: {
      y: number,
      velocity: number,
      alive: true
    }
  },
  fascist: {
    controllerOrder: string[],
    controllerIndex: number,
    controllerUserName: string,
    bird: {
      y: number,
      velocity: number,
      alive: true
    }
  },
  pylons: [
    {
      id: string,
      x: number,
      gapTop: number,
      gapBottom: number,
      counted: false
    }
  ],
  config: {
    tickMs: number,
    gravity: number,
    flapVelocity: number,
    laneHeight: number,
    laneWidth: number,
    birdX: number,
    birdWidth: number,
    birdHeight: number,
    pylonWidth: number,
    pylonSpeed: number,
    gapSize: number,
    spawnMs: number
  }
}
```

### Game Phase

Add a phase constant or convention:

- `flappyHitler`

This phase prevents normal election/policy interaction and lets the frontend branch cleanly.

## Authority Model

### Server Responsibilities

- start flappy
- maintain bird state
- maintain pylon state
- simulate gravity and movement
- detect passed gaps
- rotate controllers
- detect collisions / out-of-bounds
- decide winner
- broadcast snapshots

### Client Responsibilities

- render current snapshot
- send flap intent
- show which player currently has control
- show team reveal state

### What Clients Must Not Decide

- collisions
- passed gaps
- controller changes
- winner
- spawn timing

## Socket Protocol

### Incoming Client Event

Reuse or replace the old `flappyEvent` path with a stricter contract.

Recommended action:

- keep the event name `flappyEvent`
- change payload handling to be server-authoritative and validated

Allowed input shapes:

```js
{
  uid: string,
  type: 'flap'
}
```

The server infers acting username from socket session. Client should not be trusted to provide team or controller identity.

### Outgoing Server Event

Two reasonable options:

- put flappy snapshot on `gameUpdate`
- or send `flappyUpdate` separately

Recommended MVP:

- keep high-level phase/status on `gameUpdate`
- send frame data on `flappyUpdate`

Reason:

- `gameUpdate` already carries table state and phase changes
- a lighter `flappyUpdate` avoids shoving large chat/game objects across the wire every tick

Suggested snapshot:

```js
{
  type: 'snapshot',
  passedGapCount: number,
  liberal: {
    controllerUserName: string,
    bird: { y: number, alive: boolean }
  },
  fascist: {
    controllerUserName: string,
    bird: { y: number, alive: boolean }
  },
  pylons: [
    { id: string, x: number, gapTop: number, gapBottom: number }
  ]
}
```

Other events:

- `start`
- `rotateControl`
- `finish`

These can be separate event types or just encoded in the snapshot plus `gameUpdate`. MVP should favor simplicity over elegance.

## Backend Integration Plan

### 1. Add a Flappy Engine Module

Create a dedicated module, likely:

- `routes/socket/game/flappy.js`

Responsibilities:

- `canStartFlappy(game)`
- `startFlappy(game)`
- `handleFlappyInput(socket, game, data)`
- `broadcastFlappySnapshot(game)`
- `advanceFlappy(game)`
- `rotateFlappyControllers(game)`
- `finishFlappy(game, winningTeam)`
- `cleanupFlappy(game)`

### 2. Replace Dead Handler

Current `routes/socket/user-events/flappy-hitler.js` is disabled by an immediate `return`.

Options:

- delete and replace with calls into the new module
- or keep filename and make it a thin wrapper

Recommended:

- keep the file path for minimal routing churn
- rewrite it as a thin validated wrapper around `game/flappy.js`

### 3. Hook Policy-Win Paths

Current policy-win completion happens in:

- `routes/socket/game/election.js`
- `routes/socket/game/policy-powers.js`

When policy-track victory is reached:

- call `canStartFlappy(game)`
- if true, call `startFlappy(game)`
- otherwise preserve existing `completeGame(...)`

### 4. Do Not Hook Other Endings in MVP

Leave these unchanged:

- Hitler elected
- assassination outcomes
- Merlin assassination
- moderation force-end

### 5. Secure Input

For a `flap` input:

- validate `game.flappyState.isActive`
- validate current phase is `flappyHitler`
- validate acting user is seated and alive
- validate acting user is current controller for their team
- apply flap impulse only if valid

### 6. Cleanup

On finish or table destruction:

- clear tick interval
- clear spawn interval
- delete or mark `flappyState`

This is important to avoid orphaned intervals and broken tables.

## Frontend Integration Plan

### 1. Replace Hardcoded Gate

`Game.jsx` currently hardcodes:

```js
const isFlappy = false;
```

Replace with a real check based on game phase or `flappyState.isActive`.

Recommended:

```js
const isFlappy = gameInfo.gameState && gameInfo.gameState.phase === 'flappyHitler';
```

### 2. Rewrite `Flappy.jsx`

Current `Flappy.jsx` is not reusable as-is. It owns:

- local bird physics
- local pylon positions
- local collision detection
- automatic `startFlappy`

All of that should move to the server except rendering and input.

New `Flappy.jsx` should:

- subscribe/unsubscribe cleanly to `flappyUpdate`
- render two lanes from server snapshots
- emit `flappyEvent: { type: 'flap' }` on click / keypress for the local user
- visually indicate current controller for each team
- display passed gap count and current status

### 3. Team Reveal UI

When flappy starts, team alignment should become public.

Recommended MVP presentation:

- show public card-backs as liberal/fascist team cards, not full role cards
- add a visible controller marker to the current controlling seat

The seat system already supports card-back class composition and icon variants. MVP should use that rather than inventing a whole new seat widget.

### 4. Controller Marker

Recommended simple UI:

- small plane icon or ring on the current controlling seat
- duplicate this in the flappy lane HUD text:
  - `Liberals: controlled by X`
  - `Fascists: controlled by Y`

### 5. Input

MVP input methods:

- click / tap on the lane
- keyboard key for convenience, e.g. `Space`

The server should still ignore input from non-controllers.

## Physics / Tuning Defaults

These are initial placeholders only and should be tuned with the sandbox.

- tick rate: `50ms`
- spawn interval: `1600ms`
- bird X: fixed near left side of lane
- gravity: modest, arcade-feel
- flap impulse: strong enough to recover from mid-gap
- gap size: forgiving but not trivial
- pylon speed: moderate

Important design preference:

- MVP should err easy rather than brutal

The whole point is a funny tiebreaker, not a precision esports mode.

## Local Testing Plan

### Existing Helpers

The repo already includes:

- `yarn dev`
- `yarn create-accounts`
- `yarn assign-local-mod`

Those create quick local users and a local admin.

### New MVP Test Helper

Add one admin-only dev tool:

- `Force Flappy`

Behavior:

- only available in development
- only available to admin / local mod
- only available on a started table
- takes the current table directly into `flappyHitler`

This avoids needing to play a whole match to terminal policy state every time.

Recommended placement:

- existing moderation/gamechat admin controls
- or a temporary dev-only button

### Optional Secondary Helper

If physics tuning is awkward, add a second dev helper:

- `Flappy Sandbox`

This could be:

- a temporary route/hash, or
- a dev-only fake table entry

Use it only if tuning inside real table flow is too annoying.

## Reconnect / Observer Rules

### Reconnect

If a player reconnects during flappy:

- they rejoin the table normally
- they receive current `gameUpdate`
- they receive the latest flappy snapshot
- if they are current controller, they may immediately flap

### Observers

Observers can watch flappy.

Observers:

- receive snapshots
- cannot flap
- can see controller indicators
- can see revealed teams

## Chat / Status

Recommended status flow:

- `Flappy Hitler begins. Policy victory is suspended.`
- `FLAPPY HITLER: Control rotates every 3 passed gaps.`
- `Liberals are now controlled by X. Fascists are now controlled by Y.`
- `Control rotates: Liberal -> X, Fascist -> Y`
- `Liberals crash! Fascists win the game.`

Gamechat messages should be concise and explicit. Status text should update, but not spam every tick.

## Files Likely Touched

- `FLAPPY_SPEC.md`
- `routes/socket/game/flappy.js` (new)
- `routes/socket/user-events/flappy-hitler.js`
- `routes/socket/routes.js`
- `routes/socket/game/election.js`
- `routes/socket/game/policy-powers.js`
- `routes/socket/util.js`
- `src/frontend-scripts/components/section-main/Game.jsx`
- `src/frontend-scripts/components/section-main/Flappy.jsx`
- `src/frontend-scripts/components/section-main/Players.jsx`
- `src/scss/...` for controller marker / flappy lane styles

Potentially:

- moderation or gamechat UI for dev-only `Force Flappy`

## Risks

### 1. Interval Cleanup

This codebase has many delayed transitions already. Flappy adds another timed system. If cleanup is sloppy, stale intervals will survive after finish or table deletion.

### 2. Desync / Input Feel

Server authority is correct, but input may feel sluggish if snapshots are too sparse. Tick rate and broadcast strategy need to be "good enough" without overengineering.

### 3. Seat Reveal Semantics

Revealing teams publicly is straightforward in standard/custom SH, but gets messy with blind mode and variants. This is why MVP excludes them.

### 4. Legacy UI Entanglement

`Game.jsx`, `Players.jsx`, and the table shell are old and tightly coupled. The main UI risk is making flappy fit without breaking normal table rendering.

### 5. No Replay Support

MVP will create a state transition replays do not understand. That is acceptable for MVP, but should be documented.

## Estimate

### Implementation

- backend flappy state machine and routing: 1.5 to 2 days
- frontend render/input/controller UI: 1 to 1.5 days
- dev helper and tuning: 0.5 to 1 day
- testing / bug fixing: 0.5 to 1 day

Total MVP estimate:

- about 3 to 5 days

### Risk Level

- overall: moderate

Not because the feature itself is huge, but because it touches end-game transitions, sockets, and legacy UI.

## Open Questions

- Should control rotation happen exactly on every 3rd passed gap globally, or separately per team lane?
  - Recommendation: global.
- Should team reveal use actual membership card-backs, or just a lighter visual team indicator?
  - Recommendation: membership/team indicator, not full role reveal.
- Should the flappy bird use the default cardback image, or a new dedicated sprite?
  - Recommendation: use existing assets first, add a sprite only if needed.
- Should there be sound for flap/crash/rotation in MVP?
  - Recommendation: no new sounds in MVP.

## Recommended First Implementation Order

1. Add the backend flappy engine and validated input path.
2. Add the policy-win interception hook.
3. Add `gameState.phase = 'flappyHitler'`.
4. Rewrite `Flappy.jsx` as a render-only client for server snapshots.
5. Add team reveal and controller markers.
6. Add the dev-only `Force Flappy` tool.
7. Tune physics and fix reconnect/cleanup bugs.

## Final Recommendation

Do the MVP exactly once, narrowly:

- policy-win replacement only
- standard/custom SH only
- server-authoritative simulation
- rotate controllers every 3 passed gaps
- dev-only force-start helper for testing

That is the smallest version that feels real rather than gimmicky.
