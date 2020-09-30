import React from 'react';
import moment from 'moment';
import $ from 'jquery';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import Checkbox from 'semantic-ui-checkbox';
import { Form, Header, Button, Modal } from 'semantic-ui-react';

$.fn.checkbox = Checkbox;

export default class Moderation extends React.Component {
	state = {
		selectedUser: '',
		userList: [],
		gameList: [],
		actionTextValue: '',
		log: [],
		playerListState: 0,
		broadcastText: '',
		playerInputText: '',
		resetServerCount: 0,
		logCount: 1,
		modLogToday: false,
		nonSeasonalSetStats: false,
		logSort: {
			type: 'date',
			direction: 'descending'
		},
		userSort: {
			type: 'username',
			direction: 'descending'
		},
		gameSort: {
			type: 'username',
			direction: 'descending'
		},
		showActions: true,
		filterModalVisibility: false,
		filterValue: '',
		showGameIcons: true,
		lagMeterStatus: '',
		tableCollapsed: false
	};

	componentDidMount() {
		const self = this;
		const { socket } = this.props;

		socket.on('lagTestResults', data => {
			this.setState({
				lagMeterStatus: `Average lag: ${data} ms`
			});
		});

		socket.on('modInfo', info => {
			this.setState({
				userList: info.userList,
				gameList: info.gameList,
				log: info.modReports,
				showActions: info.showActions || false
			});

			$(this.toggleIpbans).checkbox(info.ipbansNotEnforced.status ? 'set checked' : 'set unchecked');
			$(this.toggleGameCreation).checkbox(info.gameCreationDisabled.status ? 'set checked' : 'set unchecked');
			$(this.toggleAccountCreation).checkbox(info.accountCreationDisabled.status ? 'set checked' : 'set unchecked');
			$(this.toggleLimitNewPlayers).checkbox(info.limitNewPlayers.status ? 'set checked' : 'set unchecked');
			$(this.toggleBypassVPNCheck).checkbox(info.bypassVPNCheck.status ? 'set checked' : 'set unchecked');
		});

		socket.emit('getModInfo', 1);

		$(this.toggleAccountCreation).checkbox({
			onChecked() {
				socket.emit('updateModAction', {
					modName: self.props.userInfo.userName,
					userName: '',
					ip: '',
					comment: self.state.actionTextValue || 'Disabled account creation',
					action: 'disableAccountCreation'
				});
			},
			onUnchecked() {
				socket.emit('updateModAction', {
					modName: self.props.userInfo.userName,
					userName: '',
					ip: '',
					comment: self.state.actionTextValue || 'Enabled account creation',
					action: 'enableAccountCreation'
				});
			}
		});

		$(this.toggleBypassVPNCheck).checkbox({
			onChecked() {
				socket.emit('updateModAction', {
					modName: self.props.userInfo.userName,
					userName: '',
					ip: '',
					comment: self.state.actionTextValue || 'Disabled VPN Check',
					action: 'disableVPNCheck'
				});
			},
			onUnchecked() {
				socket.emit('updateModAction', {
					modName: self.props.userInfo.userName,
					userName: '',
					ip: '',
					comment: self.state.actionTextValue || 'Enabled VPN Check',
					action: 'enableVPNCheck'
				});
			}
		});

		$(this.toggleIpbans).checkbox({
			onChecked() {
				socket.emit('updateModAction', {
					modName: self.props.userInfo.userName,
					userName: '',
					ip: '',
					comment: self.state.actionTextValue || 'Disabled all IP bans',
					action: 'disableIpbans'
				});
			},
			onUnchecked() {
				socket.emit('updateModAction', {
					modName: self.props.userInfo.userName,
					userName: '',
					ip: '',
					comment: self.state.actionTextValue || 'Enabled all IP bans',
					action: 'enableIpbans'
				});
			}
		});

		$(this.toggleGameCreation).checkbox({
			onChecked() {
				socket.emit('updateModAction', {
					modName: self.props.userInfo.userName,
					userName: '',
					ip: '',
					comment: self.state.actionTextValue || 'Disabled game creation',
					action: 'disableGameCreation'
				});
			},
			onUnchecked() {
				socket.emit('updateModAction', {
					modName: self.props.userInfo.userName,
					userName: '',
					ip: '',
					comment: self.state.actionTextValue || 'Enabled game creation',
					action: 'enableGameCreation'
				});
			}
		});

		$(this.toggleGameCreation).checkbox({
			onChecked() {
				socket.emit('updateModAction', {
					modName: self.props.userInfo.userName,
					userName: '',
					ip: '',
					comment: self.state.actionTextValue || 'Disabled game creation',
					action: 'disableGameCreation'
				});
			},
			onUnchecked() {
				socket.emit('updateModAction', {
					modName: self.props.userInfo.userName,
					userName: '',
					ip: '',
					comment: self.state.actionTextValue || 'Enabled game creation',
					action: 'enableGameCreation'
				});
			}
		});

		$(this.toggleLimitNewPlayers).checkbox({
			onChecked() {
				socket.emit('updateModAction', {
					modName: self.props.userInfo.userName,
					userName: '',
					ip: '',
					comment: self.state.actionTextValue || 'Enabled limiting new players',
					action: 'enableLimitNewPlayers'
				});
			},
			onUnchecked() {
				socket.emit('updateModAction', {
					modName: self.props.userInfo.userName,
					userName: '',
					ip: '',
					comment: self.state.actionTextValue || 'Disabled limiting new players',
					action: 'disableLimitNewPlayers'
				});
			}
		});

		$(this.toggleSeasonalSetstats).checkbox({
			onChecked() {
				self.setState({
					nonSeasonalSetStats: true
				});
			},
			onUnchecked() {
				self.setState({
					nonSeasonalSetStats: false
				});
			}
		});
	}

	componentWillUnmount() {
		const { socket } = this.props;

		socket.off('modInfo');
		socket.off('lagTestResults');
	}

	togglePlayerList = () => {
		if (this.state.playerListState < 2) {
			this.setState({
				playerListState: this.state.playerListState + 1,
				selectedUser: ''
			});
		} else {
			this.setState({
				playerListState: 0,
				selectedUser: '',
				playerInputText: ''
			});
		}
	};

