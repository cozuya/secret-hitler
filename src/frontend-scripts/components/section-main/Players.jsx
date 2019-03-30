import React from 'react';
import $ from 'jquery';
import Dropdown from 'semantic-ui-dropdown';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import Policies from './Policies.jsx';
import { togglePlayerNotes } from '../../actions/actions';
import { PLAYERCOLORS } from '../../constants';
import { IsTypingContext } from '../reusable/Context';

$.fn.dropdown = Dropdown;

const mapDispatchToProps = dispatch => ({
	togglePlayerNotes: playerName => dispatch(togglePlayerNotes(playerName))
});

const mapStateToProps = ({ playerNotesActive }) => ({
	playerNotesActive
});

class Players extends React.Component {
	state = {
		passwordValue: '',
		reportedPlayer: '',
		reportTextValue: '',
		playerNotes: [],
		playerNoteSeatEnabled: false,
		reportLength: 0
	};

	// componentWillReceiveProps(nextProps) {
	// 	const { userName } = this.props;
	// 	const { publicPlayersState } = nextProps.gameInfo;

	// 	if (this.props.userInfo.userName && publicPlayersState.length > this.props.gameInfo.publicPlayersState.length) {
	// 		this.props.socket.emit('getPlayerNotes', {
	// 			userName,
	// 			seatedPlayers: publicPlayersState.filter(player => player.userName !== userName).map(player => player.userName)
	// 		});
	// 	}
	// }

	componentDidMount() {
		const { socket, userInfo } = this.props;

		if (userInfo.gameSettings && !userInfo.gameSettings.disablePlayerNotes) {
			socket.on('notesUpdate', notes => {
				this.setState({ playerNotes: notes });
			});

			const seatedPlayers = this.props.gameInfo.publicPlayersState.filter(player => player.userName !== userInfo.userName).map(player => player.userName);

			if (seatedPlayers.length) {
				socket.emit('getPlayerNotes', {
					userName: userInfo.userName,
					seatedPlayers
				});
			}
		}
	}

	componentWillUnmount() {
		this.props.socket.off('notesUpdate');
	}

	handlePlayerDoubleClick = userName => {
		if ((!this.props.gameInfo.general.private && this.props.userInfo.userName && this.props.userInfo.userName !== userName) || this.props.isReplay) {
			this.setState({ reportedPlayer: userName });
			$(this.reportModal).modal('show');
			$('.ui.dropdown').dropdown();
		}
	};

