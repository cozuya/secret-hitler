import React from 'react';

export default class Changelog extends React.Component {
	constructor() {
		super();
		this.leaveChangelog = this.leaveChangelog.bind(this);
	}

	leaveChangelog() {
		this.props.onLeaveChangelog('default');
	}

	render() {
		return (
			<section className="changelog">
				<i className="remove icon" onClick={this.leaveChangelog} />
				<div className="ui header">
					<h2>Changelog</h2>
				</div>
				<div className="ui header">
					<p>Version 0.6.3 "conte" released 6-24-2017</p>
				</div>
				<h3>New feature: moderator IP bans.</h3>
				<p>Obviously need to be used carefully, but this will prevent (hopefully) some of the worst offenders from repeatedly making accounts. All IP bans are temporary and go away relatively fast.</p>
				<p>Other issues:</p>
				<ul>
					<li>Observer chat is back.</li>
					<li>A fix to non rainbows having purple names in the userlist/lobby.</li>
					<li>A fix to clicking on an icon in the userlist/lobby taking you to the profile instead of the game.</li>
					<li>A fix to a general styling issue - seen most obviously by the yellow circle around the lizard being offset.</li>
					<li>A fix to only rainbow players in a rainbow game showing up on the userlist/lobby as opposed to all rainbow players.</li>
					<li>Thanks to a submission, tracks have been manually desaturated and replaced, most users won't see a change.</li>
					<li>All images minified so should be a lot snappier on first load..</li>
				</ul>
				<h3>New feature: Replays</h3>
				<img src="/images/replay-demo.gif" width="750px" />
				<ul>
					<li>Replays are now available! They can be accessed from the post-game or from player profiles.</li>
				</ul>
				<h3>Misc. bug fixes</h3>
				<ul>
					<li>Fixed bug with Vote Accuracy, which was counting elections with Liberal presidents.</li>
					<li>Fixed bug that was sometimes awarding false losses to profiles after a Liberal win.</li>
				</ul>
				<div className="ui header">
					<p>Version 0.6.2 "ssalg deniats" released 6-18-2017</p>
				</div>
				<ul>
					<li>A fix to the userlist display issues.</li>
					<li>A fix to non rainbows having purple names and colors.</li>
					<li>Back end validation to chats, meaning dead players can't avoid the disabled filter & not logged in users can't chat.</li>
					<li>Player names are now case insensitive, meaning that a player cannot make an account named "Valeera" if there's already an account called "valeera". If some accounts need to be deleted let me know.</li>
				</ul>
				<div className="ui header">
					<p>Version 0.6.1 "stained glass" released 6-17-2017</p>
				</div>
				<h3>New feature: player font size setting in game settings.</h3>
				<p>Click the gear icon to change the size of the font in games.</p>
				<h3>New feature: admin and mod broadcasts.</h3>
				<p>Admins and mods have the ability to send a message to all games.  This should be used sparingly and really only for downtime announcements or if a particularly bad troll attack happens.</p>
				<h4>Other updates</h4>
				<ul>
					<li>A fix to the general styling problems with profiles.</li>
					<li>A fix to player's win rates being bumped down a line due to long usernames/icons.</li>
					<li>Rainbow player's lobby is now sorted correctly.</li>
				</ul>
				<p>New morning mods: Faaiz1999 and DumbBullDoor.  We have pretty good mod coverage so closing mod applications for a bit, will reopen when needed.  Thanks!</p>
				<p>Next up: more bug fixes in preparation for a 1.0 beta and release (all bugs fixed, all desired features in).</p>
				<div className="ui header">
					<p>Version 0.6.0 "noise" released 6-12-2017</p>
				</div>
				<h3>New feature: Player profiles</h3>
				<p>Click on a player in the lobby/player list to get detailed information about games they've played. You can access your own stats that way, or through the game settings screen ("gear" icon in upper right corner).</p>
				<div style={{textAlign: 'center'}}>
					<img src="images/profile.png" style={{width: '90%'}}/>
				</div>
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
				<p>Some players have volunteered to be moderators.  They are empowered to have the ability to ban non-rainbow players for griefing and trolling, and to check for cheating. Hopefully this (and some more advanced powers from admins) will be a permanent solution to problems that may come up.  Moderators will have a red (M) next to their names.</p>
				<h4>Other updates</h4>
				<ul>
					<li>A fix to the rainbow game icon on the gamelist only being there for games that haven't started yet.</li>
					<li>A fix (finally) to dead players being able to chat by leaving the game and coming back.</li>
					<li>A 3 second delay has been implemented between the inactment of a policy by the chancellor, and the ability for the government to make a claim (for non-experienced games only).  This should change game play a lot I think..</li>
					<li>Various tooltips have been added to some items and will continue to be addded in the future.</li>
					<li>A fix to rainbow losses also adding to normal losses, but not the other way around.  I'll see if there's a way to credit those.</li>
					<li>Contribution by player sethe: a fix to the (relatively rare) problem of the election tracker not working right with vetos and neins.</li>
				</ul>
				<p>Up next: player profiles.  This is just about ready to go and will be released within the next 2 days.</p>
				<div className="ui header">
					<p>Version 0.4.0 "chestnut" released 6-5-2017</p>
				</div>
				<h3>New feature: Rainbow games.</h3>
				<p>While creating a game, players with more than 50 completed games ("rainbow players") will now be able to create games that only other rainbow players can be seated in. These games have a special symbol in the sidebar.</p>
				<div style={{textAlign: 'center'}}>
					<img src="images/gamelist-rainbow.png" />
				</div>
				<p>In the lobby, a new icon appears showing what game style you are filter and sorting the userlist by.  Click it to switch between "regular" and "rainbow". Effectively, rainbow players get to "start over" in an optional hard mode with a 0-0 score.</p>
				<p><b>For rainbow games, your wins and losses are in a different tier, that does not affect your regular game winrate or player color.</b>  "Rainbow rewards" may come in at some point.</p>
				<p>Also in this release, the karma system has been temporarily disabled due to griefers exploiting it.  The next major feature is <b>player moderation</b>, where I will be enlisting some of our regular players to help out in getting rid of griefers and trolls.  This isn't all that hard and will be coming soon, and hopefully guarantee a better playing experience for everyone.  Please check the github issue if you are interested in helping out.</p>
			</section>
		);
	}
}

Changelog.propTypes = {
	onLeaveChangelog: React.PropTypes.func,
};
