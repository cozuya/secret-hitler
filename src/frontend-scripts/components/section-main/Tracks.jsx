import React from 'react';
import CardFlinger from './CardFlinger.jsx';
import EnactedPolicies from './EnactedPolicies.jsx';
import PropTypes from 'prop-types';
import { Popup } from 'semantic-ui-react';

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

	optionIcons(gameInfo) {
		const game = gameInfo.general;

		let rebalance69p;
		let rebalance69pTooltip;
		let disableChat;
		let disableChatTooltip;
		let disableGamechat;
		let disableGamechatTooltip;
		let experiencedMode;
		let experiancedModeTooltip;
		let privateOnly;
		let privateOnlyTooltip;
		let priv;
		let privTooltip;
		let rainbowgame;
		let rainbowgameTooltip;

		if (game.rebalance69p) {
			rebalance69p = <div> R </div>;
			rebalance69pTooltip = 'Rebalanced 6, 7, & 9 player games';
		}

		if (game.disableChat) {
			disableChat = (
				<i className="icons">
					<i className="unmute icon" />
					<i className="large remove icon" style={{ opacity: '0.6', color: '#1b1b1b' }} />
				</i>
			);
			disableChatTooltip = 'Player Chat Disabled';
		}

		if (game.privateOnly) {
			privateOnly = <i className="spy icon" />;
			privateOnlyTooltip = 'Private game only - only anonymous players may be seated here.';
		}

		if (!game.privateOnly && game.private) {
			priv = <i className="lock icon" />;
			privTooltip = 'Private game.';
		}

		if (game.disableGamechat) {
			disableGamechat = (
				<i className="icons">
					<i className="game icon" />
					<i className="large remove icon" style={{ opacity: '0.6', color: '#1b1b1b' }} />
				</i>
			);
			disableGamechatTooltip = 'Game Chat Disabled';
		}

		if (game.experiencedMode) {
			experiencedMode = <i className="fast forward icon" />;
			experiancedModeTooltip = 'Speed Mode';
		}

		if (game.rainbowgame) {
			rainbowgame = <img style={{ maxHeight: '14px', marginBottom: '-2px' }} src="../images/rainbow.png" />;
			rainbowgameTooltip = 'Experienced Game';
		}

		return (
			<div className="options-icons-container">
				<span className="rebalanced">
					<Popup inverted trigger={rebalance69p} content={rebalance69pTooltip} />
				</span>
				<span>
					<Popup inverted trigger={disableChat} content={disableChatTooltip} />
				</span>
				<span>
					<Popup inverted trigger={disableGamechat} content={disableGamechatTooltip} />
				</span>
				<span>
					<Popup inverted trigger={experiencedMode} content={experiancedModeTooltip} />
				</span>
				<span>
					<Popup inverted trigger={privateOnly} content={privateOnlyTooltip} />
				</span>
				<span>
					<Popup inverted trigger={priv} content={privTooltip} />
				</span>
				<span>
					<Popup inverted trigger={rainbowgame} content={rainbowgameTooltip} />
				</span>
			</div>
		);
	}

	render() {
		const { gameInfo, userInfo, socket } = this.props;
		const renderElectionTracker = () => {
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
		};

		const updateRemake = () => {
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

		return (
			<section className="tracks-container">
				<CardFlinger userInfo={userInfo} gameInfo={gameInfo} socket={socket} />
				<EnactedPolicies gameInfo={gameInfo} />
				<div>
					<div className="game-name">
						{(() => {
							if (gameInfo.general.flag !== 'none') {
								return <i className={`ui flag ${gameInfo.general.flag}`} />;
							}
						})()}
						<span>{gameInfo.general.name}</span>
					</div>
					<div className="option-icons">{this.optionIcons(gameInfo)}</div>
					<div className="player-count">
						Players: <span>{gameInfo.publicPlayersState.length}</span>
					</div>
					{userInfo.userName &&
						userInfo.isSeated &&
						gameInfo.gameState.isTracksFlipped &&
						!gameInfo.general.isRemade &&
						!(gameInfo.general.isTourny && gameInfo.general.tournyInfo.round === 2) && (
							<i
								className={
									gameInfo.general.isTourny && gameInfo.general.tournyInfo.round === 1
										? `remove icon ${this.state.remakeStatus ? 'enabled' : ''}`
										: `icon repeat ${this.state.remakeStatus ? 'enabled' : ''}`
								}
								onClick={updateRemake}
								title="Enable this button to show that you would like to remake this game"
							/>
						)}
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
	onSeatingUser: PropTypes.func,
	userInfo: PropTypes.object,
	gameInfo: PropTypes.object,
	socket: PropTypes.object
};

export default Tracks;
