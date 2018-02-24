import React from 'react';
import $ from 'jquery';
import Policies from './Policies.jsx';
import Dropdown from 'semantic-ui-dropdown';
import { EDITORS, ADMINS, PLAYERCOLORS, MODERATORS, CURRENTSEASONNUMBER } from '../../constants';
import PropTypes from 'prop-types';

$.fn.dropdown = Dropdown;

export default class Players extends React.Component {
	constructor() {
		super();
		this.clickedTakeSeat = this.clickedTakeSeat.bind(this);
		this.handlePlayerClick = this.handlePlayerClick.bind(this);
		this.handlePlayerDoubleClick = this.handlePlayerDoubleClick.bind(this);
		this.handlePasswordSubmit = this.handlePasswordSubmit.bind(this);
		this.handleReportSubmit = this.handleReportSubmit.bind(this);
		this.state = {
			passwordValue: '',
			reportedPlayer: '',
			reportTextValue: ''
		};
	}

	handlePlayerDoubleClick(userName) {
		if ((!this.props.gameInfo.general.private && this.props.userInfo.userName && this.props.userInfo.userName !== userName) || this.props.isReplay) {
			this.setState({ reportedPlayer: userName });
			$(this.reportModal).modal('show');
			$('.ui.dropdown').dropdown();
		}
	}

	handlePlayerClick(e) {
		const { userInfo, gameInfo, socket } = this.props;
		const { gameState } = gameInfo;
		const { phase, clickActionInfo } = gameState;
		const index = parseInt($(e.currentTarget).attr('data-index'), 10);

		if (phase === 'selectingChancellor' && userInfo.userName) {
			if (clickActionInfo[0] === userInfo.userName && clickActionInfo[1].includes(index)) {
				socket.emit('presidentSelectedChancellor', {
					chancellorIndex: index,
					uid: gameInfo.general.uid
				});
			}
		}

		if (phase === 'selectPartyMembershipInvestigate' && userInfo.userName) {
			if (clickActionInfo[0] === userInfo.userName && clickActionInfo[1].includes(index)) {
				socket.emit('selectPartyMembershipInvestigate', {
					playerIndex: index,
					uid: gameInfo.general.uid
				});
			}
		}

		if (phase === 'execution' && userInfo.userName) {
			if (clickActionInfo[0] === userInfo.userName && clickActionInfo[1].includes(index)) {
				socket.emit('selectedPlayerToExecute', {
					playerIndex: index,
					uid: gameInfo.general.uid
				});
			}
		}

		if (phase === 'specialElection' && userInfo.userName) {
			if (clickActionInfo[0] === userInfo.userName && clickActionInfo[1].includes(index)) {
				socket.emit('selectedSpecialElection', {
					playerIndex: index,
					uid: gameInfo.general.uid
				});
			}
		}
	}

	renderPreviousGovtToken(i) {
		const { publicPlayersState } = this.props.gameInfo;

		if (publicPlayersState && publicPlayersState[i].previousGovernmentStatus) {
			return <div className={`government-token previous-government-token ${publicPlayersState[i].previousGovernmentStatus}`} />;
		}
	}

	renderGovtToken(i) {
		const { publicPlayersState } = this.props.gameInfo;

		if (publicPlayersState && publicPlayersState[i].governmentStatus) {
			return <div className={`government-token ${publicPlayersState[i].governmentStatus}`} />;
		}
	}

	renderLoader(i) {
		const { publicPlayersState } = this.props.gameInfo;

		if (publicPlayersState && publicPlayersState[i].isLoader) {
			return <div className="ui active tiny inverted loader" />;
		}
	}

