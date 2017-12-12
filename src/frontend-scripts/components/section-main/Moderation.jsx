import React from 'react';
import moment from 'moment';
import _ from 'lodash';
import $ from 'jquery';
import { ADMINS, EDITORS } from '../../constants';
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
			logSort: {
				type: 'date',
				direction: 'descending'
			}
		};
	}

	componentDidMount() {
		const self = this,
			{ socket } = this.props;

		socket.on('modInfo', info => {
			this.setState({
				userList: info.userList,
				log: info.modReports
			});

			$(this.toggleIpbans).checkbox(info.accountCreationDisabled.status ? 'set checked' : 'set unchecked');
			$(this.toggleGameCreation).checkbox(info.accountCreationDisabled.status ? 'set checked' : 'set unchecked');
			$(this.toggleAccountCreation).checkbox(info.accountCreationDisabled.status ? 'set checked' : 'set unchecked');
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
				<input placeholder="Player or game name" onChange={playerInputKeyup} className="player-input" value={this.state.playerInputText} />
			</div>
		);
	}

	renderUserlist() {
		const radioChange = userName => {
				this.setState({ selectedUser: userName });
			},
			{ userList } = this.state,
			ips = userList.map(user => user.ip),
			multiIPs = _.uniq(_.filter(ips, (x, i, ips) => _.includes(ips, x, i + 1)));

		return userList
			.sort((a, b) =>
				(() => {
					if (a.isRainbow && !b.isRainbow) {
						return 1;
					}

					if (b.isRainbow && !a.isRainbow) {
						return -1;
					}

					if (a.isRainbow && b.isRainbow) {
						return a.userName > b.userName ? -1 : 1;
					}

					return a.userName > b.userName ? -1 : 1;
				})()
			)
			.map((user, index) => (
				<li key={index} title={user.isTor ? 'TOR user' : ''} className={user.isTor ? 'istor' : multiIPs.includes(user.ip) ? 'multi' : ''}>
					<label>
						<input
							type="radio"
							name="users"
							onChange={() => {
								radioChange(user.userName);
							}}
						/>
						{user.userName} <span className="ip">{user.ip}</span>
					</label>
				</li>
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
					setTimeout(() => {
						this.props.socket.emit('getModInfo');
					}, 500);
				}
			},
			{ selectedUser, actionTextValue, playerInputText } = this.state;

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
				<br />
				<button
					className={(selectedUser || playerInputText) && actionTextValue ? 'ui button ipban-button' : 'ui button disabled ipban-button'}
					onClick={() => {
						takeModAction('ban');
					}}
				>
					Ban user
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
						takeModAction(`setWins${this.state.actionTextValue}`);
					}}
				>
					Set wins
				</button>
				<button
					className={(selectedUser || playerInputText) && actionTextValue ? 'ui button tier3' : 'ui button disabled tier3'}
					onClick={() => {
						takeModAction(`setLosses${this.state.actionTextValue}`);
					}}
				>
					Set losses
				</button>
				<button
					className={(selectedUser || playerInputText) && actionTextValue ? 'ui button tier3' : 'ui button disabled tier3'}
					onClick={() => {
						takeModAction(`setRWins${this.state.actionTextValue}`);
					}}
				>
					Set R wins
				</button>
				<button
					className={(selectedUser || playerInputText) && actionTextValue ? 'ui button tier3' : 'ui button disabled tier3'}
					onClick={() => {
						takeModAction(`setRLosses${this.state.actionTextValue}`);
					}}
				>
					Set R losses
				</button>
				<button
					className={
						(selectedUser || playerInputText) &&
						actionTextValue &&
						(ADMINS.includes(this.props.userInfo.userName) || EDITORS.includes(this.props.userInfo.userName))
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
						(selectedUser || playerInputText) &&
						actionTextValue &&
						(ADMINS.includes(this.props.userInfo.userName) || EDITORS.includes(this.props.userInfo.userName))
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
						(selectedUser || playerInputText) &&
						actionTextValue &&
						(ADMINS.includes(this.props.userInfo.userName) || EDITORS.includes(this.props.userInfo.userName))
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
					style={{ background: 'black' }}
					className={
						actionTextValue && (ADMINS.includes(this.props.userInfo.userName) || EDITORS.includes(this.props.userInfo.userName))
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
		const { logSort } = this.state,
			clickSort = type => {
				this.setState({
					logSort: {
						type,
						direction: this.state.logSort.direction === 'descending' ? 'ascending' : 'descending'
					}
				});
			},
			modRetrieveClick = e => {
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

		return (
			<div>
				<table className="ui celled table">
					<thead>
						<tr>
							<th
								onClick={() => {
									clickSort('modUserName');
								}}
							>
								mod {logSort.type === 'modUserName' && <i className={logSort.direction === 'descending' ? 'angle down icon' : 'angle up icon'} />}
							</th>
							<th
								onClick={() => {
									clickSort('date');
								}}
							>
								Date {logSort.type === 'date' && <i className={logSort.direction === 'descending' ? 'angle down icon' : 'angle up icon'} />}
							</th>
							<th
								onClick={() => {
									clickSort('actionTaken');
								}}
							>
								Action {logSort.type === 'actionTaken' && <i className={logSort.direction === 'descending' ? 'angle down icon' : 'angle up icon'} />}
							</th>
							<th
								onClick={() => {
									clickSort('userActedOn');
								}}
							>
								Player {logSort.type === 'userActedOn' && <i className={logSort.direction === 'descending' ? 'angle down icon' : 'angle up icon'} />}
							</th>
							<th
								onClick={() => {
									clickSort('ip');
								}}
							>
								IP {logSort.type === 'ip' && <i className={logSort.direction === 'descending' ? 'angle down icon' : 'angle up icon'} />}
							</th>
							<th
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
							.filter(entry => (this.state.modLogToday ? new Date(entry.date).toDateString() === new Date().toDateString() : true))
							.sort((a, b) => {
								const { logSort } = this.state,
									aDate = new Date(a.date),
									bDate = new Date(b.date);

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
									<td>{report.modUserName}</td>
									<td>{moment(new Date(report.date)).format('YYYY-MM-DD HH:mm')}</td>
									<td>{report.actionTaken}</td>
									<td>{report.userActedOn}</td>
									<td>{report.ip}</td>
									<td>{report.modNotes}</td>
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
		const broadcastKeyup = e => {
				this.setState({
					broadcastText: e.currentTarget.value
				});
			},
			toggleModLogToday = e => {
				const { modLogToday } = this.state;
				e.preventDefault();

				this.setState({
					modLogToday: !modLogToday
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
							<ul className="userlist">{this.renderUserlist()}</ul>
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
