import React from 'react';
import {connect} from 'react-redux';
import Table from './Table.jsx';
import Gamechat from './Gamechat.jsx';
import Gameroles from './Gameroles.jsx';
import {updateExpandoInfo, updateClickedGamerole, updateClickedPlayer} from '../../actions/actions.js';

class Game extends React.Component {
	constructor() {
		super();

		this.selectedPlayer = this.selectedPlayer.bind(this);
		this.roleState = this.roleState.bind(this);
		this.selectedGamerole = this.selectedGamerole.bind(this);
	}

	roleState(state) {
		this.props.dispatch(updateExpandoInfo(state));
	}

	selectedGamerole(state) {
		this.props.dispatch(updateClickedGamerole(state));
	}

	selectedPlayer(state) {
		this.props.dispatch(updateClickedPlayer(state));
	}

	render() {
		return (
			<section className="game">
				<div className="ui grid">
					<div className="row">
						<div
							className={
								(() => {
									let classes;

									if (this.props.userInfo.gameSettings && this.props.userInfo.gameSettings.disableRightSidebarInGame) {
										classes = 'eight ';
									} else {
										classes = 'ten ';
									}

									classes += 'wide column table-container';

									return classes;
								})()
					}>
							<Table
								onUserNightActionEventSubmit={this.props.onUserNightActionEventSubmit}
								onUpdateTruncateGameSubmit={this.props.onUpdateTruncateGameSubmit}
								onUpdateSelectedForEliminationSubmit={this.props.onUpdateSelectedForEliminationSubmit}
								onUpdateReportGame={this.props.onUpdateReportGame}
								onSeatingUser={this.props.onSeatingUser}
								onLeaveGame={this.props.onLeaveGame}
								selectedPlayer={this.selectedPlayer}
								gameInfo={this.props.gameInfo}
								userInfo={this.props.userInfo}
								socket={this.props.socket}
							/>
						</div>
						<div
							className={
							(() => {
								let classes;

								if (this.props.userInfo.gameSettings && this.props.userInfo.gameSettings.disableRightSidebarInGame) {
									classes = 'eight ';
								} else {
									classes = 'six ';
								}

								classes += 'wide column chat-container game-chat';

								return classes;
							})()
					}>
							<section className="gamestatus">
								{this.props.gameInfo.status}
							</section>
							<Gamechat
								gameInfo={this.props.gameInfo}
								userInfo={this.props.userInfo}
								onNewGameChat={this.props.onNewGameChat}
								clickedGameRole={this.props.gameRoleInfo}
								clickedPlayer={this.props.clickedPlayerInfo}
								roleState={this.roleState}
								selectedGamerole={this.props.clickedGamerole}
								selectedPlayer={this.props.clickedPlayer}
								socket={this.props.socket}
							/>
						</div>
					</div>
				</div>
				<div
					className={
						(() => {
							let classes = 'row gameroles-container';

							if (this.props.userInfo.gameSettings && this.props.userInfo.gameSettings.disableRightSidebarInGame) {
								classes += ' disabledrightsidebar';
							}

							return classes;
						})()
			}>
					<Gameroles
						userInfo={this.props.userInfo}
						roles={this.props.gameInfo.roles}
						roleState={this.props.expandoInfo}
						selectedGamerole={this.selectedGamerole}
						gameInfo={this.props.gameInfo}
					/>
				</div>
			</section>
		);
	}
}

const select = state => state;

export default connect(select)(Game);

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