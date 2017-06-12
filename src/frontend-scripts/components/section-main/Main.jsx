import React from 'react';
import Menu from '../menu/Menu.jsx';
import Defaultmid from './Defaultmid.jsx';
import Creategame from './Creategame.jsx';
import Settings from './Settings.jsx';
import Game from './Game.jsx';
import Profile from './Profile.jsx';
import Replay from './replay/Replay.jsx';
import Changelog from './Changelog.jsx';
import Moderation from './Moderation.jsx';

export default class Main extends React.Component {
	render() {
		return (
			<section
				className={
					(() => {
						let classes = '';

						if (this.props.midSection === 'game' || this.props.midSection === 'replay') {
							if (this.props.gameInfo.general && this.props.gameInfo.general.experiencedMode) {
								classes = 'experienced ';
							}

							if (this.props.userInfo.gameSettings && this.props.userInfo.gameSettings.enableRightSidebarInGame) {
								classes += 'thirteen';
							} else {
								classes += 'sixteen';
							}
						} else if (this.props.midSection === 'replay') {
							classes += 'sixteen';
						} else {
							classes = 'ten';
						}

						classes += ' wide column section-main';  // yes semantic requires classes in specific order... ascii shrug
						return classes;
					})()
				}
			>
				<Menu
					userInfo={this.props.userInfo}
					onLeaveGame={this.props.onLeaveGame}
					onSettingsButtonClick={this.props.onSettingsButtonClick}
					gameInfo={this.props.gameInfo}
				/>
				{(() => {
					switch (this.props.midSection) {
					case 'createGame':
						return (
							<Creategame
								userList={this.props.userList}
								userInfo={this.props.userInfo}
								onCreateGameSubmit={this.props.onCreateGameSubmit}
								onLeaveCreateGame={this.props.onLeaveCreateGame}
							/>
						);
					case 'changelog':
						return (
							<Changelog
								onLeaveChangelog={this.props.onLeaveChangelog}
								version={this.props.version}
							/>
						);
					case 'game':
						return (
							<Game
								onUserNightActionEventSubmit={this.props.onUserNightActionEventSubmit}
								onUpdateTruncateGameSubmit={this.props.onUpdateTruncateGameSubmit}
								onUpdateSelectedForEliminationSubmit={this.props.onUpdateSelectedForEliminationSubmit}
								onUpdateReportGame={this.props.onUpdateReportGame}
								onClickedTakeSeat={this.props.onClickedTakeSeat}
								onNewGameChat={this.props.onNewGameChat}
								onSeatingUser={this.props.onSeatingUser}
								onLeaveGame={this.props.onLeaveGame}
								userInfo={this.props.userInfo}
								gameInfo={this.props.gameInfo}
								userList={this.props.userList}
								socket={this.props.socket}
							/>
						);
					case 'moderation':
						return (
							<Moderation
								userInfo={this.props.userInfo}
								socket={this.props.socket}
								userList={this.props.userList}
								onLeaveModeration={this.props.onLeaveModeration}
							/>
						);
					case 'settings':
						return (
							<Settings
								onLeaveSettings={this.props.onLeaveSettings}
								userInfo={this.props.userInfo}
								socket={this.props.socket}
							/>
						);
					case 'profile':
						return <Profile />;
					case 'replay':
						return <Replay />;
					default:
						return (
							<Defaultmid quickDefault={this.props.quickDefault} />
						);
					}
				})()}
			</section>
		);
	}
}

Main.propTypes = {
	midSection: React.PropTypes.string,
	userInfo: React.PropTypes.object,
	gameInfo: React.PropTypes.object,
	socket: React.PropTypes.object,
	userList: React.PropTypes.object
};