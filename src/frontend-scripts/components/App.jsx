import sock from 'socket.io-client';
import React from 'react';
import {observer} from 'mobx-react';
import LeftSidebar from './section-left/LeftSidebar.jsx';
import Main from './section-main/Main.jsx';
import RightSidebar from './section-right/RightSidebar.jsx';

const socket = sock({
	reconnection: false
});

class App extends React.Component {
	constructor() {
		super();

		this.handleRoute = this.handleRoute.bind(this);
		// this.handleCreateGameSubmit = this.handleCreateGameSubmit.bind(this);
		// this.handleSeatingUser = this.handleSeatingUser.bind(this);
		// this.handleLeaveGame = this.handleLeaveGame.bind(this);
		// this.makeQuickDefault = this.makeQuickDefault.bind(this);
	}

	componentDidUpdate() {
		console.log('Hello World!');
		// console.log(this.props.userInfo.user.userName);
	}

	componentDidMount() {
		const {classList} = document.getElementById('game-container');

		if (classList.length) {
			const userName = classList[0].split('username-')[1];

			this.props.userInfo.updateUserName(userName);
			socket.emit('getUserGameSettings', userName);
		}

		socket.on('manualDisconnection', () => {
			window.location.pathname = '/observe';
		});

		socket.on('manualReload', () => {
			window.location.reload();
		});

		socket.on('gameSettings', settings => {
			this.props.userInfo.updateUserGameSettings(settings);
		});

		socket.on('gameList', list => {
			this.props.gameList.updateGameList(list);
		});

		socket.on('gameUpdate', (game, isSettings) => {
			const {midSection, gameInfo} = this.props,
				{updateGameInfo} = gameInfo,
				{updateMidsection} = midSection;

			if (midSection.section !== 'game' && Object.keys(game).length) {
				updateGameInfo(game);
				updateMidsection('game');
			} else if (!Object.keys(game).length) {
				if (isSettings) {
					updateMidsection('settings');
				} else {
					updateMidsection('default');
				}
				updateGameInfo(game);
			} else {
				updateGameInfo(game);
			}
		});

		socket.on('userList', list => {
			this.props.userList.updateUserList(list);
		});

		socket.on('generalChats', chats => {
			this.props.generalChats.updateGeneralChats(chats);
		});
	}

	handleRoute(route) {
		this.props.midSection.updateMidsection(route);
	}

	// handleCreateGameSubmit(game) {
		// const {dispatch, userInfo} = this.props;

		// userInfo.seatNumber = '0';
		// dispatch(updateGameInfo(game));
		// dispatch(updateMidsection('game'));
		// dispatch(updateUser(userInfo));
		// socket.emit('addNewGame', game);
	// }

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
		const {userInfo} = this.props,
			game = {
			};

		userInfo.seatNumber = '0';
		// dispatch(updateGameInfo(game));
		// dispatch(updateMidsection('game'));
		// dispatch(updateUser(userInfo));
		socket.emit('addNewGame', game);
	}

	// ***** end dev helpers *****

	handleSeatingUser(seatNumber) {
		const {gameInfo, userInfo} = this.props,
			data = {
				uid: gameInfo.uid,
				seatNumber,
				userName: userInfo.userName
			};

		userInfo.seatNumber = seatNumber;
		socket.emit('updateSeatedUser', data);
		// dispatch(updateUser(userInfo));
	}

	handleLeaveGame(seatNumber, isSettings = false) {
		const {userInfo} = this.props;

		if (userInfo.seatNumber) {
			userInfo.seatNumber = '';
			// dispatch(updateUser(userInfo));
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
					if (this.props.midSection.section !== 'game') {
						return (
							<LeftSidebar
								userInfo={this.props.userInfo}
								midSection={this.props.midSection}
								gameList={this.props.gameList}
								// onCreateGameButtonClick={this.handleRoute}
								socket={socket}
							/>
						);
					}
				})()}
				<Main
					midSection={this.props.midSection}
					userInfo={this.props.userInfo}
					gameInfo={this.props.gameInfo}
					// onCreateGameSubmit={this.handleCreateGameSubmit}
					// onLeaveCreateGame={this.handleRoute}
					// onLeaveSettings={this.handleRoute}
					// onSeatingUser={this.handleSeatingUser}
					// onLeaveGame={this.handleLeaveGame}
					// quickDefault={this.makeQuickDefault}
					// onSettingsButtonClick={this.handleRoute}
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

export default observer(App);

App.propTypes = {
	userInfo: React.PropTypes.object,
	midSection: React.PropTypes.object,
	gameInfo: React.PropTypes.object,
	gameList: React.PropTypes.object,
	generalChats: React.PropTypes.object,
	userList: React.PropTypes.object
};