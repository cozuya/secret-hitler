import React from 'react';
import { connect } from 'react-redux';
import $ from 'jquery';
import classnames from 'classnames';
import PropTypes from 'prop-types';
import { Scrollbars } from 'react-custom-scrollbars';

import { loadReplay, toggleNotes, updateUser } from '../../actions/actions';
import { PLAYERCOLORS, getBadWord } from '../../constants';
import { renderEmotesButton, processEmotes } from '../../emotes';

const mapDispatchToProps = dispatch => ({
	loadReplay: summary => dispatch(loadReplay(summary)),
	toggleNotes: notesStatus => dispatch(toggleNotes(notesStatus)),
	updateUser: userInfo => dispatch(updateUser(userInfo))
});

const mapStateToProps = ({ notesActive }) => ({ notesActive });

class Gamechat extends React.Component {
	state = {
		lock: false,
		claim: '',
		playersToWhitelist: [],
		notesEnabled: false,
		showFullChat: false,
		showPlayerChat: true,
		showGameChat: true,
		showObserverChat: true,
		badWord: [null, null],
		textLastChanged: 0,
		textChangeTimer: -1,
		chatValue: '',
		processedChats: '',
		votesPeeked: false,
		gameFrozen: false
	};

	componentDidMount() {
		this.scrollChats();
		setTimeout(() => this.setState({ forceProcess: true }, () => this.scrollChats()), 750);

		$(this.leaveGameModal).on('click', '.leave-game.button', () => {
			// modal methods dont seem to work.
			window.location.hash = '#/';
			$(this.leaveGameModal).modal('hide');
		});

		$(this.leaveTournyQueueModal).on('click', '.leave-tourny.button', () => {
			window.location.hash = '#/';
			$(this.leaveTournyQueueModal).modal('hide');
		});

		$(this.leaveTournyQueueModal).on('click', '.leave-tourny-queue.button', () => {
			window.location.hash = '#/';
			$(this.leaveTournyQueueModal).modal('hide');
		});
		this.props.socket.on('removeClaim', () => {
			this.setState({
				claim: ''
			});
		});
	}

	componentDidUpdate(prevProps, nextProps) {
		const { userInfo, gameInfo } = this.props;
		this.scrollChats();

		if (
			(prevProps &&
				userInfo.userName &&
				userInfo.isSeated &&
				prevProps.gameInfo.publicPlayersState.filter(player => player.isDead).length !== gameInfo.publicPlayersState.filter(player => player.isDead).length &&
				gameInfo.publicPlayersState.find(player => userInfo.userName === player.userName).isDead) ||
			(prevProps &&
				userInfo.userName &&
				gameInfo.gameState.phase === 'presidentSelectingPolicy' &&
				((gameInfo.publicPlayersState.find(player => userInfo.userName === player.userName) &&
					gameInfo.publicPlayersState.find(player => userInfo.userName === player.userName).governmentStatus === 'isPresident') ||
					(gameInfo.publicPlayersState.find(player => userInfo.userName === player.userName) &&
						gameInfo.publicPlayersState.find(player => userInfo.userName === player.userName).governmentStatus === 'isChancellor')) &&
				prevProps.gameInfo.gameState.phase !== 'presidentSelectingPolicy')
		) {
			this.setState({ inputValue: '' });
			$(this.gameChatInput).blur();
		}

		if (prevProps.notesActive && !nextProps.notesActive && this.state.notesEnabled) {
			this.setState({ notesEnabled: false });
		}

		// DEBUG
		// console.log(this.state.forceProcess, prevProps.gameInfo.chats.length < gameInfo.chats.length, !this.state.processedChats);
		if (this.state.forceProcess || prevProps.gameInfo.chats.length < gameInfo.chats.length || (!this.state.processedChats && !gameInfo.general.private)) {
			this.setState(
				{
					processedChats: this.processChats(),
					forceProcess: false
				},
				() => this.scrollChats()
			);
		}
	}

	handleChatScrolled = () => {
		const bar = this.scrollbar;
		const scrolledFromBottom = bar.getValues().scrollHeight - (bar.getValues().scrollTop + bar.getValues().clientHeight - 1);

		if (this.state.lock && scrolledFromBottom < 20) {
			this.setState({ lock: false });
			this.scrollbar.scrollToBottom();
		} else if (!this.state.lock && scrolledFromBottom >= 20) {
			this.setState({ lock: true });
		}
	};

	handleWhitelistPlayers = () => {
		this.setState({
			playersToWhitelist: this.props.userList.list
				.filter(user => user.userName !== this.props.userInfo.userName)
				.map(user => ({ userName: user.userName, isSelected: false }))
		});

		$(this.whitelistModal).modal('show');
	};

	handleNoteClick = () => {
		const { notesActive, toggleNotes } = this.props;

		toggleNotes(!notesActive);
		this.setState({ notesEnabled: !notesActive });
	};

	renderNotes() {
		if (this.state.notesEnabled) {
			const notesChange = e => {
				this.setState({ notesValue: `${e.target.value}` });
			};
			return (
				<section className="notes-container">
					<p>Notes</p>
					<textarea autoFocus spellCheck="false" value={this.state.notesValue} onChange={notesChange} />
				</section>
			);
		}
	}

