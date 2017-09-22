import React from 'react'; // eslint-disable-line
import PropTypes from 'prop-types';

const Changelog = props =>
	<section className="changelog">
		<i
			className="remove icon"
			onClick={() => {
				props.onLeaveChangelog('default');
			}}
		/>
		<div className="ui header">
			<h2>Changelog</h2>
		</div>
		<div className="ui header">
			<p>Version 0.8.0 "" released </p>
		</div>
		<h3>New feature: card and graphics overhaul</h3>
		<p>Thanks to contributor andy013, most of the cards and images in game have been upgraded and colorized. Neat!</p>
		<p>Also fonts redone, many other UI tweaks in. Let us know what you think.</p>
		<h3>New feature: election voting rework (changable votes)</h3>
		<p>
			Previously, a vote on a government was immediate and permanent. Now, clicking on ja or nein will remove your loader gif, but you can either a) click the
			selected one again to bring back the loader and prevent vote tallying or just b) select the other option to switch your vote. Votes are tallied as usual
			when everyone has made a selection.
		</p>
		<h3>New feature: 2nd tier of player moderators (editors) and many new helpful moderation tools implemented.</h3>
		<p>Editors will have an (E) next to their name. Consider editors tier 1 mods, and normal (M) tier 2 mods. All of which have my full support.</p>
		<h3>New feature: wiki page</h3>
		<p>
			Check out our{' '}
			<a target="_blank" href="https://github.com/cozuya/secret-hitler/wiki">
				wiki page
			</a>{' '}
			kindly set up by moderator DFinn.
		</p>
		<p>The footer bar in the default view has also been updated.</p>
		<h4>Other issues</h4>
		<ul>
			<li>
				Home page and about us page text has been updated and the webform deprecated. If you have feedback/issues, a new email address has been set up and there
				is always discord and the player report feature.
			</li>
			<li>Player cardbacks in profiles work correctly on Edge.</li>
			<li>Gamenotes clear button now works.</li>
			<li>Thanks to contributor jonnybest, hovering on a game on the list in the left sidebar now shows you who is seated in that game.</li>
			<li>
				A bug in "blind mode" (no gamechat) was causing fascists to get credit for winning the game when Hitler was shot, this mode was disabled via hotfix, now
				that bug has been fixed and that mode has been re-enabled.
			</li>
			<li>
				Private games "P" icon in the upper left corner of a gamelist was disappearing after the game started - thanks to contributor jonnybest, this has been
				fixed.
			</li>
			<li>Players can now search/type in other players to look at their profile. Click on the settings/gear icon to see this new input field.</li>
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
			<img src="images/gamelist-rainbow.png" />
		</div>
		<p>
			In the lobby, a new icon appears showing what game style you are filter and sorting the userlist by. Click it to switch between "regular" and "rainbow".
			Effectively, rainbow players get to "start over" in an optional hard mode with a 0-0 score.
		</p>
		<p>
			<b>For rainbow games, your wins and losses are in a different tier, that does not affect your regular game winrate or player color.</b> "Rainbow rewards"
			may come in at some point.
		</p>
		<p>
			Also in this release, the karma system has been temporarily disabled due to griefers exploiting it. The next major feature is <b>player moderation</b>,
			where I will be enlisting some of our regular players to help out in getting rid of griefers and trolls. This isn't all that hard and will be coming soon,
			and hopefully guarantee a better playing experience for everyone. Please check the github issue if you are interested in helping out.
		</p>
	</section>;

Changelog.propTypes = {
	onLeaveChangelog: PropTypes.func
};

export default Changelog;
