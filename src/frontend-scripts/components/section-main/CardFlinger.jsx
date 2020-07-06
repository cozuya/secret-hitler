import React from 'react'; // eslint-disable-line
import PropTypes from 'prop-types';

const positions = ['middle-far-left', 'middle-left', 'middle-center', 'middle-right', 'middle-far-right'];

// keyboardShortcuts: {phase: {key: index}}
const keyboardShortcuts = {
	voting: {
		J: 1,
		N: 3
	},
	presidentSelectingPolicy: {
		'1': 0,
		'2': 2,
		'3': 4
	},
	chancellorSelectingPolicy: {
		'1': 1,
		'2': 3
	},
	chancellorVoteOnVeto: {
		J: 1,
		N: 3
	},
	presidentVoteOnVeto: {
		J: 1,
		N: 3
	},
	presidentVoteOnBurn: {
		J: 1,
		N: 3
	}
};

class CardFlinger extends React.Component {
	state = {
		isHovered: false,
		hoveredClass: null,
		expandingIndex: null, // index of expanding card in [0, 1, 2, 3, 4]
		expansionTimer: 0 // number returned by setTimeout
	};

	handleHover = classes => {
		this.setState({
			isHovered: !this.state.isHovered,
			hoveredClass: classes
		});
	};

	onKeyUp(event) {
		// ignore typing in chat/reporting
		if (this.state.expandingIndex === null || ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

		clearTimeout(this.state.expansionTimer);
		this.setState({
			expandingIndex: null,
			expansionTimer: 0
		});
	}

	onKeyDown(event) {
		const { gameInfo, userInfo } = this.props;
		const { gameState } = gameInfo;
		const { phase } = gameState;
		const keyboardShortcutsSetting = (userInfo && userInfo.gameSettings && userInfo.gameSettings.keyboardShortcuts) || 'disable';
		const keyIndex = keyboardShortcuts[phase][String.fromCharCode(event.keyCode)];

		console.log(keyboardShortcutsSetting);

		// ignore typing in chat/reporting, or if keyboard shortcuts are disabled
		if (keyIndex === undefined || keyboardShortcutsSetting === 'disable' || ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

		if (keyboardShortcutsSetting === '0s' && phase === 'voting') {
			// instantly vote
			this.handleCardClick(keyboardShortcuts[phase][keyChar]);
		} else {
			// set a 2s timer to process the vote as if it were a click
			if (this.state.expandingIndex !== keyIndex) {
				clearTimeout(this.state.expansionTimer);
				this.setState({
					expandingIndex: keyIndex,
					expansionTimer: setTimeout(() => {
						this.handleCardClick(keyIndex);
					}, 2000)
				});
			}
		}
	}

	componentDidMount() {
		document.addEventListener('keydown', this.onKeyDown.bind(this));
		document.addEventListener('keyup', this.onKeyUp.bind(this));
	}

	componentWillUnmount() {
		document.removeEventListener('keydown', this.onKeyDown.bind(this));
		document.removeEventListener('keyup', this.onKeyUp.bind(this));
	}

	handleCardClick = index => {
		const { gameInfo, socket } = this.props;
		const { gameState } = gameInfo;
		const { phase } = gameState;

		if (phase === 'voting' && gameInfo.cardFlingerState[0].action === 'active') {
			socket.emit('selectedVoting', {
				vote: index === 1,
				uid: gameInfo.general.uid
			});
		}

		if (phase === 'presidentSelectingPolicy' && gameInfo.cardFlingerState[0].action === 'active') {
			socket.emit('selectedPresidentPolicy', {
				uid: gameInfo.general.uid,
				selection: index ? (index === 2 ? 1 : 2) : 0
			});
		}

		if (phase === 'chancellorSelectingPolicy' && gameInfo.cardFlingerState[0].action === 'active') {
			socket.emit('selectedChancellorPolicy', {
				uid: gameInfo.general.uid,
				selection: index
			});
		}

		if (phase === 'chancellorVoteOnVeto' && gameInfo.cardFlingerState[0].action === 'active') {
			socket.emit('selectedChancellorVoteOnVeto', {
				vote: index === 1,
				uid: gameInfo.general.uid
			});
		}

		if (phase === 'presidentVoteOnVeto' && gameInfo.cardFlingerState[0].action === 'active') {
			socket.emit('selectedPresidentVoteOnVeto', {
				vote: index === 1,
				uid: gameInfo.general.uid
			});
		}

		if (phase === 'presidentVoteOnBurn' && gameInfo.cardFlingerState[0].action === 'active') {
			socket.emit('selectedPresidentVoteOnBurn', {
				vote: index === 1,
				uid: gameInfo.general.uid
			});
		}
	};

	render() {
		const { cardFlingerState } = this.props.gameInfo;
		const renderHelpMessage = () => {
			const { gameInfo, userInfo } = this.props;
			const { gameState, publicPlayersState, cardFlingerState, general } = gameInfo;
			const { phase } = gameState;
			const { status } = general;
			const { userName } = userInfo;
			const currentPlayer = publicPlayersState.find(player => player.userName === userName);
			const currentPlayerStatus = currentPlayer ? currentPlayer.governmentStatus : null;

			if (userInfo.gameSettings && userInfo.gameSettings.disableHelpMessages) {
				return;
			}

			if (status === 'Fascists win the game.' || status === 'Liberals win the game.') {
				return;
			}

			if (phase === 'voting' && cardFlingerState.length) {
				return (
					<div className="help-message voting">
						Click once to <span className="select">SELECT</span> a vote.
						<div className="secondary-message">
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
					const stateObj = cardFlingerState.find(flinger => flinger.position === position);

					let frontClasses = 'cardflinger-card front';
					let backClasses = 'cardflinger-card back';
					let containerClasses = `cardflinger-card-container ${position}`;

					if (this.props.userInfo.userName && this.props.userInfo.gameSettings && this.props.userInfo.gameSettings.disableHelpIcons !== true) {
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

					if (this.props.userInfo.userName && this.props.userInfo.gameSettings && this.props.userInfo.gameSettings.disableHelpIcons !== true) {
						if (this.state.isHovered && this.state.hoveredClass === containerClasses) {
							containerClasses += ' hovered';
						} else if (this.state.isHovered) {
							containerClasses += ' not-hovered';
						}
					}

					if (this.state.expandingIndex === i) {
						containerClasses += ' expanding';
					}

					return (
						<div
							key={i}
							className={containerClasses}
							onClick={() => this.handleCardClick(i)}
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
