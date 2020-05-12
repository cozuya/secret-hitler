import React from 'react'; // eslint-disable-line
import PropTypes from 'prop-types';

class CardFlinger extends React.Component {
	state = {
		isHovered: false,
		hoveredClass: null,
		retreatingFlingers: []
	};

	handleHover = classes => {
		this.setState({
			isHovered: !this.state.isHovered,
			hoveredClass: classes
		});
	};

	componentDidUpdate(prevProps) {
		const { gameInfo } = this.props;
		const { cardFlingerState } = gameInfo;

		if (prevProps.gameInfo.cardFlingerState && prevProps.gameInfo.cardFlingerState.length && cardFlingerState && !cardFlingerState.length) {
			this.setState(
				{
					retreatingFlingers: prevProps.gameInfo.cardFlingerState.map(flinger => ({
						...flinger,
						action: '',
						notificationStatus: '',
						cardStatus: {
							...flinger.cardStatus,
							isFlipped: false
						}
					}))
				},
				() => {
					setTimeout(() => {
						this.setState({
							retreatingFlingers: []
						});
					}, 1000);
				}
			);
		}
	}

	render() {
		const { gameInfo, socket, userInfo } = this.props;
		const { gameState, publicPlayersState, cardFlingerState, general } = gameInfo;

		const handleCardClick = index => {
			const { phase } = gameState;
			const isActive = cardFlingerState[0].action === 'active';

			if (phase === 'voting' && isActive) {
				socket.emit('selectedVoting', {
					vote: index === 1,
					uid: general.uid
				});
			}

			if (phase === 'presidentSelectingPolicy' && isActive) {
				socket.emit('selectedPresidentPolicy', {
					uid: general.uid,
					selection: index ? (index === 2 ? 1 : 2) : 0
				});
			}

			if (phase === 'chancellorSelectingPolicy' && isActive) {
				socket.emit('selectedChancellorPolicy', {
					uid: general.uid,
					selection: index
				});
			}

			if (phase === 'chancellorVoteOnVeto' && isActive) {
				socket.emit('selectedChancellorVoteOnVeto', {
					vote: index === 1,
					uid: general.uid
				});
			}

			if (phase === 'presidentVoteOnVeto' && isActive) {
				socket.emit('selectedPresidentVoteOnVeto', {
					vote: index === 1,
					uid: general.uid
				});
			}

			if (phase === 'presidentVoteOnBurn' && isActive) {
				socket.emit('selectedPresidentVoteOnBurn', {
					vote: index === 1,
					uid: general.uid
				});
			}
		};

		const positions = ['middle-far-left', 'middle-left', 'middle-center', 'middle-right', 'middle-far-right'];
		const renderHelpMessage = () => {
			const { phase } = gameState;
			const { status } = general;
			const { userName } = userInfo;
			const currentPlayer = publicPlayersState.find(player => player.userName === userName);
			const currentPlayerStatus = currentPlayer && currentPlayer.governmentStatus;

			if ((userInfo.gameSettings && userInfo.gameSettings.disableHelpMessages) || status === 'Fascists win the game.' || status === 'Liberals win the game.') {
				return;
			}

			if (phase === 'voting' && cardFlingerState && cardFlingerState.length) {
				return (
					<div className="help-message voting">
						Click once to <span className="select">SELECT</span> a vote.
						<div className="seconry-message">
							If you change your mind, click again to <span className="deselect">DESELECT</span>.
						</div>
					</div>
				);
			} else if (phase === 'selectingChancellor' && currentPlayerStatus === 'isPendingPresident') {
				return <div className="help-message nominate-chanc">You must select a player to be your Chancellor</div>;
			} else if (phase === 'presidentSelectingPolicy' && currentPlayerStatus === 'isPresident') {
				return (
					<div className="help-message pres-select">
						Choose 1 policy to <span>DISCARD</span>.
						<div className="secondary-message">
							The other 2 will be <span>PASSED</span> to your Chancellor.
						</div>
					</div>
				);
			} else if (phase === 'chancellorSelectingPolicy' && currentPlayerStatus === 'isChancellor') {
				return (
					<div className="help-message chanc-select">
						Choose 1 policy to <span>PLAY</span>.
					</div>
				);
			} else if (phase === 'selectPartyMembershipInvestigate' && currentPlayerStatus === 'isPresident') {
				return <div className="help-message investigate">You must investigate another players party membership.</div>;
			} else if (phase === 'selectPartyMembershipInvestigateReverse' && currentPlayerStatus === 'isPresident') {
				return <div className="help-message investigate">You must show another player your party membership.</div>;
			} else if (phase === 'specialElection' && currentPlayerStatus === 'isPresident') {
				return <div className="help-message special-election">Choose 1 player to become the next President.</div>;
			} else if (phase === 'execution' && currentPlayerStatus === 'isPresident') {
				return <div className="help-message execute">You must select a player to execute.</div>;
			} else if (
				(phase === 'chancellorVoteOnVeto' && currentPlayerStatus === 'isChancellor') ||
				(phase === 'presidentVoteOnVeto' && currentPlayerStatus === 'isPresident')
			) {
				return (
					<div className="help-message veto">
						Would you like to <span>VETO</span> both of these policies?
					</div>
				);
			} else if (phase === 'presidentVoteOnBurn' && currentPlayerStatus === 'isPresident') {
				return (
					<div className="help-message veto">
						Would you like to <span>DISCARD</span> the top policy?
					</div>
				);
			} else if (status === 'President to peek at policies.' && currentPlayerStatus === 'isPresident') {
				return <div className="help-message policy-peak">Click on the draw deck to peek at the top 3 policies.</div>;
			}
		};

		return (
			<section className="cardflinger-container">
				{renderHelpMessage()}
				{positions.map((position, i) => {
					const { isHovered, hoveredClass, retreatingFlingers } = this.state;
					const retreatingFlinger = retreatingFlingers.find(flinger => flinger.position === position);
					const stateObj = (cardFlingerState && cardFlingerState.find(flinger => flinger.position === position)) || retreatingFlinger;

					let frontClasses = 'cardflinger-card front';
					let backClasses = 'cardflinger-card back';
					let containerClasses = `cardflinger-card-container ${position}`;

					if (userInfo.userName && userInfo.gameSettings && userInfo.gameSettings.disableHelpIcons !== true) {
						containerClasses += ' display-help-icons';
					}

					if (stateObj && Object.keys(stateObj).length) {
						if (stateObj.cardStatus.isFlipped) {
							containerClasses += ' flippedY';
						}

						if (stateObj.action) {
							containerClasses = `${containerClasses} ${stateObj.action}`;
						}

						if (stateObj.notificationStatus) {
							containerClasses = `${containerClasses} notifier ${stateObj.notificationStatus}`;
						}

						if (stateObj.cardStatus.cardFront) {
							frontClasses = `${frontClasses} ${stateObj.cardStatus.cardFront}`;
						}

						if (stateObj.cardStatus.cardBack) {
							backClasses = `${backClasses} ${stateObj.cardStatus.cardBack}`;
						}
					}

					if (userInfo.userName && userInfo.gameSettings && !userInfo.gameSettings.disableHelpIcons) {
						if (isHovered && hoveredClass === containerClasses) {
							containerClasses += ' hovered';
						} else if (isHovered) {
							containerClasses += ' not-hovered';
						}
					}

					return (
						<div
							key={i}
							className={containerClasses}
							onClick={() => handleCardClick(i)}
							onMouseEnter={() => this.handleHover(containerClasses)}
							onMouseLeave={() => this.handleHover(containerClasses)}
						>
							<div className={frontClasses} />
							<div className={backClasses} />
						</div>
					);
				})}
			</section>
		);
	}
}

CardFlinger.propTypes = {
	userInfo: PropTypes.object,
	gameInfo: PropTypes.object,
	socket: PropTypes.object
};

export default CardFlinger;
