import React from 'react';
import $ from 'jquery';

export default class CardFlinger extends React.Component {
	constructor() {
		super();
		this.handleCardClick = this.handleCardClick.bind(this);
	}

	handleCardClick(e) {
		const {gameInfo, socket} = this.props,
			{gameState} = gameInfo,
			{phase} = gameState,
			index = parseInt($(e.currentTarget).attr('data-index'), 10);

		if (phase === 'voting' && gameInfo.cardFlingerState[0].action === 'active') {
			socket.emit('selectedVoting', {
				vote: index === 1,
				userName: this.props.userInfo.userName,
				uid: gameInfo.general.uid
			});
		}

		if (phase === 'presidentSelectingPolicy' && gameInfo.cardFlingerState[0].action === 'active') {
			socket.emit('selectedPresidentPolicy', {
				userName: this.props.userInfo.userName,
				uid: gameInfo.general.uid,
				selection: index ? index === 2 ? 1 : 2 : 0
			});
		}

		if (phase === 'chancellorSelectingPolicy' && gameInfo.cardFlingerState[0].action === 'active') {
			socket.emit('selectedChancellorPolicy', {
				userName: this.props.userInfo.userName,
				uid: gameInfo.general.uid,
				selection: gameInfo.trackState.fascistPolicyCount === 0 ? index : index ? 1 : 0,
				policy: $(e.currentTarget).find('.back').hasClass('liberalp') ? 'liberal' : 'fascist'
			});
		}

		if (phase === 'chancellorVoteOnVeto' && gameInfo.cardFlingerState[0].action === 'active') {
			socket.emit('selectedChancellorVoteOnVeto', {
				vote: index === 1,
				userName: this.props.userInfo.userName,
				uid: gameInfo.general.uid
			});
		}

		if (phase === 'presidentVoteOnVeto' && gameInfo.cardFlingerState[0].action === 'active') {
			socket.emit('selectedPresidentVoteOnVeto', {
				vote: index === 1,
				userName: this.props.userInfo.userName,
				uid: gameInfo.general.uid
			});
		}
	}

	render() {
		const {cardFlingerState} = this.props.gameInfo,
			positions = ['middle-far-left', 'middle-left', 'middle-center', 'middle-right', 'middle-far-right'];

		return (
			<section className="cardflinger-container">
				{(() => {
					return positions.map((position, i) => {
						const stateObj = cardFlingerState.find(flinger => flinger.position === position);

						let frontClasses = 'cardflinger-card front',
							backClasses = 'cardflinger-card back',
							containerClasses = `cardflinger-card-container ${position}`;

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

						return (
							<div key={i} data-index={i} className={containerClasses} onClick={this.handleCardClick}>
								<div className={frontClasses} />
								<div className={backClasses} />
							</div>
						);
					});
				})()}
			</section>
		);
	}
}

CardFlinger.propTypes = {
	userInfo: React.PropTypes.object,
	gameInfo: React.PropTypes.object,
	socket: React.PropTypes.object
};