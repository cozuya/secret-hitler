import React from 'react'; // eslint-disable-line
import _ from 'lodash';
import PropTypes from 'prop-types';

class Policies extends React.Component {
	clickedDraw() {
		const { gameInfo, userInfo } = this.props;

		if (userInfo.userName && gameInfo.playersState[gameInfo.publicPlayersState.findIndex(player => player.userName === userInfo.userName)].policyNotification) {
			this.props.socket.emit('selectedPolicies', { uid: gameInfo.general.uid });
		}
	}

	render() {
		const { gameInfo, userInfo, deckInfo, deckShown } = this.props;

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

		const renderDeckInReplay = () => {
			// num is from 1 to 18, inclusive
			// so we add 18 * deck size in order to properly inform React that when the deck size changes (we are on a new deck), we should render a new animation
			return deckShown ? (
				<div style={{ position: 'absolute', zIndex: '2' }}>
					{_.range(1, deckInfo.size + 1).map(num => (
						<div key={num + 18 * deckInfo.size} id={`splay${num}`} className={`${deckInfo.get(num - 1)}p cardflinger-card`} />
					))}
				</div>
			) : null;
		};

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
					onClick={() => this.clickedDraw()}
				>
					{(() => {
						if (gameInfo.gameState.isTracksFlipped && gameInfo.gameState.undrawnPolicyCount) {
							return <div className="card-count">{gameInfo.gameState.undrawnPolicyCount}</div>;
						}
					})()}
					{renderUndrawn()}
				</div>
				{renderDeckInReplay()}
				<div className="discard" title={`${discardedPolicyCount} policy cards discarded`}>
					{gameInfo.gameState.isTracksFlipped && Number.isInteger(discardedPolicyCount) && <div className="card-count">{discardedPolicyCount}</div>}
					{renderDiscard()}
				</div>
			</section>
		);
	}
}

Policies.defaultProps = {
	gameInfo: {},
	userInfo: {},
	deckInfo: {},
	isReplay: false
};

Policies.propTypes = {
	gameInfo: PropTypes.object,
	userInfo: PropTypes.object,
	deckInfo: PropTypes.object,
	socket: PropTypes.object,
	isReplay: PropTypes.bool
};

export default Policies;
