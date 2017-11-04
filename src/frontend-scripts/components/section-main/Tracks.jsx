import React from 'react';
import CardFlinger from './CardFlinger.jsx';
import EnactedPolicies from './EnactedPolicies.jsx';
import PropTypes from 'prop-types';
import { EDITORS, ADMINS, MODERATORS } from '../../constants';

class Tracks extends React.Component {
	constructor() {
		super();
		this.state = {
			remakeStatus: false,
			remakeStatusDisabled: false
		};
	}

	componentDidMount() {
		this._ismounted = true;
	}

	componentWillUnmount() {
		this._ismounted = false;
	}

	componentWillReceiveProps(nextProps) {
		if (!this.props.gameInfo.gameState.isStarted) {
			this.setState({
				remakeStatus: false
			});
		}
	}

	render() {
		const { gameInfo, userInfo, socket } = this.props,
			renderElectionTracker = () => {
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
			updateRemake = () => {
				if (!this.state.remakeStatusDisabled) {
					this.setState(
						{
							remakeStatus: !this.state.remakeStatus,
							remakeStatusDisabled: true
						},
						() => {
							this.props.socket.emit('updateRemake', {
								remakeStatus: this.state.remakeStatus,
								userName: userInfo.userName,
								uid: gameInfo.general.uid
							});
						}
					);

					setTimeout(() => {
						if (this._ismounted) {
							this.setState({
								remakeStatusDisabled: false
							});
						}
					}, 2000);
				}
			};

		// {userInfo.userName &&
		// 	userInfo.isSeated &&
		// 	gameInfo.gameState.isTracksFlipped && (
		// 		<i
		// 			className={`icon repeat ${this.state.remakeStatus ? 'enabled' : ''}`}
		// 			onClick={updateRemake}
		// 			title="Enable this button to show that you would like to remake this game"
		// 		/>
		// 	)}

		return (
			<section className="tracks-container">
				<CardFlinger userInfo={userInfo} gameInfo={gameInfo} socket={socket} />
				<EnactedPolicies gameInfo={gameInfo} />
				<div>
					<div className="game-name">
						Game name: <span>{gameInfo.general.name}</span>
					</div>
					<div className="player-count">
						Players: <span>{gameInfo.publicPlayersState.length}</span>
					</div>
					{
						<i
							className={`icon repeat ${this.state.remakeStatus ? 'enabled' : ''}`}
							onClick={updateRemake}
							title="Enable this button to show that you would like to remake this game"
						/>
					}
				</div>
				<section
					className={(() => {
						let classes = 'tracks';

						if (gameInfo.cardFlingerState.length || gameInfo.trackState.isBlurred) {
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
	}
}

Tracks.propTypes = {
	onUpdateReportGame: PropTypes.func,
	onSeatingUser: PropTypes.func,
	userInfo: PropTypes.object,
	gameInfo: PropTypes.object,
	socket: PropTypes.object
};

export default Tracks;
