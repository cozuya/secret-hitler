# secrethitler.io — DigitalOcean → Render migration runbook

End-to-end cutover: app to Render, MongoDB to Atlas Flex, custom cardbacks to a Render Persistent
Disk. DO stays fully live until DNS is flipped and we've confirmed Render is healthy. Designed to be
executed in **one cutover window**, de-risked by a **dry run** beforehand.

> Convention: `[DO]` = run on the DigitalOcean droplet, `[ATLAS]` = Atlas UI / mongosh against Atlas,
> `[RENDER]` = Render dashboard or `render ssh`, `[LOCAL]` = your machine, `[DNS]` = DNS provider.
> Anything marked **DECIDE** needs a judgment call before/at that step.

---

## 0. What we're moving (inventory)

| Thing | From (DO) | To (Render) |
|---|---|---|
| Node app (Express + socket.io) | droplet, pm2 | Render web service, `node bin/dev.js`, 1 instance |
| MongoDB | self-hosted on droplet (`secret-hitler-app` db) | Atlas Flex |
| Sessions / global settings | Redis on droplet (or wherever) | shared Render Key Value, db 10 / 11 |
| Custom cardbacks | droplet FS `public/images/custom-cardbacks/*.png` | Render Persistent Disk `/var/data/cardbacks` |
| Static build output | built on droplet | built by Render `buildCommand` |
| DNS / TLS | (current provider, likely Cloudflare) | DNS points at Render; TLS via Render or Cloudflare |

Already done in code (branch `jun-24`): cardback dir is now `CARDBACK_DIR`-driven, the upload crash is
fixed, and `render.yaml` declares the disk + env. See `docs/` history / the diff.

---

## 1. Pre-flight (do days ahead — no downtime, fully reversible)

### 1a. Provision Atlas Flex
1. `[ATLAS]` Create the Flex cluster in **the same region as Render (Virginia / us-east-1)** to keep
   latency low.
2. `[ATLAS]` Create the DB user the app will use (read/write on `secret-hitler-app`).
3. `[ATLAS]` **IP allowlist** — Render egress is **not static by default**. Choose one **DECIDE**:
   - Enable Render's **static outbound IPs** add-on and allowlist exactly those, **or**
   - Allowlist `0.0.0.0/0` and rely on a strong DB password + SRV/TLS (simpler, less tight).
4. `[LOCAL]` Confirm you can connect: `mongosh "<atlas-srv-uri>/secret-hitler-app"`.

### 1b. Confirm Redis / Key Value
- `[RENDER]` Verify the shared Render Key Value instance is reachable on its **internal** URL from the
  Virginia region, and that db 10 (sessions) / db 11 (global settings) are free of collisions (the
  other app owns db 0–9). This is the existing arrangement — just confirm before cutover.

### 1c. Secrets — fill EVERY `sync: false` in the Render dashboard
From the current production `.env`. Missing any of these silently breaks a feature:
- `MONGO_URL` — the **Atlas** SRV string, including `/secret-hitler-app` in the path.
- `REDIS_URL` — the Render Key Value **internal** URL.
- `SECRETSESSIONKEY` — **must be set** (otherwise sessions sign with `"hunter2"`).
- `DISCORDCLIENTID` / `DISCORDCLIENTSECRET`, `GITHUBCLIENTID` / `GITHUBCLIENTSECRET`.
- `MGKEY` / `MGDOMAIN` (Mailgun), `DISCORDREPORTURL`, `DISCORDADMINPING`, `DISCORDCRASHURL`,
  `DISCORDPRIVATEDEVELOPERS`, `GETIPINTELAPIEMAIL`.
- Non-secret (already in `render.yaml`): `NODE_ENV`, `NODE_VERSION`, `HUSKY=0`, `CARDBACK_DIR`.

### 1d. OAuth redirect URIs **DECIDE**
The strategies use **relative** `callbackURL`s and there is **no `app.set('trust proxy')`**. Two
implications:
- **For testing on the temp Render URL:** add `https://<temp>.onrender.com/discord/login-callback`
  and `.../github/login-callback` to the Discord and GitHub OAuth apps, **or** skip OAuth on temp and
  test with local username/password accounts (see §4).
- **Behind Render's proxy:** verify the redirect resolves to **https** (registered URIs are https). If
  it resolves to http, set `app.set('trust proxy', true)` (small code change) and re-test. Validate
  this on the temp URL in §4 — don't discover it at cutover.

