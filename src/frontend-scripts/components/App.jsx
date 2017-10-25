import React from 'react';
import { connect } from 'react-redux';
import LeftSidebar from './section-left/LeftSidebar.jsx';
import Main from './section-main/Main.jsx';
import RightSidebar from './section-right/RightSidebar.jsx';
import Gamenotes from './Gamenotes.jsx';
import {
	updateUser,
	updateMidsection,
	updateGameList,
	updateGameInfo,
	updateUserList,
	updateGeneralChats,
	updateVersion,
	fetchProfile,
	fetchReplay
} from '../actions/actions.js';
import { MODERATORS, ADMINS, EDITORS } from '../constants';
import socket from '../socket';
import PropTypes from 'prop-types';

const select = state => state;

export class App extends React.Component {
	constructor() {
		super();
		this.handleRoute = this.handleRoute.bind(this);
		this.handleRoute = this.handleRoute.bind(this);
		this.handleSeatingUser = this.handleSeatingUser.bind(this);
		this.handleLeaveGame = this.handleLeaveGame.bind(this);
		this.makeQuickDefault = this.makeQuickDefault.bind(this);
		this.changeNotesValue = this.changeNotesValue.bind(this);

		this.state = {
			notesValue: ''
		};
	}

	compononentDidUpdate() {
		this.router();
	}

	componentDidMount() {
		const { dispatch } = this.props,
			{ classList } = document.getElementById('game-container');

		window.addEventListener('hashchange', this.router.bind(this));
		this.router.call(this);

		if (classList.length) {
			const username = classList[0].split('username-')[1],
				info = { userName: username };

			socket.emit('getUserGameSettings', username);

			// ** begin devhelpers **
			const devPlayers = ['Jaina', 'Rexxar', 'Malfurian', 'Thrall', 'Valeera', 'Anduin', 'aaa', 'bbb']; // eslint-disable-line one-var
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

		socket.on('manualReplayRequest', uid => {
			window.location.hash = uid ? `#/replay/${uid}` : /#/;
		});

		socket.on('manualReload', () => {
			window.location.reload();
		});

		socket.on('gameSettings', settings => {
			const { userInfo } = this.props;

			userInfo.gameSettings = settings;
			dispatch(updateUser(userInfo));
			this.forceUpdate(); // dunno why I need this to make it work I'm bad at this.
		});

		socket.on('gameList', list => {
			dispatch(updateGameList(list));
		});

		socket.on('version', v => {
			dispatch(updateVersion(v));
		});

		socket.on('gameUpdate', (game, isSettings, toReplay = false) => {
			const { hash } = window.location;

			if ((this.props.midSection !== 'game' && Object.keys(game).length) || (Object.keys(game).length && hash !== `#/table/${game.general.uid}`)) {
				dispatch(updateGameInfo(game));
				dispatch(updateMidsection('game'));
				window.location.hash = `#/table/${game.general.uid}`;
			} else if (!Object.keys(game).length) {
				if (isSettings) {
					window.location.hash = '#/settings';
				} else if (!toReplay) {
					window.location.hash = '#/';
				}
			}
			dispatch(updateGameInfo(game));
		});

		socket.on('userList', list => {
			dispatch(updateUserList(list));
		});

		socket.on('updateSeatForUser', () => {
			const { userInfo } = this.props;

			userInfo.isSeated = true;
			dispatch(updateUser(userInfo));
		});

		socket.on('generalChats', chats => {
			dispatch(updateGeneralChats(chats));
		});

		socket.on('reportUpdate', reportStatus => {
			const { userInfo } = this.props;

			userInfo.gameSettings.newReport = reportStatus;
			dispatch(updateUser(userInfo));
		});
	}

	router() {
		const { hash } = window.location,
			{ userInfo, dispatch, gameInfo } = this.props,
			isAuthed = Boolean(document.getElementById('game-container').classList.length);

		if (
			hash.substr(0, 8) !== '#/table/' &&
			gameInfo.gameState &&
			userInfo.userName &&
			gameInfo.publicPlayersState.length &&
			gameInfo.publicPlayersState.find(player => player.userName === userInfo.userName) &&
			(!gameInfo.gameState.isStarted || gameInfo.gameState.isCompleted)
		) {
			this.handleLeaveGame(true);
		}

		if (hash.substr(0, 10) === '#/profile/' && !ADMINS.includes(hash.split('#/profile/')[1])) {
			dispatch(fetchProfile(hash.split('#/profile/')[1]));
		} else if (hash.substr(0, 9) === '#/replay/') {
			dispatch(fetchReplay(hash.split('#/replay/')[1]));
		} else if (hash === '#/changelog') {
			dispatch(updateMidsection('changelog'));
		} else if (
			hash === '#/moderation' &&
			userInfo.userName &&
			(MODERATORS.includes(userInfo.userName) || EDITORS.includes(userInfo.userName) || ADMINS.includes(userInfo.userName))
		) {
			// doesn't work on direct link, would need to adapt is authed as userinfo username isn't defined when this fires.
			dispatch(updateMidsection('moderation'));
		} else if (
			hash === '#/playerreports' &&
			userInfo.userName &&
			(MODERATORS.includes(userInfo.userName) || EDITORS.includes(userInfo.userName) || ADMINS.includes(userInfo.userName))
		) {
			// doesn't work on direct link, would need to adapt is authed as userinfo username isn't defined when this fires.
			dispatch(updateMidsection('reports'));
		} else if (hash === '#/settings' && isAuthed) {
			dispatch(updateMidsection('settings'));
		} else if (hash === '#/creategame' && isAuthed) {
			dispatch(updateMidsection('createGame'));
		} else if (hash.substr(0, 8) === '#/table/') {
			socket.emit('getGameInfo', hash.split('#/table/')[1]);
		} else if (hash !== '#/') {
			window.location.hash = '#/';
		} else {
			dispatch(updateMidsection('default'));
		}
	}

	handleRoute(route) {
		const { dispatch } = this.props;

		dispatch(updateMidsection(route));
	}
	// ***** begin dev helpers *****

	makeQuickDefault() {
		const { userInfo } = this.props,
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
					excludedPlayerCount: [6],
					private: false,
					rainbowgame: true,
					experiencedMode: true,
					disableChat: false,
					disableGamechat: false,
					status: 'Waiting for more players..',
					electionCount: 0
				},
				publicPlayersState: [
					{
						userName: userInfo.userName,
						connected: true,
						isDead: false,
						customCardback: 'png',
						cardStatus: {
							cardDisplayed: false,
							isFlipped: false,
							cardFront: 'secretrole',
							cardBack: {}
						}
					}
				],
				playersState: [],
				cardFlingerState: [],
				trackState: {
					liberalPolicyCount: 0,
					fascistPolicyCount: 0,
					electionTrackerCount: 0,
					enactedPolicies: []
				}
			};

