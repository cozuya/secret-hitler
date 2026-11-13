# Neighbor chats in replays

Every replay viewer, including logged-out visitors, can read the game's archived
neighbor conversations. The chat panel starts with public chat only. Independent
Show/Hide whispers and Show/Hide public chat buttons allow public-only, combined,
or whispers-only views, and preserve the existing player/game/observer filters.
The whisper button counts archived messages, and visible whispers label sender
and recipient. Older neighbor rows without modern
participant metadata remain visible in replays, and duplicate archive rows appear
only once.

The replay socket route checks the in-memory table after its database reads and
refuses to return a transcript while that table is unfinished, even if a saved
snapshot claims completion. Finished tables and archived games after teardown
(including abandoned and legacy records) use the public replay view.

Live delivery and reconnect snapshots are unchanged: players receive only their
own neighbor conversations; ordinary observers and unrelated players receive none.
Existing authorized moderator subscriptions retain their review access. Unrelated
hidden-role/moderation rows remain restricted, and only a message's recipient can
submit its existing Neighbor Chat report.

The public replay option is explicit at the replay endpoint. Bulk export scripts
keep their existing filtering and do not acquire neighbor conversations through
this change. Help commands, lobby and board tooltips, creation settings, replay
labels, changelog and site rules disclose the replay visibility.

Validation covers public-only defaults, each combination of public/whisper
visibility, preserved public filters, legacy messages and visibility for every
replay viewer. Local Chromium checks against the server and MongoDB also cover
archived conversations for participants, unrelated users, admins and anonymous
viewers; chat loading and authorization use the actual socket route and persisted
archive.