	renderPlayerInput() {
		const playerInputKeyup = e => {
			this.setState({ playerInputText: `${e.target.value}` });
		};

		return (
			<div className="player-input">
				<input id="playernameelem" placeholder="Username or Game UID" onChange={playerInputKeyup} className="player-input" value={this.state.playerInputText} />
			</div>
		);
	}

	routeToGame(gameId) {
		window.location = `#/table/${gameId}`;
	}

	fetchReplay(gameId) {
		window.location = `#/replay/${gameId}`;
	}

	renderUserlist() {
		const radioChange = userName => {
			this.setState({ selectedUser: userName });
		};
		const { userList, userSort } = this.state;
		const ips = userList.map(user => user.ip);
		const bannedips = this.state.log.filter(log => log.actionTaken === 'ban' || log.actionTaken === 'timeOut').map(log => log.ip);
		const timednames = this.state.log.filter(log => log.actionTaken === 'timeOut2').map(log => log.userActedOn);
		const splitIP = ip => {
			const idx = ip.lastIndexOf('.');
			return [ip.substring(0, idx - 1), ip.substring(idx + 1)];
		};
		const renderStatus = user => {
			const status = user.status;
			if (!status || status.type === 'none') {
				return <i className={'status unclickable icon'} />;
			} else {
				const iconClasses = classnames(
					'status',
					{ clickable: true },
					{ search: status.type === 'observing' },
					{ favIcon: status.type === 'playing' },
					{ rainbowIcon: status.type === 'rainbow' },
					{ record: status.type === 'replay' },
					{ privateIcon: status.type === 'private' },
					'icon'
				);
				const title = {
					playing: 'This player is playing in a standard game.',
					observing: 'This player is observing a game.',
					rainbow: 'This player is playing in a experienced-player-only game.',
					replay: 'This player is watching a replay.',
					private: 'This player is playing in a private game.'
				};
				const onClick = {
					playing: this.routeToGame,
					observing: this.routeToGame,
					rainbow: this.routeToGame,
					replay: this.props.fetchReplay,
					private: this.routeToGame
				};

				return (
					<i
						title={title[status.type]}
						style={{ width: '1.3em', height: '1.3em' }}
						className={iconClasses}
						onClick={onClick[status.type].bind(this, status.gameId)}
					/>
				);
			}
		};
		const IPdata = {};
		ips.forEach(ip => {
			const data = splitIP(ip);
			if (!IPdata[data[0]]) IPdata[data[0]] = { unique: 0 };
			if (!IPdata[data[0]][data[1]]) {
				IPdata[data[0]][data[1]] = 0;
				IPdata[data[0]].unique++;
			}
			IPdata[data[0]][data[1]]++;
		});
		const getIPType = user => {
			const data = splitIP(user.ip);
			if (IPdata[data[0]][data[1]] > 1) return 'multi';
			if (IPdata[data[0]].unique > 1) return 'multi2';
			return '';
		};
		const getUserType = user => {
			if (user.isTor) return 'istor';
			if (bannedips.includes(user.ip)) return 'isbannedbefore';
			if (timednames.includes(user.userName)) return 'istimedbefore';
			return '';
		};
		const checkEmail = email => {
			if (email.startsWith('-')) return 'emailunverified';
			return '';
		};

		return userList
			.filter(user => {
				if (this.state.playerInputText) {
					return user.userName.indexOf(this.state.playerInputText) === 0;
				} else {
					return true;
				}
			})
			.sort((a, b) =>
				(() => {
					const getAmt = (a, b) => {
						if (userSort.type === 'IP' && a.ip != b.ip) return a.ip > b.ip ? 1 : -1;
						if (userSort.type === 'email' && a.email.toLowerCase() != b.email.toLowerCase()) return a.email > b.email ? 1 : -1;
						return a.userName.toLowerCase() > b.userName.toLowerCase() ? 1 : -1;
					};
					return getAmt(a, b) * (userSort.direction === 'descending' ? 1 : -1);
				})()
			)
			.map((user, index) => (
				<tr key={index}>
					<td>
						<input
							type="radio"
							name="users"
							onChange={() => {
								radioChange(user.userName);
							}}
							checked={this.state.selectedUser === user.userName}
						/>
					</td>
					<td className={getUserType(user)} style={{ display: 'flex' }}>
						{this.state.showGameIcons && renderStatus(user)}
						<a className={getUserType(user)} href={`/game/#/profile/${user.userName}`}>
							{user.userName}
						</a>
					</td>
					<td className={getIPType(user)}>{user.ip}</td>
					<td className={checkEmail(user.email)}>{user.email.substring(1)}</td>
				</tr>
			));
	}

	renderGameList() {
		const gameRadioChange = game => {
			this.setState({ playerInputText: game.uid });
		};
		const { gameList, gameSort } = this.state;
		const getGameType = game => {
			if (game.unlisted) return 'unlisted';
			if (game.custom) return 'custom';
			if (game.casual) return 'casual';
			if (game.private) return 'private';
			return 'ranked';
		};
		return gameList
			.sort((a, b) =>
				(() => {
					const getAmt = (a, b) => {
						if (gameSort.type === 'uid' && a.uid != b.uid) return a.uid > b.uid ? 1 : -1;
						if (gameSort.type === 'electionNum' && a.electionNum != b.electionNum) return a.electionNum > b.electionNum ? 1 : -1;
						return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
					};
					return getAmt(a, b) * (gameSort.direction === 'descending' ? 1 : -1);
				})()
			)
			.map((game, index) => (
				<tr key={index}>
					<td>
						<input
							type="radio"
							name="games"
							onChange={() => {
								gameRadioChange(game);
							}}
							checked={this.state.playerInputText === game.uid}
						/>
					</td>
					<td className={getGameType(game)}>{game.name}</td>
					<td>
						<a href={`/game/#/table/${game.uid}`}>{game.uid}</a>
					</td>
					<td>{game.electionNum}</td>
				</tr>
			));
	}

