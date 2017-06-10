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
					<p>Version 0.5.0 "" released 6-10-2017</p>
				</div>
				<h3>New feature (contribution): Player profiles</h3>
				<p></p>
				<div style={{textAlign: 'center'}}>
					<img src="images/gamelist-rainbow.png" />
				</div>
				<h3>New feature: Player moderators</h3>
				<p>Please welcome our new player-moderators: </p>
				<p>These players are empowered to have the ability to ban non-rainbow players for griefing and trolling, and to check for cheating. They will have a red (M) next to their name when they are not playing in a game.  Hopefully this (and some more advanced powers from admins) will be a permanent solution to problems that may come up.</p>
				<h3>Other updates</h3>
				<ul>
					<li>A fix to the rainbow game icon on the gamelist only being there for games that haven't started yet.</li>
					<li>A fix (finally) to dead players being able to leave the game and come back and chat.</li>
					<li>A 3 second delay has been implemented between the inactment of a policy by the chancellor, and the ability for the government to make a claim.  This should change game play a lot I think..</li>
					<li>Various tooltips have been added to some items and will continue to be addded in the future.</li>
					<li>Contribution: a fix to the (relatively rare) problem of the election tracker not working right with vetos and neins.</li>
					<li>Contribution: as you've probably seen, the lizard pulses yellow until you've clicked on it, displaying this changelog (once).</li>
				</ul>
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