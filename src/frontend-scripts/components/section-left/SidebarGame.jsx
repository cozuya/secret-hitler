import React from 'react'; // eslint-disable-line
import _ from 'lodash';
import PropTypes from 'prop-types';

const SidebarGame = props => {
	const {game} = props,
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
		playersCount = () => {
			const availableSeatCounts = new Array(game.maxPlayersCount)
				.fill(true)
				.map((el, i) => (game.excludedPlayerCount.includes(i + 1) || i + 1 < game.minPlayersCount) ? false : i + 1)
				.filter(el => el);

			let str = '';

			availableSeatCounts.forEach(el => {
				if (availableSeatCounts.includes(el)) {
					if (!str.length) {
						str = `${el}`;
						return;
					}

					if (availableSeatCounts.includes(el - 1)) {
						if (availableSeatCounts[el] === game.maxPlayersCount) {
							str = `${str}-${el} players`;
							return;
						}

						if (!availableSeatCounts.includes(el + 1)) {
							str = `${str}-${el}, `;
							return;
						}
					} else {
						if (availableSeatCounts[el] === game.maxPlayersCount) {
							str = `${str}${el} players`;
							return;
						}

						if (!availableSeatCounts.includes(el + 1)) {
							str = `${str}${el},`;
							return;
						}
					}
				}
			});

			return str;
		};

	return (
		<div data-uid={game.uid} onClick={() => {props.socket.emit('getGameInfo', game.uid);}} className={gameClasses()}>
			{(() => game.gameStatus === 'notStarted' ?
					(
						<div>
							{(() => {
								if (game.private) {
									return <div className="private-game" title="This is a private game.  You can only be seated if you know the password, or are whitelisted">P</div>;
								}
							})()}
							<div className={game.rainbowgame ? 'gamename rainbow' : 'gamename'} title={game.rainbowgame ? 'Rainbow game - only players with 50+ games played can be seated in this game.' : 'Click here to enter this game table.'}>{game.name}</div>
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
								<span className="seatedcount"> {game.seatedCount} {game.seatedCount === 1 ? 'player' : 'players'}</span>
							</div>
						</div>
					) :
					(
						<div>
							<div className={game.rainbowgame ? 'gamename rainbow' : 'gamename'}>{game.name}</div>
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
};

SidebarGame.propTypes = {
	game: PropTypes.object,
	socket: PropTypes.object
};

export default SidebarGame;