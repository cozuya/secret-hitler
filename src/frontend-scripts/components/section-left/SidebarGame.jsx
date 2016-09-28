import React from 'react';

export default class SidebarGame extends React.Component {
	constructor() {
		super();
		this.routeToGame = this.routeToGame.bind(this);
	}

	routeToGame() {
		this.props.socket.emit('getGameInfo', this.props.game.uid);
	}

	render() {
		const {game} = this.props,
			gameClasses = () => {
				let classes = 'ui vertical segment';

				if (game.gameStatus === 'started') {
					classes += ' inprogress';
				} else if (game.gameStatus === 'completed') {
					classes += ' completed';
				}

				return classes;
			};

		return (
			<div data-uid={game.uid} onClick={this.routeToGame} className={gameClasses()}>
				<div>
					<span className="gamename">{game.name}</span>
					<span className="seatedcount">{game.seatedCount ? game.seatedCount.toString() : ''}</span>
				</div>
			</div>
		);
	}
}

SidebarGame.propTypes = {
	game: React.PropTypes.object,
	socket: React.PropTypes.object
};