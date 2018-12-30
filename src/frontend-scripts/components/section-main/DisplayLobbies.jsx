import React from 'react'; // eslint-disable-line
import _ from 'lodash';
import PropTypes from 'prop-types';
import { PLAYERCOLORS } from '../../constants';

const DisplayLobbies = props => {
	const { game, userInfo, userList } = props;
	const gameClasses = () => {
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

		if (game.isTourny) {
			classes += ' tourny';
		}

		return classes;
	};

	const playerCount = game => {
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

		return str || game.seatedCount;
	};

	const optionIcons = () => {
		let rebalance;
		let rebalanceTooltip;
		let disableChat;
		let disableChatTooltip;
		let disableGamechat;
		let disableGamechatTooltip;
		let experiencedMode;
		let experiancedModeTooltip;
		let rainbowgame;
		let rainbowgameTooltip;
		let blind;
		let blindTooltip;
		let priv;
		let privTooltip;
		let privateOnly;
		let privateOnlyTooltip;
		let casualGame;
		let casualGameTooltip;
		let timedMode;
		let timedModeTooltip;
		let isVerifiedOnly;
		let isVerifiedOnlyTooltip;
		let eloMinimum;
		let eloMinimumTooltip;
		let customgameactive;
		let customgameactiveTooltip;

		if (game.casualGame) {
			casualGame = <i className="handshake icon" />;
			casualGameTooltip = 'Casual game - results do not count for wins or losses';
		}

		if (game.isCustomGame) {
			customgameactive = <i className="setting icon" />;
			customgameactiveTooltip = 'Custom Game';
		} else if (game.rebalance6p || game.rebalance7p || game.rebalance9p) {
			// ugly but lazy
			if (game.rebalance6p && game.rebalance7p && game.rebalance9p) {
				rebalance = <div> R679 </div>;
				rebalanceTooltip = 'Rebalanced 6, 7, and 9p games';
			} else if (game.rebalance7p && game.rebalance9p) {
				rebalance = <div> R79 </div>;
				rebalanceTooltip = 'Rebalanced 7 and 9p games';
			} else if (game.rebalance6p && game.rebalance7p) {
				rebalance = <div> R67 </div>;
				rebalanceTooltip = 'Rebalanced 6 and 7p games';
			} else if (game.rebalance6p && game.rebalance9p) {
				rebalance = <div> R69 </div>;
				rebalanceTooltip = 'Rebalanced 6 and 9p games';
			} else if (game.rebalance6p) {
				rebalance = <div> R6 </div>;
				rebalanceTooltip = 'Rebalanced 6p games';
			} else if (game.rebalance7p) {
				rebalance = <div> R7 </div>;
				rebalanceTooltip = 'Rebalanced 7p games';
			} else if (game.rebalance9p) {
				rebalance = <div> R9 </div>;
				rebalanceTooltip = 'Rebalanced 9p games';
			}
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

		if (game.privateOnly) {
			privateOnly = <i className="spy icon" />;
			privateOnlyTooltip = 'Private game only - only anonymous players.';
		}

		if (!game.privateOnly && game.private) {
			priv = <i className="lock icon" />;
			privTooltip = 'Private';
		}

		if (game.blindMode) {
			blind = <i className="hide icon" />;
			blindTooltip = 'Blind mode - players are anonymized';
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

		if (game.isVerifiedOnly) {
			isVerifiedOnly = <i className="thumbs up icon" />;
			isVerifiedOnlyTooltip = 'Only email-verified players can sit in this game.';
		}

		if (game.rainbowgame) {
			rainbowgame = <img style={{ maxHeight: '14px', marginBottom: '-2px' }} src="../images/rainbow.png" />;
			rainbowgameTooltip = 'Experienced Game';
		}

		if (game.timedMode) {
			timedMode = (
				<span style={{ color: 'peru' }}>
					<i className="hourglass half icon" />
					{`${Math.floor(game.timedMode / 60)}: ${game.timedMode % 60 < 10 ? `0${game.timedMode % 60}` : game.timedMode % 60}`}
				</span>
			);
			timedModeTooltip = `Timed Mode: ${Math.floor(game.timedMode / 60)}: ${game.timedMode % 60 < 10 ? `0${game.timedMode % 60}` : game.timedMode % 60}`;
		}

		if (game.eloMinimum) {
			eloMinimum = <span style={{ color: 'yellow' }}>Elo min: {game.eloMinimum}</span>;
			eloMinimumTooltip = `Elo minimum: ${game.eloMinimum}`;
		}

		return (
			<div className="options-icons-container">
				{game.isCustomGame && (
					<span className="customgame" data-tooltip={customgameactiveTooltip} data-inverted="">
						{customgameactive}
					</span>
				)}
				{casualGame && (
					<span data-tooltip={casualGameTooltip} data-inverted="">
						{casualGame}
					</span>
				)}
				{rebalance && (
					<span className="rebalanced" data-tooltip={rebalanceTooltip} data-inverted="">
						{rebalance}
					</span>
				)}
				{disableChat && (
					<span data-tooltip={disableChatTooltip} data-inverted="">
						{disableChat}
					</span>
				)}
				{disableGamechat && (
					<span data-tooltip={disableGamechatTooltip} data-inverted="">
						{disableGamechat}
					</span>
				)}
				{privateOnly && (
					<span data-tooltip={privateOnlyTooltip} data-inverted="">
						{privateOnly}
					</span>
				)}
				{priv && (
					<span data-tooltip={privTooltip} data-inverted="">
						{priv}
					</span>
				)}
				{blind && (
					<span data-tooltip={blindTooltip} data-inverted="">
						{blind}
					</span>
				)}
				{experiencedMode && (
					<span data-tooltip={experiancedModeTooltip} data-inverted="">
						{experiencedMode}
					</span>
				)}
				{rainbowgame && (
					<span data-tooltip={rainbowgameTooltip} data-inverted="">
						{rainbowgame}
					</span>
				)}
				{timedMode && (
					<span data-tooltip={timedModeTooltip} data-inverted="">
						{timedMode}
					</span>
				)}
				{eloMinimum && (
					<span data-tooltip={eloMinimumTooltip} data-inverted="">
						{eloMinimum}
					</span>
				)}
				{isVerifiedOnly && (
					<span data-tooltip={isVerifiedOnlyTooltip} data-inverted="">
						{isVerifiedOnly}
					</span>
				)}
			</div>
		);
	};

	const playerIcons = () => {
		const players = [];
		const total = [];
		const { gameSettings } = userInfo;
		// Might be a simpler way to write this. Just getting all the data we need and storing it in players[]
		if (game.blindMode) {
			return null;
		}

		game.userNames.forEach(el => players.push({ userName: game.private ? '' : el }));
		game.customCardback.forEach((el, index) => (players[index].customCardback = el));
		game.customCardbackUid.forEach((el, index) => (players[index].customCardbackUid = el));
		players.forEach((player, index) => {
			const userStats = userList.list ? userList.list.find(el => el.userName === player.userName) : null;

			if (userStats) {
				players[index].wins = userStats.wins;
				players[index].losses = userStats.losses;
				players[index].winsSeason = userStats.winsSeason;
				players[index].lossesSeason = userStats.lossesSeason;
				players[index].eloOverall = userStats.eloOverall;
				players[index].eloSeason = userStats.eloSeason;
			}
		});

		players.forEach(player => {
			const classes = PLAYERCOLORS(player, !(gameSettings && gameSettings.disableSeasonal), 'player-small-cardback');

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
		let progressText;
		let progressIcons;
		let classes = 'progress-text';

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
							{_.range(1, 6).map(num => (
								<div
									key={num}
									className={num <= game.enactedLiberalPolicyCount ? 'leftsidebar box liberal-box filled' : 'leftsidebar box liberal-box unfilled'}
								/>
							))}
						</div>
						<div className="fascist-count">
							{_.range(1, 7).map(num => (
								<div
									key={num}
									className={num <= game.enactedFascistPolicyCount ? 'leftsidebar box fascist-box filled' : ' leftsidebar box fascist-box unfilled'}
								/>
							))}
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
					<div>Enter</div>
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
							{userInfo.staffRole && userInfo.staffRole !== 'altmod' && <span style={{ color: 'lightblue' }}>{` Created by: ${game.gameCreatorName}`}</span>}
						</div>
						<div className="options-column experienced">{optionIcons()}</div>
					</div>
					<div className="game-main-bottom-row">
						{game.isTourny && game.tournyStatus && game.tournyStatus.queuedPlayers ? (
							<span className="game-tournament-unstarted">Tournament starting soon..</span>
						) : (
							<div className="player-icons-column">
								<div className="player-icons">{playerIcons()}</div>
							</div>
						)}
						<div className="player-count-column">
							<span className="seatedcount" style={{ fontWeight: 'bold' }}>
								{game.seatedCount || (game.tournyStatus && game.tournyStatus.queuedPlayers)}{' '}
							</span>
							<span className="divider">/</span>
							<span className="allowed-players"> {playerCount(game)}</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

DisplayLobbies.defaultProps = {
	game: {},
	socket: {},
	userInfo: {},
	userList: {}
};

DisplayLobbies.propTypes = {
	game: PropTypes.object,
	socket: PropTypes.object,
	userInfo: PropTypes.object,
	userList: PropTypes.object
};

export default DisplayLobbies;
