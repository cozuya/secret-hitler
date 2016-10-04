import React from 'react';

export default class CardFlinger extends React.Component {
	render() {
		const {gameInfo, userInfo} = this.props;

		return (
			<section className="cardflinger">
				{
					(() => {


					}
				)}
			</section>
		);
	}
}

Tracks.propTypes = {
	userInfo: React.PropTypes.object,
	gameInfo: React.PropTypes.object,
	socket: React.PropTypes.object
};