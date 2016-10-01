import React from 'react';
// import $ from 'jquery';

export default class Players extends React.Component {
	constructor() {
		super();
		this.clickedTakeSeat = this.clickedTakeSeat.bind(this);
	}

	// componentDidMount() {

	// }

	renderPlayers() {
		const {playersState} = this.props.gameInfo;

		return this.props.gameInfo.seatedPlayers.map((player, i) => {
			return (
				// onClick={this.handlePlayerClick}
				<div key={i} className="player-container" >
					<div
						className={
						(() => {
							return 'player-name';
						})()
					}
					>{player.userName}</div>
					<div
						className={
						(() => {
							let classes = 'card-container';

							if (playersState && playersState[i].cardStatus.cardDisplayed) {
								classes += ' showing';
							}

							if (playersState && playersState[i].cardStatus.isFlipped) {
								classes += ' flipped';
							}
							return classes;
						})()
					}>
						<div
							className={
							(() => {
								let classes = 'card card-front';

								if (playersState && playersState[i].cardStatus.cardFront) {
									classes = `${classes} ${playersState[i].cardStatus.cardFront}`;
								}

								return classes;
							})()
						} />
						<div
							className={
							(() => {
								let classes = 'card card-back';

								if (playersState && playersState[i].cardBack) {
									classes = `${classes} ${playersState[i].cardBack}`;
								}

								return classes;
							})()
						} />
					</div>
				</div>
			);
		});
	}

	renderTakeSeat() {
		const {userInfo, gameInfo} = this.props;

		if (!userInfo.seatNumber && !gameInfo.gameState.isStarted) {
			return <div className="ui left pointing label" onClick={this.clickedTakeSeat}>Take a seat</div>;
		}
	}

	clickedTakeSeat() {
		this.props.onClickedTakeSeat();
	}

	render() {
		return (
			<section className="players">
				{this.renderPlayers()}
				{this.renderTakeSeat()}
				<div className="ui basic small modal signinnag" ref={c => {
					this.signinModal = c;
				}}>
					<div className="ui header">You will need to sign in or sign up for an account to play.</div>
				</div>
			</section>
		);
	}
}

Players.propTypes = {
	roles: React.PropTypes.array,
	userInfo: React.PropTypes.object,
	gameInfo: React.PropTypes.object,
	roleState: React.PropTypes.string,
	selectedGamerole: React.PropTypes.func
};