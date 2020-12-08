import React from 'react'; // eslint-disable-line

class Changelog extends React.Component {
	render() {
		return (
			<section className="changelog" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
				<a href="#/">
					<i className="remove icon" />
				</a>
				<div className="ui header">
					<h2>Changelog</h2>
				</div>
				<div className="ui header" style={{ fontSize: '1.1em' }}>
					<p>Welcome to Season 12!</p>
				</div>
				<div className="ui header">
					<p>Version 1.7.2 released 12-8-2020</p>
				</div>
				<h3>New Features:</h3>
				<p>
					<strong style={{ fontSize: '1.1em', color: 'darkmagenta' }}>Adds Keyboard Shortcuts to Games</strong> - 1/2/3 for discarding a card as president, 1/2
					for discarding a card as chancellor, and j/n for voting "ja" or "nein" on a government. A 2s delay is applied to prevent accidental card selections,
					and is optionally applied to voting. These shortcuts are disabled by default; enable them in your game settings.
				</p>

				<h3>Minor Changes:</h3>
				<p>
					<strong style={{ fontSize: '1em', color: 'darkmagenta' }}>Adds Merriweather font</strong>
				</p>
				<p>
					<strong style={{ fontSize: '1.1em', color: 'darkmagenta' }}>Various bug fixes and minor visual changes</strong>
				</p>

				<div className="ui header">
					<p>Version 1.7.1 released 10-1-2020</p>
				</div>
				<h3>New Features:</h3>
				<p>
					<strong style={{ fontSize: '1.1em', color: 'darkmagenta' }}>Various New Emotes</strong> - various contributors have graciously added many new emotes,
					check them all out!
				</p>
				<p>
					<strong style={{ fontSize: '1.1em', color: 'darkmagenta' }}>Adds Keyboard Shortcuts to Replay Menu</strong> - j/k to go backwards or forwards one
					step, and h/l to go backwards or forwards one turn.
				</p>
				<p>
					<strong style={{ fontSize: '1.1em', color: 'darkmagenta' }}>Adds new user-popup menu to allow better interaction with users</strong>
				</p>
				<p>
					<strong style={{ fontSize: '1.1em', color: 'darkmagenta' }}>Various bug fixes and minor visual changes</strong>
				</p>
				<h4>The top 10 players of season 11 are:</h4>
				<ol>
					<li>CuSith: 2071</li>
					<li>imbapingu: 2068</li>
					<li>Starkrush: 1983</li>
					<li>Moranki: 1976</li>
					<li>near1337: 1940</li>
					<li>SexGodMedusa: 1939</li>
					<li>1on1: 1920</li>
					<li>SOOOOZE: 1907</li>
					<li>NotAnAlt7: 1903</li>
					<li>casdude: 1896</li>
				</ol>
				<hr />
				<div className="ui header" style={{ fontSize: '1.1em' }}>
					<p>Welcome to Season 11!</p>
				</div>
				<div className="ui header">
					<p>Version 1.7 released 7-1-2020</p>
				</div>
				<h3>New Features:</h3>
				<p>
					<strong style={{ fontSize: '1.1em', color: 'darkmagenta' }}>Emote Selector</strong> - emotes now work more similarly to other chat applications: you
					can type : (a colon) to bring up a list of emotes, and type more to filter down to specific emotes. You can use the arrow keys or mouse to select one
					and then press enter or tab to have it fill the chat input, or you can continue to type and it will filter that list down to match. All emotes have
					been changed - they all now start and end with : (a colon), and they are all lowercase.
				</p>
				<img src="../images/1.7.0-images/1-7EmoteSelector.gif" alt="Emote Selector GIF" style={{ width: '50%', alignSelf: 'center' }}></img>
				<p>
					<strong style={{ fontSize: '1.1em', color: 'darkmagenta' }}>Practice Game Mode</strong> - a casual game mode (no stat/Elo changes), but gameplay rules
					are enforced. This allows for games just for fun, but with basic gameplay rules enforced. As a result, casual games now have no gameplay rules
					enforced.
				</p>
				<img src="../images/1.7.0-images/1-7GameMode.png" alt="Game Mode Selection" style={{ width: '25%', alignSelf: 'center' }}></img>
				<p>
					<strong style={{ fontSize: '1.1em', color: 'darkmagenta' }}>Timer UI Improvements</strong> - the timer in-game will be hidden by default, and will
					only show up in the last 15 seconds or if you click its button. Click the timer to hide it. There is also a new sound when 15 seconds are remaining.
				</p>
				<div style={{ width: '75%', display: 'flex', justifyContent: 'center', alignSelf: 'center' }}>
					<img src="../images/1.7.0-images/1-7TimerIcon.png" alt="Timer UI Hidden" style={{ marginRight: '35px' }}></img>
					<img src="../images/1.7.0-images/1-7Timer.png" alt="Timer UI Shown"></img>
				</div>
				<p>
					<strong style={{ fontSize: '1.1em', color: 'darkmagenta' }}>Terms of Use Version 1.5</strong> - a new version of the Terms of Use has been published{' '}
					<a href="/tou">here</a>.
				</p>
				<p>
					<strong style={{ fontSize: '1.1em', color: 'darkmagenta' }}>End-of-game Elo Reward Changes</strong> - the Elo calculation formula has changed slightly
					(nothing major, you likely won't even notice). Elo rewards at the end of the game are now sorted by role, and are more readable.
				</p>

				<img src="../images/1.7.0-images/1-7EloChanges.png" alt="Elo Changes" style={{ maxWidth: '65%', alignSelf: 'center' }}></img>
				<p>
					<strong style={{ fontSize: '1.1em', color: 'darkmagenta' }}>Remake URLs have changed</strong> - remaking a game will no longer simply add "Remake" to
					the end of the URL, it will instead update a number. e.g. OriginalUID, OriginalUIDRemake1, OriginalUIDRemake2.
				</p>
				<p>
					<strong style={{ fontSize: '1.1em', color: 'darkmagenta' }}>Deck/Claim Information Customizations</strong> - you can now choose how deck and claim
					information is presented in your chat. The original way ('RRB' etc) is still the default, and available. However, you can now pick short ('FFL' etc)
					or full ('fascist, fascist, liberal' etc) as well.
				</p>
				<img
					src="../images/1.7.0-images/1-7ClaimTypeLegacy.png"
					alt="Deck Customizations (legacy)"
					style={{ width: '50%', marginBottom: '5px', alignSelf: 'center' }}
				></img>
				<img
					src="../images/1.7.0-images/1-7ClaimTypeShort.png"
					alt="Deck Customizations (short)"
					style={{ maxWidth: '50%', marginBottom: '5px', alignSelf: 'center' }}
				></img>
				<img
					src="../images/1.7.0-images/1-7ClaimTypeFull.png"
					alt="Deck Customizations (full)"
					style={{ maxWidth: '50%', marginBottom: '15px', alignSelf: 'center' }}
				></img>
				<p>
					<strong style={{ fontSize: '1.1em', color: 'darkmagenta' }}>New Disable Observer Chat in-game-only option</strong> - observer chat has gained a new
					option to disable observer chat only during the game. You can still disable observer chat completely as well.
				</p>
				<img src="../images/1.7.0-images/1-7Observer.png" alt="Observer Chat Selector" style={{ maxWidth: '35%', alignSelf: 'center' }}></img>
				<h3>Minor Changes:</h3>
				<p>
					<strong style={{ fontSize: '1em', color: 'darkmagenta' }}>Fixed Multiple Discord Login Issues</strong>
				</p>
				<p>
					<strong style={{ fontSize: '1em', color: 'darkmagenta' }}>Fixed Multiple Minor Blind Mode Issues</strong>
				</p>
				<p>
					<strong style={{ fontSize: '1em', color: 'darkmagenta' }}>Changed the look of various pop-ups</strong>
				</p>
				<p>
					<strong style={{ fontSize: '1em', color: 'darkmagenta' }}>Added various error messages</strong>
				</p>
				<p>
					<strong style={{ fontSize: '1em', color: 'darkmagenta' }}>Various other bugs squashed</strong>
				</p>
				<br />
				<h4>The top 10 players of season 10 are:</h4>
				<ol>
					<li> thijsdB: 2130 </li>
					<li> imbapingu: 2026 </li>
					<li> FinalManu: 2018 </li>
					<li> GodMedusa: 1971 </li>
					<li> Reich25: 1959 </li>
					<li> DoubleAgent: 1945 </li>
					<li> CowsAreCute: 1910 </li>
					<li> KyleTheHill: 1910 </li>
					<li> Mell0: 1907 </li>
					<li> RyanLockwood: 1905 </li>
				</ol>

				<div className="ui header" style={{ fontSize: '1.1em' }}>
					<p>Welcome to Season 10! 4-1-2020</p>
				</div>

				<h4>The top 10 players of season 9 are:</h4>
				<ul>
					<li> rags009: 1992 </li>
					<li> ChroIIo: 1942 </li>
					<li> Scorcha: 1930 </li>
					<li> NotFat: 1924 </li>
					<li> ChillMedusa: 1899 </li>
					<li> arteezy: 1886 </li>
					<li> DanGheesling14: 1886 </li>
					<li> olly97: 1882 </li>
					<li> earring: 1854 </li>
					<li> lucaanders: 1854 </li>
				</ul>

				<hr style={{ width: '100%' }} />
				<div className="ui header">
					<p>Version 1.6.7 released 1-25-2020</p>
				</div>
				<p>New feature: Player settable color theming. Check the settings page to change the color palettes.</p>
				<p>Multiple Bug Fixes and Improvements</p>
				<p>Multiple Moderation Improvements</p>
				<div className="ui header">
					<p>Version 1.6.6 released 1-5-2020</p>
				</div>
				<p>Adds 10 New Emotes</p>
				<p>Adds Color to Replay Chat</p>
				<p>Fixes Remake Visual Bugs</p>
				<p>Fixes Leaderboard Caching</p>
				<p>Adds Veteran AEM Role</p>
				<p>Multiple Bug Fixes</p>
				<hr style={{ width: '100%' }} />
				<div className="ui header">
					<p>Welcome to 2020 and to Season 9!</p>
				</div>
				<h4>The top 10 players of season 8 are:</h4>
				<ul>
					<li> godhemzelve: 2067</li>
					<li> Scorcha: 2024</li>
					<li> imbapingu: 2013</li>
					<li> wenshan: 1945</li>
					<li> Rivstar:1937</li>
					<li> MaximTheMeme: 1924</li>
					<li> RetiredManu: 1906</li>
					<li> codingwizard: 1888</li>
					<li> trump: 1872</li>
					<li> IThanosI: 1870</li>
				</ul>

				<div className="ui header">
					<p>Version 1.6.5 released 10-5-2019</p>
				</div>
				<p>Updates Terms of Use to version 1.4</p>
				<p>Fixes Cardbacks not being visible in remakes</p>
				<p>Fixes spacing issues for user names and medals in game</p>
				<p>Fixes bug where remake votes didn't rescind automatically</p>
				<div className="ui header">
					<p>Version 1.6.4 released 10-1-2019</p>
				</div>
				<h4>The top 10 players of season 7 are:</h4>
				<ul>
					<li>Canaris: 1956 </li>
					<li>imbapingu: 1941 </li>
					<li>liluzivert: 1924 </li>
					<li>Maximovic96: 1923 </li>
					<li>rags009: 1920 </li>
					<li>Olk: 1897 </li>
					<li>acro: 1887 </li>
					<li>Freakin: 1882 </li>
					<li>Kristy: 1882 </li>
					<li>okboomer: 1879 </li>
				</ul>

				<p>Fixes Season End Date on Firefox</p>
				<p>Fixes Remake Spam</p>
				<p>Fixes Bug where users could snoop which other players had voted to remake</p>
				<p>Adds the ability to simply type "@mod [message]" in game to ping a moderator on Discord automatically</p>
				<p>Adds a Safe For Work User Setting - to minorly conceal some mentions of Hitler</p>
				<p>Adds a new on-site warning feature for moderators</p>
				<p>Multiple moderation improvements</p>
				<div className="ui header">
					<p>Version 1.6.3 released 8-28-2019</p>
				</div>
				<p>Temporarily disables "disable game chat" game setting due to various gamebreaking bugs</p>
				<p>Fixes casual game setting for timed games</p>
				<p>Adds Trivia Mode Preset</p>
				<p>Adds User Setting to choose number of Chats shown when truncated</p>
				<p>Multiple Moderation Improvements</p>
				<div className="ui header">
					<p>Version 1.6.2 released 8-1-2019</p>
				</div>
				<h4>Majorly reduces chat lag!</h4>
				<p>Fixes Terms of Use formatting</p>
				<p>Fixes Claim Window not Disappearing at end of game</p>
				<p>Fixes Various Moderation Features</p>
				<hr style={{ width: '100%' }} />

				<div className="ui header">
					<p>Version 1.6.1 released 7-10-2019</p>
				</div>
				<h4>8 New Emotes!</h4>
				<h4>New Unlisted Game Setting</h4>
				<p>Game will be hidden from Games List, and will be only accessible via link</p>

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

				<h4>Timed Games are Fixed! -Vigasaurus</h4>
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
