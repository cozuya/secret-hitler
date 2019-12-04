import React from 'react';
import { connect } from 'react-redux';
import Main from './section-main/Main.jsx';
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
import socket from '../socket';
import PropTypes from 'prop-types';
import RightSidebar from './section-right/RightSidebar.jsx';
import Menu from './menu/Menu.jsx';
import DevHelpers from './DevHelpers.jsx';
import '../../scss/style-dark.scss';

const select = state => state;

class TopLevelErrorBoundry extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			error: null,
			errorInfo: null
		};
	}

	componentDidCatch(error, errorInfo) {
		this.setState({
			error,
			errorInfo
		});
	}

	render() {
		const { errorInfo, error } = this.state;

		return errorInfo ? (
			<div style={{ padding: '20px' }}>
				<h2>You've broken the website.</h2>
				<p>
					Not really, but there's been an unhandled error in the site's UI code. This is probably due to a new issue in a recent deployment. Please expand the
					details below and post a screenshot of them in #development-contribution on our Discord.{'  '}
					<a href="/game">Click here to get back to safety.</a>
				</p>
				<details style={{ whiteSpace: 'pre-wrap' }}>
					{error && (error.stack || error.toString())}
					<br />
					{errorInfo.componentStack}
				</details>
			</div>
		) : (
			this.props.children
		);
	}
}

TopLevelErrorBoundry.propTypes = {
	children: PropTypes.object
};