	handleClickedLeaveGame = () => {
		const { userInfo, gameInfo } = this.props;

		if (userInfo.isSeated && gameInfo.gameState.isStarted && !gameInfo.gameState.isCompleted) {
			$(this.leaveGameModal).modal('show');
		} else if (userInfo.isSeated && !gameInfo.gameState.isStarted && gameInfo.general.isTourny) {
			$(this.leaveTournyQueueModal).modal('show');
		} else {
			window.location.hash = '#/';
		}
	};

	handleTyping = e => {
		e.preventDefault();
		const { gameInfo } = this.props;
		this.setState({
			chatValue: e.target.value
		});
		const chatValue = e.target.value;

		if (gameInfo && gameInfo.general && gameInfo.general.private) {
			if (this.state.badWord[0]) {
				this.setState({
					badWord: [null, null]
				});
				return;
			}
		}

		const foundWord = getBadWord(chatValue);
		if (this.state.badWord[0] !== foundWord[0]) {
			if (this.state.textChangeTimer !== -1) clearTimeout(this.state.textChangeTimer);
			if (foundWord[0]) {
				this.setState({
					badWord: foundWord,
					textLastChanged: Date.now(),
					textChangeTimer: setTimeout(() => {
						this.setState({ textChangeTimer: -1 });
					}, 1000)
				});
			} else {
				this.setState({
					badWord: [null, null],
					textChangeTimer: -1
				});
			}
		}
	};

	chatDisabled = () => {
		return this.state.badWord[0] && Date.now() - this.state.textLastChanged < 1000;
	};

	handleSubmit = e => {
		const { gameInfo } = this.props;

		e.preventDefault();

		if (this.chatDisabled()) {
			return;
		}

		const { chatValue } = this.state;

		if (chatValue.length <= 300 && chatValue && !$('.expando-container + div').hasClass('disabled')) {
			const chat = {
				chat: chatValue,
				uid: gameInfo.general.uid
			};

			this.props.socket.emit('addNewGameChat', chat);

			this.setState({
				chatValue: '',
				badWord: [null, null]
			});

			if (this.gameChatInput) {
				this.gameChatInput.focus();
			}
		}
	};

	handleSubscribeModChat = () => {
		if (confirm('Are you sure you want to subscribe to mod-only chat to see private information?')) {
			const { gameInfo } = this.props;
			this.props.socket.emit('subscribeModChat', gameInfo.general.uid);
		}
	};

	scrollChats() {
		if (!this.state.lock) {
			this.scrollbar.scrollToBottom();
		}
	}

	handleChatFilterClick = e => {
		const filter = e.currentTarget.getAttribute('data-filter');
		switch (filter) {
			case 'Player':
				this.setState({ showPlayerChat: !this.state.showPlayerChat });
				break;
			case 'Game':
				this.setState({ showGameChat: !this.state.showGameChat });
				break;
			case 'Spectator':
				this.setState({ showObserverChat: !this.state.showObserverChat });
				break;
			case 'History':
				this.setState({ showFullChat: !this.state.showFullChat });
				break;
			default:
				console.log(`Unknown filter: ${filter}`);
		}
	};

	handleTimestamps(timestamp) {
		const { userInfo } = this.props;

		if (userInfo.userName && userInfo.gameSettings && userInfo.gameSettings.enableTimestamps) {
			const hours = `0${new Date(timestamp).getHours()}`.slice(-2);
			const minutes = `0${new Date(timestamp).getMinutes()}`.slice(-2);
			const seconds = `0${new Date(timestamp).getSeconds()}`.slice(-2);

			return <span className="chat-timestamp">{`${hours}:${minutes}:${seconds} `}</span>;
		}
	}

	handleChatLockClick = () => {
		if (this.state.lock) {
			this.setState({ lock: false });
		} else {
			this.setState({ lock: true });
		}
	};

	handleClickedClaimButton = () => {
		const { gameInfo, userInfo } = this.props;
		const playerIndex = gameInfo.publicPlayersState.findIndex(player => player.userName === userInfo.userName);
		this.setState({
			claim: this.state.claim ? '' : gameInfo.playersState[playerIndex].claim
		});
	};

	handleInsertEmote = emote => {
		this.setState({
			chatValue: this.state.chatValue + ' ' + emote
		});
		this.chatInput.focus();
	};

	renderModEndGameButtons() {
		const modalClick = () => {
			$(this.modendgameModal).modal('show');
		};

		return (
			<div>
				<div className="ui button primary" onClick={modalClick} style={{ width: '60px' }}>
					Mod end game
				</div>
			</div>
		);
	}

	isPlayerInGame(players, username) {
		players.map(player => {
			if (player.userName === username) {
				return true;
			}
		});
		return false;
	}

