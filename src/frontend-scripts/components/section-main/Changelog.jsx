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
			<p>Version 0.11.0 released 12-21-2017</p>
		</div>
		<h3>New feature: tournament mode!</h3>
		<p>When making a game, you now have the option to instead make a new tournment lobby.</p>
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
			Next up: any issues with tournaments, and most likely, a 3rd and 4th tier of playerlist sort for tournments and rainbow tournaments. After that, probably
			seasons as its a small change and optional and extends the life of the game.
		</h3>
		<div className="ui header">
			<p>Version 0.10.7 released 12-18-2017</p>
		</div>
		<h3>Rebalance update in create game</h3>
		<p>
			When creating a game, you no longer have the option to rebalance all 6/7/9p games - instead, you can pick individually via new checkboxes which game sizes
			you would like rebalanced.
		</p>
		<div style={{ textAlign: 'center' }}>
			<img src="/images/new-rebalance.png" />
		</div>
		<h3>Blind mode update</h3>
		<p>
			Blind mode now assigns every player a random adjective + animal name, instead of just being blank/their number. Please let me know if you find this to be
			more playable/any other feedback. Also, it no longer shows who is seated or their cardbacks in the gamelist/lobby.
		</p>
		<h3>New create game option: disable observer chat</h3>
		<p>
			Toggle this on to prevent observers from chatting at all in your new game. No icon for this as thats starting to get huge (though you will see that in
			these games, the internal chat filter for observers is not present).
		</p>
		<h3>Other items</h3>
		<ul>
			<li>
				Gamelist filters now correctly show the toggled state after leaving and coming back to the list, and there is new and obvious UI for that feature.
			</li>
			<li>"Show chats" button in replays should work now (no longer crash the browser/require refresh).</li>
			<li>When you search for a profile from the settings view, your URL will correctly update to show the player's name.</li>
			<li>
				Moderators now have a new sitewide "disable game creation" setting - this will be used when planned updates are about to happen. I'm lazy and there's no
				UI for it, the button will just not do anything so uh don't panic.
			</li>
			<li>Players with exactly 50 games played are no longer grey in the player list.</li>
			<li>There's some chance I completely broke replays in this update... if so please don't hassle me/the mods, I will work on a fix immediately.</li>
		</ul>
		<div className="ui header">
			<p>Version 0.10.6 released 12-10-2017</p>
		</div>
		<h3>New game type: blind mode</h3>
		<div style={{ textAlign: 'center' }}>
			<img src="/images/blind.png" />
		</div>
		<p>Games with this option enabled will anonymize players - players do not have their names displayed (or colors/cardbacks) until the game is complete.</p>
		<h3>New gamelist filters</h3>
		<p>New gamelist filters for standard and rainbow games have been added.</p>
		<h3>Next major update (tournaments) is almost done, expect this week, the increased traffic was a bit distracting.</h3>
		<div className="ui header">
			<p>Version 0.10.5 released 12-9-2017</p>
		</div>
		<h3>New feature: player blacklist</h3>
		<p>
			If you'd like to blacklist a player, go to their profile via the playerlist or search from your settings page, and click the new button. This has 2
			effects: it prevents them from joining games <b>you have made</b>, and also gives them a new color for you so that you can avoid games they are in. Abuse
			of this feature for public games will result in a ban.
		</p>
		<h3>New setting and moderation action: converting a player from normal/public to private-game-only</h3>
		<p>
			If you'd like to be an anonymous player (or not be) you can now toggle this gamesetting (cog icon in upper right) - this can only happen once every 18
			hours. This action will log you out.
		</p>
		<h3>New gametype: only private-game-only players allowed</h3>
		<p>
			For anonymous players, there is a new checkbox while creating a game that only allows other anonymous players to take a seat. Non-anonymous players will
			not see these games on the list.
		</p>
		<ul>
			<li>Private, and private only games now have an icon on the gameslist and in games themselves.</li>
			<li>Gamelist filters will now remember your settings when leaving and then returning to the gamelist view.</li>
		</ul>
		<div className="ui header">
			<p>Version 0.10.4 released 12-6-2017</p>
		</div>
		<h3>New feature: private-game-only accounts</h3>
		<div style={{ textAlign: 'center' }}>
			<img src="https://i.imgur.com/ULKSqr2.png" />
		</div>
		<p>
			When signing up for an account, you can now make a new type of account - one that can only create and sit in private games. That account name does not
			appear in the userlist on the right sidebar, cannot use general chat, cannot set custom game names, and when a non-moderator views a game that player is
			playing in, their real username is obscured. Please use these if you're just visiting. Please note that I'm not condoning breaking the site rules, but
			this is just easier for everyone..
		</p>
		<h3>New feature: gamelist checkbox filters</h3>
		<p>
			Self explanatory - the increased traffic from our new clover friends have made these necessary. Because I'm lazy and did this quickly you'll have to redo
			these every time you revert to the gamelist view, sorry. I'll make it persist next patch.
		</p>
		<ul>
			<li>Bug fix: Players seated in a game that has been remade can no longer hit the remake button, screwing everything up/bouncing between games.</li>
			<li>Bug fix: Private games that get remade now correctly transfers over the old game's password, as expected.</li>
			<li>Bug fix: Observing a game when someone is executed no longer crashes your browser..</li>
			<li>Players in private games can no longer report players.</li>
			<li>Game UIDs always start with a capital letter.</li>
		</ul>
		{/* <div className="ui header">
			<p>Version 0.11.0 released 12-10-2017</p>
		</div>
		<h3>New feature: tournaments</h3>
		<p>
			Tournaments on SH.IO consist of players queueing up until there are enough players to have 2 games going as once, and then splitting into two tables. The
			winners of each game then play a 2nd game immediately after the 2nd table completes its game.
		</p>
		<p>There is some new UI here - when making a tournament in the create game panel, the slider turns into choosing a 14, 16, or 18 player tournament.</p>
		<p>
			When you queue for a tournament, you can leave the table - you will be pulled into the tournament when it starts. Joining another game or disconnecting
			removes you from the queue.
		</p>
		<p>
			The remake game functionality in tournaments now turns into cancel tournament. If someone afks in a tournament, there is no choice but to cancel both
			tables when remake is made. Please have the courtesy of doing so so that the other table isn't stuck playing a dead game. FYI: moderators are going to be
			very upset with tournament afkers..
		</p>
		<p>
			Winners of tournaments get a cool crown icon next to their name! And are sorted to the top of the userList under mods. These last for 3 hours from
			completion of the tournament. And yes, you can get multiple crowns.
		</p>
		<p>There's no stat tracking of tournaments yet - that will be the next thing worked on for minor versioning.</p> */}
		<div className="ui header">
			<p>Version 0.10.3 released 11-23-2017</p>
		</div>
		<p>Chat scrolling fixes again (I hope), bunch of moderator stuff, fix to 7p rebalanced graph (tomorrow).</p>
		<h3>Next up: if stuff is finally working right in 0.10, tourny mode.</h3>
		<div className="ui header">
			<p>Version 0.10.2 released 11-19-2017</p>
		</div>
		<h3>Bug fix patch:</h3>
		<p>
			Mobile devices should work better, hopefully fixes to some of the chat scrolling issues, start game sound should be back, gamenotes text readable again.
		</p>
		<h3>Next up: more bug fixes..</h3>
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
			<p>Version 0.9.2 "dim3" released 11-5-2017</p>
		</div>
		<h3>New feature: discord integration in general chat.</h3>
		<p>Click the new discord icon (while logged in) to replace the site's general chat with our discord channel's general chat.</p>
		<h3>New feature: disable confetti user setting.</h3>
		<p>For those of you that hate fun.</p>
		<h3>New feature: moderator sticky notes on general chat.</h3>
		<p>Dismiss in usual way, will be used to impart useful information that is less temporary than broadcasts.</p>
		<h3>New feature: reverted private games visibility.</h3>
		<p>
			Having them totally hidden was probably too difficult to find for some players that didn't have the URL. So now everyone can see private games again, but
			only those who are seated (and mods) can see gamechats. A decent compromise I think.
		</p>
		<h3>Other issues:</h3>
		<ul>
			<li>Clicking on a player's name in general chat takes you to their profile page.</li>
			<li>The remake button's gamechat now tells you how many votes you need to remake a game.</li>
			<li>A fix to moderation timeout ability is in.</li>
			<li>
				Players can only make one player report per game. I'm lazy and there's no failure state for this, so just keep it in mind: more than one attempt per
				game will not go through to mods.
			</li>
		</ul>
		<div className="ui header">
			<p>Version 0.9.1 "dim2" released 11-2-2017</p>
		</div>
		<h3>New feature: remake game button</h3>
		<div style={{ textAlign: 'center' }}>
			<img style={{ width: '30%', border: '1px solid grey', margin: '5px 0' }} src="/images/remake.png" />
		</div>
		<p>
			Your game is dead or afked on, or you just want to play again with the same team? Hit this button in the lower left corner of the fascist track to show
			that you'd like to remake the game. When (number of fascists in game +1, or +2 in 8, 9 and 10p games) have also hit the button, the game is remade with
			the same rules and name and updated UID/link, and will start when its requirements are met as usual.
		</p>
		<h3>New feature: rerebalanced 9p games</h3>
		<p>
			In what should speak volumes about what I know about game design, having an already-enacted liberal policy in 9p games.. actually makes fascists win more.
			So now that's gone, but there is one less fascist policy in the deck (so starting at 16). We'll see what happens there.
		</p>
		<h3>Other issues:</h3>
		<ul>
			<li>Thanks to a contribution, "blind mode" aka no gamechat mode now correctly will let other fascists see who is on their team.</li>
			<li>Stats/charts should work with the new rerebalanced 9p starting tomorrow when data collection fires at 4am.</li>
		</ul>
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
			<p>Version 0.8.2 "blue steel" released 9-30-2017</p>
		</div>
		<h3>New feature: player selectable fonts</h3>
		<div style={{ textAlign: 'center' }}>
			<img style={{ width: '95%', border: '1px solid grey', padding: '10px', margin: '5px 0' }} src="/images/fonts.png" />
		</div>
		<p>
			These can be found on the usual place (player settings, cog icon in upper right) and save on click. You will probably want to tweak your gamechat font
			size slider as well.
		</p>
		<ul>
			<li>The "game countdown is negative" bug should be fixed.</li>
			<li>An issue with some players cannot remake an account after it being deleted has been addressed. Contact a moderator if you have been affected.</li>
			<li>All new images from 0.8.0 have had their saturation knocked down by 25%, and new colors in gamechat muted more.</li>
			<li>Broadcasts now echo through webhook to discord.</li>
		</ul>
		<div className="ui header">
			<p>Version 0.8.1 "silver" released 9-28-2017</p>
		</div>
		<p>Cleanup/bug fix patch, the following was affected:</p>
		<ul>
			<li>
				Games should start and stop better now - if a 5th player is seated in a 5-10 player game, and then leaves, previously it would count down from 20 and
				then stall, now it will correctly not count down and go back to the waiting phase. Awesome!
			</li>
			<li>
				Ages old fix to a special election president being able to nominate a chancellor who was in the last elected government, in opposition to the printed
				rules.
			</li>
			<li>You can now claim after a veto.</li>
			<li>Fixed a bug where sometimes a president can not select a card to veto, hanging the game.</li>
			<li>Some more attempts to fix the various small sorting/jumping issues that are still out there.</li>
			<li>The link in the signup modal on the main page is finally working..</li>
			<li>Generalchat sticky scroll should work/work better</li>
			<li>Moderators have ban back, and hopefully some issues fixed with IPs.</li>
			<li>The info icon on the lobby has been updated.</li>
			<li>Profile search now works on Edge.</li>
			<li>There's a new discord webhook to ping admins when the site crashes. -_-</li>
		</ul>
		<p>The first 6 issues all done by contributor andy013 on github!</p>
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
			<p>Version 0.7.7 "shadow2" released 9-14-2017</p>
		</div>
		<ul>
			<li>Terms of use have been updated - if you're playing a public game, you must converse in a language everyone understands.</li>
			<li>Fix to gamenotes being cleared/deleted every time its dismissed. It will now persist until you leave the site/reload.</li>
			<li>Gamechat text for the veto policy power has been clarified/expanded for the president & chancellor.</li>
			<li>More attempted fixes to sort issues in general.</li>
			<li>
				The minimum width of this application has been lowered by 30px, meaning it will fit on a laptop like a macbook better without small horizontal
				scrolling.
			</li>
			<li>Some crash fixes attempted.</li>
			<li>Players can only make one account per day per IP.</li>
		</ul>
		<div className="ui header">
			<p>Version 0.7.5 "shadow" released 9-10-2017</p>
		</div>
		<h2>Over 50,000 games have been played!</h2>
		<h3>New feature: game notes</h3>
		<p>
			Click on the note icon next to the lock button to pop out a new component you can take notes on, scratchpad style. You can drag and drop this to any
			location. Not currently resizable as thats a bit tough.
		</p>
		<h3>New feature: sticky chat v2</h3>
		<p>
			Now, when chat is scrolled from the bottom, the lock is automatically set, meaning it will no longer "jump" every time someone chats something new.
			Conversely the lock is unset when you scroll back to the bottom. Hopefully this will go better than last time which was bugged for many
			players/browsers/zoom levels I believe.
		</p>
		<h4>Other items</h4>
		<ul>
			<li>New polls have been added, please use them.</li>
			<li>The terms of use has been updated - TOR users are no longer permitted. If you have a legitimate reason to use TOR, contact a moderator.</li>
			<li>Per the polls result, fascist players can no longer shoot hitler.</li>
			<li>The home page now shows how many players are online.</li>
			<li>Swastika symbols can no longer be used for game names..</li>
			<li>Player profiles now include cardbacks.</li>
			<li>Games now show the name and player count.</li>
			<li>Some more attempts to fix sorting bugs have been implemented.</li>
			<li>The link to discord on the default screen & homepage has been fixed.</li>
		</ul>
		<div className="ui header">
			<p>Version 0.7.4 "grey2" released 9-2-2017</p>
		</div>
		<h3>
			New feature:{' '}
			<a href="/polls" target="_blank">
				polls page
			</a>.
		</h3>
		<p>I'd like to start getting more feedback from the community so will start adding polls and see how it goes.</p>
		<h3>New feature: player reports now also get sent to a new discord channel. Internet is magic.</h3>
		<h3>New feature: sticky chat</h3>
		<p>
			Now, when chat is scrolled from the bottom, the lock is automatically set, meaning it will no longer "jump" every time someone chats something new.
			Conversely the lock is unset when you scroll back to the bottom.
		</p>
		<h4>Other items</h4>
		<ul>
			<li>Experienced mode is now correctly changed to speed mode in the games list.</li>
			<li>Mod notes now show players.</li>
			<li>Players can no longer chat blank lines by hitting space.</li>
			<li>Banned players will have their general chats instantly deleted.</li>
			<li>
				Note that the way this app works on the dev side has changed slightly, if you are playing along at home please check the README. You'll also need to do
				npm i this patch.
			</li>
		</ul>
		<div className="ui header">
			<p>Version 0.7.3 "grey" released 9-1-2017</p>
		</div>
		<h3>New feature: player reports</h3>
		<p>
			Double click a player's name in game (not card) to bring up an input field to alert moderators of bad behavior. Moderators now see a new icon that shows
			player reports and will respond when available.
		</p>
		<h3>Feature: stats page</h3>
		<p>
			The <a href="https://secrethitler.io/stats">stats page</a> has been (mostly) restored, still needs a little work (undefined/not a number).
		</p>
		<p>Bug fix: a long standing bug preventing moderators from properly banning users who are not in game has been fixed.</p>
		<p>Bug fix: the italic font is no longer semibold..</p>
		<h3>Over 400 players have cardbacks! Wow!</h3>
		<div className="ui header">
			<p>Version 0.7.2 "black3" released 8-10-2017</p>
		</div>
		<ul>
			<li>New game setting: disable player cardbacks. For those who find them distracting.</li>
			<li>New game setting: application width slider. Prefer the old (or custom) width of the application? Move this slider as desired.</li>
			<li>Bug fix: winning players can now click leave game as before. Sorry about that!</li>
			<li>New mods: snake69sus & Ecoturtle</li>
		</ul>
		<div className="ui header">
			<p>Version 0.7.1 "black2" released 8-10-2017</p>
		</div>
		<ul>
			<li>Players that have a custom cardback now correctly shows the red X when dead.</li>
			<li>General chat width is now working correctly.</li>
		</ul>
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
			<p>Version 0.6.6 "tuotuc" released 8-2-2017</p>
		</div>
		<h3>Small patch to fix a bug that could be used to crash the server thanks to player veggiemanz who now has a shiny orange name. Also these things:</h3>
		<ul>
			<li>
				Shuffling of the deck when its less than 3 should now happen before any election, as per the rules. This will prevent the "nein all" problem when
				there's few policies left.
			</li>
			<li>As you probably saw, there is a notice on the sign in/sign up modals to use Chrome or Firefox for the best experience.</li>
			<li>Fascists who investigate hitler will not have hitler's name change to fascist color.</li>
			<li>Hid the cardback section on settings as that is work in progress.</li>
			<li>Gamelist sort should be better and no longer bounce around as much.</li>
			<li>Confetti should no longer prevent the winners from being able to type in chat while its raining down.</li>
			<li>A fix to chancellor discards not showing up in replays.</li>
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
