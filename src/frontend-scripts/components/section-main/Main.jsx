import React from 'react'; // eslint-disable-line
import Creategame from './Creategame.jsx';
import Settings from './Settings.jsx';
import Game from './Game.jsx';
import Profile from './Profile.jsx';
import Replay from './replay/Replay.jsx';
import Changelog from './Changelog.jsx';
import Moderation from './Moderation.jsx';
import Reports from './Reports.jsx';
import Leaderboards from './Leaderboards.jsx';
import PropTypes from 'prop-types';
import GamesList from './GamesList.jsx';
import { Scrollbars } from 'react-custom-scrollbars';

export class Main extends React.Component {
	constructor() {
		super();

		this.state = {
			gameFilter: {
				priv: false,
				pub: false,
				unstarted: false,
				inprogress: false,
				completed: false,
				timedMode: false,
				rainbow: false,
				standard: false,
				customgame: false,
				casualgame: false
			}
		};
	}

	componentDidMount() {
		const { userInfo } = this.props;
		const { Notification } = window;

		if ('Notification' in window && Notification.permission === 'default') {
			Notification.requestPermission(permission => {
				if (permission === 'granted') {
					new Notification('Players may now "ping" you.');
				}
			});
		}

		if (userInfo.hasNotDismissedSignupModal) {
		}
	}

	static getDerivedStateFromProps(props) {
		return props.userInfo.gameSettings ? { gameFilter: props.userInfo.gameSettings.gameFilters } : null;
	}

	render() {
		let classes = 'section-main';

		const { midSection, userList, userInfo, socket, gameInfo } = this.props;
		const changeGameFilter = gameFilter => {
			this.setState(gameFilter);

			if (userInfo.gameSettings) {
				socket.emit('updateGameSettings', {
					gameFilters: gameFilter
				});
			}
		};
		const RenderMidSection = () => {
			switch (midSection) {
				case 'createGame':
					return <Creategame userList={userList} userInfo={userInfo} socket={socket} />;
				case 'changelog':
					return <Changelog />;
				case 'game':
					if (Object.keys(gameInfo).length) {
						return (
							<Game
								onClickedTakeSeat={this.props.onClickedTakeSeat}
								onSeatingUser={this.props.onSeatingUser}
								onLeaveGame={this.props.onLeaveGame}
								userInfo={userInfo}
								gameInfo={gameInfo}
								userList={userList}
								socket={socket}
								allEmotes={this.props.allEmotes}
							/>
						);
					}
					break;
				case 'moderation':
					return <Moderation userInfo={userInfo} socket={socket} userList={userList} />;
				case 'settings':
					return <Settings userInfo={userInfo} socket={socket} />;
				case 'profile':
					return <Profile userInfo={userInfo} socket={socket} userList={userList} />;
				case 'replay':
					return <Replay allEmotes={this.props.allEmotes} />;
				case 'reports':
					return <Reports socket={socket} userInfo={userInfo} />;
				case 'leaderboards':
					return <Leaderboards />;
				default:
					return (
						<GamesList
							userList={userList}
							userInfo={userInfo}
							midSection={midSection}
							gameList={this.props.gameList}
							socket={socket}
							changeGameFilter={changeGameFilter}
							gameFilter={this.state.gameFilter}
						/>
					);
			}
		};

		if (midSection === 'game' || midSection === 'replay') {
			classes += ' game';
		}

		return (
			<section className={classes}>
				{midSection === 'game' || midSection === 'replay' ? (
					RenderMidSection()
				) : (
					<Scrollbars className="scrollbar-container-main" renderThumbVertical={props => <div {...props} className="thumb-vertical" />}>
						<div className="section-main-content-container">{RenderMidSection()}</div>
					</Scrollbars>
				)}
			</section>
		);
	}
}

Main.propTypes = {
	midSection: PropTypes.string,
	userInfo: PropTypes.object,
	gameInfo: PropTypes.object,
	socket: PropTypes.object,
	userList: PropTypes.object,
	gameList: PropTypes.array,
	allEmotes: PropTypes.array
};

export default Main;
