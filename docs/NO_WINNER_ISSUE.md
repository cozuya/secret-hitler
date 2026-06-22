# No-Winner Issue — `buildEnhancedGameSummary.js`

**Status:** OPEN — deferred pending a domain decision (affects real game records / ELO, so it
was not auto-fixed during the jun-17 cleanup).
**File:** `models/game-summary/buildEnhancedGameSummary.js`
**Origin:** pre-existing; surfaced in the jun-17 code reviews and listed "below the cut" in
`REGRESSION_BUG_TRIAGE_JUN17-1.md`.

## TL;DR

When a completed game's **final turn has no enacted policy** and none of the explicitly-handled
end conditions matched, `winningTeam` is computed as `null`. Every player's `isWinner` then
compares their loyalty against `null` and is `false`, so **everyone is recorded as a loser** for
that game, and the summary's `winningTeam` is persisted as `null`.

## Where

The `winningTeam` IIFE (≈ lines 95–117):

```js
const winningTeam = (() => {
  const lastTurn = turns.last();

  if (lastTurn.isMerlinShot) {
    return "fascist";
  }
  if (summary.gameSetting.noTopdecking > 0 && lastTurn.isElectionTrackerMaxed) {
    return "fascist";
  }
  if (lastTurn.isHitlerElected) {
    return "fascist";
  } else if (lastTurn.isHitlerKilled) {
    return "liberal";
  } else {
    if (!lastTurn.enactedPolicy) {
      console.log("no lastturn enacted policy @ buildenhancedgamesummary");
      return null;            // <-- the no-winner case
    }
    return lastTurn.enactedPolicy.value();
  }
})();
```

Consumed by `isWinner` (≈ line 178):

```js
const isWinner = (username) => loyaltyOf(username).map((l) => l === winningTeam);
```

…and exported on the summary object as `winningTeam` (≈ line 190).

`turns` comes from `buildTurns(summary.logs, players, summary.gameSetting)` (line 78); the final
turn is whatever the last log entry produced.

## Why it matters

`isWinner` / `winningTeam` flow into `updateProfiles` at game end
(`routes/socket/game/end-game.js` → `models/profile/utils.js` `profileDelta`), which records
per-player win/loss into profile stats. A `null` `winningTeam` means **every player takes a loss**
for a game that someone actually won — corrupting win/loss records (and anything derived from them).

This is exactly why it was **not** patched blindly: choosing the wrong winner here mis-records real
ranked games. The original author chose to log and return `null` rather than guess.

## When it triggers (needs confirmation against the turn model)

The `else` branch assumes the game ended on a **policy enactment** (the 5th liberal or 6th fascist
policy). It returns `null` whenever the final turn carries no `enactedPolicy` and the game didn't
end via one of the four handled paths (Merlin shot, topdeck/election-tracker-maxed, Hitler elected,
Hitler killed).

The most likely concrete trigger is a game that ends on an **execution rather than a policy** —
specifically **shooting the last living liberal**, which `policy-powers.js` resolves as a fascist
win (`!libAlive → completeGame(game, "fascist")`). That end state is **not** represented among the
four handled conditions, and an execution turn has no `enactedPolicy`, so it would fall through to
`null`.

> ⚠️ This trigger is inferred from the game-end logic; it should be confirmed against `buildTurns`
> (how the final execution turn is modeled, and whether `enactedPolicy` is ever carried over).
> There may be other paths (e.g. certain Avalon / monarchist end states) that also land here.

## Resolution options (pick one)

1. **Derive the winner from the final track counts.** If `liberalPolicyCount >= 5` → liberal; if
   `fascistPolicyCount >= 6` → fascist; otherwise fall back to the execution/role-based outcome
   (e.g. no living liberals → fascist). Most faithful to the rules, but needs the final track/role
   state available at this point in the summary.
2. **Reuse the authoritative result the engine already computed.** `completeGame(game, winningTeam)`
   in `end-game.js` already knows the winner — if that value is stored on the summary, read it here
   instead of re-deriving from the last turn. (Likely the cleanest fix if the field exists / can be
   added.)
3. **Treat it as a no-result game.** If the winner genuinely can't be determined, make `isWinner`
   return `none`/undefined for everyone (so nobody is recorded as a *loss*) rather than `false`.
   Safer than today's behavior, but records no win either.
4. **Confirm it can't actually happen** and replace the `null` return with a hard error/alert so it
   surfaces loudly instead of silently zeroing everyone out.

## Open questions for Chris

- Which end states legitimately reach the `else` with no `enactedPolicy`? (Last-liberal execution is
  the suspected one — are there others?)
- Does the persisted game summary already carry the engine's decided winner (option 2), or must it
  be re-derived (option 1)?
- For a truly indeterminate game, is the desired behavior "everyone loss" (today), "no result"
  (option 3), or "should never happen, error" (option 4)?

## Where to make the change

`models/game-summary/buildEnhancedGameSummary.js`, the `winningTeam` IIFE (and possibly `isWinner`
for option 3). No automated gameplay coverage exists — any change needs a manual check that a normal
5-blue / 6-red / Hitler-elected / Hitler-shot game still reports the correct winner, plus the
specific edge case (last-liberal execution) now reports fascist.
