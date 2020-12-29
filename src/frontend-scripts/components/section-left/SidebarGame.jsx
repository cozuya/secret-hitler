import React from 'react'; // eslint-disable-line
import _ from 'lodash';
import PropTypes from 'prop-types';

const SidebarGame = ({ game, socket }) => {
	const gameClasses = () => {
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
	};
	const playersCount = () => {
		const availableSeatCounts = new Array(game.maxPlayersCount)
			.fill(true)
			.map((el, i) => (game.excludedPlayerCount.includes(i + 1) || i + 1 < game.minPlayersCount ? false : i + 1))
			.filter(el => el);

		let str = '';

		availableSeatCounts.forEach(el => {
			if (availableSeatCounts.includes(el)) {
				if (el === game.maxPlayersCount) {
					str = `${str}${el} players`;
				} else {
					if (availableSeatCounts.includes(el - 1)) {
						if (!availableSeatCounts.includes(el + 1)) {
							str = `${str}${el}, `;
						}
					} else {
						if (!str.length) {
							str = availableSeatCounts.includes(el + 1) ? `${el}-` : `${el},`;
						} else {
							str = !availableSeatCounts.includes(el + 1) ? `${str}${el},` : (str = `${str}${el}-`);
						}
					}
				}
			}
		});

		return str;
	};

	return (
		<div
			data-uid={game.uid}
			onClick={() => {
				socket.emit('getGameInfo', game.uid);
			}}
			className={gameClasses()}
		>
			{game.gameStatus === 'notStarted' ? (
				<div>
					{game.private && (
						<div className="private-game" title="This is a private game.  You can only be seated if you know the password, or are whitelisted">
							P
						</div>
					)}
					{(game.rebalance6p || game.rebalance7p || game.rebalance9p) && (
						<div
							className="rebalance-game"
							title="This is a rebalanced game - 6 player games start with a fascist policy enacted, 7 & 9 player games start with one less fascist policy."
						>
							{game.rebalance6p && game.rebalance7p && game.rebalance9p
								? 'R679'
								: game.rebalance6p && game.rebalance7p
								? 'R67'
								: game.rebalance6p && game.rebalance9p
								? 'R69'
								: game.rebalance7p && game.rebalance9p
								? 'R79'
								: game.rebalance6p
								? 'R6'
								: game.rebalance7p
								? 'R7'
								: 'R9'}
						</div>
					)}
					<div
						className={game.rainbowgame ? 'gamename rainbow' : 'gamename'}
						title={
							(game.rainbowgame ? 'Rainbow game - only players with 50+ games played can be seated in this game.' : 'Click here to enter this game table.') +
							' Already in game: ' +
							game.userNames.join(', ')
						}
					>
						{game.name}
					</div>
					{(() => {
						let status = '';

						if (game.experiencedMode) {
							status = 'Speed';
						}

						if (game.playerChats === 'disabled') {
							if (status) {
								status += ' | ';
							}
							status += 'No chat';
						} else if (game.playerChats === 'emotes') {
							if (status) {
								status += ' | ';
							}
							status += 'Emotes only';
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
						<span className="divider" style={{ color: 'var(--theme-text-2)' }}>
							|
						</span>
						<span className="seatedcount">
							{' '}
							{game.seatedCount} {game.seatedCount === 1 ? 'player' : 'players'}
						</span>
					</div>
				</div>
			) : (
				<div>
					{game.private && (
						<div className="private-game" title="This is a private game.">
							P
						</div>
					)}
					{game.rebalance69p && (
						<div
							className="rebalance-game"
							title="This is a rebalanced game - 6 player games start with a fascist policy enacted, 7 & 9 player games start with one less fascist policy."
						>
							R
						</div>
					)}
					<div className={game.rainbowgame ? 'gamename rainbow' : 'gamename'} title={'Playing: ' + game.userNames.join(', ')}>
						{game.name}
					</div>
					<div className="liberal-count">
						{_.range(1, 6).map(num => (
							<div key={num} className={num <= game.enactedLiberalPolicyCount ? 'box liberal-box filled' : 'box liberal-box unfilled'} />
						))}
					</div>
					<div className="fascist-count">
						{_.range(1, 7).map(num => (
							<div key={num} className={num <= game.enactedFascistPolicyCount ? 'box fascist-box filled' : 'box fascist-box unfilled'} />
						))}
					</div>
					<div className="lower-row">
						<span className="allowed-players">Election #{game.electionCount} </span>
						<span className="divider">|</span>
						<span className="seatedcount">
							{' '}
							{game.seatedCount} {game.seatedCount === 1 ? 'player' : 'players'} seated
						</span>
					</div>
				</div>
			)}
		</div>
	);
};

SidebarGame.propTypes = {
	game: PropTypes.object,
	socket: PropTypes.object
};

export default SidebarGame;
