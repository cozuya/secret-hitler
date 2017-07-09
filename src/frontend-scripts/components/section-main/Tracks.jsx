import React from 'react';
import CardFlinger from './CardFlinger.jsx';
import EnactedPolicies from './EnactedPolicies.jsx';
import PropTypes from 'prop-types';

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

		if (gameInfo.gameState.isTracksFlipped && (gameInfo.trackState && !gameInfo.trackState.isHidden)) {
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

						if (this.props.gameInfo.cardFlingerState.length || gameInfo.trackState.isBlurred) {
							classes += ' blurred';
						}

						return classes;
					})()
				}>
					<div className={
						(() => {
							let classes = 'track-flipper track-flipper-top';

							if (gameInfo.gameState.isTracksFlipped) {
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

							if (gameInfo.gameState.isTracksFlipped) {
								classes += ' flipped';
							}

							return classes;
						})()
					}>
						<div className="track bottom-track-front" />
						<div className={
							(() => {
								let classes = 'track bottom-track-back';

								if (gameInfo.general.playerCount < 7) {
									classes += ' track0';
								} else if (gameInfo.general.playerCount < 9) {
									classes += ' track1';
								} else {
									classes += ' track2';
								}

								return classes;
							})()
						} />
					</div>
					{this.renderElectionTracker()}
				</section>
			</section>
		);
	}
}

Tracks.propTypes = {
	onUpdateReportGame: PropTypes.func,
	onSeatingUser: PropTypes.func,
	onLeaveGame: PropTypes.func,
	userInfo: PropTypes.object,
	gameInfo: PropTypes.object,
	socket: PropTypes.object
};