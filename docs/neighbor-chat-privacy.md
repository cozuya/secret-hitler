# Neighbor Chat privacy and moderation

Players send with `/l` and `/r`, or `/N` with a seat number (for example `/4 hi`). `/N` only reaches seat N when it is the sender's nearest living, non-left neighbor on either side (the same seats `/l` and `/r` resolve to); any other number gets a private error naming the valid seats. Every rule below applies to all three commands.

Neighbor Chat stays restricted after the game. The sender and recipient can read their own conversations in the replay; other players and anonymous viewers cannot. Authorized chat reviewers (admin, editor, moderator and trialmod) can review the saved transcript. Live visibility still uses the existing hidden-info subscriptions and excludes seated staff from the moderator view.

Accepted messages are retained in `game.private.neighborChats` and archived in `Game.neighborChats`, separately from public replay chat. The replay socket endpoint uses current account permissions and strips both raw private arrays and legacy Neighbor Chat rows from public responses. Both public game-export scripts apply the same filter. The existing moderator-only `/gameJSON` export remains available for review.

Older Neighbor Chat records have no reliable participant identifiers. Those rows remain available to authorized reviewers, but cannot safely be assigned to a participant's replay. No database migration is required for new messages. Existing replay availability is unchanged: private games do not publish the game summary required by the replay UI, although their retained chat remains available to moderators and to the recipient's authenticated report request.

The in-game mute button stops sending and receiving Neighbor Chat for that game, without changing public chat. Messages are not redirected around a muted neighbor. The preference survives a reconnect to that table and resets in a new game.

Neighbor Chat can be enabled independently of public player chat. In a silent game, ordinary public player messages remain disabled while living, present players can use `/l <message>`, `/r <message>` and `/N <message>` privately (where N is a neighboring seat number). Existing mute, policy-selection, rate-limit and Flappy first-gate restrictions still apply. Emote-only games continue to filter Neighbor Chat to emotes and numbers. Silent games without Neighbor Chat enabled retain their usual command-only input. Enabling Neighbor Chat still makes a silent game casual, with Custom games retaining their unrated Custom type.

A recipient can report a received message from live chat or their replay. Reports save the server's message plus up to five preceding and five following messages from the same pair. Caller-supplied identities and transcripts are not accepted. Moderators can open the evidence in Player Reports after the game; ongoing-game reports withhold conversation evidence and free text to preserve the existing live visibility rules. The report notification contains only a game reference, never private conversation text.

Limits: 1,000 accepted Neighbor Chat messages per game and four distinct Neighbor Chat reports per recipient per game. Excess messages are rejected with feedback; previously accepted evidence is retained. Private games keep the existing 30-message live-history cap, while the restricted archive retains all accepted messages. A server restart before normal game persistence can still lose in-memory conversation history; a successfully submitted report has its own persisted evidence.

Neighbor Chat games are always casual. When Neighbor Chat is enabled, `create-game.js` forces `casualGame` whatever the client sends, so the game never changes Elo, ranked wins/losses or ranked activity, and a Practice selection becomes casual. Custom games keep their own (also unrated) Custom type. As with every casual game, gameplay auto-reports are not sent; player reports and Neighbor Chat message reports still work.

## Release playtest

- In a Neighbor Chat game, send in both directions, including across a dead or departed seat. Verify that only the pair and a subscribed moderator observer receive the message, and that a seated moderator gets only their own participant view.
- Repeat in blind and emote-only games: live names remain masked and emotes render. In a silent Neighbor Chat game, verify ordinary public player messages are rejected (including from seated staff), `/l`, `/r` and a valid `/N` reach only the pair and authorized moderator observers, a non-neighbor `/N` is rejected privately, and the private transcript remains restricted in replays.
- Mute, attempt delivery, unmute, and reconnect. Public chat keeps its configured enabled/silent behavior; mute status is restored and rejected messages do not reach a different neighbor.
- Submit a report and open Player Reports. Before completion, the transcript is withheld. After completion, reload reports and verify the saved message, surrounding conversation and reported sender.
- Open the completed replay as each participant, an unrelated player, an anonymous viewer and a moderator. Verify the corresponding restricted histories and that a recipient can report from the replay. A fresh moderator session should be able to review without having watched the game live.
- Verify mute/report button layout on desktop and mobile. Run a remake and confirm that its conversation and mute preference start fresh.