		socket.emit('addNewGame', game);
	}

	// ***** end dev helpers *****

	handleSeatingUser(password) {
		const { gameInfo, userInfo } = this.props,
			data = {
				uid: gameInfo.general.uid,
				userName: userInfo.userName,
				customCardback: userInfo.gameSettings.customCardback,
				customCardbackUid: userInfo.gameSettings.customCardbackUid,
				password
			};

		socket.emit('updateSeatedUser', data);
	}

	handleLeaveGame(isSeated, isSettings = false, badKarma, toReplay) {
		const { dispatch, userInfo, gameInfo } = this.props;

		if (userInfo.isSeated) {
			userInfo.isSeated = false;
			dispatch(updateUser(userInfo));
		}

		socket.emit('leaveGame', {
			userName: userInfo.userName,
			isSeated,
			isSettings,
			uid: gameInfo.general.uid,
			toReplay
		});
	}

	changeNotesValue(value) {
		this.setState({
			notesValue: value
		});
	}

	render() {
		const { gameSettings } = this.props.userInfo;

		return (
			<section
				className="ui grid"
				style={{
					fontFamily: gameSettings
						? gameSettings.fontFamily ? `'${gameSettings.fontFamily}', Lato, sans-serif` : '"Comfortaa", Lato, sans-serif'
						: '"Comfortaa", Lato, sans-serif'
				}}
			>
				{this.props.notesActive && <Gamenotes value={this.state.notesValue} changeNotesValue={this.changeNotesValue} />}
				{this.props.midSection !== 'game' &&
					this.props.midSection !== 'replay' && (
						<LeftSidebar
							userInfo={this.props.userInfo}
							midSection={this.props.midSection}
							gameList={this.props.gameList}
							onCreateGameButtonClick={this.handleRoute}
							onGameClick={this.handleGameClick}
							socket={socket}
						/>
					)}
				<Main
					userInfo={this.props.userInfo}
					midSection={this.props.midSection}
					gameInfo={this.props.gameInfo}
					onLeaveSettings={this.handleRoute}
					onSeatingUser={this.handleSeatingUser}
					onLeaveGame={this.handleLeaveGame}
					quickDefault={this.makeQuickDefault}
					onLeaveChangelog={this.handleRoute}
					onSettingsButtonClick={this.handleRoute}
					onChangelogButtonClick={this.handleRoute}
					onLeaveModeration={this.handleRoute}
					onLeaveReports={this.handleRoute}
					onClickedTakeSeat={this.handleSeatingUser}
					userList={this.props.userList}
					socket={socket}
					version={this.props.version}
				/>
				{((this.props.midSection !== 'game' && this.props.midSection !== 'replay') ||
					(this.props.userInfo.gameSettings && this.props.userInfo.gameSettings.enableRightSidebarInGame)) && (
					<RightSidebar
						gameInfo={this.props.gameInfo}
						userInfo={this.props.userInfo}
						userList={this.props.userList}
						generalChats={this.props.generalChats}
						onModerationButtonClick={this.handleRoute}
						socket={socket}
					/>
				)}
			</section>
		);
	}
}

App.propTypes = {
	dispatch: PropTypes.func,
	userInfo: PropTypes.object,
	midSection: PropTypes.string,
	gameInfo: PropTypes.object,
	gameList: PropTypes.array,
	generalChats: PropTypes.array,
	userList: PropTypes.object
};

export default connect(select)(App);