	renderPlayers() {
		const { gameInfo, userInfo } = this.props;
		const { gameSettings } = userInfo;
		const { playersState, gameState, publicPlayersState } = gameInfo;
		const isBlind = gameInfo.general.blindMode && !gameInfo.gameState.isCompleted;
		const time = new Date().getTime();
		const renderPlayerName = (player, i) => {
			const userName = isBlind ? (gameInfo.gameState.isTracksFlipped ? gameInfo.general.replacementNames[i] : '?') : player.userName;
			const prependCrowns = str => (
				<span>
					{!(userInfo.gameSettings && Object.keys(userInfo.gameSettings).length && userInfo.gameSettings.disableCrowns) &&
						(!gameInfo.general.blindMode || gameInfo.gameState.isCompleted) &&
						player.tournyWins &&
						player.tournyWins.filter(winTime => time - winTime < 10800000).map((crown, ind) => <span className="crown-icon" key={player.tournyWins[ind]} />)}
					{str}
				</span>
			);

			if (
				player.isPrivate &&
				!(MODERATORS.includes(userInfo.userName) || ADMINS.includes(userInfo.userName) || EDITORS.includes(userInfo.userName)) &&
				!userInfo.isSeated
			) {
				return prependCrowns('Anonymous');
			}

			if (gameState.isTracksFlipped) {
				return prependCrowns(`${i + 1}. ${userName}`);
			}

			return prependCrowns(userName);
		};

		return publicPlayersState.map((player, i) => (
			<div
				key={i}
				data-index={i}
				onClick={this.handlePlayerClick}
				style={
					player.customCardback &&
					!isBlind &&
					(!userInfo.userName || !(userInfo.userName && userInfo.gameSettings && userInfo.gameSettings.disablePlayerCardbacks))
						? {
								backgroundImage: `url(../images/custom-cardbacks/${player.userName}.${player.customCardback}?${player.customCardbackUid})`
							}
						: {
								backgroundImage: `url(../images/default_cardback.png)`
							}
				}
				className={(() => {
					let classes = 'player-container';
					let user = Object.keys(this.props.userList).length ? this.props.userList.list.find(play => play.userName === player.userName) : null;
					let w;
					let l;

					if (user) {
						w = !(gameSettings && gameSettings.disableSeasonal) ? user[`winsSeason${CURRENTSEASONNUMBER}`] : user.wins;
						l = !(gameSettings && gameSettings.disableSeasonal) ? user[`lossesSeason${CURRENTSEASONNUMBER}`] : user.losses;
					}

					if (playersState && Object.keys(playersState).length && playersState[i] && playersState[i].notificationStatus) {
						classes = `${classes} notifier ${playersState[i].notificationStatus}`;
					} else if (publicPlayersState && Object.keys(publicPlayersState).length && publicPlayersState[i].notificationStatus) {
						classes = `${classes} notifier ${publicPlayersState[i].notificationStatus}`;
					}

					if (publicPlayersState && Object.keys(publicPlayersState).length && publicPlayersState[i].isDead) {
						classes = `${classes} isDead`;
					}

					if (user && w + l > 49 && !isBlind) {
						classes = `${classes} ${PLAYERCOLORS(user, !(gameSettings && gameSettings.disableSeasonal))}`;
					}

					return classes;
				})()}
			>
				<div
					title={
						isBlind
							? 'Double click to open a modal to report this player to the moderator team'
							: `Double click to open a modal to report ${player.userName} to the moderator team`
					}
					onDoubleClick={() => {
						this.handlePlayerDoubleClick(player.userName);
					}}
					className={(() => {
						let classes = 'player-number';

						if (playersState && Object.keys(playersState).length && playersState[i] && playersState[i].nameStatus) {
							classes = `${classes} ${playersState[i].nameStatus}`;
						} else if (Object.keys(publicPlayersState).length && publicPlayersState[i].nameStatus) {
							classes = `${classes} ${publicPlayersState[i].nameStatus}`;
						}

						if (publicPlayersState[i].leftGame) {
							classes = `${classes} leftgame`;
						} else if (!publicPlayersState[i].connected) {
							classes = `${classes} disconnected`;
						}

						if (userInfo.gameSettings && userInfo.gameSettings.blacklist.includes(player.userName)) {
							classes = `${classes} blacklisted`;
						}

						return classes;
					})()}
				>
					{renderPlayerName(player, i)}
				</div>
				{this.renderPreviousGovtToken(i)}
				{this.renderLoader(i)}
				{this.renderGovtToken(i)}
				<div
					className={(() => {
						let classes = 'card-container';

						if (
							(playersState && Object.keys(playersState).length && playersState[i] && playersState[i].cardStatus.cardDisplayed) ||
							(publicPlayersState && publicPlayersState[i].cardStatus.cardDisplayed)
						) {
							classes += ' showing';
						}

						if (
							(playersState && Object.keys(playersState).length && playersState[i] && playersState[i].cardStatus.isFlipped) ||
							(publicPlayersState && publicPlayersState[i].cardStatus.isFlipped)
						) {
							classes += ' flipped';
						}
						return classes;
					})()}
				>
					<div
						className={(() => {
							let classes = 'card card-front';

							if (publicPlayersState[i] && Object.keys(publicPlayersState[i]).length && publicPlayersState[i].cardStatus.cardFront) {
								classes = `${classes} ${publicPlayersState[i].cardStatus.cardFront}`;
							}

							return classes;
						})()}
					/>
					<div
						className={(() => {
							let classes = 'card card-back';

							if (
								playersState &&
								playersState.length &&
								Object.keys(playersState[i]).length &&
								Object.keys(playersState[i].cardStatus).length &&
								Object.keys(playersState[i].cardStatus.cardBack).length
							) {
								if (playersState[i].cardStatus.cardBack.icon || playersState[i].cardStatus.cardBack.icon === 0) {
									classes = `${classes} ${playersState[i].cardStatus.cardBack.cardName}${playersState[i].cardStatus.cardBack.icon.toString()}`;
								} else {
									classes = `${classes} ${playersState[i].cardStatus.cardBack.cardName}`;
								}
							} else if (publicPlayersState && Object.keys(publicPlayersState[i].cardStatus.cardBack).length) {
								if (publicPlayersState[i].cardStatus.cardBack.icon || publicPlayersState[i].cardStatus.cardBack.icon === 0) {
									classes = `${classes} ${publicPlayersState[i].cardStatus.cardBack.cardName}${publicPlayersState[i].cardStatus.cardBack.icon.toString()}`;
								} else {
									classes = `${classes} ${publicPlayersState[i].cardStatus.cardBack.cardName}`;
								}
							}

							return classes;
						})()}
					/>
				</div>
			</div>
		));
	}

