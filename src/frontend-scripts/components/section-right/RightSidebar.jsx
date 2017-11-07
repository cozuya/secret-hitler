import React from 'react'; // eslint-disable-line
import Playerlist from './Playerlist.jsx';
import Generalchat from './Generalchat.jsx';
import PropTypes from 'prop-types';

const RightSidebar = props => {
	let classes = 'section-right';
	if (props.midSection === 'game') {
		classes += ' game';
	}

	return (
		<section className={classes}>
			<Playerlist userInfo={props.userInfo} userList={props.userList} socket={props.socket} />
			<Generalchat gameInfo={props.gameInfo} socket={props.socket} generalChats={props.generalChats} userInfo={props.userInfo} userList={props.userList} />
		</section>
	);
};

RightSidebar.propTypes = {
	gameInfo: PropTypes.object,
	userInfo: PropTypes.object,
	socket: PropTypes.object,
	generalChats: PropTypes.object,
	userList: PropTypes.object,
	midSection: PropTypes.string
};

export default RightSidebar;
