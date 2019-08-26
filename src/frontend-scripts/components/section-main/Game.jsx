import React from 'react';

import Tracks from './Tracks.jsx';
import Gamechat from './Gamechat.jsx';
import Players from './Players.jsx';
import Confetti from './Confetti.jsx';
import Balloons from './Balloons.jsx';
import Flappy from './Flappy.jsx';
import PropTypes from 'prop-types';
import playSound from '../reusable/playSound';

export default class Game extends React.Component {
	componentDidUpdate(prevProps) {
		const { userInfo, gameInfo } = this.props;

		if (
			(userInfo.isSeated && gameInfo.gameState && gameInfo.gameState.isTracksFlipped && !prevProps.gameInfo.gameState.isTracksFlipped) ||
			(gameInfo.general.isTourny &&
				gameInfo.general.status === 'Tournament starts in 5 seconds.' &&
				prevProps.gameInfo.general.status !== 'Tournament starts in 5 seconds.')
		) {
			playSound('alarm', 'pack1', 2400);
		}

		if ((userInfo.gameSettings && userInfo.gameSettings.soundStatus !== 'Off') || !userInfo.gameSettings) {
			const pack = userInfo.gameSettings ? userInfo.gameSettings.soundStatus : 'pack2';

			if (gameInfo.general.status === 'Dealing roles..' && prevProps.gameInfo.general.status !== 'Dealing roles..') {
				playSound('shuffle', 'pack1', 3000);
			}

			if (
				(gameInfo.gameState.audioCue === 'enactPolicyL' || gameInfo.gameState.audioCue === 'enactPolicyF') &&
				(prevProps.gameInfo.gameState.audioCue !== 'enactPolicyL' || prevProps.gameInfo.gameState.audioCue !== 'enactPolicyF')
			) {
				playSound(pack === 'pack1' ? 'enactpolicy' : gameInfo.gameState.audioCue === 'enactPolicyL' ? 'enactpolicyl' : 'enactpolicyf', pack, 4000);
			}

			if (gameInfo.general.status === 'Waiting on presidential discard.' && prevProps.gameInfo.general.status !== 'Waiting on presidential discard.') {
				playSound('presidentreceivespolicies', 'pack1', 3000);
			}

			if (gameInfo.general.status === 'Waiting on chancellor enactment.' && prevProps.gameInfo.general.status !== 'Waiting on chancellor enactment.') {
				playSound('chancellorreceivespolicies', 'pack1', 2000);
			}

			if (gameInfo.gameState.audioCue === 'policyPeek' && prevProps.gameInfo.gameState.audioCue !== 'policyPeek') {
				playSound('policypeek', 'pack1', 3000);
			}

			if (gameInfo.gameState.audioCue === 'selectedExecution' && prevProps.gameInfo.gameState.audioCue !== 'selectedExecution') {
				playSound('playershot', pack, pack === 'pack1' ? 11000 : 5000);
			}

			if (gameInfo.gameState.audioCue === 'selectedInvestigate' && prevProps.gameInfo.gameState.audioCue !== 'selectedInvestigate') {
				playSound(pack === 'pack1' ? 'policyinvestigate' : 'policypeek', 'pack1', pack === 'pack1' ? 11000 : 3000);
			}

			if (
				prevProps.gameInfo.general.status === 'President to select special election.' &&
				gameInfo.general.status !== 'President to select special election.'
			) {
				playSound(pack === 'pack1' ? 'policyspecialelection' : 'policypeek', 'pack1', pack === 'pack1' ? 9000 : 3000);
			}

			if (gameInfo.gameState.audioCue === 'hitlerShot' && prevProps.gameInfo.gameState.audioCue !== 'hitlerShot') {
				playSound(pack === 'pack1' ? 'liberalswinhitlershot' : 'liberalswin', pack, pack === 'pack1' ? 26000 : 8000);
			}

			if (gameInfo.gameState.audioCue === 'liberalsWin' && prevProps.gameInfo.gameState.audioCue !== 'liberalsWin') {
				playSound('liberalswin', pack, pack === 'pack1' ? 19000 : 8000);
			}

			if (gameInfo.gameState.audioCue === 'fascistsWin' && prevProps.gameInfo.gameState.audioCue !== 'fascistsWin') {
				playSound('fascistswin', pack, pack === 'pack1' ? 19000 : 13000);
			}

			if (gameInfo.gameState.audioCue === 'fascistsWinHitlerElected' && prevProps.gameInfo.gameState.audioCue !== 'fascistsWinHitlerElected') {
				playSound('fascistswinhitlerelected', pack, pack === 'pack1' ? 11000 : 13000);
			}

			if (gameInfo.gameState.audioCue === 'passedVeto' && prevProps.gameInfo.gameState.audioCue !== 'passedVeto') {
				playSound(pack === 'pack1' ? 'vetosucceeds' : 'policypeek', 'pack1', pack === 'pack1' ? 10000 : 3000);
			}
		}

		// All players have left the game, so we will return the observer to the main screen.
		if (
			(!gameInfo.publicPlayersState.length && !(gameInfo.general.isTourny && gameInfo.general.tournyInfo.round === 0)) ||
			(gameInfo.general.isTourny && gameInfo.general.tournyInfo.round === 0 && !gameInfo.general.tournyInfo.queuedPlayers.length)
		) {
			window.location.hash = '#/';
		}
	}

