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
			In twitch.tv style, players can chat small word fragments which will turn into icons inside of chat, such as:<img style={{ width: '30%', margin: '0 auto', display: 'block' }} src="/images/em.png" />
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
