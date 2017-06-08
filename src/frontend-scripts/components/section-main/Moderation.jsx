import React from 'react';
import {MODERATORS, ADMINS} from '../../constants';
import _ from 'lodash';

export default class Moderation extends React.Component {
	constructor() {
		super();

		this.state = {
			selectedUser: '',
			userList: [],
			actionTextValue: ''
		};
	}

	componentDidMount() {
		this.props.socket.emit('getModInfo');

		this.props.socket.on('modInfo', info => {
			console.log(info);
			this.setState({userList: info.userList});
		});
	}

	componentWillUnmount() {
		this.props.socket.off('modInfo');
	}

	renderUserlist() {
		const radioChange = userName => {
				this.setState({selectedUser: userName});
			},
			{userList} = this.state,
			ips = userList.map(user => user.ip),
			multiIPs = _.uniq(_.filter(ips, (x, i, ips) => _.includes(ips, x, i + 1)));

		return userList
			.filter(user => !MODERATORS.includes(user.userName) && (ADMINS.includes(this.props.userInfo.userName) || !user.isRainbow))
			.sort((a, b) => (a.losses + a.wins) + (b.losses + b.wins))
			.map((user, index) => <li key={index} className={multiIPs.includes(user.ip) ? 'multi' : ''}><label><input type="radio" name="users" onChange={() => {radioChange(user.userName);}} />{user.userName} <span className="ip">{user.ip}</span></label></li>);
	}

	renderButtons() {
		const takeModAction = action => {
			this.props.socket.emit('updateModAction', {
				modName: this.props.userInfo.userName,
				userName: this.state.selectedUser,
				action
			});
			this.setState({selectedUser: ''});
			setTimeout(() => {
				this.props.socket.emit('getModInfo');
			}, 500);
		};

		return (
			<div className="button-container">
				<button disabled={!this.state.selectedUser} onClick={() => {takeModAction('ban');}}>Ban user</button>
			</div>
		);
	}

	renderModReports() {

	}

	renderActionText() {
		const handleTextChange = e => {
			this.setState({inputValue: `${e.target.value}`});
		};

		return <textarea value={this.state.actionTextValue} onChange={handleTextChange} spellcheck="false" />;
	}

	render() {
		return (
			<section className="moderation">
				<h2>Moderation</h2>
				<ul className="userlist">
					{this.renderUserlist()}
				</ul>
				{this.renderModReports()}
				{this.renderButtons()}
				{this.renderActionText()}
			</section>
		);
	}
}

Moderation.propTypes = {
	userInfo: React.PropTypes.object,
	socket: React.PropTypes.object
};