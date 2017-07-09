import React from 'react';
import Playerlist from './Playerlist.jsx';
import Generalchat from './Generalchat.jsx';
import PropTypes from 'prop-types';

export default class RightSidebar extends React.Component {
	render() {
		return (
			<section className="section-right three wide column">
				<Playerlist
					userInfo={this.props.userInfo}
					userList={this.props.userList}
					socket={this.props.socket}
					onModerationButtonClick={this.props.onModerationButtonClick}
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
	gameInfo: PropTypes.object,
	userInfo: PropTypes.object,
	socket: PropTypes.object,
	generalChats: PropTypes.array,
	userList: PropTypes.object,
	onModerationButtonClick: PropTypes.func
};