import React from 'react'; // eslint-disable-line
import DisplayLobbies from './DisplayLobbies.jsx';
import PropTypes from 'prop-types';

const GamesList = props => {
	const renderGameList = () => {
		const { gameList } = props;
		if (gameList.length) {
			return gameList
				.sort((a, b) => {
					const aGameStatus = a.gameStatus,
						bGameStatus = b.gameStatus;

					if (aGameStatus === 'notStarted' && bGameStatus === 'notStarted') {
						return a.seatedCount === b.seatedCount ? a.uid - b.uid : a.seatedCount - b.seatedCount;
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
						return a.electionCount === b.electionCount ? a.seatedCount - b.seatedCount : a.electionCount - b.electionCount;
					}

					return a.uid > b.uid ? 1 : -1;
				})
				.map((game, index) => {
					return <DisplayLobbies key={index} game={game} socket={props.socket} userList={props.userList} userInfo={props.userInfo} />;
				});
		}
	};

	return (
		<section className="browser-container">
			<div className="browser-header">
				{(() => {
					const { userName } = props.userInfo,
						gameBeingCreated = props.midSection === 'createGame';

					return userName && !gameBeingCreated ? (
						<a className="fluid inverted ui button primary" href="#/creategame">
							Create a new game
						</a>
					) : (
						<button className="fluid inverted ui button disabled">{gameBeingCreated ? 'Creating a new game..' : 'Log in to make games'}</button>
					);
				})()}
			</div>
			<div className="browser-body">{renderGameList()}</div>
		</section>
	);
};

GamesList.propTypes = {
	userInfo: PropTypes.object,
	midSection: PropTypes.string,
	gameList: PropTypes.array,
	onCreateGameButtonClick: PropTypes.func,
	socket: PropTypes.object
};

export default GamesList;
