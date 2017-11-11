import React from 'react'; // eslint-disable-line
import _ from 'lodash';
import PropTypes from 'prop-types';
import { PLAYERCOLORS } from '../../constants';

const DisplayLobbies = props => {
	const { game, userInfo, userList } = props,
		gameClasses = () => {
			let classes = 'browser-row';

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
		playerCount = () => {
			const availableSeatCounts = new Array(game.maxPlayersCount)
				.fill(true)
				.map((el, i) => (game.excludedPlayerCount.includes(i + 1) || i + 1 < game.minPlayersCount ? false : i + 1))
				.filter(el => el);

			let str = '';

			availableSeatCounts.forEach(el => {
				if (availableSeatCounts.includes(el)) {
					if (el === game.maxPlayersCount) {
						str = `${str}${el}`;
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

	const optionIcons = () => {
		let rebalance69p,
			rebalance69pTooltip,
			disableChat,
			disableChatTooltip,
			disableGamechat,
			disableGamechatTooltip,
			experiencedMode,
			experiancedModeTooltip,
			rainbowgame,
			rainbowgameTooltip;

		if (game.rebalance69p) {
			rebalance69p = <div> R </div>;
			rebalance69pTooltip = 'Rebalanced 6, 7, & 9 player games';
		}

		if (game.disableChat) {
			disableChat = (
				<i className="icons">
					<i className="unmute icon" />
					<i className="large remove icon" style={{ opacity: '0.6', color: '#1b1b1b' }} />
				</i>
			);
			disableChatTooltip = 'Player Chat Disabled';
		}

		if (game.disableGamechat) {
			disableGamechat = (
				<i className="icons">
					<i className="game icon" />
					<i className="large remove icon" style={{ opacity: '0.6', color: '#1b1b1b' }} />
				</i>
			);
			disableGamechatTooltip = 'Game Chat Disabled';
		}

		if (game.experiencedMode) {
			experiencedMode = <i className="fast forward icon" />;
			experiancedModeTooltip = 'Speed Mode';
		}

		if (game.rainbowgame) {
			rainbowgame = <img style={{ maxHeight: '14px', marginBottom: '-2px' }} src="../images/rainbow.png" />;
			rainbowgameTooltip = 'Experienced Game';
		}

		return (
			<div className="options-icons-container">
				<span className="rebalanced" data-tooltip={rebalance69pTooltip} data-inverted="">
					{rebalance69p}
				</span>
				<span data-tooltip={disableChatTooltip} data-inverted="">
					{disableChat}
				</span>
				<span data-tooltip={disableGamechatTooltip} data-inverted="">
					{disableGamechat}
				</span>
				<span data-tooltip={experiancedModeTooltip} data-inverted="">
					{experiencedMode}
				</span>
				<span data-tooltip={rainbowgameTooltip} data-inverted="">
					{rainbowgame}
				</span>
			</div>
		);
	};

	const playerIcons = () => {
		const players = [],
			total = [];

		// Might be a simpler way to write this. Just getting all the data we need and storing it in players[]
		game.userNames.forEach(el => players.push({ userName: el }));
		game.customCardback.forEach((el, index) => (players[index].customCardback = el));
		game.customCardbackUid.forEach((el, index) => (players[index].customCardbackUid = el));
		players.forEach((player, index) => {
			const userStats = userList.list.find(el => el.userName === player.userName);
			if (userStats) {
				players[index].wins = userStats.wins;
				players[index].losses = userStats.losses;
			}
		});

		players.forEach(player => {
			const classes = player.wins + player.losses > 49 ? `player-small-cardback ${PLAYERCOLORS(player)}` : 'player-small-cardback';

			if (player.customCardback && (!userInfo.userName || !(userInfo.userName && userInfo.gameSettings && userInfo.gameSettings.disablePlayerCardbacks))) {
				total.push(
					<div key={total.length} className={classes} data-tooltip={player.userName} data-inverted="">
						<img src={`../images/custom-cardbacks/${player.userName}.${player.customCardback}?${player.customCardbackUid}`} />
					</div>
				);
			} else {
				total.push(
					<div key={total.length} className={classes} data-tooltip={player.userName} data-inverted="">
						<img src={`../images/default_cardback.png`} />
					</div>
				);
			}
		});

		// Adds empty seat icons
		if (game.gameStatus === 'notStarted') {
			const difference = game.maxPlayersCount - players.length;
			for (let i = 1; i <= difference; i++) {
				if (players.length + i >= game.minPlayersCount && !game.excludedPlayerCount.includes(players.length + i)) {
					total.push(
						<div key={total.length} className="empty-seat-icons included-player-count">
							{players.length + i}
						</div>
					);
				} else {
					total.push(
						<div key={total.length} className="empty-seat-icons">
							{players.length + i}
						</div>
					);
				}
			}
		}
		return total;
	};

	const gameProgress = () => {
		let progressText,
			progressIcons,
			classes = 'progress-text';
		if (game.private) {
			classes += ' private';
			progressText = 'Private Game';
			progressIcons = (
				<div className="progress-icons private">
					<i className="yellow lock icon" title="This is a private game.  You can only be seated if you know the password, or are whitelisted" />
				</div>
			);
		} else if (game.gameStatus === 'liberal') {
			classes += ' liberal';
			progressText = 'Liberals Win !';
			progressIcons = (
				<div className="victory-icon">
					<img src="../images/bird.png" />
				</div>
			);
		} else if (game.gameStatus === 'fascist') {
			classes += ' fascist';
			progressText = 'Fascists Win !';
			progressIcons = (
				<div className="victory-icon">
					<img src="../images/skull.png" />
				</div>
			);
		} else if (game.gameStatus === 'notStarted') {
			classes += ' waiting';
			progressText = 'Waiting for players...';
		} else {
			if (game.electionCount > 0) {
				progressText = 'Election #' + game.electionCount;
				progressIcons = (
					<div className="progress-icons">
						<div className="liberal-count">
							{(() =>
								_.range(1, 6).map(num => (
									<div
										key={num}
										className={num <= game.enactedLiberalPolicyCount ? 'leftsidebar box liberal-box filled' : 'leftsidebar box liberal-box unfilled'}
									/>
								)))()}
						</div>
						<div className="fascist-count">
							{(() =>
								_.range(1, 7).map(num => (
									<div
										key={num}
										className={num <= game.enactedFascistPolicyCount ? 'leftsidebar box fascist-box filled' : ' leftsidebar box fascist-box unfilled'}
									/>
								)))()}
						</div>
					</div>
				);
			} else {
				progressText = 'Starting Game...';
			}
		}
		return (
			<div className="game-progress">
				<div className="hidden-join-message">
					<i className="share icon" />
					<div>Join</div>
				</div>
				<span className={classes}>{progressText}</span>
				{progressIcons}
			</div>
		);
	};

	const renderFlag = () => {
		if (game.flag !== 'none') {
			return <i className={`ui flag ${game.flag}`} />;
		}
	};

	return (
		<div
			data-uid={game.uid}
			onClick={() => {
				location.href = `#/table/${game.uid}`;
			}}
			className={gameClasses()}
		>
			<div className="game-row">
				{gameProgress()}
				<div className="game-main">
					<div className="game-main-top-row">
						<div className="gamename-column">
							{renderFlag()}
							{game.name}
						</div>
						<div className="options-column experienced">{optionIcons()}</div>
					</div>
					<div className="game-main-bottom-row">
						<div className="player-icons-column">
							<div className="player-icons">{playerIcons()}</div>
						</div>
						<div className="player-count-column">
							<span className="seatedcount" style={{ fontWeight: 'bold' }}>
								{game.seatedCount}{' '}
							</span>
							<span className="divider">/</span>
							<span className="allowed-players"> {playerCount()}</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

DisplayLobbies.propTypes = {
	game: PropTypes.object,
	socket: PropTypes.object,
	userInfo: PropTypes.object,
	userList: PropTypes.object
};

export default DisplayLobbies;
