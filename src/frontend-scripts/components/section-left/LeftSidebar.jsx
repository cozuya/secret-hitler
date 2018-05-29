import React from 'react'; // eslint-disable-line
import SidebarGame from './SidebarGame.jsx';
import PropTypes from 'prop-types';

const LeftSidebar = ({ userInfo, midSection, gameList, onCreateGameButtonClick, socket }) => {
	const renderGameList = () => {
		if (gameList.length) {
			return gameList
				.sort((a, b) => {
					const aGameStatus = a.gameStatus;
					const bGameStatus = b.gameStatus;

					if (aGameStatus === 'notStarted' && bGameStatus === 'notStarted') {
						return a.seatedCount === b.seatedCount ? (a.uid > b.uid ? 1 : -1) : a.seatedCount - b.seatedCount;
					}

					if (aGameStatus === 'notStarted' && bGameStatus !== 'notStarted') {
						return -1;
					}

					if (aGameStatus !== 'notStated' && bGameStatus === 'notStarted') {
						return 1;
					}

					if (aGameStatus === 'isStarted' && bGameStatus !== 'isStarted') {
						return -1;
					}

					if (aGameStatus !== 'isStarted' && bGameStatus === 'isStarted') {
						return 1;
					}

					if (aGameStatus === 'isStarted' && bGameStatus === 'isStarted') {
						if (a.electionCount === b.electionCount && a.seatedCount === b.seatedCount) {
							return a.uid > b.uid ? 1 : -1;
						} else if (a.electionCount === b.electionCount) {
							return a.seatedCount - b.seatedCount;
						} else {
							return a.electionCount - b.electionCount;
						}
					}

					return a.uid > b.uid ? 1 : -1;
				})
				.map((game, index) => <SidebarGame key={index} game={game} socket={socket} userInfo={userInfo} />);
		}
	};

	return (
		<section className="section-left three wide column leftsidebar">
			{(() => {
				const { userName } = userInfo;
				const gameBeingCreated = midSection === 'createGame';

				return userName && !gameBeingCreated ? (
					<a className="ui button primary" href="#/creategame">
						Create a new game
					</a>
				) : (
					<button className="ui button disabled">{gameBeingCreated ? 'Creating a new game..' : 'Sign in to make games'}</button>
				);
			})()}
			<div className="games-container">
				<div className="ui divider" />
				<h3 className="ui header centered hoz-gradient">Games</h3>
				<div className="ui divider" />
				{renderGameList()}
			</div>
		</section>
	);
};

LeftSidebar.defaultProps = {
	userInfo: {},
	gameList: []
};

LeftSidebar.propTypes = {
	userInfo: PropTypes.object,
	midSection: PropTypes.string,
	gameList: PropTypes.array,
	onCreateGameButtonClick: PropTypes.func,
	socket: PropTypes.object
};

export default LeftSidebar;
