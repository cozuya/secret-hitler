import React from 'react';
import PropTypes from 'prop-types';

class HostOverlay extends React.Component {
	constructor() {
		super();
		this.hostStartGame = this.hostStartGame.bind(this);
		this.hostCancelStart = this.hostCancelStart.bind(this);
		this.hostRemake = this.hostRemake.bind(this);
	}

	hostStartGame() {
		if (this.props.gameInfo.publicPlayersState.length < 5) {
			this.props.handleOpenWarning('You need at least 5 players to start!');
		} else {
			this.props.socket.emit('hostStartGame', { uid: this.props.gameInfo.general.uid });
		}
	}

	hostCancelStart() {
		if (this.props.gameInfo.gameState.isStarted && !this.props.gameInfo.gameState.isTracksFlipped) {
			this.props.socket.emit('hostCancelStart', { uid: this.props.gameInfo.general.uid });
		}
	}

	hostRemake() {
		if (this.props.gameInfo.gameState.isCompleted) {
			this.props.socket.emit('hostRemake', { uid: this.props.gameInfo.general.uid });
		}
	}

	render() {
		const { gameInfo } = this.props;
		if (!gameInfo.gameState.isTracksFlipped) {
			return (
				<div className="help-message host">
					<div>You are the host of this game.</div>
					<div>
						Click on the host icon <img className="host-icon" src="../../images/host-icon.png" /> to access game options.
					</div>
					<div>When you're ready, click start to begin the game.</div>
					{!gameInfo.gameState.isStarted && (
						<div className="ui button primary start" onClick={this.hostStartGame}>
							Start game
						</div>
					)}
					{gameInfo.gameState.isStarted && (
						<div className="ui button start" onClick={this.hostCancelStart}>
							Cancel Start
						</div>
					)}
				</div>
			);
		} else if (gameInfo.gameState.isCompleted) {
			return (
				<div className="help-message host">
					<div className="ui button primary start remake" onClick={this.hostRemake}>
						Remake Game
					</div>
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
