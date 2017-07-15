import React from 'react';
import moment from 'moment';
import _ from 'lodash';
import $ from 'jquery';
import {ADMINS} from '../../constants';

export default class Moderation extends React.Component {
	constructor() {
		super();
		this.leaveModeration = this.leaveModeration.bind(this);
		this.togglePlayerList = this.togglePlayerList.bind(this);
		this.broadcastClick = this.broadcastClick.bind(this);
		this.handleBroadcastSubmit = this.handleBroadcastSubmit.bind(this);
		this.state = {
			selectedUser: '',
			userList: [],
			actionTextValue: '',
			log: [],
			playerListShown: true,
			broadcastText: ''
		};
	}

	componentDidMount() {
		this.props.socket.emit('getModInfo');

		this.props.socket.on('modInfo', info => {
			this.setState({
				userList: info.userList,
				log: info.modReports
			});
		});
	}

	componentWillUnmount() {
		this.props.socket.off('modInfo');
	}

	togglePlayerList() {
		this.setState({playerListShown: !this.state.playerListShown});
	}

	renderUserlist() {
		const radioChange = userName => {
				this.setState({selectedUser: userName});
			},
			{userList} = this.state,
			ips = userList.map(user => user.ip),
			multiIPs = _.uniq(_.filter(ips, (x, i, ips) => _.includes(ips, x, i + 1)));

		return userList
			.sort((a, b) => (() => {
				if (a.isRainbow && !b.isRainbow) {
					return 1;
				}

				if (b.isRainbow && !a.isRainbow) {
					return -1;
				}

				return b.userName - a.userName;
			})())
			.map((user, index) => <li key={index} className={multiIPs.includes(user.ip) ? 'multi' : ''}><label><input type="radio" name="users" onChange={() => {radioChange(user.userName);}} />{user.userName} <span className="ip">{user.ip}</span></label></li>);
	}

	renderButtons() {
		const takeModAction = action => {
			this.props.socket.emit('updateModAction', {
				modName: this.props.userInfo.userName,
				userName: this.state.selectedUser,
				ip: this.state.selectedUser ? this.state.userList.find(user => user.userName === this.state.selectedUser).ip : '',
				comment: this.state.actionTextValue,
				action
			});
			this.setState({
				selectedUser: '',
				actionTextValue: ''
			});
			setTimeout(() => {
				this.props.socket.emit('getModInfo');
			}, 500);
		};

		return (
			<div className="button-container">
				<button className={(!this.state.selectedUser || !this.state.actionTextValue) ? 'ui button primary disabled' : 'ui button primary'} onClick={() => {takeModAction('ban');}}>Ban user</button>
				<button className={!this.state.actionTextValue ? 'ui button disabled' : 'ui button'} onClick={() => {takeModAction('comment');}}>Comment without action</button>
				<button className={!this.state.actionTextValue ? 'ui button disabled ipban-button' : 'ui button ipban-button'} onClick={() => {takeModAction('ipban');}}>Ban and IP ban for 18 hours</button>
				<button className={(!this.state.actionTextValue && ADMINS.includes(this.props.userInfo.userName)) ? 'ui button disabled ipban-button' : 'ui button ipban-button'} onClick={() => {takeModAction('ipbanlarge');}}>Ban and IP ban for 1 week</button>
			</div>
		);
	}

	renderModLog() {
		return (
			<div>
				<table className="ui celled table">
					<thead>
						<tr>
							<th>Mod</th>
							<th>Date</th>
							<th>Action</th>
							<th>User</th>
							<th>IP</th>
							<th>Comment</th>
						</tr>
					</thead>
					<tbody>
						{this.state.log.map((report, index) => <tr key={index}><td>{report.modUserName}</td><td>{moment(new Date(report.date)).format('l')}</td><td>{report.actionTaken}</td><td>{report.actionTaken === 'comment' ? '' : report.userActedOn}</td><td>{report.ip}</td><td>{report.modNotes}</td></tr>)}
					</tbody>
				</table>
			</div>
		);
	}

	renderActionText() {
		const handleTextChange = e => {
			this.setState({actionTextValue: `${e.target.value}`});
		};

		return <textarea placeholder="Comment" value={this.state.actionTextValue} onChange={handleTextChange} spellCheck="false" />;
	}

	leaveModeration() {
		this.props.onLeaveModeration('default');
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
			action: 'broadcast'
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
		};

		return (
			<section className="moderation">
				<h2>Moderation</h2>
				<a className="broadcast" href="#" onClick={this.broadcastClick} >Broadcast to all players</a>
				<i className="remove icon" onClick={this.leaveModeration} />
				<span onClick={this.togglePlayerList} className="player-list-toggle">show/hide playerlist</span>
				<div>
					{(() => {
						if (this.state.playerListShown) {
							return (
								<div className="modplayerlist">
									<h3>Current player list</h3>
									<ul className="userlist">
										{this.renderUserlist()}
									</ul>
									{this.renderActionText()}
									{this.renderButtons()}
								</div>
							);
						}
					})()}
					<div className="modlog" style={{maxWidth: this.state.playerListShown ? '60%' : '100%'}}>
						<h3>Moderation log</h3>
						{this.renderModLog()}
					</div>
				</div>
				<div className="ui basic fullscreen modal broadcastmodal" ref={c => {
					this.bModal = c;
				}}>
					<div className="ui header">Broadcast to all games:</div>
					<div className="ui input">
						<form onSubmit={this.handleBroadcastSubmit}>
							<input maxLength="300" placeholder="Broadcast" onChange={broadcastKeyup} className="broadcast-input" autoFocus value={this.state.broadcastText} ref={c => {
								this.broadcastText = c;
							}} />
							<div onClick={this.handleBroadcastSubmit} className={this.state.broadcastText ? 'ui button primary' : 'ui button primary disabled'}>Submit</div>
						</form>
					</div>
				</div>
			</section>
		);
	}
}

Moderation.propTypes = {
	userInfo: React.PropTypes.object,
	socket: React.PropTypes.object,
	onLeaveModeration: React.PropTypes.func
};