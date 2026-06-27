# Cutover-day checklist — promote the temp Render service to prod

The simplest path: the existing service (`secret-hitler-t7lp.onrender.com`) **becomes** prod. It already
has the Persistent Disk + cardbacks, the heap fix, and a working config — so cutover is: refresh data
from a frozen DO, sync any new cardbacks, set remaining secrets, add the domain, flip DNS. No new
service, no re-doing the disk.

Detailed context lives in `docs/migration-plan.md`; this is the do-it list.

---

## A. Before the window (NO downtime — do these first, anytime today/tomorrow)

- [ ] **Commit + push** the staged changes (heap fix in `render.yaml`, OAuth `trust proxy`/`proxy:true`
      in `app.js`). Confirm Render auto-deploys green, the app boots, and you can still log in.
- [ ] **Set all remaining secrets** on the service (Environment tab). Already set: `MONGO_URL`,
      `REDIS_URL`, `CARDBACK_DIR`, `NODE_OPTIONS`, `NODE_ENV`. Still needed:
      `SECRETSESSIONKEY`, `DISCORDCLIENTID`, `DISCORDCLIENTSECRET`, `GITHUBCLIENTID`,
      `GITHUBCLIENTSECRET`, `MGKEY`, `MGDOMAIN`, `DISCORDREPORTURL`, `DISCORDADMINPING`,
      `DISCORDCRASHURL`, `DISCORDPRIVATEDEVELOPERS`, `GETIPINTELAPIEMAIL`.
- [ ] **Lower DNS TTL** for `secrethitler.io` (+ `www`) to **300s**, several hours ahead so it propagates.
- [ ] **Confirm the DNS/Cloudflare setup:** `dig NS secrethitler.io +short` and
      `curl -sI https://secrethitler.io | grep -i server`. Plan: keep Cloudflare proxied → at flip you
      repoint CF's origin record at the Render service.
- [ ] **Final smoke test** on the temp URL: log in, create + play a game with a 2nd account, a cardback
      renders, a write persists.

## B. The maintenance window (DO frozen — this is the downtime)

> Expect roughly **1.5–2 hours** frozen, dominated by the Atlas restore (~45 min today) plus the local
> dump/restore prep. See the downtime note at the bottom before you commit to this.

- [ ] **Announce downtime** (Discord), pick off-peak.
- [ ] **Freeze writes on DO** — take the site to maintenance / read-only so no new data is created past here.
- [ ] **Refresh data → Atlas** (same commands as today):
  ```sh
  # dump straight off DO to local (droplet has no spare disk, so stream it):
  ssh <user>@<droplet> 'mongodump --db=secret-hitler-app --gzip --archive' > ~/shiodata/sh-prod-full-CUTOVER.archive.gz
  gzip -t ~/shiodata/sh-prod-full-CUTOVER.archive.gz                      # must pass

  # restore into LOCAL mongo (build-slim needs full data local; $out can't cross servers):
  mongorestore --gzip --archive=~/shiodata/sh-prod-full-CUTOVER.archive.gz --drop
  #   ^ let this FINISH this time (today it got killed mid-index; data was fine, but let it complete
  #     so the slim carries full indexes onto Atlas).

  # build the slim, then dump it:
  cd ~/shiodata
  SRC_DB=secret-hitler-app DST_DB=sh-prod-slim CUTOFF_DAYS=365 node build-slim.mjs   # check total < 5GB
  mongodump --uri="mongodb://localhost:27017" --db=sh-prod-slim --gzip --archive=sh-prod-slim.archive.gz

  # restore to Atlas — URI has NO db in the path (the /db acts as a --db filter and restores 0!):
  mongorestore --uri="mongodb://<user>:<pass>@<atlas-hosts>/?authSource=admin&replicaSet=<rs>&ssl=true" \
               --gzip --archive=sh-prod-slim.archive.gz \
               --nsFrom="sh-prod-slim.*" --nsTo="secret-hitler-app.*" \
               --drop --numInsertionWorkersPerCollection=1
  ```
- [ ] **Final cardback delta sync** (catch any uploaded since today): re-pull from DO into
      `~/shiodata/cardbacks/`, then push:
  ```sh
  tar czf - -C ~/shiodata/cardbacks . | ssh -o UpdateHostKeys=no srv-d8u16tlaeets73flar50@ssh.virginia.render.com 'tar xzf - -C /var/data/cardbacks'
  ```
- [ ] **Restart the Render service** (clean view of the fresh data). Quick smoke test on the onrender URL.
- [ ] **Add `secrethitler.io` (+ `www`) as a custom domain** on the service; let Render provision TLS.
- [ ] **Flip DNS** to Render (repoint Cloudflare's origin, keep it proxied per the plan).
- [ ] **Verify on the real domain:** load, log in including **Discord/GitHub OAuth** (now works — the
      `proxy:true` fix + registered https URIs), play a game, a cardback renders.

## C. After

- [ ] Watch Render logs + the Discord crash webhook for ~30 min.
- [ ] **Keep DO running** as rollback for a few days (rollback = repoint DNS back to DO).
- [ ] **Set up backups** — confirm Atlas Flex snapshot retention; back up the cardback disk (it's the
      only copy now).
- [ ] Once stable (days later): decommission DO; decide whether to adopt the `render.yaml` blueprint.

---

## The one real decision: downtime length

The in-window data refresh is correct (no lost data) but means a **~1.5–2 hr maintenance window**.
If that's too long, the alternatives trade simplicity or freshness:
- **Accept staleness (simplest, lossy):** load the data shortly *before* the window and at cutover just
  flip DNS — but any games/signups/XP in that gap are lost. Only OK if you're fine losing a few hours.
- **Delta refresh (shorter window, more complex):** bulk-load early, then in the window re-restore only
  the collections that changed. More moving parts.

Default to the in-window full refresh unless the downtime is a dealbreaker.