	handlePlayerClick = e => {
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

		if (phase === 'selectPartyMembershipInvestigateReverse' && userInfo.userName) {
			if (clickActionInfo[0] === userInfo.userName && clickActionInfo[1].includes(index)) {
				socket.emit('selectPartyMembershipInvestigateReverse', {
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
	};

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

	renderPlayerNotesIcon(index) {
		const { userInfo, gameInfo, togglePlayerNotes, playerNotesActive } = this.props;
		const { userName } = gameInfo.publicPlayersState[index];
		const clickedPlayerNote = playerNoteSeatEnabled => {
			togglePlayerNotes(!playerNotesActive ? userName : '');

			this.setState({
				playerNoteSeatEnabled
			});
		};
		const note = this.state.playerNotes.find(note => note.notedUser === userName);

		if (userInfo.userName && userName !== userInfo.userName) {
			return (
				<i
					onClick={e => {
						e.stopPropagation();
						clickedPlayerNote(index);
					}}
					title={note ? note.note : ''}
					className={
						note
							? playerNotesActive.length
								? 'large window minus icon playernote has-note'
								: 'large edit icon playernote has-note'
							: 'large edit icon playernote'
					}
				/>
			);
		}
	}

	renderTyping(player) {
		const { isTyping } = this.props;

		if (isTyping && isTyping[player.userName] && Date.now() - isTyping[player.userName] < 2000) {
			setTimeout(() => {
				if (Date.now() - isTyping[player.userName] >= 2000) {
					this.forceUpdate();
				}
			}, 2000);
			return <img className="is-typing" src="../images/typing.gif" />;
		}
	}

	renderPlayers() {
		const { gameInfo, userInfo } = this.props;
		const { gameSettings } = userInfo;
		const { playersState, gameState, publicPlayersState } = gameInfo;
		const isBlind = gameInfo.general.blindMode && !gameInfo.gameState.isCompleted;
		const time = Date.now();
		const renderPlayerName = (player, i) => {
			const userName = isBlind ? (gameInfo.gameState.isTracksFlipped ? gameInfo.general.replacementNames[i] : '?') : player.userName;
			const prependSeasonAward = () => {
				switch (player.previousSeasonAward) {
					case 'bronze':
						return <span title="This player was in the 3rd tier of ranks in the previous season" className="season-award bronze" />;
					case 'silver':
						return <span title="This player was in the 2nd tier of ranks in the previous season" className="season-award silver" />;
					case 'gold':
						return <span title="This player was in the top tier of ranks in the previous season" className="season-award gold" />;
					case 'gold1':
						return <span title="This player was the top player of the previous season" className="season-award gold1" />;
					case 'gold2':
						return <span title="This player was 2nd highest player of the previous season" className="season-award gold2" />;
					case 'gold3':
						return <span title="This player was 3rd highest player of the previous season" className="season-award gold3" />;
					case 'gold4':
						return <span title="This player was 4th highest player of the previous season" className="season-award gold4" />;
					case 'gold5':
						return <span title="This player was 5th highest player of the previous season" className="season-award gold5" />;
				}
			};

			const prependCrowns = str => (
				<span>
					{!(userInfo.gameSettings && Object.keys(userInfo.gameSettings).length && userInfo.gameSettings.disableCrowns) &&
						(!gameInfo.general.blindMode || gameInfo.gameState.isCompleted) &&
						player.tournyWins &&
						player.tournyWins.filter(winTime => time - winTime < 10800000).map((crown, ind) => <span className="crown-icon" key={player.tournyWins[ind]} />)}

					{!(userInfo.gameSettings && Object.keys(userInfo.gameSettings).length && userInfo.gameSettings.disableCrowns) &&
						(!gameInfo.general.blindMode || gameInfo.gameState.isCompleted) &&
						player.previousSeasonAward &&
						prependSeasonAward()}
					{!(userInfo.gameSettings && Object.keys(userInfo.gameSettings).length && userInfo.gameSettings.disableCrowns) &&
						(!gameInfo.general.blindMode || gameInfo.gameState.isCompleted) &&
						player.specialTournamentStatus && <span title="This player was in the top 3 of the winter 2019 tournament" className="crown-icon" />}
					{str}
				</span>
			);

			if (player.isPrivate && !userInfo.staffRole && !userInfo.isSeated) {
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
					let user = this.props.userList.list ? this.props.userList.list.find(play => play.userName === player.userName) : null;
					let w;
					let l;

					if (user) {
						w = !(gameSettings && gameSettings.disableSeasonal) ? user.winsSeason : user.wins;
						l = !(gameSettings && gameSettings.disableSeasonal) ? user.lossesSeason : user.losses;
					}

					if (playersState && Object.keys(playersState).length && playersState[i] && playersState[i].notificationStatus) {
						classes = `${classes} notifier ${playersState[i].notificationStatus}`;
					} else if (publicPlayersState && Object.keys(publicPlayersState).length && publicPlayersState[i].notificationStatus) {
						classes = `${classes} notifier ${publicPlayersState[i].notificationStatus}`;
					}

					if (publicPlayersState && Object.keys(publicPlayersState).length && publicPlayersState[i].isDead) {
						classes = `${classes} isDead`;
					}

					if (user && !isBlind) {
						classes = `${classes} ${PLAYERCOLORS(user, !(gameSettings && gameSettings.disableSeasonal), '')}`;
					}

					return classes;
				})()}
			>
				<div
					title={
						isBlind || player.isPrivate
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
				{this.renderTyping(player)}
				{this.renderGovtToken(i)}
				{/* {this.renderPlayerNotesIcon(i)} */}
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
			gameInfo.publicPlayersState.length < gameInfo.general.maxPlayersCount &&
			(!userInfo.userName || !gameInfo.publicPlayersState.find(player => player.userName === userInfo.userName))
		) {
			return gameInfo.general.isTourny ? (
				<div className="ui left pointing label tourny" onClick={this.clickedTakeSeat}>
					Queue for tournament
				</div>
			) : (
				<div className="ui right pointing label" onClick={this.clickedTakeSeat}>
					Take a seat
				</div>
			);
		}
	}

	handlePasswordSubmit = e => {
		e.preventDefault();

		this.props.onClickedTakeSeat(this.state.passwordValue);
		$(this.passwordModal).modal('hide');
	};

	handleReportSubmit = e => {
		const { gameInfo } = this.props;
		e.preventDefault();

		if (!this.state.reportTextValue) {
			return;
		}

		const index = gameInfo.publicPlayersState.findIndex(player => player.userName === this.state.reportedPlayer);
		if (this.state.reportLength <= 140) {
			this.props.socket.emit('playerReport', {
				uid: gameInfo.general.uid,
				userName: this.props.userInfo.userName || 'from replay',
				gameType: gameInfo.general.isTourny ? 'tournament' : gameInfo.general.casualGame ? 'casual' : 'standard',
				reportedPlayer: `${index ? `{${index + 1}} ${this.state.reportedPlayer}` : this.state.reportedPlayer}`,
				reason: $('input[name="reason"]').attr('value'),
				comment: this.state.reportTextValue
			});
			$(this.reportModal).modal('hide');
			this.setState({
				maxReportLengthExceeded: false
			});
		}
	};

	clickedTakeSeat = () => {
		const { gameInfo, userInfo, onClickedTakeSeat, userList } = this.props;
		const user = userList.list ? userList.list.find(user => user.userName === userInfo.userName) : null; 

		if (userInfo.userName) {
			if (userInfo.gameSettings.unbanTime && new Date(userInfo.gameSettings.unbanTime) > new Date()) {
				window.alert('Sorry, this service is currently unavailable.');
			} else if (!gameInfo.general.private && (userInfo.gameSettings && userInfo.gameSettings.isPrivate)) {
				$(this.privatePlayerInPublicGameModal).modal('show');
			} else if (gameInfo.general.rainbowgame && (user && user.wins + user.losses <= 49) || (gameInfo.general.rainbowgame && (!user || !user.wins || !user.losses))) {
				$(this.notRainbowModal).modal('show');
			} else if (gameInfo.general.gameCreatorBlacklist && gameInfo.general.gameCreatorBlacklist.includes(userInfo.userName)) {
				$(this.blacklistModal).modal('show');
			} else if (gameInfo.general.isVerifiedOnly && !userInfo.verified) {
				$(this.verifiedModal).modal('show');
			} else if (gameInfo.general.eloMinimum) {
				const user = userList.list.find(user => user.userName === userInfo.userName);

				if (user && (parseInt(user.eloSeason, 10) >= gameInfo.general.eloMinimum || parseInt(user.eloOverall, 10) >= gameInfo.general.eloMinimum)) {
					onClickedTakeSeat();
				} else {
					$(this.elominimumModal).modal('show');
				}
			} else if (gameInfo.general.private && !gameInfo.general.whitelistedPlayers.includes(userInfo.userName)) {
				$(this.passwordModal).modal('show');
			} else {
				onClickedTakeSeat();
			}
		} else {
			$(this.signinModal).modal('show');
		}
	};

	render() {
		const handlePasswordInputChange = e => {
			this.setState({ passwordValue: `${e.target.value}` });
		};
		const handleReportTextChange = e => {
			this.setState({
				reportLength: Number(e.target.value.length),
				reportTextValue: `${e.target.value}`
			});
		};
		const isBlind = this.props.gameInfo.general.blindMode && !this.props.gameInfo.gameState.isCompleted;

		return (
			<section className="players">
				{this.renderTakeSeat()}
				{this.renderPlayers()}

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
					className="ui basic small modal"
					ref={c => {
						this.verifiedModal = c;
					}}
				>
					<div className="ui header">
						This game is for email-verified only accounts. Have your account become verified by adding an email address in your <a href="/account">settings.</a>
					</div>
				</div>

				<div
					className="ui basic small modal"
					ref={c => {
						this.elominimumModal = c;
					}}
				>
					<div className="ui header">You do not meet the elo minimum to play in this game.</div>
				</div>

				<div
          			className="ui basic small modal"
          			ref={c => {
            			this.notRainbowModal = c;
         			}}
        		>
	         		<div className="ui header">You do not meet the required amount of games played (50) to play in this game.</div>
        		</div>

       			<div
        			className="ui basic small modal"
        			ref={c => {
            			this.privatePlayerInPublicGameModal = c;
          			}}
        		>
        			<div className="ui header">Your account can only play in private games. This is a public game. You can change this in your <a href="/game/#/settings">settings.</a></div>
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
								<div className="item">AFK/Leaving game</div>
								<div className="item">Abusive chat</div>
								<div className="item">Cheating</div>
								<div className="item">Gamethrowing</div>
								<div className="item">Stalling</div>
								<div className="item">Botting</div>
								<div className="item">Other</div>
							</div>
						</div>
						<textarea placeholder="Comment" value={this.state.reportTextValue} onChange={handleReportTextChange} spellCheck="false" maxLength="500" />
						<span className={this.state.reportLength > 140 ? 'counter error' : 'counter'}>{140 - this.state.reportLength}</span>
						<div
							onClick={this.handleReportSubmit}
							className={this.state.reportTextValue && this.state.reportLength <= 140 ? 'ui button primary' : 'ui' + ' button primary disabled'}
						>
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

Players.defaultProps = {
	isTyping: {}
};

Players.propTypes = {
	roles: PropTypes.array,
	userInfo: PropTypes.object,
	gameInfo: PropTypes.object,
	roleState: PropTypes.string,
	userList: PropTypes.object,
	socket: PropTypes.object,
	selectedGamerole: PropTypes.func,
	isReplay: PropTypes.bool,
	toggleNotes: PropTypes.func,
	playerNotesActive: PropTypes.string,
	isTyping: PropTypes.object,
	onClickedTakeSeat: PropTypes.func
};

const PlayersContainer = props => <IsTypingContext.Consumer>{p => <Players {...props} isTyping={p ? p.isTyping : null} />}</IsTypingContext.Consumer>;

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(PlayersContainer);
