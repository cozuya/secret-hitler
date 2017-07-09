import React from 'react'; // eslint-disable-line
import Playerlist from './Playerlist.jsx';
import Generalchat from './Generalchat.jsx';
import PropTypes from 'prop-types';

const RightSidebar = props =>
	(
		<section className="section-right three wide column">
			<Playerlist
				userInfo={props.userInfo}
				userList={props.userList}
				socket={props.socket}
				onModerationButtonClick={props.onModerationButtonClick}
			/>
			<div className="ui divider right-sidebar-divider" />
			<Generalchat
				gameInfo={props.gameInfo}
				socket={props.socket}
				generalChats={props.generalChats}
				userInfo={props.userInfo}
				userList={props.userList}
			/>
		</section>
	);

RightSidebar.propTypes = {
	gameInfo: PropTypes.object,
	userInfo: PropTypes.object,
	socket: PropTypes.object,
	generalChats: PropTypes.array,
	userList: PropTypes.object,
	onModerationButtonClick: PropTypes.func
};

export default RightSidebar;