	renderTakeSeat() {
		const { userInfo, gameInfo, userList } = this.props;
		const user = userList.list ? userList.list.find(user => user.userName === userInfo.userName) : null;

		if (
			!userInfo.isSeated &&
			userInfo.userName &&
			!gameInfo.gameState.isTracksFlipped &&
			gameInfo.publicPlayersState.length < 10 &&
			(!userInfo.userName || !gameInfo.publicPlayersState.find(player => player.userName === userInfo.userName)) &&
			(!gameInfo.general.rainbowgame || (user && user.wins + user.losses > 49)) &&
			(userInfo.gameSettings && (!userInfo.gameSettings.isPrivate || gameInfo.general.private)) &&
			(!gameInfo.general.privateOnly || (userInfo.gameSettings && userInfo.gameSettings.isPrivate))
		) {
			return gameInfo.general.isTourny ? (
				<div className="ui left pointing label tourny" onClick={this.clickedTakeSeat}>
					Queue for tournament
				</div>
			) : (
				<div className="ui left pointing label" onClick={this.clickedTakeSeat}>
					Take a seat
				</div>
			);
		}
	}

	handlePasswordSubmit(e) {
		e.preventDefault();

		this.props.onClickedTakeSeat(this.state.passwordValue);
		$(this.passwordModal).modal('hide');
	}

	handleReportSubmit(e) {
		const { gameInfo } = this.props;
		e.preventDefault();

		if (!this.state.reportTextValue) {
			return;
		}

		this.props.socket.emit('playerReport', {
			uid: gameInfo.general.uid,
			userName: this.props.userInfo.userName || 'from replay',
			gameType: gameInfo.general.isTourny ? 'tournament' : gameInfo.general.casualGame ? 'casual' : 'standard',
			reportedPlayer: this.state.reportedPlayer,
			reason: $('input[name="reason"]').attr('value'),
			comment: this.state.reportTextValue
		});
		$(this.reportModal).modal('hide');
	}

