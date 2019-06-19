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

		if (this.props.socket) {
			this.props.socket.on('updateRemakeStatus', status => {
				this.setState(
					{
						remakeStatus: status,
						remakeStatusDisabled: true
					},
					() => {
						setTimeout(
							() => {
								if (this._ismounted) {
									this.setState({
										remakeStatusDisabled: false
									});
								}
							},
							this.state.remakeStatus ? 2000 : 5000
						);
					}
				);
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
		let casualgame;
		let casualgameTooltip;
		let timedMode;
		let timedModeTooltip;
		let isVerifiedOnly;
		let isVerifiedOnlyTooltip;
		let eloMinimum;
		let eloMinimumTooltip;
		let customgameactive;
		let flappyMode;
		let flappyModeTooltip;
		let flappyOnlyMode;
		let flappyOnlyModeTooltip;
		const customgameactiveTooltip = 'Custom Game';

		if (gameInfo.customGameSettings && gameInfo.customGameSettings.enabled) {
			customgameactive = <i className="setting icon" />;
		} else {
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
				: ((rebalance69p = <div> R9 </div>), (rebalance69pTooltip = 'Rebalanced 9 player games'));
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

		if (game.flappyMode) {
			flappyMode = <i className="plane icon" />;
			flappyModeTooltip = 'COMING SOON: Flappy Mode - sudden death games are resolved with a game of Flappy Hitler';
		}

		if (game.flappyOnlyMode) {
			flappyOnlyMode = <i className="plane icon" style={{ color: 'darkred' }} />;
			flappyOnlyModeTooltip = 'Flappy Only Mode: no policies, just play flappy';
		}

		return (
			<div className="options-icons-container">
				{gameInfo.customGameSettings && gameInfo.customGameSettings.enabled && (
					<span className="customgame">
						<Popup style={{ zIndex: 999999 }} inverted trigger={customgameactive} content={customgameactiveTooltip} />
					</span>
				)}
				{rebalance69p && (
					<span className="rebalanced">
						<Popup style={{ zIndex: 999999 }} inverted trigger={rebalance69p} content={rebalance69pTooltip} />
					</span>
				)}
				{disableChat && (
					<span>
						<Popup style={{ zIndex: 999999 }} inverted trigger={disableChat} content={disableChatTooltip} />
					</span>
				)}
				{disableGamechat && (
					<span>
						<Popup style={{ zIndex: 999999 }} inverted trigger={disableGamechat} content={disableGamechatTooltip} />
					</span>
				)}
				{experiencedMode && (
					<span>
						<Popup style={{ zIndex: 999999 }} inverted trigger={experiencedMode} content={experiancedModeTooltip} />
					</span>
				)}
				{privateOnly && (
					<span>
						<Popup style={{ zIndex: 999999 }} inverted trigger={privateOnly} content={privateOnlyTooltip} />
					</span>
				)}
				{priv && (
					<span>
						<Popup style={{ zIndex: 999999 }} inverted trigger={priv} content={privTooltip} />
					</span>
				)}
				{rainbowgame && (
					<span>
						<Popup style={{ zIndex: 999999 }} inverted trigger={rainbowgame} content={rainbowgameTooltip} />
					</span>
				)}
				{casualgame && (
					<span>
						<Popup style={{ zIndex: 999999 }} inverted trigger={casualgame} content={casualgameTooltip} />
					</span>
				)}
				{timedMode && (
					<span>
						<Popup style={{ zIndex: 999999 }} inverted trigger={timedMode} content={timedModeTooltip} />
					</span>
				)}
				{isVerifiedOnly && (
					<span>
						<Popup style={{ zIndex: 999999 }} inverted trigger={isVerifiedOnly} content={isVerifiedOnlyTooltip} />
					</span>
				)}
				{eloMinimum && (
					<span>
						<Popup style={{ zIndex: 999999 }} inverted trigger={eloMinimum} content={eloMinimumTooltip} />
					</span>
				)}
				{flappyMode && (
					<span>
						<Popup style={{ zIndex: 999999 }} inverted trigger={flappyMode} content={flappyModeTooltip} />
					</span>
				)}
				{flappyOnlyMode && (
					<span>
						<Popup style={{ zIndex: 999999 }} inverted trigger={flappyOnlyMode} content={flappyOnlyModeTooltip} />
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
				this.props.socket.emit('updateRemake', {
					remakeStatus: !this.state.remakeStatus,
					uid: gameInfo.general.uid
				});
			}
		};

		const renderFasTrack = () => {
			if (gameInfo.customGameSettings && gameInfo.customGameSettings.enabled) {
				const offX = -8;
				const offY = -8;

				let powers = [];
				let numFas = 0;
				let hzStart = 3;
				let vzPoint = 5;
				let hitKnowsFas = false;

				if (gameInfo.customGameSettings.powers) {
					// Only need to detect one property, either they're all there or none are.
					powers = gameInfo.customGameSettings.powers.map(p => {
						if (p == null) return 'None';
						if (p == 'investigate') return 'Inv';
						if (p == 'deckpeek') return 'Peek';
						if (p == 'election') return 'Elect';
						if (p == 'bullet') return 'Gun';
						if (p == 'reverseinv') return 'ReverseInv';
						if (p == 'peekdrop') return 'PeekDrop';

						console.log(`Unknown power: ${p}`);
						return null;
					});
					numFas = gameInfo.customGameSettings.fascistCount;
					hzStart = gameInfo.customGameSettings.hitlerZone;
					vzPoint = gameInfo.customGameSettings.vetoZone;
					hitKnowsFas = gameInfo.customGameSettings.hitKnowsFas;
				} else {
					// Should only happen before a game starts, but as a precaution typical settings are used.
					if (gameInfo.general.playerCount < 7) {
						powers = ['None', 'None', 'Peek', 'Gun', 'Gun'];
						numFas = 1;
						hitKnowsFas = true;
					} else if (gameInfo.general.playerCount < 9) {
						powers = ['None', 'Inv', 'Elect', 'Gun', 'Gun'];
						numFas = 2;
					} else {
						powers = ['Inv', 'Inv', 'Elect', 'Gun', 'Gun'];
						numFas = 3;
					}
				}

				const getHZ = pos => {
					if (pos < hzStart) return 'Off';
					if (pos > hzStart) return 'On';
					return 'Start';
				};

				return (
					<div className="track bottom-track-back custom-fastrack-base">
						<span
							style={{
								width: '92px',
								height: '120px',
								left: `${offX + 137}px`,
								top: `${offY + 58}px`,
								position: 'absolute',
								backgroundImage: `url(../images/customtracks/fasTrackHZ${getHZ(1)}.png)`
							}}
						/>
						<span
							style={{
								width: '92px',
								height: '120px',
								left: `${offX + 229}px`,
								top: `${offY + 58}px`,
								position: 'absolute',
								backgroundImage: `url(../images/customtracks/fasTrackHZ${getHZ(2)}.png)`
							}}
						/>
						<span
							style={{
								width: '92px',
								height: '120px',
								left: `${offX + 321}px`,
								top: `${offY + 58}px`,
								position: 'absolute',
								backgroundImage: `url(../images/customtracks/fasTrackHZ${getHZ(3)}.png)`
							}}
						/>
						<span
							style={{
								width: '92px',
								height: '120px',
								left: `${offX + 413}px`,
								top: `${offY + 58}px`,
								position: 'absolute',
								backgroundImage: `url(../images/customtracks/fasTrackHZ${getHZ(4)}.png)`
							}}
						/>
						<span
							style={{
								width: '92px',
								height: '120px',
								left: `${offX + 505}px`,
								top: `${offY + 58}px`,
								position: 'absolute',
								backgroundImage: `url(../images/customtracks/fasTrackHZ${getHZ(5)}.png)`
							}}
						/>

						<span
							className="custom-fastrack-powerslot"
							style={{
								left: `${offX + 58}px`,
								top: `${offY + 58}px`,
								backgroundImage: `url(../images/customtracks/fasPower${powers[0]}${hzStart <= 0 ? 'Light' : ''}.png)`
							}}
						>
							{vzPoint == 1 && (
								<span className={'custom-fastrack-powerslot ' + (hzStart <= 0 ? 'custom-fastrack-vetozone-light' : 'custom-fastrack-vetozone')} />
							)}
						</span>
						<span
							className="custom-fastrack-powerslot"
							style={{
								left: `${offX + 150}px`,
								top: `${offY + 58}px`,
								backgroundImage: `url(../images/customtracks/fasPower${powers[1]}${hzStart <= 1 ? 'Light' : ''}.png)`
							}}
						>
							{vzPoint == 2 && (
								<span className={'custom-fastrack-powerslot ' + (hzStart <= 1 ? 'custom-fastrack-vetozone-light' : 'custom-fastrack-vetozone')} />
							)}
						</span>
						<span
							className="custom-fastrack-powerslot"
							style={{
								left: `${offX + 242}px`,
								top: `${offY + 58}px`,
								backgroundImage: `url(../images/customtracks/fasPower${powers[2]}${hzStart <= 2 ? 'Light' : ''}.png)`
							}}
						>
							{vzPoint == 3 && (
								<span className={'custom-fastrack-powerslot ' + (hzStart <= 2 ? 'custom-fastrack-vetozone-light' : 'custom-fastrack-vetozone')} />
							)}
						</span>
						<span
							className="custom-fastrack-powerslot"
							style={{
								left: `${offX + 334}px`,
								top: `${offY + 58}px`,
								backgroundImage: `url(../images/customtracks/fasPower${powers[3]}${hzStart <= 3 ? 'Light' : ''}.png)`
							}}
						>
							{vzPoint == 4 && (
								<span className={'custom-fastrack-powerslot ' + (hzStart <= 3 ? 'custom-fastrack-vetozone-light' : 'custom-fastrack-vetozone')} />
							)}
						</span>
						<span
							className="custom-fastrack-powerslot"
							style={{
								left: `${offX + 426}px`,
								top: `${offY + 58}px`,
								backgroundImage: `url(../images/customtracks/fasPower${powers[4]}${hzStart <= 4 ? 'Light' : ''}.png)`
							}}
						>
							{vzPoint == 5 && (
								<span className={'custom-fastrack-powerslot ' + (hzStart <= 4 ? 'custom-fastrack-vetozone-light' : 'custom-fastrack-vetozone')} />
							)}
						</span>
						<span
							className="custom-fastrack-powerslot"
							style={{ left: `${offX + 518}px`, top: `${offY + 58}px`, backgroundImage: 'url(../images/customtracks/fasPowerEndGame.png)' }}
						/>

						<span
							style={{
								width: '268px',
								height: '15px',
								left: `${offX + 336}px`,
								top: `${offY + 60}px`,
								position: 'absolute',
								backgroundImage: 'url(../images/customtracks/fasTrackHZText.png)'
							}}
						/>

						<span
							style={{
								width: '227px',
								height: '11px',
								left: `${offX + 220}px`,
								top: `${offY + 186}px`,
								position: 'absolute',
								backgroundImage: `url(../images/customtracks/fasTrack${numFas}fas.png)`
							}}
						/>
						<span
							style={{
								width: '227px',
								height: '11px',
								left: `${offX + 220}px`,
								top: `${offY + 196}px`,
								position: 'absolute',
								backgroundImage: `url(../images/customtracks/fasTrack${numFas > 1 ? 'Multi' : 'Single'}${hitKnowsFas ? 'Known' : 'Unknown'}.png)`
							}}
						/>
					</div>
				);
			} else {
				return (
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
				);
			}
		};

		return (
			<section className="tracks-container">
				<CardFlinger userInfo={userInfo} gameInfo={gameInfo} socket={socket} />
				<EnactedPolicies gameInfo={gameInfo} />
				<div>
					<div className="game-name">
						{gameInfo.general.flag !== 'none' && <i className={`ui flag ${gameInfo.general.flag}`} />}
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

							if (gameInfo.gameState.isTracksFlipped || (gameInfo.customGameSettings && gameInfo.customGameSettings.enabled)) {
								classes += ' flipped';
							}

							return classes;
						})()}
					>
						<div className="track bottom-track-front" />
						{renderFasTrack()}
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
	socket: PropTypes.object
};

export default Tracks;
