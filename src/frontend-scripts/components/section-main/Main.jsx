import React from 'react';
import { Redirect, withRouter, Switch, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Scrollbars } from 'react-custom-scrollbars';

import Creategame from './Creategame.jsx';
import Settings from './Settings.jsx';
import Game from './Game.jsx';
import Profile from './Profile.jsx';
import Replay from './replay/Replay.jsx';
import Changelog from './Changelog.jsx';
import Moderation from './Moderation.jsx';
import Reports from './Reports.jsx';
import Leaderboards from './Leaderboards.jsx';
import GamesList from './GamesList.jsx';

export class Main extends React.Component {
	state = {
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

	componentDidMount() {
		const { Notification } = window;

		if ('Notification' in window && Notification.permission === 'default') {
			Notification.requestPermission(permission => {
				if (permission === 'granted') {
					new Notification('Players may now "ping" you.');
				}
			});
		}
	}

	static getDerivedStateFromProps(props) {
		return props.userInfo.gameSettings ? { gameFilter: props.userInfo.gameSettings.gameFilters } : null;
	}

	render() {
		let classes = 'section-main';

		const { userList, userInfo, socket, gameInfo, allEmotes, gameList } = this.props;
		const isGame = Boolean(Object.keys(gameInfo).length);
		const changeGameFilter = gameFilter => {
			this.setState(gameFilter);

			if (userInfo.gameSettings) {
				socket.emit('updateGameSettings', {
					gameFilters: gameFilter
				});
			}
		};
		const RenderMidSection = () => {
			return (
				<Switch>
					<Route
						exact
						path="/game/creategame"
						render={() => (userInfo.userName ? <Creategame userList={userList} socket={socket} userInfo={userInfo} /> : <Redirect to="/observe" />)}
					/>
					<Route
						exact
						path="/game/settings"
						render={() => (userInfo.userName ? <Settings socket={socket} userInfo={userInfo} /> : <Redirect to="/observe" />)}
					/>
					<Route exact path="/game/changelog" component={Changelog} />
					<Route exact path="/game/moderation" render={() => <Moderation userInfo={userInfo} socket={socket} userList={userList} />} />
					<Route exact path="/game/profile/:id" render={() => <Profile userInfo={userInfo} socket={socket} userList={userList} />} />
					<Route exact path="/game/replay/:id" render={() => <Replay allEmotes={allEmotes} />} />
					<Route exact path="/game/reports/" render={() => <Reports socket={socket} userInfo={userInfo} />} />
					<Route exact path="/game/leaderboards" component={Leaderboards} />
					<Route
						exact
						path="/game/table/:id"
						render={() => (
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
						)}
					/>
					<Route
						path="/game"
						render={() => (
							<GamesList
								userList={userList}
								userInfo={userInfo}
								gameList={gameList}
								socket={socket}
								changeGameFilter={changeGameFilter}
								gameFilter={this.state.gameFilter}
							/>
						)}
					/>
				</Switch>
			);
		};

		if (isGame) {
			classes += ' game';
		}

		return (
			<section className={classes}>
				{isGame ? (
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
	userInfo: PropTypes.object,
	gameInfo: PropTypes.object,
	socket: PropTypes.object,
	userList: PropTypes.object,
	gameList: PropTypes.array,
	allEmotes: PropTypes.array
};

export default withRouter(Main);