	renderGameButtons() {
		const takeModAction = action => {
			if (action) {
				this.props.socket.emit('updateModAction', {
					modName: this.props.userInfo.userName,
					userName:
						action === 'deleteGame'
							? `DELGAME${this.state.playerInputText}`
							: action === 'resetGameName'
							? `RESETGAMENAME${this.state.playerInputText}`
							: this.state.playerInputText || this.state.selectedUser,
					ip: this.state.playerInputText ? '' : this.state.selectedUser ? this.state.userList.find(user => user.userName === this.state.selectedUser).ip : '',
					comment: this.state.actionTextValue,
					action
				});
			}
			this.setState({
				selectedUser: '',
				actionTextValue: '',
				playerInputText: ''
			});
		};

		const { playerInputText } = this.state;

		return (
			<div className="button-container">
				<button
					style={{ width: '100%', background: '#0ca51d' }}
					className={playerInputText ? 'ui button' : 'ui button disabled'}
					onClick={() => {
						takeModAction('resetGameName');
					}}
				>
					Reset game name
				</button>
				<button
					style={{ width: '100%', background: 'indianred' }}
					className={playerInputText ? 'ui button' : 'ui button disabled'}
					onClick={() => {
						takeModAction('deleteGame');
					}}
				>
					Delete game
				</button>
			</div>
		);
	}

