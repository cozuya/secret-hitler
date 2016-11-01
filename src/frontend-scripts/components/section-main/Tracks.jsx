import React from 'react';
import CardFlinger from './CardFlinger.jsx';
import EnactedPolicies from './EnactedPolicies.jsx';

export default class Tracks extends React.Component {
	constructor() {
		super();
		this.renderElectionTracker = this.renderElectionTracker.bind(this);
		// this.handleClickedReportGame = this.handleClickedReportGame.bind(this);
	}

	renderElectionTracker() {
		const {gameInfo} = this.props;

		let classes = 'electiontracker';

		if (gameInfo.trackState.electionTrackerCount === 1) {
			classes += ' fail1';
		} else if (gameInfo.trackState.electionTrackerCount === 2) {
			classes += ' fail2';
		} else if (gameInfo.trackState.electionTrackerCount === 3) {
			classes += ' fail3';
		}

		if (gameInfo.gameState.isStarted) {
			return <div className={classes} />;
		}
	}

	render() {
		const {gameInfo, userInfo, socket} = this.props;

		return (
			<section className="tracks-container">
				<CardFlinger
					userInfo={userInfo}
					gameInfo={gameInfo}
					socket={socket}
				/>
				<EnactedPolicies
					gameInfo={gameInfo}
				/>
				<section className={
					(() => {
						let classes = 'tracks';

						if (this.props.gameInfo.cardFlingerState.length) {
							classes += ' blurred';
						}

						return classes;
					})()
				}>
					<div className={
						(() => {
							let classes = 'track-flipper track-flipper-top';

							if (gameInfo.gameState.isStarted) {
								classes += ' flipped';
							}

							return classes;
						})()
					}>
						<div className="track top-track-front" />
						<div className="track top-track-back" />
					</div>
					<div className={
						(() => {
							let classes = 'track-flipper track-flipper-bottom';

							if (gameInfo.gameState.isStarted) {
								classes += ' flipped';
							}

							return classes;
						})()
					}>
						<div className="track bottom-track-front" />
						<div className="track bottom-track-back" />
					</div>
					{this.renderElectionTracker()}
				</section>
			</section>
		);
	}
}

Tracks.propTypes = {
	onUpdateReportGame: React.PropTypes.func,
	onSeatingUser: React.PropTypes.func,
	onLeaveGame: React.PropTypes.func,
	userInfo: React.PropTypes.object,
	gameInfo: React.PropTypes.object,
	socket: React.PropTypes.object
};