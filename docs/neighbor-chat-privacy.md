# Neighbor Chat privacy and moderation

Neighbor Chat stays restricted after the game. The sender and recipient can read their own conversations in the replay; other players and anonymous viewers cannot. Authorized chat reviewers (admin, editor, moderator and trialmod) can review the saved transcript. Live visibility still uses the existing hidden-info subscriptions and excludes seated staff from the moderator view.

Accepted messages are retained in `game.private.neighborChats` and archived in `Game.neighborChats`, separately from public replay chat. The replay socket endpoint uses current account permissions and strips both raw private arrays and legacy Neighbor Chat rows from public responses. Both public game-export scripts apply the same filter. The existing moderator-only `/gameJSON` export remains available for review.

Older Neighbor Chat records have no reliable participant identifiers. Those rows remain available to authorized reviewers, but cannot safely be assigned to a participant's replay. No database migration is required for new messages. Existing replay availability is unchanged: private games do not publish the game summary required by the replay UI, although their retained chat remains available to moderators and to the recipient's authenticated report request.

The in-game mute button stops sending and receiving Neighbor Chat for that game, without changing public chat. Messages are not redirected around a muted neighbor. The preference survives a reconnect to that table and resets in a new game.

A recipient can report a received message from live chat or their replay. Reports save the server's message plus up to five preceding and five following messages from the same pair. Caller-supplied identities and transcripts are not accepted. Moderators can open the evidence in Player Reports after the game; ongoing-game reports withhold conversation evidence and free text to preserve the existing live visibility rules. The report notification contains only a game reference, never private conversation text.

Limits: 1,000 accepted Neighbor Chat messages per game and four distinct Neighbor Chat reports per recipient per game. Excess messages are rejected with feedback; previously accepted evidence is retained. Private games keep the existing 30-message live-history cap, while the restricted archive retains all accepted messages. A server restart before normal game persistence can still lose in-memory conversation history; a successfully submitted report has its own persisted evidence.

## Release playtest

- In a Neighbor Chat game, send in both directions, including across a dead or departed seat. Verify that only the pair and a subscribed moderator observer receive the message, and that a seated moderator gets only their own participant view.
- Repeat in blind and emote-only games: live names remain masked and emotes render.
- Mute, attempt delivery, unmute, and reconnect. Public chat remains usable; mute status is restored and rejected messages do not reach a different neighbor.
- Submit a report and open Player Reports. Before completion, the transcript is withheld. After completion, reload reports and verify the saved message, surrounding conversation and reported sender.
- Open the completed replay as each participant, an unrelated player, an anonymous viewer and a moderator. Verify the corresponding restricted histories and that a recipient can report from the replay. A fresh moderator session should be able to review without having watched the game live.
- Verify mute/report button layout on desktop and mobile. Run a remake and confirm that its conversation and mute preference start fresh.
