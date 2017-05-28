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
					<p>Version 0.3.2 "avocado" released 5-28-2017</p>
				</div>
				<h3>New feature: player status icons in the lobby.  Players in game will have a "SH" icon.  Players observing will have a magnifying glass icon.  Click both (while not in a game) to go to the game that player is in.</h3>
				<ul>
					<li>Irritating private games that never get started now get deleted after 10 minutes.</li>
					<li>Fix to a front-end issue with observer chat.</li>
					<li>Another attempt to fix gamelist sort.</li>
				</ul>
				<div className="ui header">
					<p>Version 0.3.1 "mint" released 5-26-2017</p>
				</div>
				<h3>New feature (sorta): player colors in both game and general chat.  This can be disabled with a new player setting in the settings menu (click "gear" icon while not in a game).  Note that because of the "unorthodox" way I did this, players who are no longer logged in will have their previous chats revert to the default.</h3>
				<ul>
					<li>A new info component is in the lobby/playerlist.  Click it to get details on the player name color schemes.</li>
					<li>Fix to "chancellor in veto zone can't click a card, hanging the entire game" bug that to be honest I have no idea where it came from, but it should be working now.  Sorry about that.</li>
					<li>Looks like there was one crash bug left and only happened a couple times per day, this patch will attempt to fix that. Without further breaking stuff.</li>
					<li>Fix to gamelist sort bouncing around like crazy (I hope, this is like the 3rd time I've tried to fix it).</li>
					<li>Enhanced the player colors a bit, and took out bolded player names as it was a bit much.</li>
					<li>Increased threshold for being in the "top tier" on the playerlist from 30 to 50.  This will put only "colored" (bad choice of words..) players on the top.  I think this incentivizes people a bit.</li>
					<li>Stats page only refreshes once per day now.</li>
				</ul>
				<div className="ui header">
					<p>Version 0.3.0 "teal" released 5-23-2017</p>
				</div>
				<h3>New feature <a target="_blank" href="/stats">game stats</a>. Pretty basic to start, but interesting.  Will expand more on that later.</h3>
				<ul>
					<li>Fixed the last crash bug for real this time.  I mean it.  Associated to that bug, fixed the "can't select ja or nein while chancellor during veto phase" bug.</li>
					<li>More fun name color stuff:</li>
					<ul>
						<li>>55% win rate: light purple</li>
						<li>>65% win rate: dark purple</li>
						<li>>300 games played: very dark green</li>
						<li>The 2 above are bolded. <b>Beware.</b></li>
					</ul>
					<li>also moved the 2nd tier of win rate from 10 minimum games to 30 minimum games if that makes sense.  Unfortunately due to an issue (PEBKAC), player colors in chat will be in the next release, not this one.</li>
					<li>Bug fix to (#34) when the status bar wrapped the styling was off slightly.</li>
					<li>Bug fix to (#2) left sidebar gamelist sorting.. I hope.  It SHOULD be: unstarted games on top, in progress games in the middle, completed games on the bottom.</li>
					<li>New component: "footer" on the bottom of the default/lizard screen that has a new "changelog" component and links to the github issues page.</li>
				</ul>
				<div className="ui header">
					<p>Version 0.2.0 "violet" released 5-16-2017</p>
				</div>
				<h3>New feature: automated claim system</h3>
				<p>After the following actions:</p>
				<ul>
					<li>President receives 3 policies and chancellor completes his or her discard</li>
					<li>Chancellor receives 2 policies and completes his or her discard</li>
					<li>President peeks at the top 3 policies</li>
					<li>President examines party loyalty</li>
				</ul>
				<p>A glowing "C" will show up in the lower right corner of chat for those players.</p>
				<div style={{textAlign: 'center'}}>
					<img src="images/claim-button.png" style={{marginTop: 0}} />
				</div>
				<p>Click that, and the chat window will be overlaid with a new modal.</p>
				<div style={{textAlign: 'center'}}>
					<img src="images/claim-modal.png" style={{marginTop: 0, textAlign: 'center'}} />
				</div>
				<p>Click your action (or click the C again to dismiss) and a new type of chat will appear, informing players about what you say happened.  You have until the next election to do this action.</p>
				<div style={{textAlign: 'center'}}>
					<img src="images/claim-text.png" style={{marginTop: 0, textAlign: 'center'}} />
				</div>
				<p>Let me know if you like/hate this, and any issues or requests about it.</p>
			</section>
		);
	}
}

Changelog.propTypes = {
	onLeaveChangelog: React.PropTypes.func,
};