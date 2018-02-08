import React from 'react';
import Tracks from './Tracks.jsx';
import Gamechat from './Gamechat.jsx';
import Players from './Players.jsx';
import Confetti from './Confetti.jsx';
import Balloons from './Balloons.jsx';
import PropTypes from 'prop-types';

export default class Game extends React.Component {
	componentDidUpdate(prevProps) {
		const { userInfo, gameInfo } = this.props;

		if (userInfo.isSeated && gameInfo.gameState && gameInfo.gameState.isTracksFlipped && !prevProps.gameInfo.gameState.isTracksFlipped) {
			const sound = document.createElement('audio');

			sound.setAttribute('src', '../../alarm.mp3');
			sound.play();

			setTimeout(() => {
				sound.pause();
			}, 2400);
		}
		// All players have left the game, so we will return the observer to the main screen.
		if ((!gameInfo.publicPlayersState.length && !(gameInfo.general.isTourny && gameInfo.general.tournyInfo.round === 0)) ||
			(gameInfo.general.isTourny && gameInfo.general.tournyInfo.round === 0 && !gameInfo.general.tournyInfo.queuedPlayers.length)) {
			window.location.hash = '#/';
		}
	}

	render() {
		const { userInfo, gameInfo } = this.props;

		return (
			<section className="game">
				<div className="ui grid">
					<div className="row">
						<div className="ten wide column tracks-container">
							<Tracks userInfo={userInfo} gameInfo={gameInfo} socket={this.props.socket} />
						</div>
						<div className="six wide column chat-container game-chat">
							<section className={gameInfo.general && gameInfo.general.isTourny ? 'gamestatus tourny' : 'gamestatus'}>
								{gameInfo.general && gameInfo.general.status}
							</section>
							<Gamechat userList={this.props.userList} gameInfo={gameInfo} userInfo={userInfo} socket={this.props.socket} />
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
	userList: PropTypes.object
};