### 1e. Test build on Render (no traffic)
- `[RENDER]` Do a **trial deploy of branch `jun-24`** (service paused / no domain) to confirm the
  recent vite/biome/node-24 tooling builds green on Render's builder before cutover night.

### 1f. Lower DNS TTL
- `[DNS]` Drop the TTL on the records you'll flip (apex `secrethitler.io` + `www`) to **300s** at least
  a day ahead, so the cutover propagates fast and rollback is quick.

### 1g. Audit the droplet for out-of-app jobs
- `[DO]` `crontab -l` (and `/etc/cron.*`) — look for mongodump backups, TLS renewals, log rotation,
  season-reset or maintenance scripts. Anything not inside the Node app needs re-homing (Render Cron
  Jobs) or retiring. The app's own timers are in-process (`setInterval`) and move with it.

---

## 2. Dry run (rehearsal — do this BEFORE cutover night)

The point of the dry run is to (a) prove the data pipeline and (b) **measure how long the Atlas
restore takes**, since that time = your cutover downtime.

1. `[DO]` Take a **throwaway** dump (see §5 for the real commands) and run the **slimming** (§6) on a
   *staging copy*, never on live.
2. `[ATLAS]` Restore the slim dump into a **separate** `secret-hitler-app-staging` database (or a
   throwaway Flex cluster). **Time it.**
3. `[RENDER]` Point the trial deploy's `MONGO_URL` at the staging DB, bring it up on its temp URL, and
   run the §4 smoke test end to end.
4. Fix anything that breaks (trust proxy, allowlist, missing secret, index issues) **now**, while there's
   no clock running.
5. Tear down staging. You now know the exact cutover sequence and the restore duration.

---

## 3. The freshness problem — CHOSEN: maintenance window (model A)

DO keeps taking writes (new games, signups, XP) the entire time you prep. **Anything written on DO
after the final dump is lost at cutover.** So the *real* data load must happen during a write freeze
right before the DNS flip — not days earlier.

**Decision (locked): A — maintenance window.** Announce downtime, freeze writes on DO (take the site
down or read-only), do the final dump → slim → restore → smoke → flip DNS in one window. Downtime ≈
the restore time measured in the dry run (§2). The dry run is what makes this safe; if it shows the
restore is unacceptably long, fall back to **B**, otherwise stay on A.

- **B. Bulk-early + small delta (fallback only).** Restore the full slim dump early; at cutover freeze
  DO and re-dump **only the collections that change** (accounts/profiles/games), restore just those
  with `--drop`, then flip. Shorter window, more moving parts — only if A's restore is too long.
- **C. Oplog point-in-time.** Only if DO's mongod is a **replica set**. Probably not — skip.

Default to **A**, using the dry-run timing to decide if you need **B**.

---

## 4. Smoke test checklist (run on the temp Render URL, every pass)

Log in and exercise the real paths:
- [ ] App boots clean on Render (logs show Mongo connected, Redis connected, no FATAL).
- [ ] Page loads, assets (bundle.js / style-main.css) 200, no console errors.
- [ ] **Log in** as an existing migrated account (local username/password). Session persists across
      reloads. (OAuth only if §1d redirect URIs were added.)
- [ ] **Create a game**, join with a second browser/account, **play a few elections** — confirm
      socket.io realtime works over WebSocket on Render.
- [ ] **Saves persist:** change a game setting / earn XP → reload → it stuck (writes reaching Atlas).
- [ ] **Cardback upload** (rainbow account): uploads, renders, file lands on the disk
      (`render ssh` → `ls /var/data/cardbacks`), and **survives a manual redeploy**.
- [ ] **Existing migrated cardback** renders for an old user.
- [ ] A forced write failure returns an error and does **not** crash the process.
- [ ] Signup→verify flow: note links email `https://secrethitler.io` (hardcoded), so on temp either
      test with already-verified migrated accounts or manually flip `verification` in the temp DB.

---

## 5. MongoDB: dump from DO

