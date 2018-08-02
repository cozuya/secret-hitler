import React from 'react';
import CardFlinger from './CardFlinger.jsx';
import EnactedPolicies from './EnactedPolicies.jsx';
import PropTypes from 'prop-types';
import { Popup } from 'semantic-ui-react';
import HostMenu from './HostMenu.jsx';

class Tracks extends React.Component {
	constructor() {
		super();
		this.state = {
			remakeStatus: false,
			remakeStatusDisabled: false,
			timedModeTimer: ''
		};
	}

	componentDidMount() {
		const { Notification } = window;

		this._ismounted = true;

		if (Notification && Notification.permission === 'granted' && this.props.socket) {
			this.props.socket.on('pingPlayer', data => {
				new Notification(data);
			});
		}
	}

	componentWillUnmount() {
		const { Notification } = window;

		this._ismounted = false;

		if (Notification && Notification.permission === 'granted' && this.props.socket) {
			this.props.socket.off('pingPlayer');
		}
	}

	componentWillReceiveProps(nextProps) {
		const { gameInfo } = this.props;

		if (!gameInfo.gameState.isStarted) {
			this.setState({
				remakeStatus: false
			});
		}

		if (
			gameInfo.general.timedMode &&
			gameInfo.gameState &&
			nextProps.gameInfo.gameState &&
			!gameInfo.gameState.timedModeEnabled &&
			nextProps.gameInfo.gameState.timedModeEnabled
		) {
			let minutes = Math.floor(gameInfo.general.timedMode / 60);
			let seconds = gameInfo.general.timedMode % 60;
			this.intervalId = window.setInterval(() => {
				if (!seconds) {
					if (minutes) {
						minutes--;
					}
					seconds = 59;
				} else {
					seconds--;
				}

				if ((!seconds && !minutes) || !nextProps.gameInfo.gameState.timedModeEnabled) {
					this.setState({ timedModeTimer: '' }, () => {
						window.clearInterval(this.intervalId);
					});
				} else {
					this.setState({
						timedModeTimer: `Action forced in ${minutes}:${seconds > 9 ? seconds : `0${seconds}`}`
					});
				}
			}, 1000);
		}

		if (gameInfo.gameState && gameInfo.gameState.timedModeEnabled && nextProps.gameInfo.gameState && !nextProps.gameInfo.gameState.timedModeEnabled) {
			window.clearInterval(this.intervalId);
			this.setState({
				timedModeTimer: ''
			});
		}
	}

