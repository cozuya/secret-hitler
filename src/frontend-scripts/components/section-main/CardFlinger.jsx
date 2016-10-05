import React from 'react';

export default class CardFlinger extends React.Component {
	// componentDidUpdate(prevProps) {

	// }

	render() {
		const {cardFlingerState} = this.props,
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
							containerClasses += ' flipped';
						}

						if (stateObj.action) {
							containerClasses = `${containerClasses} ${stateObj.action}`;
						}

						if (stateObj.notificationStatus) {
							containerClasses = `${containerClasses} ${stateObj.notificationStatus}`;
						}

						if (stateObj.cardStatus.cardFront) {
							frontClasses = `${frontClasses} ${stateObj.cardStatus.cardFront}`;
						}

						if (stateObj.cardStatus.cardBack) {
							backClasses = `${backClasses} ${stateObj.cardStatus.cardBack}`;
						}
					}

					return (
						<div key={i} className={containerClasses}>
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
	cardFlingerState: React.PropTypes.array,
	socket: React.PropTypes.object
};