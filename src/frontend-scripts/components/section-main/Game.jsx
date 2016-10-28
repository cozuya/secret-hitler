import React from 'react';
import Tracks from './Tracks.jsx';
import Gamechat from './Gamechat.jsx';
import Players from './Players.jsx';

export default class Game extends React.Component {
	render() {
		return (
			<section className="game">
				<div className="ui grid">
					<div className="row">
						<div
							className={
								(() => {
									let classes;

									if (this.props.userInfo.gameSettings && !this.props.userInfo.gameSettings.enableRightSidebarInGame) {
										classes = 'ten ';
									} else {
										classes = 'ten ';
									}

									classes += 'wide column tracks-container';

									return classes;
								})()
					}>
							<Tracks
								userInfo={this.props.userInfo}
								gameInfo={this.props.gameInfo}
								socket={this.props.socket}
							/>
						</div>
						<div
							className={
							(() => {
								let classes;

								if (this.props.userInfo.gameSettings && this.props.userInfo.gameSettings.enableRightSidebarInGame) {
									classes = 'six ';
								} else {
									classes = 'six ';
								}

								classes += 'wide column chat-container game-chat';

								return classes;
							})()
					}>
							<section className="gamestatus">
								{this.props.gameInfo.general.status}
							</section>
							<Gamechat
								gameInfo={this.props.gameInfo}
								userInfo={this.props.userInfo}
								onLeaveGame={this.props.onLeaveGame}
								onNewGameChat={this.props.onNewGameChat}
								socket={this.props.socket}
							/>
						</div>
					</div>
				</div>
				<div
					className={
						(() => {
							let classes = 'row players-container';

							if (this.props.userInfo.gameSettings && this.props.userInfo.gameSettings.disableRightSidebarInGame) {
								classes += ' disabledrightsidebar';
							}

							return classes;
						})()
			}>
					<Players
						onClickedTakeSeat={this.props.onClickedTakeSeat}
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
	onUserNightActionEventSubmit: React.PropTypes.func,
	onUpdateTruncateGameSubmit: React.PropTypes.func,
	onUpdateSelectedForEliminationSubmit: React.PropTypes.func,
	onUpdateReportGame: React.PropTypes.func,
	onNewGameChat: React.PropTypes.func,
	onSeatingUser: React.PropTypes.func,
	onLeaveGame: React.PropTypes.func,
	userInfo: React.PropTypes.object,
	gameInfo: React.PropTypes.object,
	socket: React.PropTypes.object,
	gameRoleInfo: React.PropTypes.object,
	clickedPlayerInfo: React.PropTypes.object,
	clickedGamerole: React.PropTypes.object,
	clickedPlayer: React.PropTypes.object,
	expandoInfo: React.PropTypes.string,
	dispatch: React.PropTypes.func
};