	clickedTakeSeat() {
		const { gameInfo, userInfo, onClickedTakeSeat } = this.props;

		if (userInfo.userName) {
			if (gameInfo.general.gameCreatorBlacklist.includes(userInfo.userName)) {
				$(this.blacklistModal).modal('show');
			} else if (userInfo.gameSettings.unbanTime && new Date(userInfo.gameSettings.unbanTime) > new Date()) {
				window.alert('Sorry, this service is currently unavailable.');
			} else if (gameInfo.general.private && !gameInfo.general.whitelistedPlayers.includes(userInfo.userName)) {
				$(this.passwordModal).modal('show');
			} else {
				onClickedTakeSeat();
			}
		} else {
			$(this.signinModal).modal('show');
		}
	}

	render() {
		const handlePasswordInputChange = e => {
			this.setState({ passwordValue: `${e.target.value}` });
		};
		const handleReportTextChange = e => {
			this.setState({ reportTextValue: `${e.target.value}` });
		};
		const isBlind = this.props.gameInfo.general.blindMode && !this.props.gameInfo.gameState.isCompleted;

		return (
			<section className="players">
				{this.renderPlayers()}
				{this.renderTakeSeat()}

				<div
					className="ui basic small modal signinnag"
					ref={c => {
						this.signinModal = c;
					}}
				>
					<div className="ui header">You will need to sign in or sign up for an account to play.</div>
				</div>

				<div
					className="ui basic small modal"
					ref={c => {
						this.blacklistModal = c;
					}}
				>
					<div className="ui header">This game's creator has you blacklisted.</div>
				</div>

				<div
					className="ui basic small modal reportmodal"
					ref={c => {
						this.reportModal = c;
					}}
				>
					<form onSubmit={this.handleReportSubmit}>
						<div className="ui header">
							Report player <span style={{ color: 'red' }}>{isBlind ? '(blind player, mods will know)' : this.state.reportedPlayer}</span> to the moderators
						</div>
						<div className="ui selection dropdown">
							<input type="hidden" name="reason" />
							<i className="dropdown icon" />
							<div className="default text">Reason</div>
							<div className="menu">
								<div className="item">AFK/leaving game</div>
								<div className="item">Abusive chat</div>
								<div className="item">Cheating</div>
								<div className="item">Other</div>
							</div>
						</div>
						<textarea placeholder="Comment" value={this.state.reportTextValue} onChange={handleReportTextChange} spellCheck="false" maxLength="500" />
						<div onClick={this.handleReportSubmit} className={this.state.reportTextValue ? 'ui button primary' : 'ui button primary disabled'}>
							Submit
						</div>
					</form>
				</div>

				<div
					className="ui basic small modal passwordmodal"
					ref={c => {
						this.passwordModal = c;
					}}
				>
					<div className="ui header">Private game password:</div>
					<div className="ui input">
						<form onSubmit={this.handlePasswordSubmit}>
							<input
								maxLength="20"
								placeholder="Password"
								onChange={handlePasswordInputChange}
								value={this.state.passwordValue}
								autoFocus
								ref={c => {
									this.privategamepassword = c;
								}}
							/>
							<div onClick={this.handlePasswordSubmit} className="ui button primary">
								Submit
							</div>
						</form>
					</div>
				</div>
				<Policies gameInfo={this.props.gameInfo} userInfo={this.props.userInfo} socket={this.props.socket} />
			</section>
		);
	}
}

Players.propTypes = {
	roles: PropTypes.array,
	userInfo: PropTypes.object,
	gameInfo: PropTypes.object,
	roleState: PropTypes.string,
	userList: PropTypes.object,
	socket: PropTypes.object,
	selectedGamerole: PropTypes.func,
	isReplay: PropTypes.bool
};
