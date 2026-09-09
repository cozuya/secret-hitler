# Leaderboard troubleshooting

The web service reads a saved snapshot; opening Leaderboards does not recalculate it.
The `secret-hitler-leaderboard` Render cron in `render.yaml` runs
`node scripts/retrieveLeaderboardData.js` daily at 09:00 UTC and publishes the
`leaderboards` document with `_id: "current"`. The HTTP route caches successful reads
for 60 seconds and retains the last successful response if a later database read fails.

## Check production without changing account state

1. Read `/leaderboardData.json`. New responses include `status` and `updatedAt` beside
   the five existing board arrays:
   - `ready`: a snapshot exists, even if nobody qualified for a particular board.
   - `pending`: no saved payload exists in the database the web service reads.
   - `unavailable`: the read failed and this web process has no cached successful response.
   An old `updatedAt` can mean the cron stopped publishing; it can also be a cached
   response retained during database trouble. A response without metadata can come
   from older web code.
2. In Render, confirm `secret-hitler-leaderboard` exists, is enabled, and deploys the
   intended revision. Check its latest run for `[leaderboard] updated` or
   `[leaderboard] fatal:`. A blueprint entry in this repository does not prove the
   service was created or its secret configured in production.
3. Confirm the cron and web service have `MONGO_URL` configured for the same Atlas
   cluster **and database name**. The cron secret is configured separately in Render.
   Inspect settings without copying connection credentials into issues or logs.
4. Inspect the snapshot in that database using a read-only query:

   ```js
   db.leaderboards.findOne({ _id: "current" }, { payload: 1, updatedAt: 1 });
   ```

   Compare its timestamp and arrays with the HTTP response after the 60-second cache
   window. If the document is current but HTTP remains old, inspect web database-read
   errors and verify the database names again.

Season 25's Elo board requires 20 ranked season games and ranked activity within
14 days. The XP and recent-Rainbow boards qualify independently; an empty Elo board
alone is not evidence of a failed refresh.

Do not repeatedly trigger the cron as a read-only diagnostic: it also writes
`previousDayElo` and `previousDayXP` on active accounts. A rerun changes the daily
gain window. Confirm the cause and timing before choosing a recovery run.

## Verification for this change

The response/refresh/cache and frontend tests cover empty, populated, unavailable,
retry, and stale-timestamp behavior with mocked storage. Production cron logs,
credentials, and the live snapshot were not accessible during this investigation;
the reported production failure remains unconfirmed.
