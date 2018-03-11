import React from 'react';
import { connect } from 'react-redux';
import Main from './section-main/Main.jsx';
import Gamenotes from './Gamenotes.jsx';
import Playernotes from './Playernotes.jsx';
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
import RightSidebar from './section-right/RightSidebar.jsx';
import Menu from './menu/Menu.jsx';
import DevHelpers from './DevHelpers.jsx';
import '../../scss/style-dark.scss';

const select = state => state;

export class App extends React.Component {
	constructor() {
		super();

		this.handleSeatingUser = this.handleSeatingUser.bind(this);
		this.handleLeaveGame = this.handleLeaveGame.bind(this);
		this.makeQuickDefault = this.makeQuickDefault.bind(this);
		this.changeNotesValue = this.changeNotesValue.bind(this);
		this.changePlayerNotesValue = this.changePlayerNotesValue.bind(this);

		this.state = {
			notesValue: '',
			playerNotesValue: ''
		};

		this.prevHash = '';
	}

	compononentDidUpdate() {
		this.router();
	}

	componentDidMount() {
		const { dispatch } = this.props;
		const { classList } = document.getElementById('game-container');

		window.addEventListener('hashchange', this.router.bind(this));
		this.router.call(this); // uh..?

		if (classList.length) {
			const username = classList[0].split('username-')[1];
			const info = { userName: username };

			socket.emit('getUserGameSettings', username);

			// ** begin devhelpers **
			//			const devPlayers = ['Jaina', 'Rexxar', 'Malfurian', 'Thrall', 'Valeera', 'Anduin', 'aaa', 'bbb']; // eslint-disable-line one-var
			//			if (devPlayers.includes(username)) {
			//				const data = {
			//					uid: 'devgame',
			//					userName: username
			//				};

			//	info.isSeated = true;
			//	socket.emit('updateSeatedUser', data);
			//	socket.emit('getGameInfo', 'devgame');
			//			}
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

		socket.on('joinGameRedirect', uid => {
			dispatch(updateMidsection('game'));
			window.location.hash = `#/table/${uid}`;
		});

		socket.on('gameUpdate', game => {
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
		const { hash } = window.location;
		const { userInfo, dispatch, gameInfo } = this.props;
		const isAuthed = Boolean(document.getElementById('game-container').classList.length);

		/**
		 * @param {string} type - todo
		 * @param {string} uid - game identifier
		 */
		const updateStatus = (type, uid) => {
			if (userInfo.userName) {
				socket.emit('updateUserStatus', userInfo.userName, type, uid);
			}
		};

		if (hash === this.prevHash) {
			return;
		}

		if (
			Object.keys(gameInfo).length &&
			userInfo.userName &&
			userInfo.isSeated &&
			gameInfo.publicPlayersState.length &&
			gameInfo.publicPlayersState.find(player => player.userName === userInfo.userName)
		) {
			if (hash === '#/') {
				this.handleLeaveGame();
			} else if (!gameInfo.gameState.isCompleted) {
				if (this.prevHash !== '#/table/' + gameInfo.general.uid) {
					// Force player to rejoin the game if it's not finished and they are still seated
					socket.emit('getGameInfo', gameInfo.general.uid);
				} else {
					// If they were already sitting at the table then just make sure they can see it and don't redirect away
					dispatch(updateMidsection('game'));
					window.location.hash = '#/table/' + gameInfo.general.uid;
				}
				// Prevent prevHash being incorrect after we are redirected
				this.prevHash = '#/table/' + gameInfo.general.uid;
				return;
			}
		} else if (this.prevHash.substr(0, 8) === '#/table/') {
			this.handleLeaveGame(this.prevHash.split('#/table/')[1]);
		}

		if (hash.substr(0, 10) === '#/profile/') {
			dispatch(fetchProfile(hash.split('#/profile/')[1], userInfo.userName));
		} else if (hash.substr(0, 9) === '#/replay/') {
			updateStatus('replay', hash.split('#/replay/')[1]);
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
			updateStatus('none');
			dispatch(updateMidsection('default'));
		}

		this.prevHash = hash;
	}

	// ***** begin dev helpers *****

	makeQuickDefault() {
		const { userInfo } = this.props;
		const game = {
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
				rainbowgame: false,
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
		const { gameInfo, userInfo } = this.props;
		const data = {
			uid: gameInfo.general.uid,
			userName: userInfo.userName,
			isPrivate: userInfo.gameSettings.isPrivate,
			customCardback: userInfo.gameSettings.customCardback,
			customCardbackUid: userInfo.gameSettings.customCardbackUid,
			tournyWins: userInfo.gameSettings.tournyWins,
			password
		};

		socket.emit('updateSeatedUser', data);
	}

	handleLeaveGame(manualLeaveGame) {
		const { dispatch, userInfo, gameInfo } = this.props;

		if (userInfo.isSeated) {
			userInfo.isSeated = false;
			dispatch(updateUser(userInfo));
		}

		socket.emit('leaveGame', {
			userName: userInfo.userName,
			uid: manualLeaveGame || gameInfo.general.uid
		});
	}

	changeNotesValue(value) {
		this.setState({
			notesValue: value
		});
	}

	changePlayerNotesValue(value) {
		this.setState({
			playerNotesValue: value
		});
	}

	render() {
		const { gameSettings } = this.props.userInfo;
		let classes = 'body-container';

		if (this.props.midSection === 'game' || this.props.midSection === 'replay') {
			classes += ' game';
		}

		return (
			<section
				className="app-container"
				style={{
					fontFamily: gameSettings
						? gameSettings.fontFamily ? `'${gameSettings.fontFamily}', Lato, sans-serif` : '"Comfortaa", Lato, sans-serif'
						: '"Comfortaa", Lato, sans-serif'
				}}
			>
				{this.props.notesActive && <Gamenotes value={this.state.notesValue} changeNotesValue={this.changeNotesValue} />}

				{this.props.playerNotesActive && <Playernotes value={this.state.playerNotesValue} changePlayerNotesValue={this.changePlayerNotesValue} />}

				<DevHelpers />

				<Menu userInfo={this.props.userInfo} gameInfo={this.props.gameInfo} midSection={this.props.midSection} />

				<div className={classes}>
					<Main
						userInfo={this.props.userInfo}
						midSection={this.props.midSection}
						gameInfo={this.props.gameInfo}
						onSeatingUser={this.handleSeatingUser}
						quickDefault={this.makeQuickDefault}
						onClickedTakeSeat={this.handleSeatingUser}
						userList={this.props.userList}
						socket={socket}
						version={this.props.version}
						gameList={this.props.gameList}
					/>

					{(() => {
						if (
							(this.props.midSection !== 'game' && this.props.midSection !== 'replay') ||
							(this.props.userInfo.gameSettings && this.props.userInfo.gameSettings.enableRightSidebarInGame)
						) {
							return (
								<RightSidebar
									gameInfo={this.props.gameInfo}
									userInfo={this.props.userInfo}
									userList={this.props.userList}
									generalChats={this.props.generalChats}
									socket={socket}
									midSection={this.props.midSection}
								/>
							);
						}
					})()}
				</div>
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
	generalChats: PropTypes.object,
	userList: PropTypes.object
};

export default connect(select)(App);