	renderButtons() {
		const { socket, userInfo } = this.props;
		const { playerInputText, selectedUser, userList, actionTextValue, lagMeterStatus } = this.state;
		const takeModAction = action => {
			if (action === 'lagMeter') {
				this.setState(
					{
						lagMeterStatus: 'Pending...'
					},
					() => {
						let count = 0;
						const lagTimer = window.setInterval(() => {
							if (count < 5) {
								socket.emit('updateModAction', {
									modName: userInfo.userName,
									userName: playerInputText || selectedUser,
									ip: playerInputText ? '' : selectedUser ? userList.find(user => user.userName === selectedUser).ip : '',
									comment: actionTextValue,
									action,
									frontEndTime: Date.now()
								});
								count++;
							} else {
								clearInterval(lagTimer);
							}
						}, 1000);
					}
				);
			} else if (action === 'resetServer' && !this.state.resetServerCount) {
				this.setState({ resetServerCount: 1 });
			} else {
				socket.emit('updateModAction', {
					modName: userInfo.userName,
					userName:
						action === 'deleteGame'
							? `DELGAME${playerInputText}`
							: action === 'resetGameName'
							? `RESETGAMENAME${playerInputText}`
							: playerInputText || selectedUser,
					ip: playerInputText ? '' : selectedUser ? userList.find(user => user.userName === selectedUser).ip : '',
					comment: actionTextValue,
					action
				});
				this.setState({
					selectedUser: '',
					actionTextValue: '',
					playerInputText: ''
				});
			}
		};

		return (
			<div className="button-container">
				<br />
				<button
					style={{ width: '100%' }}
					className={!this.state.actionTextValue ? 'ui button disabled ib' : 'ui button ib'}
					onClick={() => {
						takeModAction('comment');
					}}
				>
					Comment without action
				</button>
				<div className="ui horizontal divider">lag-o-meter</div>
				<button
					className={lagMeterStatus ? 'ui button lagmeter disabled' : 'ui button lagmeter'}
					style={{ background: 'turquoise', color: 'black' }}
					onClick={() => {
						takeModAction('lagMeter');
					}}
				>
					Test lag
				</button>
				<span style={{ marginLeft: '10px' }}>{lagMeterStatus}</span>
				<div className="ui horizontal divider">Warnings</div>
				<button
					className={(selectedUser || playerInputText) && actionTextValue ? 'ui button ipban-button' : 'ui button disabled ipban-button'}
					style={{ background: '#ff5865', color: 'black' }}
					onClick={() => {
						takeModAction('warn');
					}}
				>
					Issue Warning
				</button>
				<button
					className={(selectedUser || playerInputText) && actionTextValue ? 'ui button ipban-button' : 'ui button disabled ipban-button'}
					style={{ background: '#FFDEAD', color: 'black' }}
					onClick={() => {
						takeModAction('removeWarning');
					}}
				>
					Delete Most Recent Warning
				</button>
				<button
					className={selectedUser || playerInputText ? 'ui button ipban-button' : 'ui button disabled ipban-button'}
					style={{ background: '#FFA07A', color: 'black' }}
					onClick={() => {
						this.props.socket.emit('seeWarnings', playerInputText || selectedUser);
						this.setState({
							selectedUser: '',
							actionTextValue: '',
							playerInputText: ''
						});
					}}
				>
					See Warnings
				</button>
				<div className="ui horizontal divider">Revoke Access</div>
				<button
					className={(selectedUser || playerInputText) && actionTextValue ? 'ui button ipban-button' : 'ui button disabled ipban-button'}
					onClick={() => {
						takeModAction('ban');
					}}
				>
					Ban user
				</button>
				<button
					className={(selectedUser || playerInputText) && actionTextValue ? 'ui button timeout-button' : 'ui button disabled timeout-button'}
					onClick={() => {
						takeModAction('timeOut3');
					}}
				>
					IP Timeout - 1 Hour
				</button>
				<button
					className={(selectedUser || playerInputText) && actionTextValue ? 'ui button timeout-button' : 'ui button disabled timeout-button'}
					onClick={() => {
						takeModAction('timeOut4');
					}}
				>
					Timeout - 6 Hours
				</button>
				<button
					className={(selectedUser || playerInputText) && actionTextValue ? 'ui button timeout-button' : 'ui button disabled timeout-button'}
					onClick={() => {
						takeModAction('timeOut');
					}}
				>
					IP Timeout - 18 Hours
				</button>
				<button
					className={(selectedUser || playerInputText) && actionTextValue ? 'ui button timeout-button' : 'ui button disabled timeout-button'}
					onClick={() => {
						takeModAction('timeOut2');
					}}
				>
					Timeout - 18 Hours
				</button>
				<div className="ui horizontal divider">User Actions</div>
				<button
					className={(selectedUser || playerInputText) && actionTextValue ? 'ui button' : 'ui button disabled'}
					onClick={() => {
						takeModAction('setVerified');
					}}
					style={{ width: '100%', background: 'aquamarine' }}
				>
					Set as verified
				</button>
				<button
					className={(selectedUser || playerInputText) && actionTextValue ? 'ui button cardback-button' : 'ui button disabled cardback-button'}
					onClick={() => {
						takeModAction('deleteCardback');
					}}
				>
					Reset player cardback
				</button>
				<button
					style={{ width: '100%', background: 'lilac' }}
					className={(selectedUser || playerInputText) && actionTextValue ? 'ui button' : 'ui button disabled'}
					onClick={() => {
						takeModAction('deleteBio');
					}}
				>
					Reset player bio
				</button>
				<button
					style={{ width: '100%', background: 'palevioletred' }}
					className={(selectedUser || playerInputText) && actionTextValue ? 'ui button cardback-button' : 'ui button disabled convert-button'}
					onClick={() => {
						takeModAction('togglePrivate');
					}}
				>
					Toggle player private-only (Permanent)
				</button>
				<button
					style={{ width: '100%', background: 'palevioletred' }}
					className={(selectedUser || playerInputText) && actionTextValue ? 'ui button cardback-button' : 'ui button disabled convert-button'}
					onClick={() => {
						takeModAction('togglePrivateEighteen');
					}}
				>
					Toggle player private-only (18 Hours)
				</button>
				<button
					style={{ width: '100%', background: '#e05543' }}
					className={(selectedUser || playerInputText) && actionTextValue ? 'ui button' : 'ui button disabled'}
					onClick={() => {
						takeModAction('logoutUser');
					}}
				>
					Logout User
				</button>
				<div className="ui horizontal divider">Games</div>
				<button
					style={{ width: '100%', background: 'indianred' }}
					className={playerInputText ? 'ui button' : 'ui button disabled'}
					onClick={() => {
						takeModAction('deleteGame');
					}}
				>
					Delete game
				</button>
				<button
					style={{ width: '100%', background: '#0ca51d' }}
					className={playerInputText ? 'ui button' : 'ui button disabled'}
					onClick={() => {
						takeModAction('resetGameName');
					}}
				>
					Reset game name
				</button>
				<div className="ui horizontal divider">General Chat</div>
				<button
					style={{ width: '100%', background: 'darkorange' }}
					className={!this.state.actionTextValue ? 'ui button disabled ib' : 'ui button ib'}
					onClick={() => {
						takeModAction('setSticky');
					}}
				>
					Set general chat sticky
				</button>
				<button
					style={{ width: '100%' }}
					className={!this.state.actionTextValue ? 'ui button disabled ib' : 'ui button ib'}
					onClick={() => {
						takeModAction('clearGenchat');
					}}
				>
					Clear general chat
				</button>
				<div className="ui horizontal divider">Grant Access</div>
				<button
					className={(selectedUser || playerInputText) && actionTextValue ? 'ui button timeout-button' : 'ui button disabled timeout-button'}
					onClick={() => {
						takeModAction('clearTimeout');
					}}
				>
					Restore User
				</button>
				<button
					className={(selectedUser || playerInputText) && actionTextValue ? 'ui button timeout-button' : 'ui button disabled timeout-button'}
					onClick={() => {
						takeModAction('clearTimeoutIP');
					}}
				>
					Restore IP
				</button>
				<button
					className={(selectedUser || playerInputText) && actionTextValue ? 'ui button timeout-button' : 'ui button disabled timeout-button'}
					onClick={() => {
						takeModAction('clearTimeoutAndTimeoutIP');
					}}
				>
					Restore User and IP
				</button>
				<button
					style={{ width: '100%', background: 'royalblue' }}
					className={'ui button'}
					onClick={() => {
						takeModAction('makeBypass');
					}}
				>
					Create login bypass key
				</button>
				<div className="ui horizontal divider"> </div>
				<div className="toggle-containers">
					<h4 className="ui header">Disable account creation</h4>
					<div
						className="ui fitted toggle checkbox"
						ref={c => {
							this.toggleAccountCreation = c;
						}}
					>
						<input type="checkbox" name="accountcreation" />
					</div>
				</div>
				<br />
				{/* <div className="toggle-containers">
					<h4 className="ui header">Disable ipbans including new account restrictions</h4>
					<div
						className="ui fitted toggle checkbox"
						ref={c => {
							this.toggleIpbans = c;
						}}
					>
						<input type="checkbox" name="ipbans" />
					</div>
				</div> */}
				<div className="toggle-containers">
					<h4 className="ui header">Disable game creation</h4>
					<div
						className="ui fitted toggle checkbox"
						ref={c => {
							this.toggleGameCreation = c;
						}}
					>
						<input type="checkbox" name="ipbans" />
					</div>
				</div>
				{/* <div className="toggle-containers">
					<h4 className="ui header">Limit new player actions</h4>
					<div
						className="ui fitted toggle checkbox"
						ref={c => {
							this.toggleLimitNewPlayers = c;
						}}
					>
						<input type="checkbox" name="ipbans" />
					</div>
				</div> */}
				<br />
				<div className="toggle-containers">
					<h4 className="ui header">Disable VPN Check</h4>
					<div
						className="ui fitted toggle checkbox"
						ref={c => {
							this.toggleBypassVPNCheck = c;
						}}
					>
						<input type="checkbox" name="vpnbypass" />
					</div>
				</div>
				<br />
				<div className="ui horizontal divider" style={{ color: 'red' }}>
					🔰 Editors/Admins Only 📛
				</div>

				<button
					className={
						(selectedUser || playerInputText) && actionTextValue && (userInfo.staffRole === 'editor' || userInfo.staffRole === 'admin')
							? 'ui button tier3'
							: 'ui button disabled tier3'
					}
					onClick={() => {
						takeModAction({
							type: `setWins${this.state.actionTextValue}`,
							isNonSeason: this.state.nonSeasonalSetStats
						});
					}}
				>
					Set wins
				</button>
				<button
					className={
						(selectedUser || playerInputText) && actionTextValue && (userInfo.staffRole === 'editor' || userInfo.staffRole === 'admin')
							? 'ui button tier3'
							: 'ui button disabled tier3'
					}
					onClick={() => {
						takeModAction({
							type: `setLosses${this.state.actionTextValue}`,
							isNonSeason: this.state.nonSeasonalSetStats
						});
					}}
				>
					Set losses
				</button>
				<button
					className={
						(selectedUser || playerInputText) && actionTextValue && (userInfo.staffRole === 'editor' || userInfo.staffRole === 'admin')
							? 'ui button tier3'
							: 'ui button disabled tier3'
					}
					onClick={() => {
						takeModAction({
							type: `setRWins${this.state.actionTextValue}`,
							isNonSeason: this.state.nonSeasonalSetStats
						});
					}}
				>
					Set R wins
				</button>
				<button
					className={
						(selectedUser || playerInputText) && actionTextValue && (userInfo.staffRole === 'editor' || userInfo.staffRole === 'admin')
							? 'ui button tier3'
							: 'ui button disabled tier3'
					}
					onClick={() => {
						takeModAction({
							type: `setRLosses${this.state.actionTextValue}`,
							isNonSeason: this.state.nonSeasonalSetStats
						});
					}}
				>
					Set R losses
				</button>
				<div className="toggle-containers">
					<h4 className="ui header">Above actions apply only to non seasonal.</h4>
					<div
						className="ui fitted toggle checkbox"
						ref={c => {
							this.toggleSeasonalSetstats = c;
						}}
					>
						<input type="checkbox" name="seasonalsetstats" />
					</div>
				</div>
				<div className="ui horizontal divider">User Actions</div>
				<button
					style={{ background: 'lime', color: 'black' }}
					className={
						(selectedUser || playerInputText) && actionTextValue && (userInfo.staffRole === 'editor' || userInfo.staffRole === 'admin')
							? 'ui button ipban-button'
							: 'ui button disabled ipban-button'
					}
					onClick={() => {
						takeModAction('rainbowUser');
					}}
				>
					Rainbow user
				</button>
				<button
					className={
						(selectedUser || playerInputText) && actionTextValue && (userInfo.staffRole === 'editor' || userInfo.staffRole === 'admin')
							? 'ui button ib'
							: 'ui button disabled ib'
					}
					onClick={() => {
						takeModAction('getIP');
					}}
					style={{ width: '100%' }}
				>
					Get user IP
				</button>
				<button
					style={{ background: 'crimson' }}
					className={
						(selectedUser || playerInputText) && actionTextValue && (userInfo.staffRole === 'editor' || userInfo.staffRole === 'admin')
							? 'ui button ipban-button'
							: 'ui button disabled ipban-button'
					}
					onClick={() => {
						takeModAction('deleteUser');
					}}
				>
					Delete user
				</button>
				<button
					style={{ background: '#f78d59' }}
					className={
						(selectedUser || playerInputText) && actionTextValue && (userInfo.staffRole === 'editor' || userInfo.staffRole === 'admin')
							? 'ui button ipban-button'
							: 'ui button disabled ipban-button'
					}
					onClick={() => {
						takeModAction('renameUser');
					}}
				>
					Rename user
				</button>
				<button
					style={{ background: 'darkblue' }}
					className={
						(selectedUser || playerInputText) && actionTextValue && (userInfo.staffRole === 'editor' || userInfo.staffRole === 'admin')
							? 'ui button ipban-button'
							: 'ui button disabled ipban-button'
					}
					onClick={() => {
						takeModAction('deleteProfile');
					}}
				>
					Delete/reset player profile
				</button>
				<div className="ui horizontal divider">Punishments</div>
				<button
					className={
						(selectedUser || playerInputText) && actionTextValue && (userInfo.staffRole === 'editor' || userInfo.staffRole === 'admin')
							? 'ui button ipban-button'
							: 'ui button disabled ipban-button'
					}
					onClick={() => {
						takeModAction('ipban');
					}}
				>
					Ban and IP ban for 18 hours
				</button>
				<button
					className={
						(selectedUser || playerInputText) && actionTextValue && (userInfo.staffRole === 'editor' || userInfo.staffRole === 'admin')
							? 'ui button ipban-button'
							: 'ui button disabled ipban-button'
					}
					onClick={() => {
						takeModAction('ipbanlarge');
					}}
				>
					Ban and IP ban for 1 week
				</button>
				<button
					className={
						(selectedUser || playerInputText) && actionTextValue && (userInfo.staffRole === 'editor' || userInfo.staffRole === 'admin')
							? 'ui button ipban-button'
							: 'ui button disabled ipban-button'
					}
					style={{ background: 'magenta' }}
					onClick={() => {
						takeModAction('fragbanSmall');
					}}
				>
					Ban IP fragment (xxx.xxx or xxx.xxx.xxx) for 18 hours
				</button>
				<button
					style={{ background: 'darkmagenta' }}
					className={
						(selectedUser || playerInputText) && actionTextValue && (userInfo.staffRole === 'editor' || userInfo.staffRole === 'admin')
							? 'ui button ipban-button'
							: 'ui button disabled ipban-button'
					}
					onClick={() => {
						takeModAction('fragbanLarge');
					}}
				>
					Ban IP fragment (xxx.xxx or xxx.xxx.xxx) for 1 week
				</button>
				<div className="ui horizontal divider">Roles</div>
				<button
					style={{ background: '#21bae0' }}
					className={
						(selectedUser || playerInputText) && actionTextValue && (userInfo.staffRole === 'editor' || userInfo.staffRole === 'admin')
							? 'ui button ipban-button'
							: 'ui button disabled ipban-button'
					}
					onClick={() => {
						takeModAction('toggleContributor');
					}}
				>
					Toggle Contributor Role
				</button>
				<button
					style={{ background: '#74d6d3' }}
					className={
						(selectedUser || playerInputText) && actionTextValue && (userInfo.staffRole === 'editor' || userInfo.staffRole === 'admin')
							? 'ui button ipban-button'
							: 'ui button disabled ipban-button'
					}
					onClick={() => {
						takeModAction('toggleTourneyMod');
					}}
				>
					Toggle Tourney Mod Role
				</button>
				<button
					style={{ background: 'grey' }}
					className={
						(selectedUser || playerInputText) && actionTextValue && (userInfo.staffRole === 'editor' || userInfo.staffRole === 'admin')
							? 'ui button ipban-button'
							: 'ui button disabled ipban-button'
					}
					onClick={() => {
						takeModAction('removeStaffRole');
					}}
				>
					Remove Staff Role
				</button>
				<button
					style={{ background: 'violet' }}
					className={
						(selectedUser || playerInputText) && actionTextValue && (userInfo.staffRole === 'editor' || userInfo.staffRole === 'admin')
							? 'ui button ipban-button'
							: 'ui button disabled ipban-button'
					}
					onClick={() => {
						takeModAction('promoteToAltMod');
					}}
				>
					Assign to Staff Role - AEM Alt
				</button>
				<button
					style={{ background: 'purple' }}
					className={
						(selectedUser || playerInputText) && actionTextValue && (userInfo.staffRole === 'editor' || userInfo.staffRole === 'admin')
							? 'ui button ipban-button'
							: 'ui button disabled ipban-button'
					}
					onClick={() => {
						takeModAction('promoteToTrialMod');
					}}
				>
					Promote to Staff Role - Trial Mod
				</button>
				<button
					style={{ background: '#007fff' }}
					className={
						(selectedUser || playerInputText) && actionTextValue && (userInfo.staffRole === 'editor' || userInfo.staffRole === 'admin')
							? 'ui button ipban-button'
							: 'ui button disabled ipban-button'
					}
					onClick={() => {
						takeModAction('promoteToMod');
					}}
				>
					Promote to Staff Role - Mod
				</button>
				<button
					style={{ background: '#05bba0' }}
					className={
						(selectedUser || playerInputText) && actionTextValue && (userInfo.staffRole === 'editor' || userInfo.staffRole === 'admin')
							? 'ui button ipban-button'
							: 'ui button disabled ipban-button'
					}
					onClick={() => {
						takeModAction('promoteToEditor');
					}}
				>
					Promote to Staff Role - Editor
				</button>
				<button
					style={{ background: '#84b8fd' }}
					className={
						(selectedUser || playerInputText) && actionTextValue && (userInfo.staffRole === 'editor' || userInfo.staffRole === 'admin')
							? 'ui button ipban-button'
							: 'ui button disabled ipban-button'
					}
					onClick={() => {
						takeModAction('promoteToVeteran');
					}}
				>
					Promote to Role - Veteran AEM
				</button>
				<button
					style={{ background: 'grey' }}
					className={
						actionTextValue && (userInfo.staffRole === 'editor' || userInfo.staffRole === 'admin')
							? 'ui button ipban-button'
							: 'ui button disabled ipban-button'
					}
					onClick={() => {
						socket.emit('regatherAEMUsernames');
						takeModAction('regatherAEMList');
					}}
				>
					Refresh AEM List
				</button>
				<hr />
				<button
					style={{ background: 'black' }}
					className={
						actionTextValue && (userInfo.staffRole === 'editor' || userInfo.staffRole === 'admin')
							? 'ui button ipban-button'
							: 'ui button disabled ipban-button'
					}
					onClick={() => {
						takeModAction('resetServer');
					}}
				>
					{this.state.resetServerCount ? 'Click again to reset server' : 'Reset server - click twice'}
				</button>
			</div>
		);
	}

