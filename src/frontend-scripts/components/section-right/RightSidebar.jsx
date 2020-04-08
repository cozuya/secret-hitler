import React from 'react'; // eslint-disable-line
import Playerlist from './Playerlist.jsx';
import Generalchat from './Generalchat.jsx';
import PropTypes from 'prop-types';

const RightSidebar = (props) => {
	let classes = 'ui section-right transition';
	if (props.midSection === 'game') {
		classes += ' game';
	}

	return (
		<section className={classes} id={'playerlist'}>
			<Playerlist userInfo={props.userInfo} userList={props.userList} socket={props.socket} />
			<Generalchat
				gameInfo={props.gameInfo}
				socket={props.socket}
				generalChats={props.generalChats}
				userInfo={props.userInfo}
				userList={props.userList}
				allEmotes={props.allEmotes}
			/>
		</section>
	);
};

RightSidebar.propTypes = {
	gameInfo: PropTypes.object,
	userInfo: PropTypes.object,
	socket: PropTypes.object,
	generalChats: PropTypes.object,
	userList: PropTypes.object,
	midSection: PropTypes.string,
	allEmotes: PropTypes.array,
};

export default RightSidebar;
