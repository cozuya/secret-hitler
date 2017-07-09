import React from 'react'; // eslint-disable-line
import $ from 'jquery';
import PropTypes from 'prop-types';

const CardFlinger = props => {
	const handleCardClick = (e) => {
			const {gameInfo, socket} = props,
				{gameState} = gameInfo,
				{phase} = gameState,
				index = parseInt($(e.currentTarget).attr('data-index'), 10);

			if (phase === 'voting' && gameInfo.cardFlingerState[0].action === 'active') {
				socket.emit('selectedVoting', {
					vote: index === 1,
					userName: props.userInfo.userName,
					uid: gameInfo.general.uid
				});
			}

			if (phase === 'presidentSelectingPolicy' && gameInfo.cardFlingerState[0].action === 'active') {
				socket.emit('selectedPresidentPolicy', {
					userName: props.userInfo.userName,
					uid: gameInfo.general.uid,
					selection: index ? index === 2 ? 1 : 2 : 0
				});
			}

			if (phase === 'chancellorSelectingPolicy' && gameInfo.cardFlingerState[0].action === 'active') {
				socket.emit('selectedChancellorPolicy', {
					userName: props.userInfo.userName,
					uid: gameInfo.general.uid,
					selection: index,
					policy: $(e.currentTarget).find('.back').hasClass('liberalp') ? 'liberal' : 'fascist'
				});
			}

			if (phase === 'chancellorVoteOnVeto' && gameInfo.cardFlingerState[0].action === 'active') {
				socket.emit('selectedChancellorVoteOnVeto', {
					vote: index === 1,
					userName: props.userInfo.userName,
					uid: gameInfo.general.uid
				});
			}

			if (phase === 'presidentVoteOnVeto' && gameInfo.cardFlingerState[0].action === 'active') {
				socket.emit('selectedPresidentVoteOnVeto', {
					vote: index === 1,
					userName: props.userInfo.userName,
					uid: gameInfo.general.uid
				});
			}
		},
		{cardFlingerState} = props.gameInfo,
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
						<div key={i} data-index={i} className={containerClasses} onClick={handleCardClick}>
							<div className={frontClasses} />
							<div className={backClasses} />
						</div>
					);
				});
			})()}
		</section>
	);
};

CardFlinger.propTypes = {
	userInfo: PropTypes.object,
	gameInfo: PropTypes.object,
	socket: PropTypes.object
};

export default CardFlinger;