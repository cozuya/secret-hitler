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
					gameInfo={this.props.gameInfo}
					socket={this.props.socket}
					generalChats={this.props.generalChats}
					userInfo={this.props.userInfo}
					userList={this.props.userList}
				/>
			</section>
		);
	}
}

RightSidebar.propTypes = {
	gameInfo: React.PropTypes.object,
	userInfo: React.PropTypes.object,
	socket: React.PropTypes.object,
	generalChats: React.PropTypes.array,
	userList: React.PropTypes.object
};