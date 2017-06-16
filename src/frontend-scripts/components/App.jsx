import sock from 'socket.io-client';
import React from 'react';
import {connect} from 'react-redux';
import LeftSidebar from './section-left/LeftSidebar.jsx';
import Main from './section-main/Main.jsx';
import RightSidebar from './section-right/RightSidebar.jsx';
import {updateUser, updateMidsection, updateGameList, updateGameInfo, updateUserList, updateGeneralChats, updateVersion} from '../actions/actions.js';

const socket = sock({
		reconnection: false
	}),
	select = state => state;

export class App extends React.Component {
	componentDidMount() {
		const {dispatch} = this.props,
			{classList} = document.getElementById('game-container');

		if (classList.length) {
			const username = classList[0].split('username-')[1],
				info = {userName: username};

			socket.emit('getUserGameSettings', username);

			// ** begin devhelpers **
			const devPlayers = ['Jaina', 'Rexxar', 'Malfurian', 'Thrall', 'Valeera', 'Anduin', 'aaa', 'bbb'];
			if (devPlayers.includes(username)) {
				const data = {
					uid: 'devgame',
					userName: username
				};

				// info.isSeated = true;
				socket.emit('updateSeatedUser', data);
				socket.emit('getGameInfo', 'devgame');
			}
			// ** end devhelpers **
			dispatch(updateUser(info));
		}

		socket.on('manualDisconnection', () => {
			window.location.pathname = '/observe';
		});

		socket.on('manualReload', () => {
			window.location.reload();
		});

		socket.on('gameSettings', settings => {
			const {userInfo} = this.props;

			userInfo.gameSettings = settings;
			dispatch(updateUser(userInfo));
		});

		socket.on('gameList', list => {
			dispatch(updateGameList(list));
		});

		socket.on('version', v => {
			dispatch(updateVersion(v));
		});

		socket.on('gameUpdate', (game, isSettings) => {
			if (this.props.midSection !== 'game' && Object.keys(game).length) {
				dispatch(updateGameInfo(game));
				dispatch(updateMidsection('game'));
			} else if (!Object.keys(game).length) {
				if (isSettings) {
					dispatch(updateMidsection('settings'));
				} else {
					dispatch(updateMidsection('default'));
				}
				dispatch(updateGameInfo(game));
			} else {
				dispatch(updateGameInfo(game));
			}
		});

		socket.on('userList', list => {
			dispatch(updateUserList(list));
		});

		socket.on('updateSeatForUser', () => {
			const {userInfo} = this.props;

			userInfo.isSeated = true;
			dispatch(updateUser(userInfo));
		});

		socket.on('generalChats', chats => {
			dispatch(updateGeneralChats(chats));
		});
	}

	handleRoute = route => {
		const {dispatch} = this.props;

		dispatch(updateMidsection(route));
	}

	handleCreateGameSubmit = game => {
		const {dispatch, userInfo} = this.props;

		userInfo.isSeated = true;
		dispatch(updateUser(userInfo));
		dispatch(updateMidsection('game'));
		dispatch(updateGameInfo(game));
		socket.emit('addNewGame', game);
	}

	// ***** begin dev helpers *****

	makeQuickDefault = () => {
		const {dispatch, userInfo} = this.props,
			game = {
				gameState: {
					previousElectedGovernment: [],
					undrawnPolicyCount: 17,
					discardedPolicyCount: 0,
					presidentIndex: -1
				},
				chats: [],
				general: {
					uid: 'devgame',
					name: 'New Game',
					minPlayersCount: 5,
					maxPlayersCount: 5,
					private: false,
					rainbowgame: true,
					experiencedMode: true,
					disableChat: false,
					disableGamechat: false,
					status: 'Waiting for more players..',
					electionCount: 0
				},
				publicPlayersState: [{
					userName: userInfo.userName,
					connected: true,
					isDead: false,
					cardStatus: {
						cardDisplayed: false,
						isFlipped: false,
						cardFront: 'secretrole',
						cardBack: {}
					}
				}],
				playersState: [],
				cardFlingerState: [],
				trackState: {
					liberalPolicyCount: 0,
					fascistPolicyCount: 0,
					electionTrackerCount: 0,
					enactedPolicies: []
				}
			};

		userInfo.isSeated = true;
		dispatch(updateUser(userInfo));
		dispatch(updateMidsection('game'));
		dispatch(updateGameInfo(game));
		socket.emit('addNewGame', game);
	}

	// ***** end dev helpers *****

	handleSeatingUser = password => {
		const {gameInfo, userInfo} = this.props,
			data = {
				uid: gameInfo.general.uid,
				userName: userInfo.userName,
				password
			};

		socket.emit('updateSeatedUser', data);
	}

	handleLeaveGame = (isSeated, isSettings = false, badKarma) => {
		const {dispatch, userInfo, gameInfo} = this.props;

		if (userInfo.isSeated) {
			userInfo.isSeated = false;
			dispatch(updateUser(userInfo));
		}

		socket.emit('leaveGame', {
			userName: userInfo.userName,
			isSeated,
			isSettings,
			uid: gameInfo.general.uid,
			badKarma
		});
	}

	render() {
		return (
			<section className="ui grid">
				{(() => {
					if (this.props.midSection !== 'game') {
						return (
							<LeftSidebar
								userInfo={this.props.userInfo}
								midSection={this.props.midSection}
								gameList={this.props.gameList}
								onCreateGameButtonClick={this.handleRoute}
								onGameClick={this.handleGameClick}
								socket={socket}
							/>
						);
					}
				})()}
				<Main
					userInfo={this.props.userInfo}
					midSection={this.props.midSection}
					onCreateGameSubmit={this.handleCreateGameSubmit}
					onLeaveCreateGame={this.handleRoute}
					gameInfo={this.props.gameInfo}
					onLeaveSettings={this.handleRoute}
					onSeatingUser={this.handleSeatingUser}
					onLeaveGame={this.handleLeaveGame}
					quickDefault={this.makeQuickDefault}
					onLeaveChangelog={this.handleRoute}
					onSettingsButtonClick={this.handleRoute}
					onChangelogButtonClick={this.handleRoute}
					onLeaveModeration={this.handleRoute}
					onClickedTakeSeat={this.handleSeatingUser}
					userList={this.props.userList}
					socket={socket}
					version={this.props.version}
				/>
				{(() => {
					if ((this.props.midSection === 'game' && this.props.userInfo.gameSettings && this.props.userInfo.gameSettings.enableRightSidebarInGame) || this.props.midSection !== 'game') {
						return (
							<RightSidebar
								gameInfo={this.props.gameInfo}
								userInfo={this.props.userInfo}
								userList={this.props.userList}
								generalChats={this.props.generalChats}
								onModerationButtonClick={this.handleRoute}
								socket={socket}
							/>
						);
					}
				})()}
			</section>
		);
	}
}

App.propTypes = {
	dispatch: React.PropTypes.func,
	userInfo: React.PropTypes.object,
	midSection: React.PropTypes.string,
	gameInfo: React.PropTypes.object,
	gameList: React.PropTypes.array,
	generalChats: React.PropTypes.array,
	userList: React.PropTypes.object
};

export default connect(select)(App);
