import React from 'react'; // eslint-disable-line
import _ from 'lodash';
import PropTypes from 'prop-types';

const Policies = props => {
	const { gameInfo, userInfo, socket } = props;
	const clickedDraw = () => {
		if (userInfo.userName && gameInfo.playersState[gameInfo.publicPlayersState.findIndex(player => player.userName === userInfo.userName)].policyNotification) {
			socket.emit('selectedPolicies', { uid: gameInfo.general.uid });
		}
	};
	const renderUndrawn = () => {
		const { playersState } = gameInfo;
		const count = gameInfo.gameState.undrawnPolicyCount;

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
	};
	const renderDiscard = () => {
		const count =
			(gameInfo.customGameSettings && gameInfo.customGameSettings.deckState
				? gameInfo.customGameSettings.deckState.lib + gameInfo.customGameSettings.deckState.fas
				: 17) -
			(gameInfo.gameState.undrawnPolicyCount + gameInfo.trackState.liberalPolicyCount + gameInfo.trackState.fascistPolicyCount);

		return _.range(1, 10).map(num => {
			let classes = `policy-card policy-discard policy-card-${num}`;

			if (num > count) {
				classes += ' offscreen';
			}

			return <div className={classes} key={num} />;
		});
	};
	const discardedPolicyCount =
		(gameInfo.customGameSettings && gameInfo.customGameSettings.deckState
			? gameInfo.customGameSettings.deckState.lib + gameInfo.customGameSettings.deckState.fas
			: 17) -
		(gameInfo.gameState.undrawnPolicyCount + gameInfo.trackState.liberalPolicyCount + gameInfo.trackState.fascistPolicyCount);

	return (
		<section className="policies-container">
			<div
				className={(() => {
					let classes = 'draw';

					if (
						userInfo.userName &&
						userInfo.isSeated &&
						gameInfo.gameState.isStarted &&
						gameInfo.playersState &&
						gameInfo.playersState[gameInfo.publicPlayersState.findIndex(player => player.userName === userInfo.userName)] &&
						gameInfo.playersState[gameInfo.publicPlayersState.findIndex(player => player.userName === userInfo.userName)].policyNotification
					) {
						classes += ' notifier';
					}

					return classes;
				})()}
				title={`${gameInfo.gameState.undrawnPolicyCount} policy cards remain`}
				onClick={clickedDraw}
			>
				{(() => {
					if (gameInfo.gameState.isTracksFlipped && gameInfo.gameState.undrawnPolicyCount) {
						return <div className="card-count">{gameInfo.gameState.undrawnPolicyCount}</div>;
					}
				})()}
				{renderUndrawn()}
			</div>
			<div className="discard" title={`${discardedPolicyCount} policy cards discarded`}>
				{gameInfo.gameState.isTracksFlipped && Number.isInteger(discardedPolicyCount) && <div className="card-count">{discardedPolicyCount}</div>}
				{renderDiscard()}
			</div>
		</section>
	);
};

Policies.defaultProps = {
	gameInfo: {},
	userInfo: {}
};

Policies.propTypes = {
	gameInfo: PropTypes.object,
	userInfo: PropTypes.object,
	socket: PropTypes.object
};

export default Policies;
