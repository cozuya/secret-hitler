import React from 'react';
import SidebarGame from './SidebarGame.jsx';

export default class LeftSidebar extends React.Component {
	constructor() {
		super();
		this.createGameClick = this.createGameClick.bind(this);
	}

	createGameClick() {
		this.props.onCreateGameButtonClick('createGame');
	}

	renderGameList() {
		const {gameList} = this.props;

		if (gameList.length) {
			return gameList.sort((a, b) => {
				const aGameStatus = a.gameStatus,
					bGameStatus = b.gameStatus;

				console.log(aGameStatus);
				console.log(bGameStatus);
				if (aGameStatus === 'completed' && bGameStatus !== 'completed') {
					return 1;
				} else if (bGameStatus === 'completed' && aGameStatus !== 'completed') {
					return -1;
				}

				if (aGameStatus !== 'isStarted' && bGameStatus === 'isStarted') {
					return -1;
				} else if (aGameStatus === 'isStarted' && bGameStatus !== 'isStarted') {
					return 1;
				} else if (aGameStatus === 'notStarted' && bGameStatus === 'notStarted') {
					return b.seatedCount - a.seatedCount;
				}

				// if (a.gameState.isStarted && !a.gameState.isCompleted) {
				// 	return b.gameState.isStarted ? -1 : 1;
				// }

				// if (b.gameState.isStarted && !b.gameState.isCompleted) {
				// 	return a.gameState.isStarted ? 1 : -1;
				// }

				return 0;
			}).map((game, index) => {
				return (
					<SidebarGame
						key={index}
						game={game}
						socket={this.props.socket}
					/>
				);
			});
		}
	}

	render() {
		return (
			<section className="section-left three wide column leftsidebar">
				{(() => {
					const {userName} = this.props.userInfo,
						gameBeingCreated = this.props.midSection === 'createGame';

					return (userName && !gameBeingCreated) ? <button className="ui button primary" onClick={this.createGameClick}>Create a new game</button> : <button className="ui button disabled">{gameBeingCreated ? 'Creating a new game..' : 'Sign in to make games'}</button>;
				})()}
				<div className="games-container">
					{this.renderGameList()}
				</div>
			</section>
		);
	}
}

LeftSidebar.propTypes = {
	userInfo: React.PropTypes.object,
	midSection: React.PropTypes.string,
	gameList: React.PropTypes.array,
	onCreateGameButtonClick: React.PropTypes.func,
	socket: React.PropTypes.object
};