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
				} else {
					classes += ' notstarted';
				}

				return classes;
			},
			playersCount = () => game.minPlayersCount === game.maxPlayersCount ? `${game.minPlayersCount} players` : `${game.minPlayersCount} - ${game.maxPlayersCount} players`;

		return (
			<div data-uid={game.uid} onClick={this.routeToGame} className={gameClasses()}>
				{(() => {
					return game.gameStatus === 'notStarted' ?
						(
							<div>
								<div className="gamename">{game.name}</div>
								<div className="lower-row">
									<span className="allowed-players">{playersCount()} </span>
									<span className="divider">|</span>
									<span className="seatedcount"> {game.seatedCount} {game.seatedCount === 1 ? 'player' : 'players'} seated</span>
								</div>
							</div>
						) :
						(
							<div>
								<span className="gamename">{game.name}</span>
							</div>
						);
				})()}
			</div>
		);
	}
}

SidebarGame.propTypes = {
	game: React.PropTypes.object,
	socket: React.PropTypes.object
};