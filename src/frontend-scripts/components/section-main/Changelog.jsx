import React from 'react'; // eslint-disable-line

import Confetti from './Confetti.jsx';

class Changelog extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			showingConfetti: true
		};
	}

	componentDidMount() {
		setTimeout(() => {
			this.setState({ showingConfetti: false });
		}, 6000);
	}

	render() {
		return (
			<React.Fragment>
				{this.state.showingConfetti && <Confetti />}

				<section className="changelog">
					<a href="#/">
						<i className="remove icon" />
					</a>
					<div className="ui header">
						<h2>Changelog</h2>
					</div>
					<div className="ui header">
						<p>Version 1.0.0 released 1-1-2019</p>
					</div>
					<h3>1.0.0 and season 5 begins!</h3>
					<h4>The top 10 players of season 4 are:</h4>
					<p>
						It took a while, but we're here - all major features I could think of and some I couldn't are in and mostly working. A long, long way from the first
						stable(ish) release back in May 2017.
					</p>
					<p>
						I want to thank our moderation team first and foremost. The site would not be in the same shape without them. There was a time that feature wasn't
						even in and it was just a nightmare. Obviously its a combination of both the theme and the nature of a mostly anonymous internet, but they've done
						an amazing job keeping this place playable in public games and fun for everyone!
					</p>
					<p>
						I also want to call out contributor/mod Hexicube for spending so much working on various parts of the app over the last ~year. Many moderation tools
						and features like custom games would not exist without him.
					</p>
					<p>
						Please note that 1.0 does not mean I am no longer supporting the application and site. Work will continue to make the site even better, but not
						personally at the pace I have been. My next game is in progress and I expect to get to a playable pre-alpha state some time in the next few months.
						It will be a (fresh IP) hidden role game with some similarities to the fascist hunting/electing game we all know and love but with some fun features
						and mechanics that can only exist online. Stay tuned! -Chris
					</p>
				</section>
			</React.Fragment>
		);
	}
}

export default Changelog;
