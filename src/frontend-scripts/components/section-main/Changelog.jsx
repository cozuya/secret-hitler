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
					<p>Version 0.3.0 "teal" released 5-23-2017</p>
					<h3>New feature <a href="/stats">game stats</a>. Pretty basic to start, but interesting.  Will expand more on that later.</h3>
					<p>Other changes:</p>
					<ul>
						<li>Fixed the last crash bug for real this time.  I mean it.</li>
						<li>More fun name color stuff:</li>
						<ul>
							<li>>55% win rate: light purple</li>
							<li>>300 games played: very dark green</li>
							<li>The (immediate) above and the dark purple players are bolded.  Beware.</li>
						</ul>
						<li>also moved the 2nd tier of win rate from 10 minimum games to 30 minimum games if that makes sense.  Custom player name colors also appear in both general and game chat!  Wow your friends!</li>
						<li>Bug fix to (#34) when the status bar wrapped the styling was off slightly.</li>
						<li>Bug fix to (#2) left sidebar gamelist sorting.. I hope.  It SHOULD be: unstarted games on top, in progress games in the middle, completed games on the bottom.</li>
						<li>New component: "footer" on the bottom of the default/lizard screen that has a new "changelog" component and links to the github issues page.</li>
					</ul>
					<p>Version 0.2.0 "violet" released 5-16-2017</p>
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
					<img src="images/claim-modal.png" style={{marginTop: 0, textAlign: 'center'}} />
					<p>Click your action (or click the C again to dismiss) and a new type of chat will appear, informing players about what you say happened.  You have until the next election to do this action.</p>
					<img src="images/claim-text.png" style={{marginTop: 0, textAlign: 'center'}} />
					<p>Let me know if you like/hate this, and any issues or requests about it.</p>
				</div>
			</section>
		);
	}
}

Changelog.propTypes = {
	onLeaveChangelog: React.PropTypes.func,
};