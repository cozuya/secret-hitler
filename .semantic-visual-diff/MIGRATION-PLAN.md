# Lucide icon migration — plan

Status: proposal (exploration done in `.semantic-visual-diff/`). Nothing here is
committed. Old Semantic icon font stays live through the whole migration, so there is
never a broken intermediate state.

## Decisions already made (see prior exploration)

- Semantic 2.4.1 → Fomantic 2.9.4 upgrade: **rejected** (~0.44% visual delta; icons are
  the same FA family — no refresh). A CSS "skin" was also tried and rejected.
- **Lucide** is the chosen icon refresh. All 30 in-app font icons map cleanly to Lucide.
- Account theming (`--theme-secondary` tints `i.icon`) is compatible: Lucide uses
  `stroke="currentColor"`, so it inherits the accent the same way — *if* we re-point the
  themed CSS at the new element (see Step 0).

## Guiding principle: size-neutral by construction

The one show-stopper class of bug is **layout/wrapping regressions** from icon footprint
changing. We neutralize it up front instead of hunting for it.

Measured (220px container, 14px text):

| variant | footprint | box height |
|---|---|---|
| Semantic font icon | 20px | 47px |
| Lucide naive (24px SVG) | 24px | 56px |
| **Lucide + box shim** | **20px** | **47px** |

The **box shim** makes Lucide occupy Semantic's exact icon box:

```css
.lucide-icon {
  display: inline-block;
  width: 1.18em;            /* Semantic .icon width  */
  height: 1em;              /* Semantic .icon height */
  margin: 0 .25rem 0 0;     /* Semantic .icon margin */
  vertical-align: baseline;
}
.lucide-icon svg { width: 100%; height: 100%; display: block; stroke-width: 2.25; }
```

Because the box is `em`-based, every existing `font-size`-driven size rule keeps working.

## How we catch what slips through: geometry diff, NOT pixels

Pixel regression can't distinguish "icon art changed" (expected) from "row wrapped"
(bug). So the verification harness measures **DOM geometry** before/after per icon context
and asserts equality:

- `container.offsetHeight` unchanged (height growth ⇒ taller line-box or a new wrap)
- `container.getClientRects().length` unchanged (line-box count ⇒ wrap)
- `el.scrollWidth <= el.clientWidth + 1` (no new overflow)

Output is a precise defect list ("these N containers grew/wrapped"), not a pile of
screenshots. `wrap-test.mjs` in this folder is the seed of that harness.

## Step 0 — foundations (one commit, no visible change)

1. Add `lucide-react` to `package.json` (frontend dep) via `pnpm add lucide-react`.
2. Add a single shared `<Icon>` wrapper component (e.g. `components/reusable/Icon.jsx`)
   that renders the lucide-react glyph inside the `.lucide-icon` shim span, accepts
   `name`, `size`, `className`, and forwards click handlers. All call sites go through it
   so metrics + theming are uniform.
3. Add the `.lucide-icon` shim CSS, and **re-point the themed icon rules** so they match
   both old and new during migration, e.g.:
   - `i.icon` → `i.icon, .lucide-icon` for the `color: var(--theme-secondary)` /
     hover `--theme-tertiary` rules in `style-dark.scss`.
   - Per-icon size/color rules (`.remove.icon { font-size: 30px }`,
     `.setting.icon.large`, `.lock.icon.green`, `.status.icon`) get matching
     `.lucide-icon` variants, OR are expressed via the wrapper's `size`/`color` props.
4. No icons swapped yet — this commit is inert.

## Step 1..N — migrate per component, incrementally

Order: least-risky first (static/leaf components), tight/critical containers last
(buttons with labels, `Menu.jsx`, the playerlist rows, chat lines).

Each commit:
1. Replace that component's `<i class="x icon">` (and any `<Icon name>` from
   semantic-ui-react) with the shared `<Icon name="…">`.
2. For each swapped icon, set `size`/`color` to match what Semantic rendered there
   (the geometry harness confirms equality).
3. Run the **geometry harness** over that component's contexts → zero height/wrap deltas.
4. Eyeball only the contexts the harness flags (should be ~none with the shim).

## Icon mapping (30 in-app font icons → Lucide)

| concept | semantic class | lucide name | note |
|---|---|---|---|
| remove / close | `remove` | `x` | sized 30px in chat (`.remove.icon`) |
| settings | `setting` | `settings` | `large` variant exists |
| info circle | `info circle` | `info` | |
| hourglass / timer | `hourglass half` | `hourglass` | |
| handshake / peace | `handshake` | `handshake` | |
| fast forward / skip | `fast forward` | `fast-forward` | |
| thumbs up | `thumbs up` | `thumbs-up` | |
| spy / hidden role | `spy` | `venetian-mask` | judgment call — confirm art |
| smile / emote | `smile` | `smile` | |
| shield | `shield` | `shield` | |
| mute | `mute` | `volume-x` | |
| lock | `lock` | `lock` | `.lock.icon.green` is fixed-color |
| gavel / mod | `gavel` | `gavel` | |
| chess king / hitler | `chess king` | `crown` | judgment call — confirm art |
| swap horizontal | `arrows alternate horizontal` | `move-horizontal` | |
| hide / eye-off | `hide` | `eye-off` | |
| plane / flappy | `plane` | `plane` | |
| play | `play` | `play` | |
| forward / next | `forward` | `skip-forward` | |
| sign out | `sign out` | `log-out` | |
| share | `share` | `share-2` | |
| ban | `ban` | `ban` | |
| filter | `filter` | `filter` | |
| user | `user` | `user` | |
| help circle | `help circle` | `circle-help` | |
| window minus | `window minus` | `square-minus` | |
| checkmark | `checkmark` | `check` | |
| angle right | `angle right` | `chevron-right` | |
| angle left | `angle left` | `chevron-left` | |
| repeat | `repeat` | `repeat` | |

## Non-JSX / out-of-scope

- **Server-rendered Pug** (`views/*.pug`) icons: handled separately — inline SVG or a
  small include helper. Small list; do after the JSX bulk.
- **Custom sprites** (`crown-icon`, `crown-captain-icon`, `victory-icon`, `rainbow-icon`,
  `standard-icon`): background-image art, NOT font icons — **left untouched**.
- **Fixed-color icons** (`.lock.icon.green`): carry the explicit color via the wrapper's
  `color` prop.

## Open items to confirm with Chris

- Judgment-call mappings: `spy`→venetian-mask, `chess king`→crown.
- Default `stroke-width`: 2.25 proposed; bump to ~2.5 for sub-16px contexts on
  low-contrast custom themes.
