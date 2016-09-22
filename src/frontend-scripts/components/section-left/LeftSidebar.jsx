import React from 'react';
import SidebarGame from './SidebarGame.jsx';

export default class LeftSidebar extends React.Component {
	constructor() {
		super();
		this.createGameClick = this.createGameClick.bind(this);
	}

	createGameClick() {
		// this.props.onCreateGameButtonClick('createGame');
	}

	render() {
		return (
			<section className="section-left three wide column leftsidebar">
				{(() => {
					const {userName} = this.props.userInfo.user,
						gameBeingCreated = this.props.midSection.section === 'createGame';

					return (userName && !gameBeingCreated) ? <button className="ui button primary" onClick={this.createGameClick}>Create a new game</button> : <button className="ui button disabled">{gameBeingCreated ? 'Creating a new game..' : 'Sign in to make games'}</button>;
				})()}
				<div className="games-container">
					{this.props.gameList.list.sort((a, b) => {
						if (!a.gameState.isStarted && b.gameState.isStarted) {
							return -1;
						} else if (a.gameState.isStarted && !b.gameState.isStarted) {
							return 1;
						} else if (!a.gameState.isStarted && !b.gameState.isStarted) {
							return b.seatedCount - a.seatedCount;
						}

						if (a.gameState.isStarted && !a.gameState.isCompleted) {
							return b.gameState.isStarted ? -1 : 1;
						}

						if (b.gameState.isStarted && !b.gameState.isCompleted) {
							return a.gameState.isStarted ? 1 : -1;
						}

						if (a.gameState.isCompleted && !b.gameState.isCompleted) {
							return 1;
						} else if (b.gameState.isCompleted && !a.gameState.isCompleted) {
							return -1;
						}

						return 0;
					}).map((game, index) => {
						return (
							<SidebarGame
								key={index}
								game={game}
								socket={this.props.socket}
							/>
						);
					})}
				</div>
			</section>
		);
	}
}

LeftSidebar.propTypes = {
	userInfo: React.PropTypes.object,
	midSection: React.PropTypes.object,
	gameList: React.PropTypes.object,
	onCreateGameButtonClick: React.PropTypes.func,
	socket: React.PropTypes.object
};