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
		const version = this.props.version.current;

		return (
			<section className="changelog">
				<i className="remove icon" onClick={this.leaveChangelog} />
				<div className="ui header">
					<h2>Changelog</h2>
				</div>
				<div className="ui header">
					<p>{`Version ${version.number} "${version.color}" released ${version.date}`}</p>
				</div>
				<h3>New feature: karma system aka player reporting system.</h3>
				<p>When you leave in-progress games you will now see a list of players with radio buttons on the modal.</p>
				<div style={{textAlign: 'center'}}>
					<img src="images/badkarma.png" />
				</div>
				<p>If you are leaving because of a griefing player aka someone who afks intentionally, who spams chat, or does not play with the intent of winning, select that person from this list.</p>
				<p>If they receive enough votes in that game, they will take a karma hit which results in:</p>
				<ul>
					<li>1st offense: 15 minute ban from playing or chatting.</li>
					<li>2nd offense: 2 hour ban from playing or chatting.</li>
					<li>3rd offense: indefinite ban from playing or chatting.</li>
				</ul>
				<strong>I cannot stress enough that this is for griefers only, not purples, not people who say "idiot" in chat, not people who lie to you (duh).  This will be watched.</strong>
				<h3>New Feature: no observer chat filter</h3>
				<div style={{textAlign: 'center'}}>
					<img src="images/noobserver.png" />
				</div>
				<p>Use this if someone is griefing you via observer chat</p>
				<ul>
					<li>Player colors should now persist after that player logs out.</li>
					<li>Despite calling it stable, 2 crashes occurred in the 3 days that avocado was out.  1 was a miss, other one was pretty bizarre.. someone not logged in tried to make a game.  You can't even do that..</li>
				</ul>
				<div className="ui header">
					<p>Version 0.3.2 "avocado" released 5-28-2017</p>
				</div>
				<h3>New feature: player status icons in the lobby.  Players in game will have a "SH" icon.  Players observing will have a magnifying glass icon.  Click either (while not in a game) to be routed to the game that player is in.  Feature courtesy of jbasrai @github.  Contribute to this open source project to get a cool orange name!</h3>
				<ul>
					<li>Irritating private games that never get started now get deleted after 10 minutes.</li>
					<li>Fix to a front-end issue with observer chat.</li>
					<li>Another attempt to fix gamelist sort.</li>
					<li>A small global black list of "bad words" and word fragments for user names and game names has been implemented.  While this is a (very mildly) adult-themed game, some stuff is not cool.  Tongue-in-cheek Nazi references and swear words?  Probably fine.  Racism/sexism/homophobia/antisemitism?  No thanks.</li>
					<li>Something special now happens when you win a game..</li>
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