import React from 'react';
import _ from 'lodash';

export default class Policies extends React.Component {
	// constructor() {
	// 	super();
	// 	this.clickedTakeSeat = this.clickedTakeSeat.bind(this);
	// 	this.handlePlayerClick = this.handlePlayerClick.bind(this);
	// }
	renderUndrawn() {
		const count = this.props.gameInfo.gameState.undrawnPolicyCount;

		return _.range(1, 18).map(num => {
			let classes = `policy-card policy-draw policy-card-${num}`;

			if (num > count || !this.props.gameInfo.gameState.isStarted) {
				classes += ' offscreen';
			}

			return <div className={classes} key={num} />;
		});
	}

	renderDiscard() {
		const count = this.props.gameInfo.gameState.discardedPolicyCount;

		return _.range(1, 10).map(num => {
			let classes = `policy-card policy-discard policy-card-${num}`;

			if (num > count) {
				classes += ' offscreen';
			}

			return <div className={classes} key={num} />;
		});
	}

	render() {
		return (
			<section className="policies-container">
				<div className="draw" title={`${this.props.gameInfo.gameState.undrawnPolicyCount} policy cards remain`}>
					{this.renderUndrawn()}
				</div>
				<div className="discard" title={`${this.props.gameInfo.gameState.discardedPolicyCount} policy cards discarded`}>
					{this.renderDiscard()}
				</div>
			</section>
		);
	}
}

Policies.propTypes = {
	gameInfo: React.PropTypes.object
};