	gameChatStatus = () => {
		const { userInfo, gameInfo } = this.props;
		const { gameState, publicPlayersState } = gameInfo;
		const { gameSettings, userName, isSeated } = userInfo;
		const isDead = (() => {
			if (userName && publicPlayersState.length && publicPlayersState.find(player => userName === player.userName)) {
				return publicPlayersState.find(player => userName === player.userName).isDead;
			}
		})();
		const isGovernmentDuringPolicySelection = (() => {
			if (gameState && (gameState.phase === 'presidentSelectingPolicy' || gameState.phase === 'chancellorSelectingPolicy') && userName && isSeated) {
				const player = publicPlayersState.find(p => p.userName === userName);
				return player && (player.governmentStatus === 'isPresident' || player.governmentStatus === 'isChancellor');
			}
		})();
		const isStaff = Boolean(
			userInfo.staffRole &&
				userInfo.staffRole.length &&
				userInfo.staffRole !== 'trialmod' &&
				userInfo.staffRole !== 'altmod' &&
				userInfo.staffRole !== 'veteran'
		);
		const user = Object.keys(this.props.userList).length ? this.props.userList.list.find(play => play.userName === userName) : undefined;

		if (gameSettings && gameSettings.unbanTime && new Date(userInfo.gameSettings.unbanTime) > new Date()) {
			return {
				isDisabled: true,
				placeholder: 'Chat disabled'
			};
		}

		if (!userName) {
			return {
				isDisabled: true,
				placeholder: 'You must log in to use chat'
			};
		}

		if (!user) {
			return {
				isDisabled: true,
				placeholder: 'Please reload...'
			};
		}

		if (userInfo.isSeated) {
			if (isDead && !gameState.isCompleted) {
				return {
					isDisabled: true,
					placeholder: 'Dead men tell no tales'
				};
			}

			if (isGovernmentDuringPolicySelection) {
				return {
					isDisabled: true,
					placeholder: 'Chat disabled for card selection'
				};
			}

			if (gameInfo.general.disableChat && gameInfo.gameState && !gameInfo.gameState.isCompleted && gameInfo.gameState.isStarted) {
				return {
					isDisabled: true,
					placeholder: 'Chat disabled'
				};
			}
		} else {
			if ((gameInfo.general.disableObserver || gameInfo.general.private) && !(isStaff || (userInfo.isTournamentMod && gameInfo.general.unlisted))) {
				return {
					isDisabled: true,
					placeholder: 'Observer chat disabled'
				};
			}

			if (
				(gameInfo.general.disableObserver || gameInfo.general.private || gameInfo.general.disableChat) &&
				(isStaff || (userInfo.isTournamentMod && gameInfo.general.unlisted))
			) {
				return {
					isDisabled: false,
					placeholder: 'Send a staff message'
				};
			}

			if (user.wins + user.losses < 10) {
				return {
					isDisabled: true,
					placeholder: 'You must finish ten games to use observer chat'
				};
			}

			if (user.isPrivate && !gameInfo.general.private) {
				return {
					isDisabled: true,
					placeholder: 'Non-private observer chat disabled'
				};
			}
		}

		return {
			isDisabled: false,
			placeholder: 'Send a message'
		};
	};

