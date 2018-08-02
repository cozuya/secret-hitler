import React from 'react';
import PropTypes from 'prop-types';

class HostOverlay extends React.Component {
	constructor() {
		super();
		this.hostStartGame = this.hostStartGame.bind(this);
		this.hostCancelStart = this.hostCancelStart.bind(this);
		this.timeSinceLastStartClick;
		this.timeSinceLastCancelClick;
		this.state = {
			showStartLoader: false,
			showCancelLoader: false,
			disableStartButton: false,
			disableCancelButton: false
		};
	}

	componentWillUpdate() {
		const currentTime = Date.now();

		if (this.state.showStartLoader && this.props.gameInfo.gameState.isStarted) {
			this.setState({ showStartLoader: false });
		}
		if (this.state.showCancelLoader && !this.props.gameInfo.gameState.isStarted) {
			this.setState({ showCancelLoader: false });
		}

		if (this.state.disableStartButton === false && currentTime - this.timeSinceLastStartClick < 5000) {
			this.setState({ disableStartButton: true });
			setTimeout(() => {
				this.setState({ disableStartButton: false });
			}, 5000);
		}

		if (this.state.disableCancelButton === false && currentTime - this.timeSinceLastCancelClick < 3000) {
			this.setState({ disableCancelButton: true });
			setTimeout(() => {
				this.setState({ disableCancelButton: false });
			}, 3000);
		}
	}

	hostStartGame() {
		if (this.props.gameInfo.publicPlayersState.length < 5) {
			this.props.handleOpenWarning('You need at least 5 players to start!');
		} else if (!(Date.now() - this.timeSinceLastStartClick < 5000)) {
			this.timeSinceLastStartClick = Date.now();
			this.setState({ showStartLoader: true });
			this.props.socket.emit('hostStartGame', { uid: this.props.gameInfo.general.uid });
		}
	}

	hostCancelStart() {
		if (this.props.gameInfo.gameState.isStarted && !this.props.gameInfo.gameState.isTracksFlipped && !(Date.now() - this.timeSinceLastCancelClick < 3000)) {
			this.timeSinceLastCancelClick = Date.now();
			this.setState({ showCancelLoader: true });
			this.props.socket.emit('hostCancelStart', { uid: this.props.gameInfo.general.uid });
		}
	}

	render() {
		const { gameInfo } = this.props;

		let startButtonClasses = 'ui button primary start';
		if (this.state.disableStartButton) {
			startButtonClasses += ' disabled';
		}
		let cancelButtonClasses = 'ui button start';
		if (this.state.disableCancelButton) {
			cancelButtonClasses += ' disabled';
		}

		if (!gameInfo.gameState.isTracksFlipped) {
			return (
				<div className="help-message host">
					<div>You are the host of this game.</div>
					<div>
						Click on the host icon <img className="host-icon" src="../../images/host-icon.png" /> to access game options.
					</div>
					<div>When you're ready, click start to begin the game.</div>
					{!gameInfo.gameState.isStarted && (
						<div className={startButtonClasses} onClick={this.hostStartGame}>
							Start game
							{this.state.showStartLoader && <div className="ui active big inverted loader" />}
						</div>
					)}
					{gameInfo.gameState.isStarted && (
						<div className={cancelButtonClasses} onClick={this.hostCancelStart}>
							Cancel Start
							{this.state.showCancelLoader && <div className="ui active big inverted loader" />}
						</div>
					)}
				</div>
			);
		} else {
			return null;
		}
	}
}

HostOverlay.propTypes = {
	gameInfo: PropTypes.object,
	socket: PropTypes.object
};

export default HostOverlay;
