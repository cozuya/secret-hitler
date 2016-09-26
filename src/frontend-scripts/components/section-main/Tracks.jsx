import React from 'react';
// import $ from 'jquery';
// import _ from 'lodash';

export default class Tracks extends React.Component {
	constructor() {
		super();

		this.leaveGame = this.leaveGame.bind(this);
		// this.handleClickedReportGame = this.handleClickedReportGame.bind(this);

		this.state = {};
	}

	// componentDidUpdate(prevProps) {
	// }

	leaveGame() {
		let seatNumber;

		if (this.props.userInfo.seatNumber) {
			seatNumber = this.props.userInfo.seatNumber;
		}

		this.props.onLeaveGame(seatNumber);
	}

	// handleClickedReportGame() {
	// 	this.props.socket.emit('updateReportGame', {
	// 		seatNumber: this.props.userInfo.seatNumber,
	// 		uid: this.props.gameInfo.uid
	// 	});
	// }

	createReportGame() {
	// 	const {gameInfo, userInfo} = this.props,
	// 		{gameState} = gameInfo;

	// 	if (userInfo.seatNumber && gameState.isStarted) {
	// 		const iconClasses = () => {
	// 			let classes = 'warning sign icon';

	// 			if (gameState.reportedGame[parseInt(userInfo.seatNumber, 10)]) {
	// 				classes += ' report-game-clicked';
	// 			}

	// 			return classes;
	// 		};

	// 		return (
	// 			<div className="table-uid">
	// 				Game ID: {gameInfo.uid}
	// 				<i onClick={this.handleClickedReportGame} ref={c => {
	// 					this.reportIcon = c;
	// 				}} className={iconClasses()} />
	// 				<div className="ui popup transition hidden">
	// 						Player abuse? Mark this game for reporting to the administrators for review.  Found a bug?  Send us an email.
	// 				</div>
	// 			</div>
	// 		);
	// 	}
	}

	// createGameInformation() {
	// 	const {gameInfo} = this.props;

	// 	return (
	// 		<div className="gameinformation-container">
	// 			<span className="game-name">{gameInfo.name}</span>
	// 			<span className="game-time">{gameInfo.time}</span>
	// 		</div>
	// 	);
	// }

	render() {
		// const {gameInfo, userInfo} = this.props;

		// if (!userInfo.seatNumber || !gameInfo.gameState.isStarted || gameInfo.gameState.isCompleted) {
		// 	return <i onClick={this.leaveGame} className="remove icon" />;
		// }
		return (
			<section className="tracks">
				<div className={
					(() => {
						let classes = 'track top-track';

						if (this.props.gameInfo.gameState.isStarted) {
							classes += ' flipped';
						}

						return classes;
					})()
				} />
				<div className={
					(() => {
						let classes = 'track bottom-track';

						if (this.props.gameInfo.gameState.isStarted) {
							classes += ' flipped';
						}

						return classes;
					})()
				} />
				<div className="ui basic small modal signinnag" ref={c => {
					this.signinModal = c;
				}}>
					<div className="ui header">You will need to sign in or sign up for an account to play.</div>
				</div>
			</section>
		);
	}
}

Tracks.propTypes = {
	onUpdateReportGame: React.PropTypes.func,
	onSeatingUser: React.PropTypes.func,
	onLeaveGame: React.PropTypes.func,
	userInfo: React.PropTypes.object,
	gameInfo: React.PropTypes.object,
	socket: React.PropTypes.object
};