	processChats() {
		const { gameInfo, userInfo, userList } = this.props;
		const { gameSettings } = userInfo;
		const isBlind = gameInfo.general && gameInfo.general.blindMode && !gameInfo.gameState.isCompleted;
		const seatedUserNames = gameInfo.publicPlayersState ? gameInfo.publicPlayersState.map(player => player.userName) : [];
		const { showFullChat, showPlayerChat, showGameChat, showObserverChat } = this.state;
		const time = new Date().getTime();
		/**
		 * @param {array} tournyWins - array of tournywins in epoch ms numbers (date.getTime())
		 * @return {jsx}
		 */
		const renderCrowns = tournyWins => {
			return tournyWins
				.filter(winTime => time - winTime < 10800000)
				.map(crown => <span key={crown} title="This player has recently won a tournament." className="crown-icon" />);
		};
		const compareChatStrings = (a, b) => {
			const stringA = typeof a.chat === 'string' ? a.chat : a.chat.map(object => object.text).join('');
			const stringB = typeof b.chat === 'string' ? b.chat : b.chat.map(object => object.text).join('');

			return stringA > stringB ? 1 : -1;
		};
		const isStaff = Boolean(
			userInfo.staffRole &&
				userInfo.staffRole.length &&
				userInfo.staffRole !== 'trialmod' &&
				userInfo.staffRole !== 'altmod' &&
				userInfo.staffRole !== 'veteran'
		);

		const renderPreviousSeasonAward = type => {
			switch (type) {
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

		if (gameInfo && gameInfo.chats && (!gameInfo.general.private || userInfo.isSeated || isStaff)) {
			let list = gameInfo.chats.sort((a, b) => (a.timestamp === b.timestamp ? compareChatStrings(a, b) : new Date(a.timestamp) - new Date(b.timestamp)));
			const chatLength = (userInfo && userInfo.gameSettings && userInfo.gameSettings.truncatedSize) || 250;
			if (showPlayerChat && showGameChat && showObserverChat && !showFullChat) {
				list = list.slice(-chatLength);
			} else {
				const listAcc = [];
				for (let i = list.length - 1; i >= 0; i--) {
					if (listAcc.length >= chatLength && !showFullChat) {
						break;
					}
					const chat = list[i];
					if (
						chat.isBroadcast ||
						(showPlayerChat && !chat.gameChat && !chat.isClaim && seatedUserNames.includes(chat.userName)) ||
						(showGameChat && (chat.gameChat || chat.isClaim)) ||
						(showObserverChat && !chat.gameChat && !seatedUserNames.includes(chat.userName)) ||
						(!seatedUserNames.includes(chat.userName) &&
							chat.staffRole &&
							chat.staffRole !== 'trialmod' &&
							chat.staffRole !== 'altmod' &&
							chat.staffRole !== 'veteran')
					) {
						listAcc.unshift(chat);
					}
				}
				list = listAcc;
			}
			const processedChats = list.reduce((acc, chat, i) => {
				const playerListPlayer = Object.keys(userList).length ? userList.list.find(player => player.userName === chat.userName) : undefined;
				const isMod =
					playerListPlayer &&
					playerListPlayer.staffRole &&
					playerListPlayer.staffRole !== '' &&
					playerListPlayer.staffRole !== 'trialmod' &&
					playerListPlayer.staffRole !== 'altmod' &&
					playerListPlayer.staffRole !== 'veteran';
				const chatContents = processEmotes(chat.chat, isMod, this.props.allEmotes);
				const isSeated = seatedUserNames.includes(chat.userName);
				const isGreenText = chatContents && chatContents[0] ? /^>/i.test(chatContents[0]) : false;
				const canSeeIncognito =
					userInfo && userInfo.staffRole && userInfo.staffRole !== '' && userInfo.staffRole !== 'altmod' && userInfo.staffRole !== 'veteran';
				acc.push(
					chat.gameChat ? (
						<div className={chat.chat[1] && chat.chat[1].type ? `item game-chat ${chat.chat[1].type}` : 'item game-chat'} key={i}>
							{this.handleTimestamps(chat.timestamp)}
							<span className="game-chat">
								{chatContents.map((chatSegment, index) => {
									if (chatSegment.type) {
										let classes;

										if (chatSegment.type === 'player') {
											classes = 'chat-player';
										} else {
											classes = `chat-role--${chatSegment.type}`;
										}

										return (
											<span key={index} className={classes}>
												{chatSegment.text}
											</span>
										);
									}

									return chatSegment.text;
								})}
							</span>
						</div>
					) : chat.isClaim ? (
						<div className="item claim-item" key={i}>
							{this.handleTimestamps(chat.timestamp)}
							<span className="claim-chat">
								{chatContents &&
									chatContents.length &&
									chatContents.map((chatSegment, index) => {
										if (chatSegment.type) {
											let classes;

											if (chatSegment.type === 'player') {
												classes = 'chat-player';
											} else {
												classes = `chat-role--${chatSegment.type}`;
											}

											return (
												<span key={index} className={classes}>
													{chatSegment.text}
												</span>
											);
										}

										return chatSegment.text;
									})}
							</span>
						</div>
					) : chat.isBroadcast ? (
						<div className="item" key={i}>
							<span className="chat-user broadcast">
								{this.handleTimestamps(chat.timestamp)} {`${chat.userName}: `}{' '}
							</span>
							<span className="broadcast-chat">{processEmotes(chat.chat, true, this.props.allEmotes)}</span>
						</div>
					) : (
						<div className="item" key={i}>
							{this.handleTimestamps(chat.timestamp)}
							{!(gameSettings && Object.keys(gameSettings).length && gameSettings.disableCrowns) &&
								chat.tournyWins &&
								!isBlind &&
								renderCrowns(chat.tournyWins)}
							{!(gameSettings && Object.keys(gameSettings).length && gameSettings.disableCrowns) &&
								chat.previousSeasonAward &&
								!isBlind &&
								renderPreviousSeasonAward(chat.previousSeasonAward)}
							{!(gameSettings && Object.keys(gameSettings).length && gameSettings.disableCrowns) &&
								chat.specialTournamentStatus &&
								chat.specialTournamentStatus === 'spring2020captain' &&
								!isBlind && <span title="This player was the captain of the winning team of the Spring 2020 tournament." className="crown-captain-icon" />}
							{!(gameSettings && Object.keys(gameSettings).length && gameSettings.disableCrowns) &&
								chat.specialTournamentStatus &&
								chat.specialTournamentStatus === 'spring2020' &&
								!isBlind && <span title="This player was part of the winning team of the Spring 2020 tournament." className="crown-icon" />}
							<span
								className={
									chat.staffRole === 'moderator' && chat.userName === 'Incognito'
										? 'chat-user moderatorcolor'
										: !playerListPlayer || (gameSettings && gameSettings.disablePlayerColorsInChat) || isBlind
										? isMod && (!isBlind || !isSeated)
											? PLAYERCOLORS(playerListPlayer, !(gameSettings && gameSettings.disableSeasonal), 'chat-user')
											: 'chat-user'
										: PLAYERCOLORS(playerListPlayer, !(gameSettings && gameSettings.disableSeasonal), 'chat-user')
								}
							>
								{isSeated ? (
									''
								) : chat.staffRole === 'moderator' && chat.userName === 'Incognito' && canSeeIncognito ? (
									<span data-tooltip="Incognito" data-inverted>
										<span className="admincolor">(Incognito) 🚫</span>
									</span>
								) : chat.staffRole === 'moderator' ? (
									<span data-tooltip="Moderator" data-inverted>
										<span className="moderatorcolor">(Mod) 🌀</span>
									</span>
								) : chat.staffRole === 'editor' ? (
									<span data-tooltip="Editor" data-inverted>
										<span
											className={
												!playerListPlayer || (gameSettings && gameSettings.disablePlayerColorsInChat) || isBlind
													? isMod && (!isBlind || !isSeated)
														? PLAYERCOLORS(playerListPlayer, !(gameSettings && gameSettings.disableSeasonal), 'chat-user')
														: 'chat-user'
													: PLAYERCOLORS(playerListPlayer, !(gameSettings && gameSettings.disableSeasonal), 'chat-user')
											}
										>
											(Editor) 🔰
										</span>
									</span>
								) : chat.staffRole === 'admin' ? (
									<span data-tooltip="Admin" data-inverted>
										<span className="admincolor">(Admin) 📛</span>
									</span>
								) : (
									<span className="observer-chat">(Observer) </span>
								)}
								{gameInfo.gameState.isTracksFlipped
									? isSeated
										? isBlind
											? `${
													gameInfo.general.replacementNames[gameInfo.publicPlayersState.findIndex(publicPlayer => publicPlayer.userName === chat.userName)]
											  } {${gameInfo.publicPlayersState.findIndex(publicPlayer => publicPlayer.userName === chat.userName) + 1}}`
											: `${chat.userName} {${gameInfo.publicPlayersState.findIndex(publicPlayer => publicPlayer.userName === chat.userName) + 1}}`
										: chat.staffRole === 'moderator' && chat.userName === 'Incognito' && canSeeIncognito
										? chat.hiddenUsername
										: isBlind && !isMod
										? '?'
										: chat.userName
									: isBlind && (!isMod || (isMod && isSeated))
									? '?'
									: chat.staffRole === 'moderator' && chat.userName === 'Incognito' && canSeeIncognito
									? chat.hiddenUsername
									: chat.userName}
								{': '}
							</span>
							<span className={isGreenText ? 'greentext' : ''}>{chatContents}</span>{' '}
						</div>
					)
				);
				return acc;
			}, []);
			return processedChats;
		}
	}

	render() {
		const { socket, userInfo, gameInfo, userList } = this.props;
		const { playersToWhitelist, showPlayerChat, showGameChat, showObserverChat, showFullChat, notesEnabled, lock } = this.state;

		const selectedWhitelistplayer = playerName => {
			const playerIndex = playersToWhitelist.findIndex(player => player.userName === playerName);

			playersToWhitelist[playerIndex].isSelected = !playersToWhitelist[playerIndex].isSelected;

			this.setState(playersToWhitelist);
		};
		const submitWhitelist = () => {
			const whitelistPlayers = playersToWhitelist.filter(player => player.isSelected).map(player => player.userName);
			socket.emit('updateGameWhitelist', {
				uid: gameInfo.general.uid,
				whitelistPlayers
			});
			$(this.whitelistModal).modal('hide');
		};
		const MenuButton = ({ children }) => <div className="item">{children}</div>;
		const WhiteListButton = () => {
			if (userInfo.isSeated && gameInfo.general.private && !gameInfo.gameState.isStarted) {
				return (
					<MenuButton>
						<div className="ui button whitelist" onClick={this.handleWhitelistPlayers}>
							Whitelist Players
						</div>
					</MenuButton>
				);
			} else {
				return null;
			}
		};
		const FollowRemakeButton = () => {
			if (gameInfo.general.isRemade) {
				const onClick = () => {
					window.location.href = `#/table/${gameInfo.general.uid}Remake`;
					window.location.reload();
				};

				return (
					<MenuButton>
						<div className="ui primary button" onClick={onClick}>
							Go To
							<br />
							Remake
						</div>
					</MenuButton>
				);
			} else return null;
		};
		const WatchReplayButton = () => {
			const { summary } = gameInfo;

			if (summary && gameInfo.gameState.isCompleted) {
				const onClick = () => {
					window.location.hash = `#/replay/${gameInfo.general.uid}`;
				};

				return (
					<MenuButton>
						<div className="ui primary button" onClick={onClick}>
							Watch Replay
						</div>
					</MenuButton>
				);
			} else return null;
		};
		const LeaveGameButton = () => {
			const classes = classnames('ui primary button', {
				['ui-disabled']: userInfo.isSeated && gameInfo.gameState.isStarted && !gameInfo.gameState.isCompleted
			});

			return (
				<MenuButton>
					<div className={classes} onClick={this.handleClickedLeaveGame}>
						Leave Game
					</div>
				</MenuButton>
			);
		};
		const routeToOtherTournyTable = e => {
			e.preventDefault();
			const { uid } = gameInfo.general;
			const tableUidLastLetter = uid.charAt(gameInfo.general.uid.length - 1);
			const { hash } = window.location;
			const { isRound1TableThatFinished2nd } = gameInfo.general.tournyInfo;

			userInfo.isSeated = false;
			updateUser(userInfo);
			window.location.hash = isRound1TableThatFinished2nd
				? `${hash.substr(0, hash.length - 1)}Final`
				: tableUidLastLetter === 'A'
				? `${hash.substr(0, hash.length - 1)}B`
				: `${hash.substr(0, hash.length - 1)}A`;
		};
		const isStaff = Boolean(
			userInfo &&
				userInfo.staffRole &&
				userInfo.staffRole.length &&
				userInfo.staffRole !== 'trialmod' &&
				userInfo.staffRole !== 'altmod' &&
				userInfo.staffRole !== 'veteran'
		);
		const hasNoAEM = players => {
			if (!userList || !userList.list) return false;
			return userList.list.every(
				user =>
					!(
						players.includes(user.userName) &&
						user.staffRole &&
						user.staffRole.length > 0 &&
						user.staffRole !== 'trialmod' &&
						user.staffRole !== 'altmod' &&
						user.staffRole !== 'veteran'
					)
			);
		};

		const modGetCurrentVotes = () => {
			socket.emit('modPeekVotes', {
				modName: userInfo.userName,
				uid: gameInfo.general.uid
			});
		};

		const modFreezeGame = () => {
			socket.emit('modFreezeGame', {
				modName: userInfo.userName,
				uid: gameInfo.general.uid
			});
		};

		const modDeleteGame = reason => {
			socket.emit('updateModAction', {
				modName: userInfo.userName,
				userName: `DELGAME${gameInfo.general.uid}`,
				comment: reason,
				action: 'deleteGame'
			});
			location.hash = '';
		};

		const sendModEndGame = winningTeamName => {
			if (confirm('Are you sure you want to end this game with the ' + winningTeamName + ' team winning?')) {
				socket.emit('updateModAction', {
					modName: userInfo.userName,
					userName: userInfo.userName,
					comment: `End game ${gameInfo.general.uid} with team ${winningTeamName} winning`,
					uid: gameInfo.general.uid,
					winningTeamName,
					action: 'modEndGame'
				});
			}
			$(this.modendgameModal).modal('hide');
		};

		return (
			<section className={isStaff ? 'gamechat aem' : 'gamechat'}>
				<section className="ui pointing menu">
					<a className={'item'} onClick={this.handleChatFilterClick} data-filter="Player" style={{ marginLeft: '5px' }}>
						<i className={`large comment icon${showPlayerChat ? ' alternate' : ''}`} title={showPlayerChat ? 'Hide player chats' : 'Show player chats'} />
					</a>
					<a className={'item'} onClick={this.handleChatFilterClick} data-filter="Game">
						<i className={`large circle icon${showGameChat ? ' info' : ''}`} title={showGameChat ? 'Hide game chats' : 'Show game chats'} />
					</a>
					{gameInfo.general && !gameInfo.general.disableObserver && (
						<a className={'item'} onClick={this.handleChatFilterClick} data-filter="Spectator">
							<i className={`large eye icon${!showObserverChat ? ' slash' : ''}`} title={showObserverChat ? 'Hide observer chats' : 'Show observer chats'} />
						</a>
					)}
					<a className={'item'} onClick={this.handleChatFilterClick} data-filter="History">
						<i
							className={`large file icon${showFullChat ? ' alternate' : ''}`}
							title={showFullChat ? 'Truncate chats to 250 lines' : 'Show entire history (might lag in longer games)'}
						/>
					</a>
					<div style={{ width: '40%', overflowX: 'auto', display: 'flex', flexDirection: 'row' }}>
						{userInfo &&
							!userInfo.isSeated &&
							isStaff &&
							gameInfo &&
							gameInfo.gameState &&
							gameInfo.gameState.isStarted &&
							!gameInfo.gameState.isCompleted &&
							this.renderModEndGameButtons()}
						{userInfo &&
							!userInfo.isSeated &&
							(isStaff || (userInfo.isTournamentMod && gameInfo.general.unlisted)) &&
							gameInfo &&
							gameInfo.gameState &&
							gameInfo.gameState.isStarted &&
							!gameInfo.gameState.isCompleted && (
								<div>
									<div
										className="ui button primary"
										onClick={() => {
											if (!this.state.votesPeeked) {
												if (confirm('Are you sure you want to peek votes for this game?')) {
													modGetCurrentVotes();
													this.setState({
														votesPeeked: true
													});
												}
											} else {
												modGetCurrentVotes();
											}
										}}
										style={{ width: '60px' }}
									>
										Peek
										<br />
										Votes
									</div>
								</div>
							)}
						{userInfo &&
							!userInfo.isSeated &&
							(isStaff || (userInfo.isTournamentMod && gameInfo.general.unlisted)) &&
							gameInfo &&
							gameInfo.gameState &&
							gameInfo.gameState.isStarted &&
							!gameInfo.gameState.isCompleted && (
								<div>
									<div
										className="ui button primary"
										onClick={() => {
											if (!this.state.gameFrozen) {
												if (confirm('Are you sure you want to freeze this game?')) {
													modFreezeGame();
													this.setState({
														gameFrozen: true
													});
												}
											} else {
												modFreezeGame();
											}
										}}
										style={{ width: '60px' }}
									>
										Freeze/
										<br />
										Unfreeze
									</div>
								</div>
							)}
						{userInfo && !userInfo.isSeated && isStaff && (
							<div>
								<div
									className="ui button primary"
									onClick={() => {
										if (confirm('Are you sure you want to delete this game?')) {
											let reason = prompt(`Enter a reason for deleting this game, leave blank if dead`);
											reason = reason || 'Dead';
											modDeleteGame(reason);
										}
									}}
									style={{ width: '60px' }}
								>
									Delete
									<br />
									Game
								</div>
							</div>
						)}
					</div>
					{gameInfo.general &&
						gameInfo.general.tournyInfo &&
						(gameInfo.general.tournyInfo.showOtherTournyTable || gameInfo.general.tournyInfo.isRound1TableThatFinished2nd) && (
							<button className="ui primary button tourny-button" onClick={routeToOtherTournyTable}>
								Observe {gameInfo.general.tournyInfo.isRound1TableThatFinished2nd ? 'final' : 'other'} tournament table
							</button>
						)}
					<div className="right menu">
						{userInfo.userName && (
							<i title="Click here to pop out notes" className={notesEnabled ? 'large window minus icon' : 'large edit icon'} onClick={this.handleNoteClick} />
						)}
						<i
							title="Click here to lock or unlock scrolling of chat"
							className={lock ? 'large lock icon' : 'large unlock alternate icon'}
							onClick={this.handleChatLockClick}
						/>
						<WhiteListButton />
						<FollowRemakeButton />
						<WatchReplayButton />
						{<LeaveGameButton />}
					</div>
				</section>
				<section
					style={{
						fontSize: userInfo.gameSettings && userInfo.gameSettings.fontSize ? `${userInfo.gameSettings.fontSize}px` : '16px',
						height: '100%',
						cursor: `${isStaff ? 'text' : 'not-allowed'}`
					}}
					className={this.state.claim ? 'segment chats blurred' : 'segment chats'}
				>
					<Scrollbars
						ref={c => (this.scrollbar = c)}
						onScroll={this.handleChatScrolled}
						renderThumbVertical={props => <div {...props} className="thumb-vertical" />}
					>
						<div className="ui list">{this.processChats()}</div>
					</Scrollbars>
				</section>
				<section className={this.state.claim ? 'claim-container active' : 'claim-container'}>
					{(() => {
						if (this.state.claim && !gameInfo.gameState.isCompleted) {
							const handleClaimButtonClick = (e, claim) => {
								const chat = {
									userName: userInfo.userName,
									claimState: claim,
									claim: this.state.claim,
									uid: gameInfo.general.uid
								};

								e.preventDefault();

								this.props.socket.emit('addNewClaim', chat);
							};

							switch (this.state.claim) {
								case 'wasPresident':
									return (
										<div>
											<p> As president, I drew...</p>
											<button
												onClick={e => {
													handleClaimButtonClick(e, 'rrr');
												}}
												className="ui button threefascist"
											>
												3 Fascist policies
											</button>
											<button
												onClick={e => {
													handleClaimButtonClick(e, 'rrb');
												}}
												className="ui button twofascistoneliberal"
											>
												2 Fascist and a Liberal policy
											</button>
											<button
												onClick={e => {
													handleClaimButtonClick(e, 'rbb');
												}}
												className="ui button twoliberalonefascist"
											>
												2 Liberal and a Fascist policy
											</button>
											<button
												onClick={e => {
													handleClaimButtonClick(e, 'bbb');
												}}
												className="ui button threeliberal"
											>
												3 Liberal policies
											</button>
										</div>
									);
								case 'wasChancellor':
									return (
										<div>
											<p> As chancellor, I received...</p>
											<button
												onClick={e => {
													handleClaimButtonClick(e, 'rr');
												}}
												className="ui button threefascist"
											>
												2 Fascist policies
											</button>
											<button
												onClick={e => {
													handleClaimButtonClick(e, 'rb');
												}}
												className="ui button onefascistoneliberal"
											>
												A Fascist and a Liberal policy
											</button>
											<button
												onClick={e => {
													handleClaimButtonClick(e, 'bb');
												}}
												className="ui button threeliberal"
											>
												2 Liberal policies
											</button>
										</div>
									);
								case 'didInvestigateLoyalty':
									return (
										<div>
											<p> As president, when I looked at the party membership I saw that he or she was on the...</p>
											<button
												onClick={e => {
													handleClaimButtonClick(e, 'fascist');
												}}
												className="ui button threefascist"
											>
												Fascist team
											</button>
											<button
												onClick={e => {
													handleClaimButtonClick(e, 'liberal');
												}}
												className="ui button threeliberal"
											>
												Liberal team
											</button>
										</div>
									);
								case 'didSinglePolicyPeek':
									return (
										<div>
											<p> As president, when I looked at the top card I saw a...</p>
											<button
												onClick={e => {
													handleClaimButtonClick(e, 'fascist');
												}}
												className="ui button threefascist"
											>
												Fascist policy
											</button>
											<button
												onClick={e => {
													handleClaimButtonClick(e, 'liberal');
												}}
												className="ui button threeliberal"
											>
												Liberal policy
											</button>
										</div>
									);
								case 'didPolicyPeek':
									return (
										<div>
											<p> As president, I peeked and saw... </p>
											<button
												onClick={e => {
													handleClaimButtonClick(e, 'rrr');
												}}
												className="ui button threefascist"
											>
												3 Fascist policies
											</button>
											<button
												onClick={e => {
													handleClaimButtonClick(e, 'rrb');
												}}
												className="ui button twofascistoneliberal"
											>
												2 Fascist and a Liberal policy
											</button>
											<button
												onClick={e => {
													handleClaimButtonClick(e, 'rbb');
												}}
												className="ui button twoliberalonefascist"
											>
												2 Liberal and a Fascist policy
											</button>
											<button
												onClick={e => {
													handleClaimButtonClick(e, 'bbb');
												}}
												className="ui button threeliberal"
											>
												3 Liberal policies
											</button>
										</div>
									);
							}
						}
					})()}
				</section>
				<form className="segment inputbar" onSubmit={this.handleSubmit}>
					{(() => {
						if (
							(isStaff || (userInfo.isTournamentMod && gameInfo.general.unlisted)) &&
							gameInfo.gameState &&
							gameInfo.gameState.isStarted &&
							userInfo &&
							!userInfo.isSeated &&
							!gameInfo.gameState.isCompleted
						) {
							return (
								<div
									className={hasNoAEM(gameInfo.publicPlayersState.map(player => player.userName)) ? 'ui primary button' : 'ui primary button disabled'}
									title="Click here to subscribe to mod-only chat"
									onClick={this.handleSubscribeModChat}
								>
									Mod Chat
								</div>
							);
						}
					})()}
					<div className={this.gameChatStatus().isDisabled ? 'ui action input disabled' : 'ui action input'}>
						{this.state.badWord[0] && (
							<span
								style={{
									zIndex: '-1',
									position: 'absolute',
									top: '-32px',
									height: '40px',
									backgroundColor: 'indianred',
									padding: '7px',
									borderRadius: '10px 10px 0px 0px',
									border: '1px solid #8c8c8c'
								}}
							>
								The word "{this.state.badWord[1]}"{this.state.badWord[0] !== this.state.badWord[1] ? ` (${this.state.badWord[0]})` : ''} is forbidden.
							</span>
						)}
						{this.state.chatValue.length > 300 && !this.state.badWord[0] && (
							<span
								style={{
									zIndex: '-1',
									position: 'absolute',
									top: '-32px',
									height: '40px',
									backgroundColor: 'indianred',
									padding: '7px',
									borderRadius: '10px 10px 0px 0px',
									border: '1px solid #8c8c8c'
								}}
							>
								{`This message is too long ${300 - this.state.chatValue.length}`}
							</span>
						)}
						<input
							value={this.state.chatValue}
							onSubmit={this.handleSubmit}
							onChange={this.handleTyping}
							type="text"
							autoComplete="off"
							spellCheck="false"
							placeholder={this.gameChatStatus().placeholder}
							id="gameChatInput"
							ref={c => (this.chatInput = c)}
						/>
						{this.gameChatStatus().isDisabled ? null : renderEmotesButton(this.handleInsertEmote, this.props.allEmotes)}
						<button type="submit" className={`ui primary button ${this.chatDisabled() ? 'disabled' : ''}`}>
							Chat
						</button>
					</div>
					{(() => {
						if (
							gameInfo.playersState &&
							gameInfo.playersState.length &&
							userInfo.userName &&
							gameInfo.playersState[gameInfo.publicPlayersState.findIndex(player => player.userName === userInfo.userName)].claim &&
							!gameInfo.playersState[gameInfo.publicPlayersState.findIndex(player => player.userName === userInfo.userName)].isDead
						) {
							return (
								<div className="claim-button" title="Click here to make a claim in chat" onClick={this.handleClickedClaimButton}>
									Claim
								</div>
							);
						}
					})()}
				</form>
				<div
					className="ui basic fullscreen modal leavegamemodals"
					ref={c => {
						this.leaveGameModal = c;
					}}
				>
					<h2 className="ui header">
						DANGER. Leaving an in-progress game will ruin it for the other players (unless you've been executed). Do this only in the case of a game already
						ruined by an AFK/disconnected player, if someone has already left, or if the game has been remade.
					</h2>
					<div className="ui green positive inverted leave-game button">
						<i className="checkmark icon" />
						Leave game
					</div>
				</div>
				<div
					className="ui basic fullscreen modal leavetournyqueue"
					ref={c => {
						this.leaveTournyQueueModal = c;
					}}
				>
					<h2 className="ui header">Leaving this table will leave the tournament queue</h2>
					<div className="ui red positive inverted leave-tourny-queue button">Leave tournament queue</div>
				</div>
				<div
					className="ui basic fullscreen modal modendgamemodal"
					ref={c => {
						this.modendgameModal = c;
					}}
				>
					<div
						className="ui blue positive inverted button"
						onClick={() => {
							sendModEndGame('liberal');
						}}
					>
						End game elo win for liberals
					</div>
					<div
						className="ui red positive inverted button"
						onClick={() => {
							sendModEndGame('fascist');
						}}
					>
						End game elo win for fascists
					</div>
				</div>
				<div
					className="ui basic fullscreen modal whitelistmodal"
					ref={c => {
						this.whitelistModal = c;
					}}
				>
					<h2 className="ui header">Select player(s) below to whitelist for seating in this private game.</h2>
					<ul>
						{this.state.playersToWhitelist
							.sort((a, b) => (a.userName > b.userName ? 1 : -1))
							.map((player, index) => {
								const uid = Math.random()
									.toString(36)
									.substring(2);

								return (
									<li key={index}>
										<input
											type="checkbox"
											id={uid}
											defaultChecked={false}
											onChange={() => {
												selectedWhitelistplayer(player.userName);
											}}
										/>
										<label htmlFor={uid}>{player.userName}</label>
									</li>
								);
							})}
					</ul>
					<div className="ui green positive inverted whitelist-submit button" onClick={submitWhitelist}>
						Submit
					</div>
				</div>
			</section>
		);
	}
}

Gamechat.propTypes = {
	clickedGameRole: PropTypes.object,
	clickedPlayer: PropTypes.object,
	roleState: PropTypes.func,
	selectedGamerole: PropTypes.object,
	selectedPlayer: PropTypes.object,
	userInfo: PropTypes.object,
	gameInfo: PropTypes.object,
	socket: PropTypes.object,
	userList: PropTypes.object,
	allEmotes: PropTypes.array,
	notesActive: PropTypes.bool,
	toggleNotes: PropTypes.func
};

export default connect(mapStateToProps, mapDispatchToProps)(Gamechat);
