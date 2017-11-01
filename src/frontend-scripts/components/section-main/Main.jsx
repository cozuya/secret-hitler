import React from 'react'; // eslint-disable-line
import Creategame from './Creategame.jsx';
import Settings from './Settings.jsx';
import Game from './Game.jsx';
import Profile from './Profile.jsx';
import Replay from './replay/Replay.jsx';
import Changelog from './Changelog.jsx';
import Moderation from './Moderation.jsx';
import Reports from './Reports.jsx';
import PropTypes from 'prop-types';
import GamesList from './GamesList.jsx';
import PerfectScrollbar from 'react-perfect-scrollbar';

const RenderMidSection = props => {
	switch (props.midSection) {
		case 'createGame':
			return <Creategame userList={props.userList} userInfo={props.userInfo} socket={props.socket} />;
		case 'changelog':
			return <Changelog onLeaveChangelog={props.onLeaveChangelog} version={props.version} />;
		case 'game':
			if (Object.keys(props.gameInfo).length) {
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
			}
			break;
		case 'moderation':
			return <Moderation userInfo={props.userInfo} socket={props.socket} userList={props.userList} onLeaveModeration={props.onLeaveModeration} />;
		case 'settings':
			return <Settings onLeaveSettings={props.onLeaveSettings} userInfo={props.userInfo} socket={props.socket} />;
		case 'profile':
			return <Profile userInfo={props.userInfo} socket={props.socket} />;
		case 'replay':
			return <Replay />;
		case 'reports':
			return <Reports socket={props.socket} userInfo={props.userInfo} onLeaveReports={props.onLeaveReports} />;
		default:
			return (
				<GamesList
					userList={props.userList}
					userInfo={props.userInfo}
					midSection={props.midSection}
					gameList={props.gameList}
					onCreateGameButtonClick={props.handleRoute}
					onGameClick={props.handleGameClick}
					socket={props.socket}
				/>
			);
	}
};

const Main = props => {
	let classes = 'section-main';
	if (props.midSection === 'game' || props.midSection === 'replay') {
		classes += ' game';
	}

	return (
		<section className={classes}>
			{(() => {
				if (props.midSection === 'game') {
					return RenderMidSection(props);
				} else {
					return (
						<PerfectScrollbar className="scrollbar-container-main" option={{ suppressScrollX: true }}>
							<div className="section-main-content-container">{RenderMidSection(props)}</div>
						</PerfectScrollbar>
					);
				}
			})()}
		</section>
	);
};

Main.propTypes = {
	midSection: PropTypes.string,
	userInfo: PropTypes.object,
	gameInfo: PropTypes.object,
	socket: PropTypes.object,
	userList: PropTypes.object,
	gameList: PropTypes.array
};

export default Main;
