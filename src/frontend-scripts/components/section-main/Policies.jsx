import React from 'react';
import _ from 'lodash';

export default class Policies extends React.Component {
	constructor() {
		super();
		this.clickedDraw = this.clickedDraw.bind(this);
	}

	clickedDraw() {
		const {gameInfo, userInfo, socket} = this.props;

		if (userInfo.userName && gameInfo.playersState[gameInfo.seatedPlayers.findIndex(player => player.userName === userInfo.userName)].policyNotification) {
			socket.emit('selectedPolicies', {uid: gameInfo.general.uid});
		}
	}

	renderUndrawn() {
		const {gameInfo, userInfo} = this.props,
			count = gameInfo.gameState.undrawnPolicyCount;

		let playerIndex;

		if (userInfo.userName) {
			playerIndex = gameInfo.playersState.find(player => player.userName === userInfo.userName);
		}

		return _.range(1, 18).map(num => {
			let classes = `policy-card policy-draw policy-card-${num}`;

			if (num > count || !this.props.gameInfo.gameState.isStarted) {
				classes += ' offscreen';
			}

			if (playerIndex && gameInfo.playersState[playerIndex].policyNotification) {
				classes += ' notification';
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
		const {gameInfo, userInfo} = this.props;

		return (
			<section className="policies-container">
				<div className={
					(() => {
						let classes = 'draw';

						if (userInfo.userName && userInfo.isSeated && gameInfo.gameState.isStarted && gameInfo.playersState[gameInfo.seatedPlayers.findIndex(player => player.userName === userInfo.userName)] && gameInfo.playersState[gameInfo.seatedPlayers.findIndex(player => player.userName === userInfo.userName)].policyNotification) {
							classes += ' notifier';
						}

						return classes;
					})()
				} title={`${this.props.gameInfo.gameState.undrawnPolicyCount} policy cards remain`} onClick={this.clickedDraw}>
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