export class App extends React.Component {
	constructor() {
		super();

		this.handleSeatingUser = this.handleSeatingUser.bind(this);
		this.handleLeaveGame = this.handleLeaveGame.bind(this);
		this.makeQuickDefault = this.makeQuickDefault.bind(this);
		this.changeNotesValue = this.changeNotesValue.bind(this);
		this.changePlayerNotesValue = this.changePlayerNotesValue.bind(this);
		this.touConfirmButton = this.touConfirmButton.bind(this);
		this.acknowledgeWarning = this.acknowledgeWarning.bind(this);

		this.state = {
			notesValue: '',
			alertMsg: {
				type: null,
				data: null
			},
			warnings: null,
			allEmotes: []
		};

		this.prevHash = '';
		this.lastReconnectAttempt = new Date();
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
			const info = {
				userName: username,
				verified: window.verified,
				staffRole: window.staffRole,
				hasNotDismissedSignupModal: window.hasNotDismissedSignupModal
			};

			socket.emit('getUserGameSettings');
			socket.emit('sendUser', this.props.userInfo);

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

		socket.on('touChange', changeList => {
			this.setState({
				alertMsg: {
					type: 'tou',
					data: changeList
				}
			});
		});

		socket.on('warningPopup', warning => {
			if (this.state.alertMsg.type === null) {
				this.setState({
					alertMsg: {
						type: 'warning',
						data: warning
					}
				});
			}
		});

		socket.on('sendWarnings', warningData => {
			this.setState({
				warnings: warningData
			});
		});

		socket.on('removeAllPopups', () => {
			this.setState({
				alertMsg: {
					type: null,
					data: null
				}
			});
		});

		socket.on('emoteList', list => {
			this.setState({
				allEmotes: list
			});
		});

		socket.on('manualDisconnection', () => {
			window.location.pathname = '/logout';
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

		socket.on('gameUpdate', (game, noChat) => {
			if (noChat) {
				const { gameInfo } = this.props;
				game.chats = gameInfo.chats;
				dispatch(updateGameInfo(game));
			} else {
				dispatch(updateGameInfo(game));
			}
		});

		socket.on('playerChatUpdate', chat => {
			const { gameInfo } = this.props;
			const _game = Object.assign({}, gameInfo);

			_game.chats.push(chat);
			dispatch(updateGameInfo(_game));
		});

		socket.on('gameModChat', chat => {
			const { gameInfo } = this.props;
			const _game = _.cloneDeep(gameInfo);

			_game.chats.push(chat);
			dispatch(updateGameInfo(_game));
		});

		socket.on('fetchUser', () => {
			socket.emit('sendUser', this.props.userInfo);
		});

		socket.on('userList', list => {
			dispatch(updateUserList(list));
			const now = new Date();
			const since = now - this.lastReconnectAttempt;
			if (since > 1000 * 5) {
				this.lastReconnectAttempt = now;
				const { userInfo } = this.props;
				if (userInfo && userInfo.userName) {
					if (!list.list.map(user => user.userName).includes(userInfo.userName)) {
						console.log('Detected own user not in list, attempting to reconnect...');
						socket.emit('getUserGameSettings');
					}
				}
			}
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

		socket.on('sendAlert', ip => {
			window.alert(ip);
		});

		socket.on('checkRestrictions', () => {
			socket.emit('receiveRestrictions');
		});
	}

	touConfirmButton(e) {
		e.preventDefault();
		if (e.target[0].checked) {
			socket.emit('confirmTOU');
		}
	}

	acknowledgeWarning(e) {
		e.preventDefault();
		if (e.target[0].checked) {
			socket.emit('acknowledgeWarning');
		}
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
				socket.emit('updateUserStatus', type, uid);
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
		} else if (hash === '#/moderation' && userInfo.staffRole && userInfo.staffRole !== 'altmod') {
			// doesn't work on direct link, would need to adapt is authed as userinfo username isn't defined when this fires.
			dispatch(updateMidsection('moderation'));
		} else if (hash === '#/signups' && userInfo.staffRole && userInfo.staffRole !== 'altmod') {
			// doesn't work on direct link, would need to adapt is authed as userinfo username isn't defined when this fires.
			dispatch(updateMidsection('signups'));
		} else if (hash === '#/playerreports' && userInfo.staffRole && userInfo.staffRole !== 'altmod') {
			// doesn't work on direct link, would need to adapt is authed as userinfo username isn't defined when this fires.
			dispatch(updateMidsection('reports'));
		} else if (hash === '#/settings' && isAuthed) {
			dispatch(updateMidsection('settings'));
		} else if (hash === '#/creategame' && isAuthed) {
			dispatch(updateMidsection('createGame'));
		} else if (hash.substr(0, 8) === '#/table/') {
			socket.emit('getGameInfo', hash.split('#/table/')[1]);
		} else if (hash === '#/leaderboards') {
			dispatch(updateMidsection('leaderboards'));
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
		const data = {
			flag: 'none',
			name: 'New Game',
			minPlayersCount: 5,
			excludedPlayerCount: [6],
			maxPlayersCount: 5,
			experiencedMode: false,
			disableChat: false,
			disableObserver: false,
			isTourny: false,
			disableGamechat: false,
			rainbowgame: false,
			blindMode: false,
			timedMode: false,
			casualGame: false,
			privatePassword: false
		};

		this.props.socket.emit('addNewGame', data);
	}

	// ***** end dev helpers *****

	handleSeatingUser(password) {
		const { gameInfo } = this.props;
		const data = {
			uid: gameInfo.general.uid,
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

		if (gameSettings && gameSettings.fullheight) {
			classes += ' fullheight';
		}

		return (
			<TopLevelErrorBoundry>
				<section
					className="app-container"
					style={{
						fontFamily: gameSettings
							? gameSettings.fontFamily
								? `'${gameSettings.fontFamily}', Lato, sans-serif`
								: '"Comfortaa", Lato, sans-serif'
							: '"Comfortaa", Lato, sans-serif'
					}}
				>
					{this.props.notesActive && <Gamenotes value={this.state.notesValue} changeNotesValue={this.changeNotesValue} />}

					{process.env.NODE_ENV !== 'production' && <DevHelpers />}

					<Menu userInfo={this.props.userInfo} gameInfo={this.props.gameInfo} midSection={this.props.midSection} />

					{(() => {
						if (this.state.alertMsg.type) {
							if (this.state.alertMsg.type === 'tou') {
								return (
									<div style={{ position: 'fixed', zIndex: 99999, background: '#0008', width: '100vw', height: '100vh', display: 'flex' }}>
										<div style={{ margin: 'auto', padding: '5px', border: '1px solid white', borderRadius: '10px', background: '#000' }}>
											<h2 style={{ fontFamily: '"Comfortaa", Lato, sans-serif' }}>
												{this.state.alertMsg.data[0].changeVer === '0.0' ? 'Site Rules' : 'Terms of Use changes'}
											</h2>
											<div
												style={{
													height: '400px',
													width: '450px',
													border: '1px solid black',
													borderRadius: '5px',
													background: '#777',
													padding: '3px',
													overflowY: 'scroll'
												}}
											>
												{this.state.alertMsg.data.map((change, index) => {
													return (
														<div key={index}>
															<h4 style={{ fontFamily: '"Comfortaa", Lato, sans-serif' }}>
																{this.state.alertMsg.data[0].changeVer === '0.0' ? '' : `Version ${change.changeVer}`}
															</h4>
															{change.changeDesc.split('\n').map((item, index) => (
																<p key={index} style={{ fontFamily: '"Comfortaa", Lato, sans-serif' }}>
																	{item}
																</p>
															))}
														</div>
													);
												})}
											</div>
											<p>
												<a href="/tou" target="_blank" style={{ fontFamily: '"Comfortaa", Lato, sans-serif' }}>
													Click here to read the full Terms of Use.
												</a>
											</p>
											<form onSubmit={this.touConfirmButton}>
												<input type="checkbox" id="touCheckBox" style={{ height: '16px', width: '16px' }} />
												<label htmlFor="touCheckBox" style={{ fontFamily: '"Comfortaa", Lato, sans-serif', cursor: 'pointer' }}>
													{' '}
													I agree to the {this.state.alertMsg.data[0].changeVer === '0.0' ? 'Terms of Use' : 'Terms of Use changes'}
												</label>
												<br />
												<input
													type="submit"
													value="Dismiss"
													style={{ width: '100%', borderRadius: '5px', fontFamily: '"Comfortaa", Lato, sans-serif', fontWeight: 'bold', cursor: 'pointer' }}
													id="touButton"
												/>
											</form>
										</div>
									</div>
								);
							}
							if (this.state.alertMsg.type === 'warning') {
								return (
									<div style={{ position: 'fixed', zIndex: 9999, background: '#0008', width: '100vw', height: '100vh', display: 'flex' }}>
										<div style={{ margin: 'auto', padding: '5px', border: '1px solid white', borderRadius: '10px', background: '#000' }}>
											<h2 style={{ fontFamily: '"Roboto", sans-serif', textAlign: 'center' }}>Moderator Warning</h2>
											<div style={{ width: '450px', margin: '5px 0' }}>
												The following is a warning from a moderator. If you believe this warning to be unjustified, you may argue your case respectfully by
												pinging @Moderator in #mod-support on our <a href="https://discord.gg/secrethitlerio">Discord</a>.
												<br />
												<br />
												Please read and follow the rules as laid out in the <a href="/tou">Terms of Use</a> to avoid further action on your account.
											</div>
											<div
												style={{
													height: 'auto',
													maxHeight: '400px',
													width: '450px',
													border: '1px solid black',
													borderRadius: '5px',
													background: '#777',
													padding: '5px'
												}}
											>
												<div>
													<h4 style={{ fontFamily: '"Roboto", sans-serif' }}>Warning: </h4>
													<p style={{ fontFamily: '"Roboto", sans-serif' }}>
														{new Date(this.state.alertMsg.data.time).toDateString() + ' - ' + this.state.alertMsg.data.text}
													</p>
													<br />
												</div>
											</div>
											<form onSubmit={this.acknowledgeWarning}>
												<div style={{ width: '450px', margin: '15px 0 5px' }}>
													<input type="checkbox" id="warningCheckBox" style={{ marginRight: '5px' }} />
													<label htmlFor="warningCheckBox" style={{ fontFamily: '"Roboto", sans-serif', cursor: 'pointer' }}>
														I acknowledge this warning and understand that continuing in this behaviour may lead to further action on my account.
													</label>
												</div>
												<br />
												<input
													type="submit"
													value="Dismiss"
													style={{
														width: '60%',
														height: '25px',
														marginLeft: '20%',
														borderRadius: '5px',
														fontFamily: '"Roboto", sans-serif',
														fontWeight: 'bold',
														cursor: 'pointer'
													}}
													id="warningButton"
												/>
											</form>
										</div>
									</div>
								);
							}
						}
					})()}

					{this.state.warnings !== null && (
						<div style={{ position: 'fixed', zIndex: 9999, background: '#0008', width: '100vw', height: '100vh', display: 'flex' }}>
							<div style={{ margin: 'auto', padding: '5px', border: '1px solid white', borderRadius: '10px', background: '#000' }}>
								<h2 style={{ fontFamily: '"Roboto", sans-serif', textAlign: 'center' }}>Warnings log</h2>
								<div style={{ width: '450px', margin: '5px 0' }}>
									Previous Warnings for User: <strong>{this.state.warnings.username}</strong>
									<br />
									<br />
								</div>
								<div
									style={{
										height: 'auto',
										maxHeight: '300px',
										width: '550px',
										border: '1px solid black',
										borderRadius: '5px',
										background: '#777',
										padding: '5px',
										overflowY: 'scroll'
									}}
								>
									{this.state.warnings.warnings.map(warning => {
										return (
											<div key={warning}>
												<p style={{ fontFamily: '"Roboto", sans-serif' }}>
													<strong>Date:</strong> {new Date(warning.time).toDateString()} {new Date(warning.time).toTimeString()}
													<br />
													<strong>Acknowledged:</strong> {warning.acknowledged ? 'Yes' : 'No'}
													<br />
													<strong>Mod:</strong> {warning.moderator}
												</p>
												<p key={warning} style={{ fontFamily: '"Roboto", sans-serif' }}>
													{warning.text}
												</p>
												<hr />
											</div>
										);
									})}
								</div>
								<input
									type="button"
									value="Dismiss"
									style={{
										width: '60%',
										height: '25px',
										margin: '15px 20%',
										borderRadius: '5px',
										fontFamily: '"Roboto", sans-serif',
										fontWeight: 'bold',
										cursor: 'pointer'
									}}
									id="warningLogButton"
									onClick={() => this.setState({ warnings: null })}
								/>
							</div>
						</div>
					)}

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
							allEmotes={this.state.allEmotes}
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
										allEmotes={this.state.allEmotes}
									/>
								);
							}
						})()}
					</div>
				</section>
			</TopLevelErrorBoundry>
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
	userList: PropTypes.object,
	version: PropTypes.object,
	socket: PropTypes.object,
	notesActive: PropTypes.bool
};

export default connect(select)(App);
