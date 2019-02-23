import React from 'react'; // eslint-disable-line

class Changelog extends React.Component {
	render() {
		return (
			<section className="changelog">
				<a href="#/">
					<i className="remove icon" />
				</a>
				<div className="ui header">
					<h2>Changelog</h2>
				</div>
				<div className="ui header">
					<p>Version 1.1.1 released 2-25-2019</p>
				</div>
				<h4>New feature: much better mobile/small screen width user experience -RPYoshi</h4>
				<p>May not be entirely bug free -_- we'll see.</p>
				<h4>New feature: display of whether or not a player is typing v3 -coz</h4>
				<p>Hopefully this one like, works, without horribly lagging out the client. We'll see!</p>
				<h4>New feature: informational popup for new accounts -coz</h4>
				<p>This will attempt to explain how the site works somewhat and provide useful links to our how to play, terms of use, about, and wiki pages.</p>
				<h4>New feature: claim directly from the chat without clicking the "claim" button - simply type what you want to claim -Vigasaurus</h4>
				<p>Hopefully won't break everything this time</p>
				<h4>Adds 12 New Emotes -Vigasaurus</h4>
				<p>Special thanks to everyone on SH.io discord server who suggested emotes</p>
				<ul>
					<li>Moderators can now peek at currently locked in votes on a government -Vigasaurus</li>
					<li>Game Creation defaults now reflect results of strawpoll conducted previously -Buncha</li>
					<li>Game creation defualts should apply correctly -Vigasaurus</li>
					<li>Updated banned word list to be more exhaustive -Vigasaurus</li>
					<li>Minor bug fixes and internal changes -Vigasaurus, Spyro</li>
				</ul>
				<div className="ui header">
					<p>Version 1.0.2 released 1-20-2019</p>
				</div>
				<ul>
					<li>Some new moderation features (mods can force votes on afks) courtesy of contributor Vigasaurus.</li>
					<li>List of games should be like it was in 1.0.0 and lower.</li>
					<li>Contributor color has been updated.</li>
				</ul>
				<h4>The top 10 players of season 4 are:</h4>
				<ul>
					<li>benjamin172: 2110</li>
					<li>minie: 2084</li>
					<li>GoldenPanda: 2017</li>
					<li>scum: 1961</li>
					<li>Moranki: 1957</li>
					<li>User: 1957</li>
					<li>Gamethrower: 1935</li>
					<li>mufasa: 1899</li>
					<li>adam: 1882</li>
					<li>Cucumber: 1879</li>
				</ul>
				<div className="ui header">
					<p>Version 1.0.1 released 1-5-2019</p>
				</div>
				<ul>
					<li>Signin/signup with Discord/Github should be fixed.</li>
					<li>You should no longer be logged out automatically as often.</li>
					<li>Election tracker now says its status in the gamechat after fails.</li>
					<li>Lobby and cosmetic improvements @Hexicube.</li>
				</ul>
				<div className="ui header">
					<p>Version 1.0.0 released 1-1-2019</p>
				</div>
				<h3>1.0.0 and season 5 begins!</h3>
				<h4>The top 10 players of season 4 are:</h4>
				<ul>
					<li>benjamin172: 2110</li>
					<li>minie: 2084</li>
					<li>GoldenPanda: 2017</li>
					<li>scum: 1961</li>
					<li>Moranki: 1957</li>
					<li>User: 1957</li>
					<li>Gamethrower: 1935</li>
					<li>mufasa: 1899</li>
					<li>adam: 1882</li>
					<li>Cucumber: 1879</li>
				</ul>
				<h3>Badges this season are thanks to player liberalist!</h3>
				<p>
					It took a while, but we're here - all major features I could think of and some I couldn't are in and mostly working. A long, long way from the first
					stable(ish) release back in May 2017.
				</p>
				<p>
					I want to thank our moderation team first and foremost. The site would not be in the same shape without them. There was a time that feature wasn't
					even in and it was just a nightmare. Obviously its a combination of both the theme and the nature of a mostly anonymous internet, but they've done an
					amazing job keeping this place playable in public games and fun for everyone!
				</p>
				<p>
					I also want to call out contributor/mod Hexicube for spending so much working on various parts of the app over the last ~year. Many moderation tools
					and features like custom games would not exist without him.
				</p>
				<p>
					Please note that 1.0 does not mean I am no longer supporting the application and site. Work will continue to make the site even better, but not
					personally at the pace I have been. My next game is in progress and I expect to get to a playable pre-alpha state some time in the next few months. It
					will be a (fresh IP) hidden role game with some similarities to the fascist hunting/electing game we all know and love but with some fun features and
					mechanics that can only exist online. Stay tuned! -Chris
				</p>
				<p>This update also includes:</p>
				<ul>
					<li>Fixed player claims showing under player chat instead of game chat.</li>
					<li>Broadcasts will now always show regardless of filters.</li>
					<li>Fixed cardbacks sometimes failing to upload.</li>
					<li>Game remaking no longer shows "1/NaN" before the game starts on non-custom games.</li>
					<li>Fixed alts/trials showing as grey in user list.</li>
					<li>Elo slider minimum is now 1600.</li>
					<li>Cardbacks now support all image types, and all sizes.</li>
					<li>Game remaking now updates the blacklist if the creator changed theirs.</li>
				</ul>
			</section>
		);
	}
}

export default Changelog;
