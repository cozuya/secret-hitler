import sock from 'socket.io-client';
import React from 'react';
import {connect} from 'react-redux';
import LeftSidebar from './section-left/LeftSidebar.jsx';
import Main from './section-main/Main.jsx';
import RightSidebar from './section-right/RightSidebar.jsx';
import {updateUser, updateMidsection, updateGameList, updateGameInfo, updateUserList, updateGeneralChats} from '../actions/actions.js';

const socket = sock({
		reconnection: false
	}),
	select = state => state;

export class App extends React.Component {
	constructor() {
		super();
		this.handleRoute = this.handleRoute.bind(this);
		this.handleCreateGameSubmit = this.handleCreateGameSubmit.bind(this);
		this.handleRoute = this.handleRoute.bind(this);
		this.handleSeatingUser = this.handleSeatingUser.bind(this);
		this.handleLeaveGame = this.handleLeaveGame.bind(this);
		this.makeQuickDefault = this.makeQuickDefault.bind(this);
	}

	componentWillMount() {
		const {dispatch} = this.props,
			{classList} = document.getElementById('game-container');

		if (classList.length) {
			const username = classList[0].split('username-')[1];

			dispatch(updateUser({userName: username}));
			socket.emit('getUserGameSettings', username);
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

		socket.on('updateSeatForUser', seatNumber => {
			const {userInfo} = this.props;

			userInfo.seatNumber = seatNumber;
			dispatch(updateUser(userInfo));
		});

		socket.on('generalChats', chats => {
			dispatch(updateGeneralChats(chats));
		});
	}

	handleRoute(route) {
		const {dispatch} = this.props;

		dispatch(updateMidsection(route));
	}

	handleCreateGameSubmit(game) {
		const {dispatch, userInfo} = this.props;

		userInfo.seatNumber = '0';
		dispatch(updateGameInfo(game));
		dispatch(updateMidsection('game'));
		dispatch(updateUser(userInfo));
		socket.emit('addNewGame', game);
	}

	// ***** begin dev helpers *****

	// componentDidUpdate(prevProps) {  // note: this breaks everything if these players try to leave a finished game
	// 	const autoPlayers = ['Jaina', 'Rexxar', 'Malfurian', 'Thrall', 'Valeera'],
	// 		{ userInfo, gameInfo, dispatch } = this.props;

	// 	let prevSeatedNames;

	// 		if (Object.keys(prevProps).length && prevProps.gameInfo && prevProps.gameInfo.seated) {
	// 			prevSeatedNames = Object.keys(prevProps.gameInfo.seated).map((seatName) => {
	// 				return prevProps.gameInfo.seated[seatName].userName;
	// 			});
	// 		}

	// 	if (prevSeatedNames && !prevSeatedNames.indexOf(userInfo.userName) !== -1 && autoPlayers.indexOf(userInfo.userName) !== -1 && !Object.keys(gameInfo).length) {
	// 		userInfo.seatNumber = (autoPlayers.indexOf(userInfo.userName) + 1).toString();
	// 		dispatch(updateUser(userInfo));
	// 		socket.emit('updateSeatedUsers', {
	// 			uid: 'devgame',
	// 			seatNumber: userInfo.seatNumber,
	// 			userInfo
	// 		});
	// 	}
	// }

	makeQuickDefault() {
		const {dispatch, userInfo} = this.props,
			game = {};

		userInfo.seatNumber = '0';
		dispatch(updateGameInfo(game));
		dispatch(updateMidsection('game'));
		dispatch(updateUser(userInfo));
		socket.emit('addNewGame', game);
	}

	// ***** end dev helpers *****

	handleSeatingUser(seatNumber) {
		const {gameInfo, dispatch, userInfo} = this.props,
			data = {
				uid: gameInfo.uid,
				seatNumber,
				userName: userInfo.userName
			};

		userInfo.seatNumber = seatNumber;
		socket.emit('updateSeatedUser', data);
		dispatch(updateUser(userInfo));
	}

	handleLeaveGame(seatNumber, isSettings = false) {
		const {dispatch, userInfo} = this.props;

		if (userInfo.seatNumber) {
			userInfo.seatNumber = '';
			dispatch(updateUser(userInfo));
		}

		socket.emit('leaveGame', {
			userName: userInfo.userName,
			seatNumber,
			isSettings,
			uid: this.props.gameInfo.uid
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
					onSettingsButtonClick={this.handleRoute}
					socket={socket}
				/>
				{(() => {
					if ((this.props.midSection === 'game' && this.props.userInfo.gameSettings && !this.props.userInfo.gameSettings.disableRightSidebarInGame) || !this.props.userInfo.userName || this.props.midSection !== 'game') {
						return (
							<RightSidebar
								userInfo={this.props.userInfo}
								userList={this.props.userList}
								generalChats={this.props.generalChats}
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