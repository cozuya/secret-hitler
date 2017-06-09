import React from 'react';
import {MODERATORS, ADMINS} from '../../constants';
import _ from 'lodash';

export default class Moderation extends React.Component {
	constructor() {
		super();

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
			console.log(info);
			this.setState({
				userList: info.userList,
				log: info.modReports
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
				comment: this.state.actionTextValue,
				action
			});
			this.setState({selectedUser: ''});
			setTimeout(() => {
				this.props.socket.emit('getModInfo');
			}, 500);
		};

		return (
			<div className="button-container">
				<button className="ui button primary" disabled={!this.state.selectedUser || !this.state.actionTextValue} onClick={() => {takeModAction('ban');}}>Ban user</button>
				<button className="ui button secondary" disabled={!this.state.actionTextValue} onClick={() => {takeModAction('comment');}}>Comment to mod log without taking an action</button>
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
							<th>Comment</th>
						</tr>
					</thead>
					<tbody>
						{this.state.log.map((report, index) => <tr key={index}><td>{report.modUserName}</td><td>{report.date}</td><td>{report.actionTaken}</td><td>{report.userActedOn}</td><td>{report.modNotes}</td></tr>)}
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

	render() {
		return (
			<section className="moderation">
				<h2>Moderation</h2>
				<div>
					<ul className="userlist">
						{this.renderUserlist()}
					</ul>
					{this.renderActionText()}
					{this.renderButtons()}
				</div>
				<div>
					{this.renderModLog()}
				</div>
			</section>
		);
	}
}

Moderation.propTypes = {
	userInfo: React.PropTypes.object,
	socket: React.PropTypes.object
};