# Cardback / player-seat card vertical-offset bug

## Symptom

On the player seats, the role cards under each player were rendering a few pixels
"off" at the **bottom**. With custom cardbacks in play, you could see the bottom edge
of the fascist (role) cards bleeding through / peeking out underneath the cardback
image — the cards looked like they were sitting a couple pixels too high, clipping
against the bottom edge of the seat instead of tucking cleanly under it.

This showed up on prod, on the player-seat rendering (`.player-container` /
`.card-container`).

## How the seat/card rendering works

Relevant DOM (see `src/frontend-scripts/components/section-main/Players.jsx`) and CSS
(`src/scss/players.scss`):

- `.player-container` — the seat. Fixed `height: 95px`. Its **background** is the
  player's custom cardback image
  (`src/frontend-scripts/components/section-main/Players.jsx:417`,
  `background-size: cover`), or the default cardback.
- `.card-container` — an absolutely-positioned child (95px tall) that holds the actual
  role card (`Players.jsx:495`). It slides between two positions:
  - **resting / hidden:** tucked below the seat, off-screen.
  - **`.showing`:** slid up to cover the seat — the ` showing` class is toggled at
    `Players.jsx:504` (used during the fascist reveal, powers, executions, etc.).
- Inside it, `.card.card-front` (`Players.jsx:521`, always `secretrole`, the grey
  generic face) and `.card.card-back` (`Players.jsx:540`, the real role, e.g.
  `fascist3`) form a 3D flip card (`transform-style: preserve-3d`,
  `.flipped { rotateY(180deg) }`).

The card images (`fascist*.png`, `secretrole.png`, `default_cardback.png`) are all
exactly **70×95**, matching the seat.

Because both the seat and the card are 95px, their alignment depends entirely on the
`top` offsets used for the resting and `.showing` positions. Those offsets are what
broke.

## Where it came from

Two recent PRs touched `.card-container` in `src/scss/players.scss`
(the two rules now live at `players.scss:208` for `.card-container` and
`players.scss:385` for `.card-container.showing`). The original, known-good CSS was:

```scss
.card-container {
    top: 100px;          // resting: 5px below the 95px seat -> clean clearance
    position: relative;
}
.card-container.showing {
    // prevents 1px gap showing below card
    top: 1px;            // shown: nudged down 1px so it fully covers the bottom
}
```

1. **PR #2011 — `9e484bd5` "Changed UI to not have the crown push down ballets"**
   Changed `.card-container` from `position: relative` to `position: absolute`.
   This is a legitimate fix (takes the card out of normal flow so the crown token no
   longer pushes the ballots down) and is **not** the cause of this bug.

2. **PR #2015 — `8f0bb378` "revised #2011"** — this is the regression. It:
   - changed the resting position `top: 100px` → `top: 100%`
     (`100%` of the 95px seat = exactly `95px`, i.e. flush with the seat's bottom edge,
     **zero clearance** instead of the previous 5px), and
   - changed `.showing` `top: 1px` → `top: 0`, **deleting** the offset — along with the
     comment that literally read `// prevents 1px gap showing below card`.

With zero clearance the card sits flush against the seat's bottom edge, so any
sub-pixel rounding lets its bottom edge bleed through / peek at the bottom of the seat.
The comment that was removed was the original author's note that this exact 1px offset
existed specifically to stop that bottom gap. Removing it re-introduced the very bug it
was guarding against.

## The fix

Reverted only the two offset values that PR #2015 changed, and restored the
explanatory comment. The `position: absolute` crown fix from PR #2011 is deliberately
kept.

```scss
.card-container {              // players.scss:208
    top: 100px;                // players.scss:211 — restored: 5px clearance below seat
    ...
    position: absolute;        // players.scss:216 — kept from PR #2011 (crown fix)
}
.card-container.showing {      // players.scss:385
    // prevents 1px gap showing below card
    top: 1px;                  // players.scss:387 — restored: fully covers to the bottom
}
```

File changed: `src/scss/players.scss` (lines `211` and `385`–`387`).

## Notes / things to keep in mind

- **The crown fix is intentionally preserved.** Only the `top` offsets were reverted,
  not `position`. Don't re-flatten these back to `top: 100% / top: 0` without also
  re-solving the bottom-gap — that's what caused this.
- **This 95px layout is offset-sensitive.** The seat and the card are both exactly
  95px, so alignment relies entirely on these hardcoded offsets. If the seat height,
  card height, or card art dimensions ever change, these `top` values need to be
  revisited together.
- **CSS build step.** `players.scss` is compiled into `public/styles/style-main.css`
  by Vite (it's part of the bundle, not one of the `sass` CLI `build-css:*` scripts).
  The change takes effect on the next build; `pnpm run start` (`vite build --watch`)
  picks it up automatically. If the watcher isn't running, a `pnpm build` is needed
  before it shows.
- `public/styles/style-dark2.css` has its own, different card-container values
  (`top: 100px`, `.showing { top: 1px }`, `background-size: contain`), but that
  stylesheet is **not** loaded by `views/layout.pug` (which pulls `style-main.css` at
  `layout.pug:13` and `style-dark.css` at `layout.pug:15`), so it wasn't involved.
</content>
