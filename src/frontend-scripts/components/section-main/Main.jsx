import React from 'react'; // eslint-disable-line
import Menu from '../menu/Menu.jsx';
import Defaultmid from './Defaultmid.jsx';
import Creategame from './Creategame.jsx';
import Settings from './Settings.jsx';
import Game from './Game.jsx';
import Profile from './Profile.jsx';
import Replay from './replay/Replay.jsx';
import Changelog from './Changelog.jsx';
import Moderation from './Moderation.jsx';
import Reports from './Reports.jsx';
import PropTypes from 'prop-types';

const Main = props =>
	<section
		className={(() => {
			let classes = '';

			if (props.midSection === 'game' || props.midSection === 'replay') {
				if (props.gameInfo.general && props.gameInfo.general.experiencedMode) {
					classes = 'experienced ';
				}

				if (props.userInfo.gameSettings && props.userInfo.gameSettings.enableRightSidebarInGame) {
					classes += 'thirteen';
				} else {
					classes += 'sixteen';
				}
			} else if (props.midSection === 'replay') {
				classes += 'sixteen';
			} else {
				classes = 'ten';
			}

			classes += ' wide column section-main'; // yes semantic requires classes in specific order... ascii shrug

			if (props.midSection === 'game' || props.midSection === 'replay') {
				classes += ' ingame';
			}
			return classes;
		})()}
	>
		<Menu userInfo={props.userInfo} onLeaveGame={props.onLeaveGame} onSettingsButtonClick={props.onSettingsButtonClick} gameInfo={props.gameInfo} />
		{(() => {
			switch (props.midSection) {
				case 'createGame':
					return (
						<Creategame
							userList={props.userList}
							userInfo={props.userInfo}
							onCreateGameSubmit={props.onCreateGameSubmit}
							onLeaveCreateGame={props.onLeaveCreateGame}
						/>
					);
				case 'changelog':
					return <Changelog onLeaveChangelog={props.onLeaveChangelog} version={props.version} />;
				case 'game':
					return (
						<Game
							onUserNightActionEventSubmit={props.onUserNightActionEventSubmit}
							onUpdateTruncateGameSubmit={props.onUpdateTruncateGameSubmit}
							onUpdateSelectedForEliminationSubmit={props.onUpdateSelectedForEliminationSubmit}
							onUpdateReportGame={props.onUpdateReportGame}
							onClickedTakeSeat={props.onClickedTakeSeat}
							onNewGameChat={props.onNewGameChat}
							onSeatingUser={props.onSeatingUser}
							onLeaveGame={props.onLeaveGame}
							userInfo={props.userInfo}
							gameInfo={props.gameInfo}
							userList={props.userList}
							socket={props.socket}
						/>
					);
				case 'moderation':
					return <Moderation userInfo={props.userInfo} socket={props.socket} userList={props.userList} onLeaveModeration={props.onLeaveModeration} />;
				case 'settings':
					return <Settings onLeaveSettings={props.onLeaveSettings} userInfo={props.userInfo} socket={props.socket} />;
				case 'profile':
					return <Profile />;
				case 'replay':
					return <Replay />;
				case 'reports':
					return <Reports socket={props.socket} userInfo={props.userInfo} onLeaveReports={props.onLeaveReports} />;
				default:
					return <Defaultmid quickDefault={props.quickDefault} />;
			}
		})()}
	</section>;

Main.propTypes = {
	midSection: PropTypes.string,
	userInfo: PropTypes.object,
	gameInfo: PropTypes.object,
	socket: PropTypes.object,
	userList: PropTypes.object
};

export default Main;
