# Bounded moderation history pages

The old request fetched `500 * count` full Mongoose documents plus online account
documents on each click, then retransmitted and rendered the entire accumulated
history. The new log shows at most 500 actions per page, with Newer/Older controls.
Sorting and the existing name filter apply to the current page, as the UI states.
Newer and Older load the log page only. Refresh reloads the newest page, the
player and game lists, and the moderation settings. The player list uses the
newest page for ban and timeout highlights while moderators browse older pages.

Historical pages use the existing Mongo `_id` index (`_id < cursor`, descending)
instead of ever-growing limits or offset scans. Only projected lean action/account
fields are loaded. The backend validates cursors, rechecks the caller's persisted
staff role, limits query execution to two seconds, and permits only one page query
at a time per socket with a one-second request cooldown. The frontend disables
pagination during refreshes and page loads. Both requests time out after ten
seconds and discard late replies.
No index migration or public history endpoint is introduced.

A local MongoDB test with 1,600 synthetic actions returned two distinct 500-action
pages. The second-page query examined 501 keys/documents to return 500 entries plus
the has-more sentinel. The two helper calls took 24 ms on that local run; this is
not a production latency or capacity estimate. Authorization, malformed requests,
pending-query bursts, retries and UI request deduplication have focused regressions.
