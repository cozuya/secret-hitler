import React from 'react';
import _ from 'lodash';

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

				if (game.gameStatus === 'isStarted') {
					classes += ' inprogress';
				} else if (game.gameStatus === 'fascist') {
					classes += ' fascist';
				} else if (game.gameStatus === 'liberal') {
					classes += ' liberal';
				} else {
					classes += ' notstarted';
				}

				return classes;
			},
			playersCount = () => game.minPlayersCount === game.maxPlayersCount ? `${game.minPlayersCount} players` : `${game.minPlayersCount} - ${game.maxPlayersCount} players`;

		return (
			<div data-uid={game.uid} onClick={this.routeToGame} className={gameClasses()}>
				{(() => game.gameStatus === 'notStarted' ?
						(
							<div>
								<div className="gamename">{game.name}</div>
								{(() => {
									let status = '';

									if (game.experiencedMode) {
										status = 'Experienced';
									}

									if (game.disableChat) {
										if (status) {
											status += ' | ';
										}
										status += 'No chat';
									}

									if (game.private) {
										if (status) {
											status += ' | ';
										}
										status += 'Private';
									}


									if (game.disableGamechat) {
										if (status) {
											status += ' | ';
										}
										status += 'No gamechat';
									}

									if (status) {
										return <div className="experienced">{status}</div>;
									}
								})()}
								<div className="lower-row">
									<span className="allowed-players">{playersCount()} </span>
									<span className="divider">|</span>
									<span className="seatedcount"> {game.seatedCount} {game.seatedCount === 1 ? 'player' : 'players'} seated</span>
								</div>
							</div>
						) :
						(
							<div>
								<div className="gamename">{game.name}</div>
								<div className="liberal-count">
									{(() => _.range(1, 6).map(num => <div key={num} className={num <= game.enactedLiberalPolicyCount ? 'box liberal-box filled' : 'box liberal-box unfilled'} />)
									)()}
								</div>
								<div className="fascist-count">
									{(() => _.range(1, 7).map(num => <div key={num} className={num <= game.enactedFascistPolicyCount ? 'box fascist-box filled' : 'box fascist-box unfilled'} />)
									)()}
								</div>
								<div className="lower-row">
									<span className="allowed-players">Election #{game.electionCount} </span>
									<span className="divider">|</span>
									<span className="seatedcount"> {game.seatedCount} {game.seatedCount === 1 ? 'player' : 'players'} seated</span>
								</div>
							</div>
						)
				)()}
			</div>
		);
	}
}

SidebarGame.propTypes = {
	game: React.PropTypes.object,
	socket: React.PropTypes.object
};