`[DO]` (adjust db name / auth to the droplet's actual mongod):
```sh
mongodump --uri="mongodb://<user>:<pass>@localhost:27017/secret-hitler-app" \
          --gzip --archive=/tmp/sh-prod-$(date +%F).archive
```
- Use `--gzip --archive` (single file, easy to move).
- `[LOCAL]` Pull it down: `scp <user>@<droplet>:/tmp/sh-prod-*.archive .`
- Check tool versions are compatible (`mongodump --version`); Atlas Flex runs a current server, which
  happily restores older dumps.

> **Already done once** (`../shiodata/`): `sh-prod-full.archive.gz` (5.6 GB) is a prior full dump and
> `sh-prod-slim.archive.gz` (713 MB) the slim build. At cutover you take a **fresh** dump (the old one
> is stale), but the tooling and the slim policy below are already proven.

## 6. Slimming — use the existing `build-slim.mjs`

The data is dominated by one collection. Real sizes from the local restore (`../shiodata/sizes.mjs`):

| collection | docs | data | storage | note |
|---|---|---|---|---|
| **games** | 1.35M | **30.3 GB** | 9.9 GB | the whale — embedded chats/replays, ~23 KB/doc |
| gamesummaries | 901k | 3.5 GB | 0.8 GB | per-retained-game logs |
| accounts | 745k | 1.5 GB | 1.1 GB | **kept full** — can't drop users → this is the Flex floor |
| profiles | 154k | 0.37 GB | 0.06 GB | kept full |
| signups | 816k | 0.14 GB | | |
| everything else | | < 0.1 GB | | playerreports, modactions, chats, etc. |
| **TOTAL** | | **~36 GB** | ~12 GB | |

So slimming = **trim `games` by date**, cascade to `gamesummaries` and the `account.games[]` /
`profile.recentGames[]` references, copy everything else verbatim. That's exactly what
`../shiodata/build-slim.mjs` already does:

```sh
# against a LOCAL mongod holding the fresh full dump (never run on live prod):
SRC_DB="secret-hitler-app" DST_DB="sh-prod-slim" CUTOFF_DAYS="365" node build-slim.mjs
mongodump --uri="mongodb://localhost:27017" --db=sh-prod-slim --gzip --archive="sh-prod-slim.archive.gz"
```
- `CUTOFF_DAYS` is the main lever (keep N days of games). 365 → ~713 MB gzipped last time.
- The script prints per-collection slim sizes at the end — **check the total against the Flex ceiling**
  (below) before restoring.

> Keep the **full, un-slimmed** dump (`sh-prod-full.archive.gz`) as the canonical backup before you cut.

## 7. Restore to Atlas (slowly)

`[LOCAL]` — note the namespace remap (slim DB is named `sh-prod-slim`, app expects `secret-hitler-app`):
```sh
mongorestore --uri="<atlas-srv-uri>" --gzip --archive="sh-prod-slim.archive.gz" \
             --nsFrom="sh-prod-slim.*" --nsTo="secret-hitler-app.*" \
             --numInsertionWorkersPerCollection=1   # gentle on Flex's throughput
```
- **⚠️ Atlas Flex storage ceiling is ~5 GB.** `accounts` alone is ~1.1 GB storage (kept full), plus
  recent `games`/`gamesummaries` — the slim restore likely lands ~2.5–3.5 GB, which fits, but
  **confirm against the build-slim size printout**. If it's tight: lower `CUTOFF_DAYS`, or strip the
  embedded `chats`/replays from older retained games.
- **⚠️ The prior full restore logged 15 failed docs** (`restore-full.log`) — almost certainly oversized
  `games` docs. Confirm which, and that none are in the *retained* slim window, before trusting it.
- Flex has limited ops/sec — keep workers low; expect this to be the slow step (you timed it in the dry run).
- **DECIDE on indexes:** either let `mongorestore` rebuild them (default, slower restore) or pass
  `--noIndexRestore` and let Mongoose build them on first app boot (Mongoose 5 `autoIndex` is on) — that
  shifts the cost to a slow first startup instead. Pick based on dry-run timing.
- Verify counts: `mongosh` → spot-check `db.accounts.countDocuments()` etc. against DO.

## 8. Cardbacks: DO → Render disk

(Per the cardback section — droplet stays live, full SSH.)
1. `[RENDER]` `render ssh secret-hitler`, then from inside the container:
   ```sh
   rsync -avz --progress <user>@<droplet>:<app>/public/images/custom-cardbacks/ /var/data/cardbacks/
   ```
   (needs `rsync` in the image + a **temporary read-only** key to the droplet; remove it after.)
   Fallback: tar on DO, `curl` the tarball from the Render shell, untar into `/var/data/cardbacks`.
2. Verify counts match: `ls /var/data/cardbacks | wc -l` vs the droplet dir.

---

## 9. Cutover (the window)

1. Announce the maintenance window (Discord). Pick off-peak.
2. `[DO]` **Freeze writes** (take the site down or read-only) so no new data is created past this point.
3. `[DO→ATLAS]` Final **dump → slim → restore** (§5–7) of the live data. (Or the §3-B delta restore.)
4. `[RENDER]` Final cardback `rsync` (§8) to catch any uploaded since the dry run.
5. `[RENDER]` Point the **real** service's `MONGO_URL` at the Atlas prod DB; ensure disk + all secrets set;
   deploy branch `jun-24`. Confirm clean boot.
6. Run the **§4 smoke test** against the temp Render URL one last time, now on real prod data.
7. `[RENDER]` Add `secrethitler.io` (+ `www`) as a **custom domain**; let Render begin TLS provisioning.
8. `[DNS]` **Flip DNS** to Render. First **confirm whether Cloudflare is in front today** (the app reads
   `cf-connecting-ip` first in its IP logic, so it almost certainly is):
   - `dig NS secrethitler.io +short` → `*.ns.cloudflare.com` means CF manages DNS.
   - `curl -sI https://secrethitler.io | grep -i server` → `server: cloudflare` means traffic is proxied.
   - **Recommended (low-risk continuity): keep Cloudflare proxied.** Point CF's origin (the orange-cloud
     A/CNAME) at the Render service. CF keeps doing TLS/edge, and the `cf-connecting-ip` IP logic keeps
     working unchanged. Render still needs `secrethitler.io` added as a custom domain so it accepts the host.
   - If instead going **DNS-only / direct to Render**: Render terminates TLS; confirm the cert issues
     (a few min after DNS resolves) and that `x-forwarded-for` still feeds the IP logic (it does — it's
     the next fallback after `cf-connecting-ip`).
   - Handle **apex** (`secrethitler.io`) per the provider (A/ALIAS/ANAME) and the `www` record.
