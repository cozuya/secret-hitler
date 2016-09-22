import React from 'react';
import Playerlist from './Playerlist.jsx';
import Generalchat from './Generalchat.jsx';

export default class RightSidebar extends React.Component {
	render() {
		return (
			<section className="section-right three wide column">
				<Playerlist
					userList={this.props.userList}
				/>
				<div className="ui divider right-sidebar-divider" />
				<Generalchat
					socket={this.props.socket}
					generalChats={this.props.generalChats}
					userInfo={this.props.userInfo}
				/>
			</section>
		);
	}
}

RightSidebar.propTypes = {
	userInfo: React.PropTypes.object,
	socket: React.PropTypes.object,
	generalChats: React.PropTypes.object,
	userList: React.PropTypes.object
};