	optionIcons(gameInfo) {
		const game = gameInfo.general;

		let rebalance69p;
		let rebalance69pTooltip;
		let voiceGame;
		let voiceGameTooltip;
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
		let casualgame;
		let casualgameTooltip;
		let timedMode;
		let timedModeTooltip;
		let isVerifiedOnly;
		let isVerifiedOnlyTooltip;
		let eloMinimum;
		let eloMinimumTooltip;

		{
			game.rebalance6p && game.rebalance7p && game.rebalance9p
				? ((rebalance69p = <div> R679 </div>), (rebalance69pTooltip = 'Rebalanced 6, 7, & 9 player games'))
				: game.rebalance6p && game.rebalance7p
					? ((rebalance69p = <div> R67 </div>), (rebalance69pTooltip = 'Rebalanced 6 & 7 player games'))
					: game.rebalance6p && game.rebalance9p
						? ((rebalance69p = <div> R69 </div>), (rebalance69pTooltip = 'Rebalanced 6 & 9 player games'))
						: game.rebalance7p && game.rebalance9p
							? ((rebalance69p = <div> R79 </div>), (rebalance69pTooltip = 'Rebalanced 7 & 9 player games'))
							: game.rebalance6p
								? ((rebalance69p = <div> R6 </div>), (rebalance69pTooltip = 'Rebalanced 6 player games'))
								: game.rebalance7p
									? ((rebalance69p = <div> R7 </div>), (rebalance69pTooltip = 'Rebalanced 7 player games'))
									: game.rebalance9p
										? ((rebalance69p = <div> R9 </div>), (rebalance69pTooltip = 'Rebalanced 9 player games'))
										: null;
		}

		if (game.voiceGame) {
			voiceGame = (
				<i className="icons">
					<i className="unmute icon" />
				</i>
			);
			voiceGameTooltip = 'Voice Game';
		}

		if (game.isVerifiedOnly) {
			isVerifiedOnly = <i className="spy icon" />;
			isVerifiedOnlyTooltip = 'Only email-verified players can sit in this game.';
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

		if (game.casualGame) {
			casualgame = <i className="handshake icon" />;
			casualgameTooltip = 'Casual game - results do not count towards wins and losses';
		}

		if (game.timedMode) {
			timedMode = (
				<span>
					<i className="hourglass half icon" />
					<span style={{ color: 'peru' }}>
						{`${Math.floor(game.timedMode / 60)}: ${game.timedMode % 60 < 10 ? `0${game.timedMode % 60}` : game.timedMode % 60}`}
					</span>
				</span>
			);
			timedModeTooltip = `Timed Mode: ${Math.floor(game.timedMode / 60)}: ${game.timedMode % 60 < 10 ? `0${game.timedMode % 60}` : game.timedMode % 60}`;
		}

		if (game.eloMinimum) {
			eloMinimum = (
				<span>
					<span style={{ color: 'yellow' }}>Elo min: {game.eloMinimum}</span>
				</span>
			);
			eloMinimumTooltip = `Elo minimum: ${game.eloMinimum}`;
		}

		return (
			<div className="options-icons-container">
				{rebalance69p && (
					<span className="rebalanced">
						<Popup inverted trigger={rebalance69p} content={rebalance69pTooltip} />
					</span>
				)}
				{voiceGame && (
					<span>
						<Popup inverted trigger={voiceGame} content={voiceGameTooltip} />
					</span>
				)}
				{disableGamechat && (
					<span>
						<Popup inverted trigger={disableGamechat} content={disableGamechatTooltip} />
					</span>
				)}
				{experiencedMode && (
					<span>
						<Popup inverted trigger={experiencedMode} content={experiancedModeTooltip} />
					</span>
				)}
				{privateOnly && (
					<span>
						<Popup inverted trigger={privateOnly} content={privateOnlyTooltip} />
					</span>
				)}
				{priv && (
					<span>
						<Popup inverted trigger={priv} content={privTooltip} />
					</span>
				)}
				{rainbowgame && (
					<span>
						<Popup inverted trigger={rainbowgame} content={rainbowgameTooltip} />
					</span>
				)}
				{casualgame && (
					<span>
						<Popup inverted trigger={casualgame} content={casualgameTooltip} />
					</span>
				)}
				{timedMode && (
					<span>
						<Popup inverted trigger={timedMode} content={timedModeTooltip} />
					</span>
				)}
				{isVerifiedOnly && (
					<span>
						<Popup inverted trigger={isVerifiedOnly} content={isVerifiedOnlyTooltip} />
					</span>
				)}
				{eloMinimum && (
					<span>
						<Popup inverted trigger={eloMinimum} content={eloMinimumTooltip} />
					</span>
				)}
			</div>
		);
	}

	render() {
		const { gameInfo, userInfo, socket } = this.props;

		/**
		 * @return {jsx}
		 */
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
				}, this.state.remakeStatus ? 10000 : 2000);
			}
		};

		return (
			<section className="tracks-container">
				<CardFlinger userInfo={userInfo} gameInfo={gameInfo} socket={socket} />
				<EnactedPolicies gameInfo={gameInfo} userInfo={userInfo} />
				<div>
					<div className="game-name">
						{gameInfo.general.flag !== 'none' && <i className={`ui flag ${gameInfo.general.flag}`} />}
						<span>{gameInfo.general.name}</span>
					</div>
					<HostMenu socket={socket} gameInfo={gameInfo} userInfo={userInfo} userList={this.props.userList} />
					<div className="option-icons">{this.optionIcons(gameInfo)}</div>
					<div className="player-count">
						<span>
							{gameInfo.publicPlayersState.length} / {gameInfo.general.maxPlayersCount}
						</span>
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
								title={
									gameInfo.general.isTourny
										? 'Enable this button to show that you would like to cancel this tournament'
										: 'Enable this button to show that you would like to remake this game'
								}
							/>
						)}
					{this.state.timedModeTimer && <div className="timed-mode-counter">{this.state.timedModeTimer}</div>}
				</div>
				<section
					className={(() => {
						let classes = 'tracks';

						if (
							gameInfo.cardFlingerState.length ||
							gameInfo.trackState.isBlurred ||
							(gameInfo.general.host === userInfo.userName && (!gameInfo.gameState.isTracksFlipped))
						) {
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

Tracks.defaultProps = {
	gameInfo: {},
	userInfo: {}
};

Tracks.propTypes = {
	onSeatingUser: PropTypes.func,
	userInfo: PropTypes.object,
	gameInfo: PropTypes.object,
	socket: PropTypes.object,
	userList: PropTypes.object
};

export default Tracks;
