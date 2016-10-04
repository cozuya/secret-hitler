import React from 'react';

export default class Tracks extends React.Component {
	constructor() {
		super();
		this.leaveGame = this.leaveGame.bind(this);
		// this.handleClickedReportGame = this.handleClickedReportGame.bind(this);
	}

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

	render() {
		const {gameInfo, userInfo} = this.props;

		return (
			<section className={
				(() => {
					let classes = 'tracks';

					if (this.props.gameInfo.trackState.blurred) {
						classes += ' blurred';
					}

					return classes;
				})()
			}>
				<div className={
					(() => {
						let classes = 'track-flipper track-flipper-top';

						if (gameInfo.gameState.isStarted) {
							classes += ' flipped';
						}

						return classes;
					})()
				}>
					<div className="track top-track-front" />
					<div className="track top-track-back" />
				</div>
				<div className={
					(() => {
						let classes = 'track-flipper track-flipper-bottom';

						if (gameInfo.gameState.isStarted) {
							classes += ' flipped';
						}

						return classes;
					})()
				}>
					<div className="track bottom-track-front" />
					<div className="track bottom-track-back" />
				</div>
				{(() => {
					if (!userInfo.seatNumber || !gameInfo.gameState.isStarted || gameInfo.gameState.isCompleted) {
						return <i onClick={this.leaveGame} className="remove icon" />;
					}
				})()}
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