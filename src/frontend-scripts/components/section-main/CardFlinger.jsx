import React from 'react';

export default class CardFlinger extends React.Component {
	// componentDidUpdate(prevProps) {

	// }

	render() {
		const {cardFlingerState, userInfo} = this.props,
			positions = ['middle-far-left', 'middle-left', 'middle-center', 'middle-right', 'middle-far-right'];

		return (
			<section className="cardflinger-container">
			{(() => {
				return positions.map((position, i) => {
					let classes = `cardflinger-card-container ${position}`;

					return (
						<div key={i} className={classes}>
							<div className="cardflinger-card front" />
							<div className="cardflinger-card back" />
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
	cardFlingerState: React.PropTypes.object,
	socket: React.PropTypes.object
};