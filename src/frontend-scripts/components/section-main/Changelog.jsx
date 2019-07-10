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
					<p>Version 1.6.0 released 7-1-2019</p>
				</div>
				<h4>The top 10 players of season 6 are:</h4>
				<ul>
					<li>Roxz80: 2001</li>
					<li>Einstein: 1997</li>
					<li>Freakin: 1963</li>
					<li>obama: 1952</li>
					<li>Metalace: 1950</li>
					<li>imbapingu: 1920</li>
					<li>StatReset: 1911</li>
					<li>Prohell: 1903</li>
					<li>acro: 1897</li>
					<li>wenshan: 1894</li>
				</ul>

				<h4>
					Timed Games are Fixed!  -Vigasaurus
				</h4>
				<p>Various Bugfixes -Vigasaurus</p>
				<p>Multiple moderation improvements</p>

				<div className="ui header">
					<p>Version 1.5.2 released 5-23-2019</p>
				</div>
				<p>Various Backend Fixes -Vigasaurus</p>
				<p>Removes Is Typing Display (Should fix some lag)</p>
				<div className="ui header">
					<p>Version 1.5.1 released 5-12-2019</p>
				</div>
				<p>Some backend changes for security thanks to Vigasaurus</p>
				<div className="ui header">
					<p>Version 1.5.0 released 4-15-2019</p>
				</div>
				<h4>
					Creating a public elo game now defaults to only verified accounts being able to sit in the game (if the game creator is verified). Verified accounts
					are those who have successfully confirmed their non disposable email address, or are using sign in with Github or Discord. This will solve various
					moderation problems. If everyone hates this, I will consider reverting this change. Please read our email terms of use (cliffs: will never email you
					other than initial verification and password resets, your email will never leave the site). -coz
				</h4>
				<p>Verify your email (or connect to Discord/Github) to ensure you are able to join these games.</p>
				<h4>ELO Slider can now have a value typed into it, and correctly alerts you to the highest you can set it. -Vigasaurus</h4>
				<p>The take a seat button now has more detailed error messages, if you're unable to sit in a game.</p>
				<p>Multiple moderation improvements.</p>
				<div className="ui header">
					<p>Version 1.4.2 released 4-1-2019</p>
				</div>
				<h4>The top 10 players of season 5 are:</h4>
				<ul>
					<li>nvassOG: 1979</li>
					<li>minie: 1977</li>
					<li>Claire0536: 1937</li>
					<li>Canaris: 1915</li>
					<li>benjamin172: 1910</li>
					<li>mufasa: 1905</li>
					<li>Arrtxi: 1901</li>
					<li>RyanLockwood: 1892</li>
					<li>Anzuboi: 1862</li>
					<li>spite: 1858</li>
				</ul>
				<div className="ui header">
					<p>Version 1.4.0 released 3-27-2019</p>
				</div>
				<h4>
					New players have the "typing indicator" setting disabled by default - reminder, if you are experiencing laggy gameplay, turn this off yourself in the
					player settings. -coz
				</h4>
				<h4>Many Moderation Improvements -Vigasaurus</h4>
				<h4>Silent Game Features now work as intended -Vigasaurus</h4>
				<h4>Many smaller fixes and minor UI changes!</h4>
				<div className="ui header">
					<p>Version 1.3.0 released 3-5-2019</p>
				</div>
				<h4>Fixed issue: Chats in replays work again.</h4>
				<h4>Returning feature: typing indicator (again). This has been overhauled and should work better.</h4>
				<h4>New player setting: disable typing indicator. If you feel this is adveresly affecting your browser, turn this off in your settings.</h4>
				<h4>New feature: Creategame overhaul.</h4>
				<p>Thanks to Vigasaurus the create game page has been redone with many new looks and feels including some fun templates.</p>
				<h4>Many smaller fixes and UI updates!</h4>
				<div className="ui header">
					<p>Version 1.1.3 released 2-26-2019</p>
				</div>
				<h4>Fixed issue: problems people were having while typing in chat in mobile view.</h4>
				<h4>Returning fixed feature: claim from chat i.e. type "rrb" to make a claim without clicking on the "claim" button.</h4>
				<div className="ui header">
					<p>Version 1.1.2 released 2-24-2019</p>
				</div>
				<h4>New feature: much better mobile/small screen width user experience -RPYoshi</h4>
				<p>May not be entirely bug free -_- we'll see.</p>
				<h4>New feature: informational popup for new accounts -coz</h4>
				<p>This will attempt to explain how the site works somewhat and provide useful links to our how to play, terms of use, about, and wiki pages.</p>
				<h4>New feature: claim directly from the chat without clicking the "claim" button - simply type what you want to claim i.e. "rrb" -Vigasaurus</h4>
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