	componentDidMount() {
		this.props.socket.emit('updateUserStatus', '', this.props.gameInfo && this.props.gameInfo.general && this.props.gameInfo.general.uid);
		this.props.socket.emit('getGameInfo', this.props.gameInfo && this.props.gameInfo.general && this.props.gameInfo.general.uid);
	}

	componentWillUnmount() {
		this.props.socket.emit('updateUserStatus');
	}

	render() {
		const { userInfo, gameInfo, socket } = this.props;
		let isFlappy;

		// Not Yet Ready
		isFlappy = false;

		return (
			<section className="game">
				<div className="ui grid">
					<div className="row">
						<div className="sixteen wide column tracks-container">
							{isFlappy ? (
								<React.Fragment>
									<Flappy isFacist={false} userInfo={userInfo} gameInfo={gameInfo} socket={socket} />
									<Flappy isFacist userInfo={userInfo} gameInfo={gameInfo} socket={socket} />
								</React.Fragment>
							) : (
									<Tracks userInfo={userInfo} gameInfo={gameInfo} socket={socket} />
								)}
						</div>
						<div className="chat-container game-chat transition">
							<section className={gameInfo.general && gameInfo.general.isTourny ? 'gamestatus tourny' : 'gamestatus'}>
								{gameInfo.general && gameInfo.general.status}
							</section>
							<Gamechat userList={this.props.userList} gameInfo={gameInfo} userInfo={userInfo} socket={socket} allEmotes={this.props.allEmotes} />
						</div>
					</div>
				</div>
				{(() => {
					const balloons = Math.random() < 0.1;

					if (
						userInfo.userName &&
						userInfo.gameSettings &&
						!userInfo.gameSettings.disableConfetti &&
						gameInfo &&
						gameInfo.publicPlayersState &&
						gameInfo.publicPlayersState.find(player => player.userName === userInfo.userName) &&
						gameInfo.publicPlayersState.find(player => player.userName === userInfo.userName).isConfetti
					) {
						return balloons ? <Balloons /> : <Confetti />;
					}
				})()}
				<div
					className={(() => {
						let classes = 'row players-container';

						if (userInfo.gameSettings && userInfo.gameSettings.disableRightSidebarInGame) {
							classes += ' disabledrightsidebar';
						}

						return classes;
					})()}
				>
					<Players
						onClickedTakeSeat={this.props.onClickedTakeSeat}
						userList={this.props.userList}
						userInfo={userInfo}
						gameInfo={gameInfo}
						socket={this.props.socket}
					/>
				</div>
			</section>
		);
	}
}

Game.defaultProps = {
	gameInfo: {},
	userInfo: {}
};

Game.propTypes = {
	onSeatingUser: PropTypes.func,
	userInfo: PropTypes.object,
	gameInfo: PropTypes.object,
	socket: PropTypes.object,
	gameRoleInfo: PropTypes.object,
	clickedPlayerInfo: PropTypes.object,
	clickedGamerole: PropTypes.object,
	clickedPlayer: PropTypes.object,
	expandoInfo: PropTypes.string,
	dispatch: PropTypes.func,
	userList: PropTypes.object,
	allEmotes: PropTypes.array,
	onClickedTakeSeat: PropTypes.func
};