	renderModLog() {
		const { logSort, logCount } = this.state;
		const clickSort = type => {
			this.setState({
				logSort: {
					type,
					direction: this.state.logSort.direction === 'descending' && type === logSort.type ? 'ascending' : 'descending'
				}
			});
		};
		const modRetrieveClick = e => {
			e.preventDefault();

			this.setState(
				{
					logCount: this.state.logCount + 1
				},
				() => {
					this.props.socket.emit('getModInfo', logCount);
				}
			);
		};

		const elem = document.getElementById('playernameelem');
		const name = elem ? elem.value : '';

		const niceAction = {
			comment: 'Comment',
			warn: 'Issue Warning',
			removeWarning: 'Delete Warning',
			getIP: 'Get IP',
			ban: 'Ban',
			setSticky: 'Set Sticky',
			ipbanlarge: '1 Week IP Ban',
			ipban: '18 Hour IP Ban',
			enableAccountCreation: 'Enable Account Creation',
			disableAccountCreation: 'Disable Account Creation',
			enableVPNCheck: 'Enable VPN Check',
			disableVPNCheck: 'Disable VPN Check',
			togglePrivate: 'Toggle Private (Permanent)',
			togglePrivateEighteen: 'Toggle Private (Temporary)',
			timeOut: 'Timeout and IP Timeout 18 Hours',
			timeOut2: 'Timeout 18 Hours',
			timeOut3: 'Timeout and IP Timeout 1 Hour',
			timeOut4: 'Timeout 6 Hours',
			clearTimeout: 'Clear Timeout',
			clearTimeoutIP: 'Clear IP Ban',
			clearTimeoutAndTimeoutIP: 'Clear Timeout and IP Timeout',
			modEndGame: 'End Game',
			deleteGame: 'Delete Game',
			enableIpBans: 'Enable IP Bans',
			disableIpBans: 'Disable IP Bans',
			disableGameCreation: 'Disable Game Creation',
			enableGameCreation: 'Enable Game Creation',
			disableIpbans: 'Disable IP Bans',
			enableIpbans: 'Enable IP Bans',
			broadcast: 'Broadcast',
			fragBanLarge: '1 Week Fragment Ban',
			fragBanSmall: '18 Hour Fragment Ban',
			clearGenchat: 'Clear General Chat',
			deleteUser: 'Delete User',
			deleteBio: 'Delete Bio',
			deleteProfile: 'Delete Profile',
			deleteCardback: 'Delete Cardback',
			resetGameName: 'Reset Game Name',
			rainbowUser: 'Grant Rainbow',
			removeStaffRole: 'Remove Staff Role',
			toggleContributor: 'Add/Remove Role (Contributor)',
			toggleTourneyMod: 'Add/Remove Role (Tourney Mod)',
			promoteToAltMod: 'Promote (AEM Alt)',
			promoteToTrialMod: 'Promote (Trial Mod)',
			promoteToVeteran: 'Promote (Veteran AEM)',
			promoteToMod: 'Promote (Mod)',
			promoteToEditor: 'Promote (Editor)',
			makeBypass: 'Create Bypass Key',
			bypassKeyUsed: 'Consume Bypass Key',
			resetServer: 'Server Restart',
			regatherAEMList: 'Refresh AEM List'
		};

		return (
			<div>
				<table className="ui celled table">
					<thead>
						<tr>
							<th
								style={{ whiteSpace: 'nowrap' }}
								onClick={() => {
									clickSort('modUserName');
								}}
							>
								Mod {logSort.type === 'modUserName' && <i className={logSort.direction === 'descending' ? 'angle down icon' : 'angle up icon'} />}
							</th>
							<th
								style={{ whiteSpace: 'nowrap' }}
								onClick={() => {
									clickSort('date');
								}}
							>
								Date {logSort.type === 'date' && <i className={logSort.direction === 'descending' ? 'angle down icon' : 'angle up icon'} />}
							</th>
							<th
								style={{ whiteSpace: 'nowrap' }}
								onClick={() => {
									clickSort('actionTaken');
								}}
							>
								Action {logSort.type === 'actionTaken' && <i className={logSort.direction === 'descending' ? 'angle down icon' : 'angle up icon'} />}
							</th>
							<th
								style={{ whiteSpace: 'normal' }}
								onClick={() => {
									clickSort('userActedOn');
								}}
							>
								Player {logSort.type === 'userActedOn' && <i className={logSort.direction === 'descending' ? 'angle down icon' : 'angle up icon'} />}
							</th>
							<th
								style={{ whiteSpace: 'nowrap' }}
								onClick={() => {
									clickSort('ip');
								}}
							>
								IP {logSort.type === 'ip' && <i className={logSort.direction === 'descending' ? 'angle down icon' : 'angle up icon'} />}
							</th>
							<th
								style={{ whiteSpace: 'nowrap' }}
								onClick={() => {
									clickSort('modNotes');
								}}
							>
								Comment {logSort.type === 'modNotes' && <i className={logSort.direction === 'descending' ? 'angle down icon' : 'angle up icon'} />}
							</th>
						</tr>
					</thead>
					<tbody>
						{this.state.log
							.filter(
								report =>
									(report.userActedOn && report.userActedOn.includes(name)) ||
									(report.modUserName && report.modUserName.includes(name)) ||
									(report.ip && report.ip.includes(name))
							)
							.filter(entry => (this.state.modLogToday ? new Date(entry.date).toDateString() === new Date().toDateString() : true))
							.sort((a, b) => {
								const { logSort } = this.state;
								const aDate = new Date(a.date);
								const bDate = new Date(b.date);

								if (logSort.type === 'date') {
									if (logSort.direction === 'descending') {
										return aDate > bDate ? -1 : 1;
									}
									return aDate > bDate ? 1 : -1;
								} else {
									if (logSort.direction === 'descending') {
										if (a[logSort.type] === b[logSort.type]) {
											return aDate > bDate ? -1 : 1;
										}
										return a[logSort.type] > b[logSort.type] ? -1 : 1;
									}

									if (a[logSort.type] === b[logSort.type]) {
										return aDate > bDate ? 1 : -1;
									}
									return a[logSort.type] > b[logSort.type] ? 1 : -1;
								}
							})
							.map((report, index) => (
								<tr key={index}>
									<td style={{ whiteSpace: 'nowrap' }}>{report.modUserName}</td>
									<td style={{ whiteSpace: 'nowrap' }}>{moment(new Date(report.date)).format('YYYY-MM-DD HH:mm')}</td>
									<td style={{ width: '120px', minWidth: '120px' }}>{niceAction[report.actionTaken] ? niceAction[report.actionTaken] : report.actionTaken}</td>
									<td style={{ whiteSpace: 'normal', wordWrap: 'break-word', maxWidth: '200px', minWidth: '120px' }}>{report.userActedOn}</td>
									<td style={{ whiteSpace: 'nowrap' }}>{report.ip}</td>
									<td style={{ Width: '200px', minWidth: '200px' }}>
										{report.modNotes.split('\n').map((v, index) => (
											<p key={index} style={{ margin: '0px' }}>
												{v}
											</p>
										))}
									</td>
								</tr>
							))}
					</tbody>
				</table>
				<button className="ui primary button" onClick={modRetrieveClick}>
					Get 500 more mod actions
				</button>
			</div>
		);
	}

