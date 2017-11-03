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
						bGameStatus = b.gameStatus,
						aName = a.name.toLowerCase(),
						bName = b.name.toLowerCase();

					if (aGameStatus === 'notStarted' && bGameStatus === 'notStarted') {
						if (a.seatedCount === b.seatedCount) {
							if (aName === bName) {
								return a.uid < b.uid ? 1 : -1;
							} else {
								return aName > bName ? 1 : -1;
							}
						} else {
							return b.seatedCount - a.seatedCount;
						}
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
						if (a.seatedCount === b.seatedCount) {
							if (aName === bName) {
								return a.uid < b.uid ? 1 : -1;
							} else {
								return aName > bName ? 1 : -1;
							}
						} else {
							return b.seatedCount - a.seatedCount;
						}
					}

					return aName === bName ? (a.uid < b.uid ? 1 : -1) : aName > bName ? 1 : -1;
				})
				.map((game, index) => {
					return <DisplayLobbies key={game.uid} game={game} socket={props.socket} userList={props.userList} userInfo={props.userInfo} />;
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
						<a className="fluid ui button primary create-game-button" href="#/creategame">
							Create a new game
						</a>
					) : (
						<button className="fluid ui button primary disabled">{gameBeingCreated ? 'Creating a new game..' : 'Log in to make games'}</button>
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
	socket: PropTypes.object,
	userList: PropTypes.object
};

export default GamesList;
