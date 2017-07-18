import React from 'react';  // eslint-disable-line
import SidebarGame from './SidebarGame.jsx';
import PropTypes from 'prop-types';

const LeftSidebar = props => {
	const	renderGameList = () => {
		const {gameList} = props;

		if (gameList.length) {
			return gameList.sort((a, b) => {
				const aGameStatus = a.gameStatus,
					bGameStatus = b.gameStatus;

				if (aGameStatus === 'notStarted' && bGameStatus === 'notStarted') {
					return a.seatedCount - b.seatedCount;
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

				return 0;
			}).map((game, index) => {
				return (
					<SidebarGame
						key={index}
						game={game}
						socket={props.socket}
					/>
				);
			});
		}
	};

const handleDiscord = function() {
    window.location = '/auth/discord';
  };

	return (
		<section className="section-left three wide column leftsidebar">
			{(() => {
				const {userName} = props.userInfo,
					gameBeingCreated = props.midSection === 'createGame';

				return (userName && !gameBeingCreated) 
				? <button className="ui button primary" onClick={() => {props.onCreateGameButtonClick('createGame');}}>Create a new game</button>
				: <section><button className="ui button disabled">{gameBeingCreated ? 'Creating a new game..' : 'Sign in to make games'}</button>
				<button className="ui button primary" onClick={this.handleDiscord}>Login with Discord</button></section> ;
			})()}
			<div className="games-container">
				{renderGameList()}
			</div>
		</section>
	);
};

LeftSidebar.propTypes = {
	userInfo: PropTypes.object,
	midSection: PropTypes.string,
	gameList: PropTypes.array,
	onCreateGameButtonClick: PropTypes.func,
	socket: PropTypes.object
};

export default LeftSidebar;