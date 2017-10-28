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

			sound.setAttribute('src', 'alarm.mp3');
			sound.play();

			setTimeout(() => {
				sound.pause();
			}, 2400);
		}
	}

	render() {
		return (
			<section className="game">
				<div className="ui grid">
					<div className="row">
						<div
							className={(() => {
								let classes;

								if (this.props.userInfo.gameSettings && !this.props.userInfo.gameSettings.enableRightSidebarInGame) {
									classes = 'ten ';
								} else {
									classes = 'ten ';
								}

								classes += 'wide column tracks-container';

								return classes;
							})()}
						>
							<Tracks userInfo={this.props.userInfo} gameInfo={this.props.gameInfo} socket={this.props.socket} />
						</div>
						<div
							className={(() => {
								let classes;

								if (this.props.userInfo.gameSettings && this.props.userInfo.gameSettings.enableRightSidebarInGame) {
									classes = 'six ';
								} else {
									classes = 'six ';
								}

								classes += 'wide column chat-container game-chat';

								return classes;
							})()}
						>
							<section className="gamestatus">{this.props.gameInfo.general && this.props.gameInfo.general.status}</section>
							<Gamechat
								userList={this.props.userList}
								gameInfo={this.props.gameInfo}
								userInfo={this.props.userInfo}
								onLeaveGame={this.props.onLeaveGame}
								onNewGameChat={this.props.onNewGameChat}
								socket={this.props.socket}
							/>
						</div>
					</div>
				</div>
				{(() => {
					const { userInfo, gameInfo } = this.props,
						balloons = Math.random() < 0.1;

					if (
						userInfo.userName &&
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

						if (this.props.userInfo.gameSettings && this.props.userInfo.gameSettings.disableRightSidebarInGame) {
							classes += ' disabledrightsidebar';
						}

						return classes;
					})()}
				>
					<Players
						onClickedTakeSeat={this.props.onClickedTakeSeat}
						userList={this.props.userList}
						userInfo={this.props.userInfo}
						gameInfo={this.props.gameInfo}
						socket={this.props.socket}
					/>
				</div>
			</section>
		);
	}
}

Game.propTypes = {
	onUserNightActionEventSubmit: PropTypes.func,
	onUpdateTruncateGameSubmit: PropTypes.func,
	onUpdateSelectedForEliminationSubmit: PropTypes.func,
	onUpdateReportGame: PropTypes.func,
	onNewGameChat: PropTypes.func,
	onSeatingUser: PropTypes.func,
	onLeaveGame: PropTypes.func,
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