	renderActionText() {
		const handleTextChange = e => {
			this.setState({ actionTextValue: `${e.target.value}` });
		};

		return <textarea placeholder="Comment" value={this.state.actionTextValue} onChange={handleTextChange} spellCheck="false" />;
	}

	broadcastClick = e => {
		e.preventDefault();

		$(this.bModal).modal('show');
	};

	handleBroadcastSubmit = e => {
		e.preventDefault();
		$(this.bModal).modal('hide');

		this.props.socket.emit('updateModAction', {
			modName: this.props.userInfo.userName,
			comment: this.state.broadcastText,
			action: 'broadcast',
			isSticky: $('#broadcast-sticky').is(':checked')
		});

		this.setState({
			broadcastText: ''
		});
	};

	render() {
		const { userSort, showActions } = this.state;

		const broadcastKeyup = e => {
			this.setState({
				broadcastText: e.target.value
			});
		};
		const toggleModLogToday = e => {
			const { modLogToday } = this.state;
			e.preventDefault();

			this.setState({
				modLogToday: !modLogToday
			});
		};
		const clickSort = type => {
			this.setState({
				userSort: {
					type,
					direction: this.state.userSort.direction === 'descending' && type === userSort.type ? 'ascending' : 'descending'
				}
			});
		};

		return (
			<section className="moderation">
				<a href="#/">
					<i className="remove icon" />
				</a>
				<h2 style={{ userSelect: 'none', WebkitUserSelect: 'none', MsUserSelect: 'none' }}>Moderation</h2>
				{showActions && (
					<a className="broadcast" href="#" onClick={this.broadcastClick}>
						Broadcast
					</a>
				)}
				<span
					className="gameIcons"
					onClick={() =>
						this.setState({
							showGameIcons: !this.state.showGameIcons
						})
					}
				>
					Show/Hide Game Icons
				</span>
				<span className="refreshModlog" onClick={() => this.props.socket.emit('getModInfo', 1)}>
					Refresh
					<i className="icon repeat" id="modlogRefresh" />
				</span>
				<span onClick={this.togglePlayerList} className="player-list-toggle">
					Toggle Player/Game List
				</span>

				<div>
					{this.state.playerListState === 0 && (
						<div className="modplayerlist">
							<h3>Current Player List</h3>
							<div className="ui table">
								<h4>Color chart:</h4>

								<span className="isbannedbefore">User has been banned before.</span>
								<br />
								<span className="istimedbefore">User has been timed before.</span>
								<br />
								<span className="multi">IP fully matches another IP.</span>
								<br />
								<span className="multi2">IP mostly matches another IP.</span>
								<br />
								<span className="emailunverified">Email is not yet verified.</span>
								<br />
							</div>
							{showActions && (
								<span>
									<div className="ui horizontal divider">-</div>
									{this.renderPlayerInput()}
									<div className="ui horizontal divider">or</div>
								</span>
							)}
							<div onClick={() => this.setState({ tableCollapsed: !this.state.tableCollapsed })} style={{ width: 'max-content', cursor: 'pointer' }}>
								<i className={`caret icon ${this.state.tableCollapsed ? 'right' : 'down'}`} />
								Collapse Table
							</div>
							<table className="ui celled table userlist">
								<thead>
									<tr>
										<th />
										<th
											style={{ whiteSpace: 'nowrap' }}
											onClick={() => {
												clickSort('username');
											}}
										>
											Username {userSort.type === 'username' && <i className={userSort.direction === 'descending' ? 'angle down icon' : 'angle up icon'} />}
										</th>
										<th
											style={{ whiteSpace: 'nowrap' }}
											onClick={() => {
												clickSort('IP');
											}}
										>
											IP {userSort.type === 'IP' && <i className={userSort.direction === 'descending' ? 'angle down icon' : 'angle up icon'} />}
										</th>
										<th
											style={{ whiteSpace: 'nowrap' }}
											onClick={() => {
												clickSort('email');
											}}
										>
											Email suffix {userSort.type === 'email' && <i className={userSort.direction === 'descending' ? 'angle down icon' : 'angle up icon'} />}
										</th>
									</tr>
								</thead>
								{!this.state.tableCollapsed && <tbody>{this.renderUserlist()}</tbody>}
							</table>
							{showActions && (
								<span>
									<div className="ui horizontal divider">-</div>
									{this.renderActionText()}
									{this.renderButtons()}
								</span>
							)}
						</div>
					)}
					{this.state.playerListState === 1 && (
						<div className="modplayerlist">
							<h3>Current Game List</h3>
							<div className="ui table">
								<h4>Color chart:</h4>
								<span className="ranked">This game is ranked</span>
								<br />
								<span className="casual">This game is casual</span>
								<br />
								<span className="private">This game is private</span>
								<br />
								<span className="custom">This game is custom</span>
								<br />
								<span className="unlisted">This game is unlisted</span>
							</div>
							{showActions && (
								<span>
									<div className="ui horizontal divider">-</div>
									{this.renderPlayerInput()}
									<div className="ui horizontal divider">or</div>
								</span>
							)}
							<div onClick={() => this.setState({ tableCollapsed: !this.state.tableCollapsed })} style={{ width: 'max-content', cursor: 'pointer' }}>
								<i className={`caret icon ${this.state.tableCollapsed ? 'right' : 'down'}`} />
								Collapse Table
							</div>
							<table className="ui celled table userlist">
								<thead>
									<tr>
										<th />
										<th
											style={{ whiteSpace: 'nowrap' }}
											onClick={() => {
												clickSort('gamename');
											}}
										>
											Game Name {userSort.type === 'gamename' && <i className={userSort.direction === 'descending' ? 'angle down icon' : 'angle up icon'} />}
										</th>
										<th
											style={{ whiteSpace: 'nowrap' }}
											onClick={() => {
												clickSort('uid');
											}}
										>
											UID {userSort.type === 'uid' && <i className={userSort.direction === 'descending' ? 'angle down icon' : 'angle up icon'} />}
										</th>
										<th
											style={{ whiteSpace: 'nowrap' }}
											onClick={() => {
												clickSort('electionnum');
											}}
										>
											Election #{' '}
											{userSort.type === 'electionnum' && <i className={userSort.direction === 'descending' ? 'angle down icon' : 'angle up icon'} />}
										</th>
									</tr>
								</thead>
								{!this.state.tableCollapsed && <tbody>{this.renderGameList()}</tbody>}
							</table>
							{showActions && (
								<span>
									<div className="ui horizontal divider">-</div>
									{this.renderActionText()}
									{this.renderGameButtons()}
								</span>
							)}
						</div>
					)}
					<div className="modlog" style={{ maxWidth: this.state.playerListShown ? '60%' : '100%' }}>
						<h3>
							Moderation Log{' '}
							<a href="#" onClick={toggleModLogToday} style={{ textDecoration: 'underline', fontSize: '12px' }}>
								{this.state.modLogToday ? 'Show all' : 'Show today only'}
							</a>
							<Button
								onClick={() => {
									this.setState({ filterModalVisibility: true, filterValue: '' });
								}}
								primary
								style={{ padding: '5px', marginLeft: '5px' }}
							>
								Filter
							</Button>
							<Modal
								open={this.state.filterModalVisibility}
								size="small"
								onClose={() => {
									this.setState({ filterModalVisibility: false });
								}}
								style={{ padding: '5px' }}
								onSubmit={() => {
									this.setState({
										filterModalVisibility: false
									});

									if (!this.state.filterValue) {
										this.props.socket.emit('getModInfo', 1);
									} else {
										this.props.socket.emit('updateModAction', {
											modName: this.props.userInfo.userName,
											userName: '',
											ip: '',
											comment: this.state.filterValue,
											action: 'getFilteredData'
										});
									}
								}}
							>
								<Header content="Filter mod actions" />
								<Form>
									<Form.Field>
										<label>Filter by username, IP address, or start of IP address</label>
										<input
											autoFocus
											value={this.state.filterValue}
											onChange={e => {
												this.setState({
													filterValue: e.target.value
												});
											}}
										/>
									</Form.Field>
									<Button secondary type="submit">
										Submit
									</Button>
									<Button
										onClick={() => {
											this.setState({
												filterModalVisibility: false,
												filterValue: ''
											});
											this.props.socket.emit('getModInfo', 1);
										}}
									>
										Clear filter
									</Button>
								</Form>
							</Modal>
						</h3>
						{this.renderModLog()}
					</div>
				</div>
				<div
					className="ui basic fullscreen modal broadcastmodal"
					ref={c => {
						this.bModal = c;
					}}
				>
					<div className="ui header">Broadcast to all games:</div>
					<div className="ui input">
						<form onSubmit={this.handleBroadcastSubmit} style={{ marginLeft: '10vw', width: '30vw', display: 'flex', flexDirection: 'column' }}>
							<textarea
								maxLength="300"
								placeholder="Broadcast"
								onChange={broadcastKeyup}
								className="broadcast-input"
								autoFocus
								value={this.state.broadcastText}
								ref={c => {
									this.broadcastText = c;
								}}
								style={{ height: '20vh', width: '100%' }}
							/>
							<div style={{ padding: '20px' }}>
								<label htmlFor="broadcast-sticky">Also sticky this broadcast</label>
								<input className="stickycheck" type="checkbox" id="broadcast-sticky" />
							</div>
							<div onClick={this.handleBroadcastSubmit} className={this.state.broadcastText ? 'ui button primary' : 'ui button primary disabled'}>
								Submit
							</div>
						</form>
					</div>
				</div>
			</section>
		);
	}
}

Moderation.propTypes = {
	userInfo: PropTypes.object,
	socket: PropTypes.object,
	fetchReplay: PropTypes.func
};
