import React from 'react';
import moment from 'moment';
import $ from 'jquery';
import PropTypes from 'prop-types';
import Checkbox from 'semantic-ui-checkbox';

$.fn.checkbox = Checkbox;

export default class Moderation extends React.Component {
	constructor() {
		super();

		this.togglePlayerList = this.togglePlayerList.bind(this);
		this.broadcastClick = this.broadcastClick.bind(this);
		this.handleBroadcastSubmit = this.handleBroadcastSubmit.bind(this);
		this.state = {
			selectedUser: '',
			userList: [],
			actionTextValue: '',
			log: [],
			playerListShown: true,
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
			}
		};
	}

	componentDidMount() {
		const self = this;
		const { socket } = this.props;

		socket.on('modInfo', info => {
			this.setState({
				userList: info.userList,
				log: info.modReports
			});

			$(this.toggleIpbans).checkbox(info.ipbansNotEnforced.status ? 'set checked' : 'set unchecked');
			$(this.toggleGameCreation).checkbox(info.gameCreationDisabled.status ? 'set checked' : 'set unchecked');
			$(this.toggleAccountCreation).checkbox(info.accountCreationDisabled.status ? 'set checked' : 'set unchecked');
		});

		socket.on('sendAlert', ip => {
			window.alert(ip);
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
		this.props.socket.off('modInfo');
	}

	togglePlayerList() {
		this.setState({ playerListShown: !this.state.playerListShown });
	}

	renderPlayerInput() {
		const playerInputKeyup = e => {
			this.setState({ playerInputText: `${e.target.value}` });
		};

		return (
			<div className="player-input">
				<input id="playernameelem" placeholder="Player or game name" onChange={playerInputKeyup} className="player-input" value={this.state.playerInputText} />
			</div>
		);
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
						/>
					</td>
					<td className={getUserType(user)}>{user.userName}</td>
					<td className={getIPType(user)}>{user.ip}</td>
					<td className={checkEmail(user.email)}>{user.email.substring(1)}</td>
				</tr>
			));
	}

	renderButtons() {
		const takeModAction = action => {
			if (action === 'resetServer' && !this.state.resetServerCount) {
				this.setState({ resetServerCount: 1 });
			} else {
				this.props.socket.emit('updateModAction', {
					modName: this.props.userInfo.userName,
					userName: action === 'deleteGame' ? `DELGAME${this.state.playerInputText}` : this.state.playerInputText || this.state.selectedUser,
					ip: this.state.selectedUser ? this.state.userList.find(user => user.userName === this.state.selectedUser).ip : '',
					comment: this.state.actionTextValue,
					action
				});
				this.setState({
					selectedUser: '',
					actionTextValue: '',
					playerInputText: ''
				});
			}
		};
		const { selectedUser, actionTextValue, playerInputText } = this.state;
		const { userInfo } = this.props;

		return (
			<div className="button-container">
				<button
					className={!this.state.actionTextValue ? 'ui button disabled ib' : 'ui button ib'}
					onClick={() => {
						takeModAction('comment');
					}}
				>
					Comment without action
				</button>
				<button
					className={!this.state.actionTextValue ? 'ui button disabled ib' : 'ui button ib'}
					onClick={() => {
						takeModAction('clearGenchat');
					}}
				>
					Clear/delete general chat
				</button>
				<button
					className={!this.state.actionTextValue ? 'ui button disabled ib' : 'ui button ib'}
					onClick={() => {
						takeModAction('getIP');
					}}
				>
					Get user IP
				</button>
				<br />
				<button
					className={(selectedUser || playerInputText) && actionTextValue ? 'ui button ipban-button' : 'ui button disabled ipban-button'}
					onClick={() => {
						takeModAction('ban');
					}}
				>
					Ban user
				</button>
				<button
					className={(selectedUser || playerInputText) && actionTextValue ? 'ui button' : 'ui button disabled'}
					onClick={() => {
						takeModAction('setVerified');
					}}
					style={{ width: '100%', background: 'aquamarine' }}
				>
					Set as verified
				</button>
				<br />
				<button
					className={(selectedUser || playerInputText) && actionTextValue ? 'ui button timeout-button' : 'ui button disabled timeout-button'}
					onClick={() => {
						takeModAction('timeOut');
					}}
				>
					Timeout - IP ban a player for 18 hours without scrambling password.
				</button>
				<button
					className={(selectedUser || playerInputText) && actionTextValue ? 'ui button timeout-button' : 'ui button disabled timeout-button'}
					onClick={() => {
						takeModAction('timeOut2');
					}}
				>
					Timeout - non-IP version.
				</button>
				<button
					className={(selectedUser || playerInputText) && actionTextValue ? 'ui button cardback-button' : 'ui button disabled cardback-button'}
					onClick={() => {
						takeModAction('deleteCardback');
					}}
				>
					Delete player cardback and log out
				</button>
				<button
					style={{ width: '100%', background: 'palevioletred' }}
					className={(selectedUser || playerInputText) && actionTextValue ? 'ui button cardback-button' : 'ui button disabled convert-button'}
					onClick={() => {
						takeModAction('togglePrivate');
					}}
				>
					Toggle player private-only and log out
				</button>
				<button
					style={{ width: '100%', background: 'lightyellow' }}
					className={playerInputText ? 'ui button' : 'ui button disabled'}
					onClick={() => {
						takeModAction('deleteGame');
					}}
				>
					Delete game
				</button>
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
					style={{ width: '100%', background: 'aquamarine' }}
					className={(selectedUser || playerInputText) && actionTextValue ? 'ui button' : 'ui button disabled'}
					onClick={() => {
						takeModAction('deleteBio');
					}}
				>
					Delete/clear player bio
				</button>
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
				<div className="toggle-containers">
					<h4 className="ui header">Disable ipbans including new account restrictions</h4>
					<div
						className="ui fitted toggle checkbox"
						ref={c => {
							this.toggleIpbans = c;
						}}
					>
						<input type="checkbox" name="ipbans" />
					</div>
				</div>
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
				<div className="ui horizontal divider">-</div>

				<button
					className={(selectedUser || playerInputText) && actionTextValue ? 'ui button tier3' : 'ui button disabled tier3'}
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
					className={(selectedUser || playerInputText) && actionTextValue ? 'ui button tier3' : 'ui button disabled tier3'}
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
					className={(selectedUser || playerInputText) && actionTextValue ? 'ui button tier3' : 'ui button disabled tier3'}
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
					className={(selectedUser || playerInputText) && actionTextValue ? 'ui button tier3' : 'ui button disabled tier3'}
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
					style={{ background: 'crimson' }}
					className={(selectedUser || playerInputText) && actionTextValue ? 'ui button ipban-button' : 'ui button disabled ipban-button'}
					onClick={() => {
						takeModAction('deleteUser');
					}}
				>
					Delete user
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
					Remove mod or editor status and log them out
				</button>
				<button
					style={{ background: 'blueviolet' }}
					className={
						(selectedUser || playerInputText) && actionTextValue && (userInfo.staffRole === 'editor' || userInfo.staffRole === 'admin')
							? 'ui button ipban-button'
							: 'ui button disabled ipban-button'
					}
					onClick={() => {
						takeModAction('promoteToMod');
					}}
				>
					Promote player to mod
				</button>
				<button
					style={{ background: 'violet' }}
					className={
						(selectedUser || playerInputText) && actionTextValue && (userInfo.staffRole === 'editor' || userInfo.staffRole === 'admin')
							? 'ui button ipban-button'
							: 'ui button disabled ipban-button'
					}
					onClick={() => {
						takeModAction('promoteToEditor');
					}}
				>
					Promote player to editor
				</button>
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
		const { logSort } = this.state;
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
					this.props.socket.emit('getModInfo', this.state.logCount);
				}
			);
		};

		const elem = document.getElementById('playernameelem');
		const name = elem ? elem.value : '';

		const niceAction = {
			comment: 'Comment',
			getIP: 'Get IP',
			ban: 'Ban',
			ipbanlarge: 'Large IP Ban',
			enableAccountCreation: 'Enable Account Creation',
			disableAccountCreation: 'Disable Account Creation',
			togglePrivate: 'Toggle Private',
			timeOut: 'Timeout (IP)',
			timeOut2: 'Timeout',
			deleteGame: 'Delete Game',
			enableIpBans: 'Enable IP Bans',
			disableIpBans: 'Disable IP Bans',
			disableGameCreation: 'Disable Game Creation',
			enableGameCreation: 'Enable Game Creation',
			disableIpbans: 'Disable IP Bans',
			enableIpbans: 'Enable IP Bans',
			broadcast: 'Broadcast',
			clearGenchat: 'Clear General Chat',
			deleteUser: 'Delete User',
			deleteBio: 'Delete Bio',
			deleteCardback: 'Delete Cardback'
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
								style={{ whiteSpace: 'nowrap' }}
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
									<td style={{ whiteSpace: 'nowrap' }}>{report.userActedOn}</td>
									<td style={{ whiteSpace: 'nowrap' }}>{report.ip}</td>
									<td style={{ Width: '200px', minWidth: '200px' }}>{report.modNotes}</td>
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

	broadcastClick(e) {
		e.preventDefault();

		$(this.bModal).modal('show');
	}

	handleBroadcastSubmit(e) {
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
	}

	render() {
		const { userSort } = this.state;

		const broadcastKeyup = e => {
			this.setState({
				broadcastText: e.currentTarget.value
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
				<h2>Moderation</h2>
				<a className="broadcast" href="#" onClick={this.broadcastClick}>
					Broadcast
				</a>
				<span onClick={this.togglePlayerList} className="player-list-toggle">
					show/hide playerlist
				</span>
				<div>
					{this.state.playerListShown && (
						<div className="modplayerlist">
							<h3>Current player list</h3>
							<div className="ui table">
								<h4>Colour chart:</h4>
								<span class="istor">User is playing via the TOR network.</span>
								<br />
								<span class="isbannedbefore">User has been banned before.</span>
								<br />
								<span class="istimedbefore">User has been timed before.</span>
								<br />
								<span class="multi">IP fully matches another IP.</span>
								<br />
								<span class="multi2">IP mostly matches another IP.</span>
								<br />
								<span class="emailunverified">Email is not yet verified.</span>
								<br />
							</div>
							<table className="ui celled table userlist">
								<thead>
									<tr>
										<th />
										<th
											style={{ 'white-space': 'nowrap' }}
											onClick={() => {
												clickSort('username');
											}}
										>
											Username {userSort.type === 'username' && <i className={userSort.direction === 'descending' ? 'angle down icon' : 'angle up icon'} />}
										</th>
										<th
											style={{ 'white-space': 'nowrap' }}
											onClick={() => {
												clickSort('IP');
											}}
										>
											IP {userSort.type === 'IP' && <i className={userSort.direction === 'descending' ? 'angle down icon' : 'angle up icon'} />}
										</th>
										<th
											style={{ 'white-space': 'nowrap' }}
											onClick={() => {
												clickSort('email');
											}}
										>
											Email suffix {userSort.type === 'email' && <i className={userSort.direction === 'descending' ? 'angle down icon' : 'angle up icon'} />}
										</th>
									</tr>
								</thead>
								<tbody>{this.renderUserlist()}</tbody>
							</table>
							<div className="ui horizontal divider">or</div>
							{this.renderPlayerInput()}
							<div className="ui horizontal divider">-</div>
							{this.renderActionText()}
							{this.renderButtons()}
						</div>
					)}
					<div className="modlog" style={{ maxWidth: this.state.playerListShown ? '60%' : '100%' }}>
						<h3>
							Moderation log{' '}
							<a href="#" onClick={toggleModLogToday} style={{ textDecoration: 'underline', fontSize: '12px' }}>
								{this.state.modLogToday ? 'Show all' : 'Show today only'}
							</a>
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
						<form onSubmit={this.handleBroadcastSubmit}>
							<input
								maxLength="300"
								placeholder="Broadcast"
								onChange={broadcastKeyup}
								className="broadcast-input"
								autoFocus
								value={this.state.broadcastText}
								ref={c => {
									this.broadcastText = c;
								}}
							/>
							<div onClick={this.handleBroadcastSubmit} className={this.state.broadcastText ? 'ui button primary' : 'ui button primary disabled'}>
								Submit
							</div>
						</form>
						<label htmlFor="broadcast-sticky">Also sticky this broadcast</label>
						<input className="stickycheck" type="checkbox" id="broadcast-sticky" />
					</div>
				</div>
			</section>
		);
	}
}

Moderation.propTypes = {
	userInfo: PropTypes.object,
	socket: PropTypes.object
};