9. Watch Render logs + the Discord crash webhook. Do a real login + game on the live domain.

---

## 10. Post-cutover

- **Keep DO fully intact and running** as rollback for several days. Rollback = point DNS back at DO.
  ⚠️ Once real users play on Render, that data only exists on Atlas — rolling back to DO loses it. So
  rollback is realistically only "clean" in the first minutes; after that, fix-forward.
- **Backups going forward (set up before you trust it):**
  - Atlas Flex includes limited snapshot backups — **confirm the retention** and whether it's enough.
  - The **cardback disk is now the only copy** of cardbacks (git-ignored). Add Render disk snapshots or
    a periodic `tar` → object storage.
  - Re-create any DO backup cron you retired in §1g.
- Decommission the droplet only once you're confident (data + cardbacks + a few days clean).

---

## Open decisions to lock before cutover night
1. ~~**Downtime model**~~ — **LOCKED: maintenance window (§3-A)**; dry run confirms the duration.
2. ~~**Slim policy**~~ — **LOCKED: `build-slim.mjs`, `CUTOFF_DAYS=365`** (§6); tune only if over the Flex cap.
3. **Atlas IP allowlist** — static outbound IPs vs `0.0.0.0/0` (§1a).
4. **Cloudflare role** — confirm it's in front today (§9.8); recommend keeping it proxied. **Needs a `dig`.**
5. **`trust proxy` / OAuth** — confirm redirect resolves https on Render; add temp redirect URIs for
   testing (§1d).
6. **Index restore** — rebuild during restore vs `--noIndexRestore` + first-boot build (§7).
7. **Flex storage headroom** — confirm slim restore total < ~5 GB from the build-slim printout (§7).
8. **The 15 failed-restore docs** — identify them (`restore-full.log`); confirm none fall in the retained window.

## Known risks / notes
- Sessions don't migrate (Redis db 10) → everyone re-logs-in after cutover. Expected.
- Verification/reset emails hardcode `https://secrethitler.io` → can't fully test signup on temp URL.
- Starter plan is 512MB / 0.5 CPU; watch the memory metric under real load, bump to `standard` if hot.
- 1 instance only (in-memory game state); a redeploy drops every live game — deploy deliberately.
