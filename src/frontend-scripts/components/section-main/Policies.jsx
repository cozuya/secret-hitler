import React from 'react';
import _ from 'lodash';

export default class Policies extends React.Component {
	constructor() {
		super();
		this.clickedDraw = this.clickedDraw.bind(this);
	}

	clickedDraw() {
		const {gameInfo, userInfo, socket} = this.props;

		if (userInfo.userName && gameInfo.playersState[gameInfo.publicPlayersState.findIndex(player => player.userName === userInfo.userName)].policyNotification) {
			socket.emit('selectedPolicies', {uid: gameInfo.general.uid});
		}
	}

	renderUndrawn() {
		const {gameInfo, userInfo} = this.props,
			{playersState} = gameInfo,
			count = gameInfo.gameState.undrawnPolicyCount;

		let playerIndex;

		if (userInfo.userName && playersState) {
			playerIndex = playersState.find(player => player.userName === userInfo.userName);
		}

		return _.range(1, 18).map(num => {
			let classes = `policy-card policy-draw policy-card-${num}`;

			if (num > count || !gameInfo.gameState.isStarted) {
				classes += ' offscreen';
			}

			if (playerIndex && playersState[playerIndex].policyNotification) {
				classes += ' notification';
			}

			return <div className={classes} key={num} />;
		});
	}

	renderDiscard() {
		const {gameInfo} = this.props,
			count = 17 - (gameInfo.gameState.undrawnPolicyCount + gameInfo.trackState.liberalPolicyCount + gameInfo.trackState.fascistPolicyCount);

		return _.range(1, 10).map(num => {
			let classes = `policy-card policy-discard policy-card-${num}`;

			if (num > count) {
				classes += ' offscreen';
			}

			return <div className={classes} key={num} />;
		});
	}

	render() {
		const {gameInfo, userInfo} = this.props,
			discardedPolicyCount = 17 - (gameInfo.gameState.undrawnPolicyCount + gameInfo.trackState.liberalPolicyCount + gameInfo.trackState.fascistPolicyCount);

		return (
			<section className="policies-container">
				<div className={
					(() => {
						let classes = 'draw';

						if (userInfo.userName && userInfo.isSeated && gameInfo.gameState.isStarted && gameInfo.playersState && gameInfo.playersState[gameInfo.publicPlayersState.findIndex(player => player.userName === userInfo.userName)] && gameInfo.playersState[gameInfo.publicPlayersState.findIndex(player => player.userName === userInfo.userName)].policyNotification) {
							classes += ' notifier';
						}

						return classes;
					})()
				} title={`${gameInfo.gameState.undrawnPolicyCount} policy cards remain`} onClick={this.clickedDraw}>
					{(() => {
						if (gameInfo.gameState.isTracksFlipped && gameInfo.gameState.undrawnPolicyCount) {
							return <div className="card-count">{gameInfo.gameState.undrawnPolicyCount}</div>;
						}
					})()}
					{this.renderUndrawn()}
				</div>
				<div className="discard" title={`${discardedPolicyCount} policy cards discarded`}>
					{(() => {
						if (gameInfo.gameState.isTracksFlipped && discardedPolicyCount) {
							return <div className="card-count">{discardedPolicyCount}</div>;
						}
					})()}
					{this.renderDiscard()}
				</div>
			</section>
		);
	}
}

Policies.propTypes = {
	gameInfo: React.PropTypes.object
};