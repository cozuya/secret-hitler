import React from 'react'; // eslint-disable-line
import CardFlinger from './CardFlinger.jsx';
import EnactedPolicies from './EnactedPolicies.jsx';
import PropTypes from 'prop-types';
import { EDITORS, ADMINS } from '../../constants';

const Tracks = props => {
	const renderElectionTracker = () => {
			const { gameInfo } = props;
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
		},
		{ gameInfo, userInfo, socket } = props;

	return (
		<section className="tracks-container">
			<CardFlinger userInfo={userInfo} gameInfo={gameInfo} socket={socket} />
			<EnactedPolicies gameInfo={gameInfo} />
			<div>
				<div className="game-name">
					Game name: <span>{gameInfo.general.name}</span>
				</div>
				{userInfo.userName &&
					(EDITORS.includes(userInfo.userName) || ADMINS.includes(userInfo.userName)) &&
					<div className="gameuid">
						Game UID: {gameInfo.general.uid}
					</div>}
				<div className="player-count">
					Players: <span>{gameInfo.publicPlayersState.length}</span>
				</div>
			</div>
			<section
				className={(() => {
					let classes = 'tracks';

					if (props.gameInfo.cardFlingerState.length || gameInfo.trackState.isBlurred) {
						classes += ' blurred';
					}

					return classes;
				})()}
			>
				<div
					className={(() => {
						let classes = 'track-flipper track-flipper-top';

						if (gameInfo.gameState.isTracksFlipped) {
							classes += ' flipped';
						}

						return classes;
					})()}
				>
					<div className="track top-track-front" />
					<div className="track top-track-back" />
				</div>
				<div
					className={(() => {
						let classes = 'track-flipper track-flipper-bottom';

						if (gameInfo.gameState.isTracksFlipped) {
							classes += ' flipped';
						}

						return classes;
					})()}
				>
					<div className="track bottom-track-front" />
					<div
						className={(() => {
							let classes = 'track bottom-track-back';

							if (gameInfo.general.playerCount < 7) {
								classes += ' track0';
							} else if (gameInfo.general.playerCount < 9) {
								classes += ' track1';
							} else {
								classes += ' track2';
							}

							return classes;
						})()}
					/>
				</div>
				{renderElectionTracker()}
			</section>
		</section>
	);
};

Tracks.propTypes = {
	onUpdateReportGame: PropTypes.func,
	onSeatingUser: PropTypes.func,
	onLeaveGame: PropTypes.func,
	userInfo: PropTypes.object,
	gameInfo: PropTypes.object,
	socket: PropTypes.object
};

export default Tracks;
