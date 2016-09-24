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
		// const setClass = role => roleMap[role].team,
		// 	renderRoles = roles => roles.map((role, i) => <div key={i} className={setClass(role)}>{roleMap[role].initial}</div>),
		// 	{game} = this.props,
		// 	gameClasses = () => {
		// 		let classes = 'ui vertical segment';

		// 		if (game.gameState.isStarted && !game.gameState.isCompleted) {
		// 			classes += ' inprogress';
		// 		}

		// 		if (game.gameState.isCompleted) {
		// 			classes += ' completed';
		// 		}

		// 		return classes;
		// 	};

// todo-release take closer look at functionality re: negative ternairy @ line 44

		const {game} = this.props;

		return (
			<div data-uid={game.uid} onClick={this.routeToGame}>
				<div>
					<span className={game.kobk ? 'gamename kobk' : 'gamename'}>{game.name}</span>
					<span className="gamelength">{game.time}</span>
					<span className="seatedcount">{game.seatedCount ? game.seatedCount.toString() : ''}/7</span>
				</div>
				<div className="rolelist">
					<div>
					</div>
					<div>
					</div>
				</div>
			</div>
		);
	}
}

SidebarGame.propTypes = {
	game: React.PropTypes.object,
	socket: React.PropTypes.object
};