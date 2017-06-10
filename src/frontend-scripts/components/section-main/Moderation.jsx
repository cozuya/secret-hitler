import React from 'react';
import {ADMINS} from '../../constants';
import moment from 'moment';
import _ from 'lodash';

export default class Moderation extends React.Component {
	constructor() {
		super();
		this.leaveModeration = this.leaveModeration.bind(this);
		this.state = {
			selectedUser: '',
			userList: [],
			actionTextValue: '',
			log: []
		};
	}

	componentDidMount() {
		this.props.socket.emit('getModInfo');

		this.props.socket.on('modInfo', info => {
			// this.setState({
			// 	userList: info.userList,
			// 	log: info.modReports.reverse()
			// });
			this.setState({
				userList: new Array(40).fill({ip: 'hi'}),
				log: info.modReports.reverse()
			});
		});
	}

	componentWillUnmount() {
		this.props.socket.off('modInfo');
	}

	renderUserlist() {
		const radioChange = userName => {
				this.setState({selectedUser: userName});
			},
			{userName} = this.props.userInfo,
			{userList} = this.state,
			ips = userList.map(user => user.ip),
			multiIPs = _.uniq(_.filter(ips, (x, i, ips) => _.includes(ips, x, i + 1)));

		return userList
			.filter(user => ADMINS.includes(userName) || !user.isRainbow)
			.sort((a, b) => (a.losses + a.wins) + (b.losses + b.wins))
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
						{this.state.log.reverse().map((report, index) => <tr key={index}><td>{report.modUserName}</td><td>{moment(new Date(report.date)).format('l')}</td><td>{report.actionTaken}</td><td>{report.actionTaken === 'comment' ? '' : report.userActedOn}</td><td>{report.ip}</td><td>{report.modNotes}</td></tr>)}
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

	render() {
		return (
			<section className="moderation">
				<h2>Moderation</h2>
				<i className="remove icon" onClick={this.leaveModeration} />
				<div>
					<div className="modplayerlist">
						<h3>Current player list</h3>
						<ul className="userlist">
							{this.renderUserlist()}
						</ul>
						{this.renderActionText()}
						{this.renderButtons()}
					</div>
					<div className="modlog">
						<h3>Moderation log</h3>
						{this.renderModLog()}
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