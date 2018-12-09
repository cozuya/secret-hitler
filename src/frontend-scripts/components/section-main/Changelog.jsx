import React from 'react'; // eslint-disable-line

const Changelog = () => (
	<section className="changelog">
		<a href="#/">
			<i className="remove icon" />
		</a>
		<div className="ui header">
			<h2>Changelog</h2>
		</div>
		<div className="ui header">
			<p>//VERSION_ME!//</p>
		</div>
		<h4>New feature: Game bias compensation</h4>
		<p>
			The elo formula has been updated to automatically calculate the team bias of every game size. Each game size has an Elo score which is added to both
			teams. There are different biases for rainbow and non-rainbow games. In the long run, this should mean that no specific size of game gives better or worse
			elo returns. However, these values may take some time to approximate the team bases. Expect a week of slightly unstable Elo returns.
		</p>
		<div className="ui header">
			<p>Version 1.0.0-beta4 released 12-4-2018</p>
		</div>
		<h3>Some attempts to fix issues with server instability, few smaller things, thats about it.</h3>
		<div className="ui header">
			<p>Version 1.0.0-beta3 released 11-23-2018</p>
		</div>
		<h4>
			Fixed feature: adding email in the account page now doesn't always return "an account already has that verified email" message. Please use that button to
			become verified.
		</h4>
		<h4>
			New feature: like a real application, sessions (aka how a website knows you're logged in) will now persist beyond crashes, reboots, and updates. In other
			words you won't have to log in so much.
		</h4>
		<h5>Links in discord to the game will no longer have giant lizard images.</h5>
		<h5>Contributors are back to teal color.</h5>
		<div className="ui header">
			<p>Version 1.0.0-beta2 released 11-22-2018</p>
		</div>
		<h3>Version 1.0! Almost.. need to make sure everything works right first.</h3>
		<h4>New feature: recolored UI. Color idea thanks to contributor/mod Hexicube.</h4>
		<h4>
			New/fixed feature: email verification and password resets.{' '}
			<a href="/account" target="_blank">
				Click here to go to your account page.
			</a>
		</h4>
		<p>
			Like a real application, you can now have an email get sent to your non-disposible email address to make your account verified (again). This time it
			shouldn't go to spam every time..
		</p>
		<p>Our email terms of use:</p>
		<ul>
			<li>Email addresses are used for ONLY the following actions: verifying your account, and reseting your password.</li>
			<li>In no circumstances will your email address be used for anything other than the above including any sort of mass "email blast".</li>
			<li>Only administrators have access to see your email address.</li>
			<li>Your email address will never leave the site/will never be given away or sold.</li>
		</ul>
		<h4>Returning feature: verified-only games in the create game page.</h4>
		<p>Verified players can once again make games that only other verified players can sit in in the create game panel.</p>
		<h3>I strongly recommend you verify your account.</h3>
		<div className="ui header">
			<p>Version 0.15.0 released 10-21-2018</p>
		</div>
		<h4>New feature: custom games!</h4>
		<p>Create a fully customised game to play the game how you want to!</p>
		<div style={{ textAlign: 'center' }}>
			<img src="https://i.imgur.com/sv6nq9C.png" />
		</div>
		<ul>
			<li>Custom Games are always casual, and have a fixed player count as opposed to the selectable range of players.</li>
			<li>It plays 5 to 10 as usual and must have a liberal majority.</li>
			<li>Choose if hitler knows his fascists, when hitler zone starts, when veto is enabled, and what policy cards are in the game.</li>
			<li>There's a new game filter for custom games (filter icon next to the "create a new game" button on the lobby).</li>
			<li>All of this feature thanks to contributor Hexicube!</li>
		</ul>
		<h4>New feature: game filters now save/persist when toggled.</h4>
		<p>Other items:</p>
		<ul>
			<li>User reports should finally be fixed.</li>
			<li>Dragging the game notes window to bad places should no longer open a new tab.</li>
			<li>Lack of rainbow color for seasonal elo/WL has been fixed.</li>
			<li>Game chat messages should no longer use an extra line.</li>
			<li>Added extra notches to the minimum elo and timed game sliders.</li>
			<li>Deck shuffles are now shown in game chat.</li>
			<li>Browser crashes now show an error page instead of a blank screen.</li>
			<li>BigNose emote is back.</li>
		</ul>
		<div className="ui header">
			<p>Version 0.14.14 released 10-16-2018</p>
		</div>
		<h4>New feature: new players must agree to the terms of use.</h4>
		<p>I want to again stress that if you don't agree with the rules of the site (cliffs: don't be an asshole), play elsewhere.</p>
		<p>
			Bugfix: full height player setting now auto-scrolls chat correctly, making it actually usable, thanks to a contributor. Check it out again if you have a
			large monitor.
		</p>
		<p>Cleanup: emotes have had a review and some of them altered, updated, and removed.</p>
		<div className="ui header">
			<p>Version 0.14.13 released 9-29-2018</p>
		</div>
		<h4>Welcome to season 4!</h4>
		<p>The top 10 players of season 3 are:</p>
		<ul>
			<li>Fusilli - 2138</li>
			<li>SheepManu - 2127</li>
			<li>HomoSapien - 2068</li>
			<li>Samsung - 2035</li>
			<li>benjamin172 - 2031</li>
			<li>harvyyy - 2025</li>
			<li>imbapingu - 2014</li>
			<li>Manu1234 - 1991</li>
			<li>Jasmine - 1989</li>
			<li>NotIconic - 1917</li>
		</ul>
		<p>
			New this season: the top 5 players of last season now have special badges thanks to mod benjamin172. Unfortunately not a lot to report lately, I've been
			incredibly busy and haven't had the time. We do have 2 new emotes! LibFrown and FasFrown credit to new contributor PeeOnBus. Also, speed mode is now
			enabled by default when entering create game credit by contributor LordVader. Thanks for playing!
		</p>
		<div className="ui header">
			<p>Version 0.14.12 released 8-8-2018</p>
		</div>
		<h4>250,000 games played! Wow!</h4>
		<h4>New feature: full height in game player setting</h4>
		<div style={{ textAlign: 'center' }}>
			<img src="http://i.imgur.com/9eDIhIP.jpg" style={{ border: '1px solid grey', width: '820px' }} />
		</div>
		<div style={{ textAlign: 'center' }}>
			<img src="/images/fullheightsetting.png" style={{ border: '1px solid grey' }} />
		</div>
		<p>
			There's a new setting for players when enabled, the UI will take up the full height of your monitor while in game, greatly extending the chatbox (see
			below). This will only be apparent for (on 100% browser zoom) players with larger monitors, laptops and smaller will not see any change.
		</p>
		<h4>New feature: moderator manual conclusion of games.</h4>
		<p>
			In a ranked game where someone afks/rage quits at the very end when they're about to lose? Contact a moderator and they can end the game for the team that
			was about to win, assigning you precious elo points. About time!
		</p>
		<h4>Other stuff:</h4>
		<ul>
			<li>New emotes! Sheeped, Shepherd, and ThumbsDown. Thanks to contributor JohnCena.</li>
			<li>Private/anonymous player names can no longer be seen by hovering on them..</li>
			<li>You don't need >1675 seasonal elo to make an elo limited game, overall now works as well.</li>
			<li>Contributor color is back.</li>
			<li>iOS safari users should be able to use their profile again.</li>
			<li>
				Next major feature planned is <b>custom games</b>, where the game creator can do things like set different policy powers and when hitler zone starts.
				There's some new polls available, please take a look.
			</li>
		</ul>
		<div className="ui header">
			<p>Version 0.14.10 released 7-23-2018</p>
		</div>
		<ul>
			<li>You can delete people from your blacklist again.</li>
			<li>
				Elo minimum games now lets a player who has either seasonal or overall elo above it play in that game. You still need to have seasons on though (will
				get to that later).
			</li>
			<li>Some performance optimizations have been put in, hopefully making things more stable.</li>
		</ul>
		<div className="ui header">
			<p>Version 0.14.9 released 7-15-2018</p>
		</div>
		<h3>New feature: elo limiter has gone in.</h3>
		<p>Minimum you can set this to is 1675, we'll keep an eye on it.</p>
		<h3>Blacklist overhaul (again)</h3>
		<p>
			Several players are using the blacklist feature in an unintended way, causing some grief for everyone. All blacklists have been deleted, and there now is
			a (working this time..) limit of 10 players that can be on your blacklist at once.
		</p>
		<h3>Timed mode may have its long standing bug fixed thanks to contributor/mod Hexicube.</h3>
		<h3>Some changes have been made in the back end that should make some performance increases/less lag and crashes. I hope.</h3>
		<div className="ui header">
			<p>Version 0.14.8 released 7-1-2018</p>
		</div>
		<h3>Welcome to season 3!</h3>
		<p>
			All seasonal elo has been reset to 1600 and all seasonal winrates are 0-0. Season 2 badges have been applied to the top ~75 players of season 2 by elo.
		</p>
		<h3>New feature: elo slider/limiter (not quite working, will be in this week)</h3>
		<p>
			Players above 1700 elo will now see a new slider while creating a game - use this to limit what players can play in the new game you are creating. Players
			who are under or over the threshold will not be able to sit.
		</p>
		<p>
			This feature will be watched for feedback - I don't want to lock players out of games, but I also think its nice to be able to play with high elo players
			exclusively if you want. This feature only applies to seasonal elo right now.
		</p>
		<h3>
			The terms of use on the about page have been somewhat adjusted. I want to make it clear that abuse by anyone is not allowed. If someone makes a mistake
			that costs you a game, do not scream at them, do not call them "retards" or "cunts". If so you will eat a ban. Its a free web game with zero stakes, chill
			and hunt/elect some fascists.
		</h3>
		<div className="ui header">
			<p>Version 0.14.7 released 6-17-2018</p>
		</div>
		<p>Verification emails should be fixed.</p>
		<p>New leaderboard component now has a working link on the lobby.</p>
		<p>Due to popular demand, verified only games are now default off instead of on.</p>
		<div className="ui header">
			<p>Version 0.14.6 released 6-12-2018</p>
		</div>
		<h3>New feature: seasonal leaderboards</h3>
		<p>Click the big words on the lobby to see who's top elo for the season, and also who's went up the most in the last 24 hours.</p>
		<h3>Attempt to fix "verification email goes to spam/sometimes rejected" issue has gone in.</h3>
		<h3>Also moderators can now manually set accounts to verified, if you are getting no where with the emails, contact a mod, thanks.</h3>
		<div className="ui header">
			<p>Version 0.14.5 released 6-7-2018</p>
		</div>
		<h3>New feature: email verified accounts</h3>
		<p>
			Your <a href="/account">account</a> can now have a new verified status by adding an email, and clicking a link when you receive an email from the site.
			New players can now (optionally) add their email while signing up. Only non-disposible email providers can be used, and its possible that the site's email
			will wind up in your spam folder so check there before requesting a new email.
		</p>
		<p>
			I want to make it very clear that I do not want or will use your email addresses for any reason other than to have it possible to be verified. The terms
			of use has the following added:
		</p>
		<ul>
			<li>Email addresses are used for ONLY the following actions: verifying your account, and reseting your password.</li>
			<li>In no circumstances will your email address be used for anything other than the above including any sort of mass "email blast".</li>
			<li>Only administrators have access to see your email address.</li>
			<li>Your email address will never leave the site/will never be given away or sold.</li>
		</ul>
		<p>In addition, you can also change your email address and request a new verification email. Password reset coming soon.</p>
		<h3>New game mode: verified accounts only</h3>
		<p>Verified accounts will now optionally be able to make a game where only other verified accounts can sit in.</p>
		<div className="ui header">
			<p>Version 0.14.3 released 6-1-2018</p>
		</div>
		<h3>New feature: sound pack #2!</h3>
		<p>
			Thanks to contributor straightleft, a new pack of sounds has been implemented, more tonal/synth like. As this is a different type of setting change, if
			you want to use sound pack #1 or turn your sound off, you'll have to go to your settings screen now.
		</p>
		<h3>Many bug fixes thanks to contributor Hexicube.</h3>
		<h3>New feature: enhanced account actions.</h3>
		<p>
			Like a real app, I am implementing some things that should have been done some time ago. In this update, only the delete account action is new, and should
			work as expected. Soon I will be rolling out email-verified accounts. Don't worry, these will be optional.
		</p>
		<p>Our terms of use has been updated...</p>
		<div className="ui header">
			<p>Version 0.14.2 released 5-22-2018</p>
		</div>
		<h3>New feature: sound effects!</h3>
		<p>
			Thanks to contributor Idrissa, most common sounds have a sound effect associated with them. Fun! You can disable these in player settings. This setting
			does not effect the starting "bong" sound.
		</p>
		<p>Also some bug fix attempts.</p>
		<div className="ui header">
			<p>Version 0.14.0 released 5-20-2018</p>
		</div>
		<h3>New feature: elo system</h3>
		<p>An elo system has come to sh.io. What is it/where is your winrate/why did your color change? See below.</p>
		<p>
			Effectively an elo system is a point-based representation of your weighted skill based off of your teammates and your opponent's elo. The easiest way to
			think of it is that, when you win a game, your elo will go up more if you are playing against high rated players (their collective average) than low rated
			players. This is adjusted for the "normal" winrate of your team and the game size.
		</p>
		<p>
			Player colors for elo mode have been redone - check the information icon on the player list. There is some drastic changes: based off percents, most
			players will be green. Some will be orange, and a small percent will be purple. Contributor color has been reassigned to teal.
		</p>
		<p>Elo changes will be communicated when a game ends. Remember that all elo is based on the average of your and your opponent's team elo.</p>
		<p>This feature can be disabled in your player settings screen.</p>
		<h3>Redone blacklists</h3>
		<p>
			All blacklists have been wiped, and a limit of 20 players that can be blacklisted has been applied. This will fail silently if you try to go over that.
			Blacklists are intended to be a way to avoid players you personally don't like playing with, not to be wielded as a weapon against players you can't
			control. Some players have blacklists in the hundreds and thats not what the feature was meant for - if there's a player breaking the rules, report them.
		</p>
		<div className="ui header">
			<p>Version 0.13.5 released 4-29-2018</p>
		</div>
		<h3>New feature: seasonal stats page.</h3>
		<p>Check out the link in the normal stats page to toggle between current season and overall stats.</p>
		<h3>Other bugfixes to various issues.</h3>
		<div className="ui header">
			<p>Version 0.13.4 released 4-28-2018</p>
		</div>
		<h3>Tournaments temporarily disabled, see below.</h3>
		<h3>Security update</h3>
		<p>
			It was brought to my attention that there's some issues with security around certain actions. This update has addressed these issues. Its important to
			note that these were game related issues, not account: your password is secure and not visible by anyone including me, and important info like who is each
			role and what the policy deck looks like, is and always was secure.
		</p>
		<h3>Other items</h3>
		<ul>
			<li>A bug with the new blacklist modal and deleting entries has been fixed.</li>
			<li>There's some new helpful messages when you try to take actions like chat without 2 games played or chat while dead.</li>
			<li>The cooldown for remaking games has been changed to 2 seconds if remake is on, and 10 seconds if remake is off.</li>
			<li>Several fixes to issues with remaking games have occured.</li>
			<li>Some fixes to issues with player colors have been implemented.</li>
			<li>Welcome new moderators littlebird and Hexicube!</li>
		</ul>
		<h2>Huge callouts to contributors Hexicube and Nth for a ton of this work!</h2>
		<h3>We don't talk about version 0.13.3</h3>
		<div className="ui header">
			<p>Version 0.13.2 released 4-22-2018</p>
		</div>
		<h3>New feature: expanded timed mode (turbo mode)</h3>
		<p>
			Want to play a super fast game (or tournament)? The timed mode slider has been changed from 30 second increments to 1 second increments, and the minimum
			time is now 2 seconds (due to animations, can't be 1 second)! Important note: as the game clearly wasn't meant to be played this way, timed mode games
			under 30 seconds are forced to be casual games. Have fun! The display in creategame page has been updated slightly.
		</p>
		<h3>Bug fix: fix to issue with timed mode some times auto choosing chancellor erroneously (I hope, please update if you still see this)</h3>
		<p>Other issues</p>
		<ul>
			<li>
				Previous "timed mode" idea credit to player HREmperor who gets orange contributor color. Contribute to this open source product to get it also! 140+
				open issues on github! -_-
			</li>
			<li>
				In your profile you can now view everyone on your blacklist, and remove them from it as well by clicking the remove icon.{' '}
				<small>
					For reasons I'm not going to get into this will not work if you go to your profile from a direct link/when you're not already on the site.
				</small>
			</li>
			<li>There's a new timed mode game filter (funnel icon next to create game button), disable this if you don't want to see timed mode games.</li>
			<li>Remake messages in chat no longer say what player has voted to remake it.</li>
			<li>The "cooldown" of the remake button being able to be vote for against remake has been moved from 2 seconds to 10 seconds.</li>
			<li>To avoid libs abandoning "lost" games, the remake threshold for 6p games is now 5, up from 4.</li>
			<li>
				The whole remake system that was semi-bugged and needed to be rescinded and then revoted in order to get started on remaking may have been fixed?
				Somehow? I swear I didn't do anything but it seems to be working as intended now. Please update if not.
			</li>
			<li>The stats page works again for 9p rebalanced.</li>
			<li>The one time name change feature has been removed, didn't work right and it turned out it wasn't a great idea to begin with.</li>
			<li>Replays now show the casual game icon when available.</li>
			<li>Casual game tournaments no longer award crowns.</li>
			<li>New emotes: CantBeBothered and Salty, thanks to contributor LordVader.</li>
		</ul>
		<div className="ui header">
			<p>Version 0.13.1 released 4-3-2018</p>
		</div>
		<h3>New game mode: Timed mode</h3>
		<p>In a timed mode game, a timer on all actions appears in the lower right part of the fascist board, after which the next action is chosen at random.</p>
		<div style={{ textAlign: 'center' }}>
			<img src="/images/timed-mode-example.png" style={{ border: '1px solid grey' }} />
		</div>
		<p>
			Example: in a 5 minute timed mode game, if someone does not make a required action in 5 minutes such as voting on an election, their nein or ja vote is
			chosen for them at random by the server. Note that in order to save stress on the server, this countdown is held client-side and will only be visible to
			players/observers if they are present in the game when each timer starts (but still goes on in the background on the server, of course). This mode will
			likely favor fascists! Feedback requested. <small>People abusing this mode to do.. something.. will be subject to moderation action.</small>
		</p>
		<p>
			Complicated magical changes were made in the back end in order to enable this functionality and it may be subject to.. not being perfect. Please report
			any problems you see. Hopefully problems != crashes.
		</p>
		<h3>Bug fix: game now once again works on iOS devices. Spoiler: they don't support notifications...</h3>
		<h3>Bug fix: blind mode players cannot reveal their names by pinging other players..</h3>
		<div className="ui header">
			<p>Version 0.13.0 released 4-1-2018</p>
		</div>
		<h3>Season 2 has begun</h3>
		<p>
			Seasonal awards have been implemented: the top 60 players with more than 150 wins in season 1 have been separated into 3 tiers, and receive special award
			flair on the lines of gold/silver/bronze.
		</p>
		<p>This flair can be disabled via the disable tournament crowns setting which has been renamed to disable tournament crowns and seasonal awards.</p>
		<h3>Congratulations to the top players of season 1 (more than 150 wins):</h3>
		<ul style={{ color: 'orange' }}>
			<li>maki2 66% wr</li>
			<li>karamia 65% wr</li>
			<li>TheDaniMan 64% wr</li>
			<li>NotIconic 63% wr</li>
			<li>TheJustStop0 62% wr</li>
			<li>qwefjz 61% wr</li>
			<li>BunchOfAnima 60% wr</li>
			<li>Zeek 60% wr</li>
		</ul>
		<h3>New feature: player notifications (pings)</h3>
		<p>When you enter the site for the first time, you will receive a notification that looks like this:</p>
		<div style={{ textAlign: 'center' }}>
			<img src="/images/notification-permission.png" style={{ border: '1px solid grey' }} />
		</div>
		<small>Obviously not localhost..</small>
		<p>
			If you enable this feature, other seated players may now send you (and you may as well) a "wake up" notification. If someone types in "Ping5", the player
			in seat 5, if notifications are enabled, will see a screen like this (on their operating system, not their browser):
		</p>
		<div style={{ textAlign: 'center' }}>
			<img src="/images/notification.png" style={{ border: '1px solid grey' }} />
		</div>
		<p>
			Players may use the ping feature only once every 3 minutes, and only in games you're seated in that have been started. This feature is only to be used for
			players who appear AFK - do not abuse this feature. Reminder: if you wind up finding these irritating, you can revoke permission for them in your browser
			settings.
		</p>
		<h3>New feature: one time name change.</h3>
		<p>
			Dislike your old name, but want to keep your stats and profile? Hit the big new big red button on your settings page to change your name. This only works
			once per account so choose wisely.
		</p>
		<h3>Other items</h3>
		<ul>
			<li>
				New emotes courtesy of contributor LordVader! ThinkFace, PIZZA, ExpressionlessFace, PopCorn, RedHeart. They are in the popup menu as well of course.
			</li>
			<li>Tournaments now make the usual "bong" noise when they start.</li>
			<li>The "rules" page has been updated thanks to a contributor. The big change is a description of common terms used on the site.</li>
			<li>Players can now submit up to 3 moderator reports per game, up from 1.</li>
			<li>A bug where people with blacklists over 100 will have an error preventing them from adding new blacklists has been fixed.</li>
			<li>The planned "timed game mode" and "player notes" feature didn't quite get wrapped up prior to today's update, look for those soon.</li>
		</ul>
		<div className="ui header">
			<p>Version 0.12.5 released 2-20-2018</p>
		</div>
		<h3>Bug fix: replays are back!</h3>
		<p>Thanks to a contribution a long standing bug in replays has been fixed and should work for all recent games.</p>
		<h3>New feature: 3 new emojis - ThumbsUp, CNH, and Shrug. Check them out.</h3>
		<h3>New feature: casual game mode setting.</h3>
		<p>Select this to play a game where the results do not affect the player's wins or losses.</p>
		<h3>Other items:</h3>
		<ul>
			<li>Thanks to a contribution, tournament crowns are no longer visible in blind mode.</li>
			<li>Please welcome new moderators safi, Wilmeister, and MrEth3real.</li>
			<li>Stats for rebalanced (-2 fascist policy) 9 player games might be working tomorrow.. (data collection occurs at 4am)</li>
			<li>There's a new poll on the polls page re: length of seasons</li>
		</ul>
		<div className="ui header">
			<p>Version 0.12.4 released 2-3-2018</p>
		</div>
		<h3>New feature: rebalanced 9p games (again).</h3>
		<p>Now, they start with 2 less fascist policies in the deck. The stats page should be updated.</p>
		<h3>New feature: games being remade will now show player roles briefly (thanks to Z3r0-K0ol on github.)</h3>
		<h3>Other items:</h3>
		<ul>
			<li>The site should look a bit better at smaller screen widths outside of games.</li>
			<li>The discord widget in general chat now works again.</li>
			<li>"Show chats" button in replays works again.</li>
			<li>The how to play page on the website has been updated with new content.</li>
			<li>Many "behind the scenes" moderation tools have been implemented.</li>
			<li>Please welcome new editor Invidia.</li>
		</ul>
		<div className="ui header">
			<p>Version 0.12.3 released 1-6-2018</p>
		</div>
		<h3>New feature: rerebalanced 9p games.</h3>
		<p>
			Due to 9p, even rebalanced, being way too easy for fascists, the newly rebalanced 9p games will have a "phantom" liberal policy already enacted at the
			start of the game, in addition to one less fascist policy. There will still be 6 liberal policies in the deck to start.
		</p>
		<ul>
			<li>The broken UI on the playerlist has been fixed.</li>
			<li>Sorting of grey players on the playerlist had a bug which caused it to be really broken - now fixed.</li>
			<li>The chat lock scroll issue has been fixed.</li>
		</ul>
		<div className="ui header">
			<p>Version 0.12.2 released 1-6-2018</p>
		</div>
		<h3>New feature: gamechat shows remaining policies (in order) at end of game.</h3>
		<div style={{ textAlign: 'center' }}>
			<img src="/images/remainingpolicies.png" style={{ border: '1px solid grey' }} />
		</div>
		<h3>New feature: blind mode now works in tournaments.</h3>
		<h3>Other items:</h3>
		<ul>
			<li>
				Previous update with players with less than 5 games played being unable to chat in general chat or observer mode has been reduced to be just 1 game
				played.
			</li>
			<li>More fixes to replay issues.</li>
			<li>Blind mode now shows the player's alias when claiming.</li>
			<li>
				An internal UI change has taken place, will hopefully resolve some issues with general chat bouncing around for some users and iOS problems as well.
			</li>
		</ul>
		<div className="ui header">
			<p>Version 0.12.1 released 1-3-2018</p>
		</div>
		<ul>
			<li>Players with less than 5 completed games can no longer chat in general chat, chat as an observer, or make player reports.</li>
			<li>Thanks to a contributor, rebalanced games now show up correctly on the status bar while in a game.</li>
			<li>Blind mode no longer shows tournament crowns..</li>
			<li>Please welcome new mods RavenCaps and JerMej1s.</li>
		</ul>
		<div className="ui header">
			<p>Version 0.12.0 released 12-31-2018</p>
		</div>
		<h3>New feature: seasonal mode!</h3>
		<h4>Important note: your stats are not gone. Read below before panicking.</h4>
		<p>
			Like many other esport games, seasonal mode has come to sh.io. What this means as that there are now two tiers of player records, seasonal (which starts
			today) and overall. At the beginning of a season, the seasonal tier is wiped of wins and losses, and should last about 3 months (some tweaking may occur).
		</p>
		<p>
			When you play a game from now on, its result is added to your overall record and your current seasonal record. Seasonal mode is opt-out, and affects you
			only - go to your player settings screen to disable it, and your and other player's overall records and name colors will be shown to you instead, just
			like before this patch. Note: players who have achieved rainbow status do not have to play 50 games to play rainbow games in new seasons, and will still
			have cardbacks enabled. Yes I realize this somewhat paradoxically will make rainbow games non rainbow so to speak at least for some time. Your profile
			will not be affected, for now.
		</p>
		<p>Some fun rewards/leaderboards/stats for doing well in seasons are planned for the near future.</p>
		<h2>Tournament mode re-re-enabled.. we'll see if this one takes..</h2>
		<h3>New feature: rainbow games now count towards standard winrate.</h3>
		<p>This has been requested a lot lately, we'll see how this goes/how people like it for season 1. The poll on this was split, lets give this a shot.</p>
		<h3>Other items:</h3>
		<ul>
			<li>
				Thanks to a pull request, the fascist/lib card icons are now randomized correctly i.e. liberal with pencil mustache/snake in a suit fascist can now
				appear in any game, not just 9/10p games.
			</li>
			<li>Thanks to the same PR, claims now are filtered into the "game" internal chat filter.</li>
			<li>
				Thanks to a PR, replays have been worked on and fixed! If you see more issues, please alert us. In addition the role cards are no longer all the same at
				the end of replays.
			</li>
			<li>The above work was done by contributor STOshka/AlexSTO. Awesome!</li>
			<li>In blind mode games, hovering on a player's name no longer shows you who they are..</li>
			<li>You can now report players in blind mode. Reminder: blind mode is not an excuse to break site rules.</li>
			<li>In a consensus vote on elections (everyone votes the same), the ja/nein cards are visible for a much shorter period of time, getting on with it.</li>
			<li>A bug that prevented players from remaking a game more than once has been fixed.</li>
			<li>The weird selection bug on elections ja/nein has been fixed, was hotfixed about a week ago but you had to have cleared your cache.</li>
			<li>Say goodbye for now to Santa Hitler.</li>
		</ul>
		<div className="ui header">
			<p>Version 0.11.1 released 12-22-2017</p>
		</div>
		<h3>Tournament mode re-enabled.. we'll see how I messed it up this time.</h3>
		<h4>A bug that allowed presidents/chancellors to chat during election period by tabbing to the input bar has been fixed.</h4>
		<h4>New chat enhancements! See below.</h4>
		<ul>
			<li>Words surrounded by * (single asterick) are italic.</li>
			<li>Words surrounded by ** (double asterick) are bold.</li>
			<li>Words surrounded by __ (double underscore) are underlined.</li>
			<li>Words surrounded by ~~ (double tilde/grave) are strikethroughed.</li>
		</ul>
		<h4>
			**Puts on professional chatroom application developer hat: please note that this only works on __words__, i.e. text that is separated by spaces, not
			multiple words. If you want that, you'll (for now..) need to surround each word with the above. Also, you can only have one of these effects per word.**
		</h4>
		<h3>The "unchangable election vote" thing is a bug, not a feature, I'll fix that soon.</h3>
		<div className="ui header">
			<p>Version 0.11.0 released 12-21-2017</p>
		</div>
		<h3>New feature: tournament mode!</h3>
		<p>When making a game, you now have the option to instead make a new tournament lobby.</p>
		<div style={{ textAlign: 'center' }}>
			<img src="/images/tournament-creategame-slider.png" />
		</div>
		<p>
			The tournament feature will start 2 tables of a game when 14, 16, or 18 people have signed up. When the 2nd game completes, a final table is created with
			the winners of both games. Please make sure you have the time set aside to play 2 full games before joining a tournament queue. If you're good. ;)
		</p>
		<p>
			Winners of the final table receive a new crown icon next to their name that lasts for 3 hours, and are sorted to top of the player list under mods. Yes,
			you can accumulate multiple crowns. Get 3+ and you'll be above mods and editors! But not admins :)
		</p>
		<p>
			In tournament round one tables, the remake button has turned into a "cancel tournament" button, please use this if there is an afk and both tables will be
			stopped. Its not an ideal solution but its what we can do.
		</p>
		<p>
			This feature is a big change, and there's likely going to be issues with it, as my professional QA department is my cat. Other than disable observer chat,
			you can use all other normal game settings for tournament mode with one caveat - in the unlikely event that you play a 6p final table, it will always be
			rebalanced.
		</p>
		<h3>New player setting: disable tournament crowns</h3>
		<p>Duh.</p>
		<h3>Other items</h3>
		<ul>
			<li>Thanks to contributor Rex1234, you can now access your profile directly by clicking on your name next to the settings cog.</li>
			<li>Hovering over a player's name in game now shows their name in the "report" description text (in case they have lots of crowns).</li>
		</ul>
		<h3>
			Next up: any issues with tournaments, and most likely, a 3rd and 4th tier of playerlist sort for tournaments and rainbow tournaments. After that, probably
			seasons as its a small change and optional and extends the life of the game.
		</h3>
		<div className="ui header">
			<p>Version 0.10.0 released 11-13-2017</p>
		</div>
		<h3>New feature: UI overhaul thanks to contributor Wi1son</h3>
		<p>
			Huge changes! Also updates to some of the more irritating front-end issues like blank screens/bouncing back and forth. Please report any issues you see.
		</p>
		<h3>New feature: see chats in replays.</h3>
		<p>There's a new button on replays to toggle between the replay tools and the chats in that game.</p>
		<h3>New feature: rebalanced 7p games.</h3>
		<p>7p games have the optional rebalance treatment now - same as 9p, a fascist policy has been removed to start the game.</p>
		<h3>Up next: blind mode and tournament mode!</h3>
		<div className="ui header">
			<p>Version 0.9.0 "dim" released 10-29-2017</p>
		</div>
		<h3>New feature: player bios</h3>
		<div style={{ textAlign: 'center' }}>
			<img style={{ width: '80%', border: '1px solid grey', padding: '10px', margin: '5px 0' }} src="/images/bio.png" />
		</div>
		<p>
			Visit your profile page to write something brief about yourself that others can see. Links are allowed, but SEO unfriendly (google "nofollow noreferrer
			noopener"). Obviously still subject to the site terms of use..
		</p>
		<h3>New feature: optional rebalancing for 6 and 9 player games</h3>
		<p>
			There's a new create game option (default: on) that, when a 6 or 9p game has begun, a facist and liberal policy have already been enacted, respectively.
			You'll get it. While these are being recorded correctly, there are no stats/graphs for this yet - next minor update.
		</p>
		<h3>New feature: URL routing</h3>
		<p>
			What this means is the URL of your browser now accurately shows the state of the application. The big takeaway is games, replays, and profiles are now all
			deep linkable! Make a private game and want your friends to join? Just send them the link. The browser back and forward buttons now work in the way you
			would expect as well. If you link a game that no longer exists, you will instead be routed to the replay. This required a large change to the front end
			and may not be perfect, please update if so. Also using gfycat style naming convention for game IDs!
		</p>
		<h3>New feature: actual private games</h3>
		<p>
			Private games have been changed - they no longer show up on the list of games on the left sidebar, and are only accessible through the new URL linking
			mechanism. In addition, private games no longer count towards a player's win and loss rate. Note: moderators can still see private games. I realize that
			it may be somewhat difficult to play additional private games - next minor patch will have a remake game feature which will help with that.
		</p>
		<h3>Other issues:</h3>
		<ul>
			<li>
				Overall UI has been tweaked color wise mostly. If you've been playing here at all in the past year (yikes), you'd know I am not at all a designer, but I
				can at least attempt to make things more fluid and contiguous. If you ARE a designer (and want to work for free..), let me know.
			</li>
			<li>Links in general chat to sh.io itself, or to this site's github repository, are now clickable. Other links are still not.</li>
			<li>Hovering on a chat in general chat will show a timestamp of when it was said.</li>
			<li>The whitelist feature now correctly has a scroll bar.</li>
			<li>If you have a custom width or font, the application no longer "flashes" when you load the page.</li>
			<li>A fix to players being able to make accounts with the same name but different capitalization has been implemented.</li>
			<li>The stats page is finally working right - it updates once per day, and the undefined/NaN stuff is gone.</li>
			<li>There is a now a slight UI difference between players who have left a game, and players who are disconnected.</li>
			<li>All dependencies updated including moving to the latest version of React (16). What this means is hopefully some better front-end performance.</li>
		</ul>
		<h3>Up next: the remake game functionality will be finished up and rolled out in 0.9.1. Also new stats graphs for the rebalanced game feature.</h3>
		<div className="ui header">
			<p>Version 0.8.0 "citehtseawen" released 9-23-2017</p>
		</div>
		<h3>New feature: UI overhaul</h3>
		<p>Thanks to contributor andy013, most of the cards and images in game have been upgraded and colorized. Neat!</p>
		<p>Also fonts redone, many other UI tweaks in. Let us know what you think. Change is good people.</p>
		<h3>New feature: chat emotes!</h3>
		<p>
			In twitch.tv style, players can chat small word fragments which will turn into icons inside of chat, such as:<img
				style={{ width: '30%', margin: '0 auto', display: 'block' }}
				src="/images/em.png"
			/>
		</p>
		<p>
			Typically a clickable popup will be available and selectable.. I didn't get to that - next patch. For now, please check out our{' '}
			<a href="https://github.com/cozuya/secret-hitler/wiki/Emotes" target="_blank">
				emote reference.
			</a>{' '}
			Thanks goes out to contributor andy013!
		</p>
		<h3>New feature: election voting rework (changable votes)</h3>
		<p>
			Previously, a vote on a government was immediate and permanent. Now, clicking on ja or nein will remove your loader gif, but you can either a) click the
			selected one again to bring back the loader and prevent vote tallying or just b) select the other option to switch your vote. Votes are tallied as usual
			when all players have selected their vote.
		</p>
		<h3>New feature: 2nd tier of player moderators (editors) and many new helpful moderation tools implemented.</h3>
		<p>
			Editors will have an (E) next to their name, and mysterious expanded mod powers! Like assign roles to players, and reveal all roles to themselves. Just
			kidding. Editors and mods can now do helpful things like temporarily turn off account creation in case of troll attack and disable ip bans so that a group
			from one location can get around the 1 account per day limit.
		</p>
		<h3>New feature: wiki page</h3>
		<p>
			Check out our{' '}
			<a target="_blank" href="https://github.com/cozuya/secret-hitler/wiki">
				wiki page
			</a>{' '}
			kindly set up by editor DFinn. Useful and topical information will be kept there, keep an eye on it if you are interested in the future of this site.
		</p>
		<h4>Other issues</h4>
		<ul>
			<li>
				Home page and about us page text has been updated and the webform deprecated. If you have feedback/issues, a new email address has been set up in the
				about page and we are always available via discord and the player report feature.
			</li>
			<li>Gamenotes clear button now works.</li>
			<li>Thanks to contributor jonnybest, hovering on a game on the list in the left sidebar now shows you who is seated in that game.</li>
			<li>
				A bug in "blind mode" (no gamechat) was causing fascists to get credit for winning the game when Hitler was shot, this mode was previously disabled via
				hotfix, now that bug has been fixed and that mode has been re-enabled.
			</li>
			<li>
				Private games "P" icon in the upper left corner of a gamelist was disappearing after the game started - thanks to contributor jonnybest, this has been
				fixed.
			</li>
			<li>
				Players can now search/type in other players to look at their profile just like clicking on them. The player settings page (gear icon) has this new
				input field.
			</li>
			<li>The footer bar in the default view has been updated to include our wiki.</li>
			<li>No new polls this release.</li>
		</ul>
		<h4>
			Next up: its high time some more effort was put in to prevent or at least lesson the pain of AFKing players. Also player notes and tournament mode coming
			soon!
		</h4>
		<div className="ui header">
			<p>Version 0.7.0 "black" released 8-7-2017</p>
		</div>
		<h3>New feature: player uploaded custom cardbacks!</h3>
		<p>In the settings view (cog icon in upper right), players now have the option to upload a new cardback that will be shown in-game. The details are:</p>
		<ul>
			<li>
				<strong>
					Image uploaded must be 70px by 95px, or it will not look right. Do not trust the previewer - it will crunch to fit the box, the game itself won't do
					that.
				</strong>
			</li>
			<li>Rainbow players only.</li>
			<li>
				For today only, you can upload an image every 30 seconds. Then it will be limited to once upload an image once per 18 hours. Be careful before hitting
				save.
			</li>
			<li>Only png, jpg, and jpeg are permitted. Must be below 40kb.</li>
			<li>
				<strong>No NSFW images, nazi anything, or images from the site itself to be tricky.</strong> The terms of service page has been updated.
			</li>
		</ul>
		<h3>New feature: better support for large width monitors.</h3>
		<p>
			The application is no longer fixed width, and will stretch to fit the entire screen. Chat boxes will take up the remaining space. I recommend turning
			"show right sidebar in game" on.
		</p>
		<h3>New feature: enhanced moderator actions</h3>
		<p>
			Mods can now delete users, set wins and losses, and delete cardbacks. Also they can now type in player names to affect offline players. Lets hope they're
			not fascists.
		</p>
		<p>Other stuff:</p>
		<ul>
			<li>The "chat a blank line" bug was fixed.</li>
			<li>Observer count was removed as it never worked right anyways.</li>
			<li>Moderators can chat in observer chat in private games.</li>
		</ul>
		<div className="ui header">
			<p>Version 0.6.0 "noise" released 6-12-2017</p>
		</div>
		<h3>New feature: Player profiles</h3>
		<p>
			Click on a player in the lobby/player list to get detailed information about games they've played. You can access your own stats that way, or through the
			game settings screen ("gear" icon in upper right corner).
		</p>
		<p>A big change to the back end, and will allow for some more interesting features (like game replays) and analysis in the future.</p>
		<p>This is an epoch event, meaning that only games from here on out will be seen in your profile.</p>
		<h3>New feature: notification for patch notes</h3>
		<p>As you've probably seen, the lizard image in the middle will glow until you click it, showing this changelog.</p>
		<p>Both features courtesy of contributor jbasrai.</p>
		<h4>Please welcome new moderators Jazz and Max.</h4>
		<div className="ui header">
			<p>Version 0.5.0 "glow" released 6-10-2017</p>
		</div>
		<h3>New feature: Player moderation</h3>
		<p>
			Some players have volunteered to be moderators. They are empowered to have the ability to ban non-rainbow players for griefing and trolling, and to check
			for cheating. Hopefully this (and some more advanced powers from admins) will be a permanent solution to problems that may come up. Moderators will have a
			red (M) next to their names.
		</p>
		<h4>Other updates</h4>
		<ul>
			<li>A fix to the rainbow game icon on the gamelist only being there for games that haven't started yet.</li>
			<li>A fix (finally) to dead players being able to chat by leaving the game and coming back.</li>
			<li>
				A 3 second delay has been implemented between the inactment of a policy by the chancellor, and the ability for the government to make a claim (for
				non-experienced games only). This should change game play a lot I think..
			</li>
			<li>Various tooltips have been added to some items and will continue to be addded in the future.</li>
			<li>A fix to rainbow losses also adding to normal losses, but not the other way around. I'll see if there's a way to credit those.</li>
			<li>Contribution by player sethe: a fix to the (relatively rare) problem of the election tracker not working right with vetos and neins.</li>
		</ul>
		<p>Up next: player profiles. This is just about ready to go and will be released within the next 2 days.</p>
		<div className="ui header">
			<p>Version 0.4.0 "chestnut" released 6-5-2017</p>
		</div>
		<h3>New feature: Rainbow games.</h3>
		<p>
			While creating a game, players with more than 50 completed games ("rainbow players") will now be able to create games that only other rainbow players can
			be seated in. These games have a special symbol in the sidebar.
		</p>
		<div style={{ textAlign: 'center' }}>
			<img src="/images/gamelist-rainbow.png" />
		</div>
		<p>
			In the lobby, a new icon appears showing what game style you are filter and sorting the userlist by. Click it to switch between "regular" and "rainbow".
			Effectively, rainbow players get to "start over" in an optional hard mode with a 0-0 score.
		</p>
		<p>
			<b>For rainbow games, your wins and losses are in a different tier, that does not affect your regular game winrate or player color.</b> "Rainbow rewards"
			may come in at some point.
		</p>
	</section>
);

export default Changelog;
