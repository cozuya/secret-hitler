# Game UID index

The games archive declares a non-unique `{ uid: 1 }` index, but automatic index creation is disabled
for that model in web and cron processes. Existing indexes remain available for queries.

Before deploying this change, verify that `uid_1` exists on the target database's `games` collection.
If it does not, set `MONGO_URL` to that database and run this once during an off-peak window:

```sh
rtk node scripts/createGameUidIndex.js
```

The script creates only that index, requests a background build, and closes its connection. Rerunning
with the same index specification is safe; it does not remove data or drop other indexes. Index work
runs on MongoDB/Atlas and can load the database, so keep it separate from a web-service restart.

This script is not part of the application startup or deployment command. Local databases need the
same explicit step if the index is desired there.
