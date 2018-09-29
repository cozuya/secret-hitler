import React from 'react';
import { connect } from 'react-redux';
import $ from 'jquery';
import { PLAYERCOLORS } from '../../constants';
import { loadReplay, toggleNotes, updateUser } from '../../actions/actions';
import classnames from 'classnames';
import PropTypes from 'prop-types';
import { renderEmotesButton, processEmotes } from '../../emotes';
import { Scrollbars } from 'react-custom-scrollbars';

const mapDispatchToProps = dispatch => ({
	loadReplay: summary => dispatch(loadReplay(summary)),
	toggleNotes: notesStatus => dispatch(toggleNotes(notesStatus)),
	updateUser: userInfo => dispatch(updateUser(userInfo))
});

const mapStateToProps = ({ notesActive }) => ({ notesActive });

class Gamechat extends React.Component {
	constructor() {
		super();

		this.handleChatFilterClick = this.handleChatFilterClick.bind(this);
		this.handleSubmit = this.handleSubmit.bind(this);
		this.handleChatLockClick = this.handleChatLockClick.bind(this);
		this.handleClickedLeaveGame = this.handleClickedLeaveGame.bind(this);
		this.handleClickedClaimButton = this.handleClickedClaimButton.bind(this);
		this.handleWhitelistPlayers = this.handleWhitelistPlayers.bind(this);
		this.handleNoteClick = this.handleNoteClick.bind(this);
		this.handleChatScrolled = this.handleChatScrolled.bind(this);
		this.handleInsertEmote = this.handleInsertEmote.bind(this);
		this.gameChatStatus = this.gameChatStatus.bind(this);
		this.handleSubscribeModChat = this.handleSubscribeModChat.bind(this);

		this.state = {
			chatFilter: 'All',
			lock: false,
			claim: '',
			playersToWhitelist: [],
			notesEnabled: false
		};
	}

	componentDidMount() {
		this.scrollChats();

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
	}

	handleChatScrolled = () => {
		const bar = this.scrollbar;
		const scrolledFromBottom = bar.getValues().scrollHeight - (bar.getValues().scrollTop + 335);

		if (this.state.lock && scrolledFromBottom < 20) {
			this.setState({ lock: false });
			this.scrollbar.scrollToBottom();
		} else if (!this.state.lock && scrolledFromBottom >= 20) {
			this.setState({ lock: true });
		}
	};

	handleWhitelistPlayers() {
		this.setState({
			playersToWhitelist: this.props.userList.list
				.filter(user => user.userName !== this.props.userInfo.userName)
				.map(user => ({ userName: user.userName, isSelected: true }))
		});

		$(this.whitelistModal).modal('show');
	}

	handleNoteClick() {
		const { notesActive, toggleNotes } = this.props;

		toggleNotes(!notesActive);
		this.setState({ notesEnabled: !notesActive });
	}

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

	handleClickedLeaveGame() {
		const { userInfo, gameInfo } = this.props;

		if (userInfo.isSeated && gameInfo.gameState.isStarted && !gameInfo.gameState.isCompleted) {
			$(this.leaveGameModal).modal('show');
		} else if (userInfo.isSeated && !gameInfo.gameState.isStarted && gameInfo.general.isTourny) {
			$(this.leaveTournyQueueModal).modal('show');
		} else {
			window.location.hash = '#/';
		}
	}

	handleSubmit(e) {
		const currentValue = this.gameChatInput.value;
		const { gameInfo } = this.props;

		e.preventDefault();

		if (currentValue.length < 300 && currentValue && !$('.expando-container + div').hasClass('disabled')) {
			const chat = {
				chat: currentValue,
				uid: gameInfo.general.uid
			};

			this.props.socket.emit('addNewGameChat', chat);

			this.gameChatInput.value = '';

			this.gameChatInput.blur();
			setTimeout(() => {
				if (this.gameChatInput) {
					this.gameChatInput.focus();
				}
			}, 80);
		}
	}

	handleSubscribeModChat() {
		if (confirm('Are you sure you want to subscribe to mod-only chat to see private information?')) {
			const { gameInfo } = this.props;
			this.props.socket.emit('subscribeModChat', gameInfo.general.uid);
		}
	}

	scrollChats() {
		if (!this.state.lock) {
			this.scrollbar.scrollToBottom();
		}
	}

	handleChatFilterClick(e) {
		this.setState({ chatFilter: $(e.currentTarget).text() });
	}

	handleTimestamps(timestamp) {
		const { userInfo } = this.props;

		if (userInfo.userName && userInfo.gameSettings && userInfo.gameSettings.enableTimestamps) {
			const hours = `0${new Date(timestamp).getHours()}`.slice(-2);
			const minutes = `0${new Date(timestamp).getMinutes()}`.slice(-2);
			const seconds = `0${new Date(timestamp).getSeconds()}`.slice(-2);

			return <span className="chat-timestamp">{`${hours}:${minutes}:${seconds} `}</span>;
		}
	}

	handleChatLockClick() {
		if (this.state.lock) {
			this.setState({ lock: false });
		} else {
			this.setState({ lock: true });
		}
	}

	handleClickedClaimButton() {
		const { gameInfo, userInfo } = this.props;
		const playerIndex = gameInfo.publicPlayersState.findIndex(player => player.userName === userInfo.userName);

		this.setState({
			claim: this.state.claim ? '' : gameInfo.playersState[playerIndex].claim
		});
	}

	handleInsertEmote(emote) {
		this.gameChatInput.value += ` ${emote}`;
		this.gameChatInput.focus();
	}

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

	gameChatStatus() {
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
				return (
					publicPlayersState.find(player => player.userName === userName).governmentStatus === 'isPresident' ||
					publicPlayersState.find(player => player.userName === userName).governmentStatus === 'isChancellor'
				);
			}
		})();
		const isStaff = Boolean(userInfo.staffRole && userInfo.staffRole.length);
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

			if (gameInfo.general.disableChat && !isStaff) {
				return {
					isDisabled: true,
					placeholder: 'Chat disabled'
				};
			}

			if (gameInfo.general.disableChat && isStaff) {
				return {
					isDisabled: false,
					placeholder: 'Send a staff message'
				};
			}
		} else {
			if ((gameInfo.general.disableObserver || gameInfo.general.private) && !isStaff) {
				return {
					isDisabled: true,
					placeholder: 'Observer chat disabled'
				};
			}

			if ((gameInfo.general.disableObserver || gameInfo.general.private) && isStaff) {
				return {
					isDisabled: false,
					placeholder: 'Send a staff message'
				};
			}

			if (user.wins + user.losses < 2) {
				return {
					isDisabled: true,
					placeholder: 'You must finish two games to use observer chat'
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
	}

	processChats() {
		const { gameInfo, userInfo, userList, isReplay } = this.props;
		const { gameSettings } = userInfo;
		const isBlind = gameInfo.general && gameInfo.general.blindMode && !gameInfo.gameState.isCompleted;
		const seatedUserNames = gameInfo.publicPlayersState ? gameInfo.publicPlayersState.map(player => player.userName) : [];
		const { chatFilter } = this.state;
		const compareChatStrings = (a, b) => {
			const stringA = typeof a.chat === 'string' ? a.chat : a.chat.map(object => object.text).join('');
			const stringB = typeof b.chat === 'string' ? b.chat : b.chat.map(object => object.text).join('');

			return stringA > stringB ? 1 : -1;
		};
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
		const isStaff = Boolean(userInfo.staffRole && userInfo.staffRole.length);

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

		if (isReplay || !gameInfo.general.private || userInfo.isSeated || isStaff) {
			return gameInfo.chats
				.sort((a, b) => (a.timestamp === b.timestamp ? compareChatStrings(a, b) : new Date(a.timestamp) - new Date(b.timestamp)))
				.filter(
					chat =>
						(chatFilter !== 'Game' && chat.staffRole && chat.staffRole !== '' && chat.staffRole !== 'contributor') ||
						(chatFilter === 'No observer chat' && (chat.gameChat || seatedUserNames.includes(chat.userName))) ||
						((chat.gameChat || chat.isClaim) && (chatFilter === 'Game' || chatFilter === 'All')) ||
						(!chat.gameChat && chatFilter !== 'Game' && chatFilter !== 'No observer chat')
				)
				.map((chat, i) => {
					const playerListPlayer = Object.keys(userList).length ? userList.list.find(player => player.userName === chat.userName) : undefined;
					const isMod = playerListPlayer && playerListPlayer.staffRole && playerListPlayer.staffRole !== '' && playerListPlayer.staffRole !== 'contributor';
					const chatContents = processEmotes(chat.chat, isMod);
					const isSeated = seatedUserNames.includes(chat.userName);
					const isGreenText = chatContents && chatContents[0] ? /^>/i.test(chatContents[0]) : false;

					return chat.gameChat ? (
						<div className={chat.chat[1] && chat.chat[1].type ? `item gamechat ${chat.chat[1].type}` : 'item gamechat'} key={i}>
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
					) : chat.isBroadcast ? (
						<div className="item" key={i}>
							<span className="chat-user broadcast">
								{this.handleTimestamps(chat.timestamp)} {`${chat.userName}: `}{' '}
							</span>
							<span className="broadcast-chat">{processEmotes(chat.chat, true)}</span>
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
							<span
								className={
									!playerListPlayer || (gameSettings && gameSettings.disablePlayerColorsInChat) || isBlind
										? 'chat-user'
										: PLAYERCOLORS(playerListPlayer, !(gameSettings && gameSettings.disableSeasonal), 'chat-user')
								}
							>
								{isReplay || isSeated ? (
									''
								) : chat.staffRole === 'moderator' ? (
									<span data-tooltip="Moderator" data-inverted>
										<span className="observer-chat">(Observer) </span>
										<span className="moderator-name">(M) </span>
									</span>
								) : chat.staffRole === 'editor' ? (
									<span data-tooltip="Editor" data-inverted>
										<span className="observer-chat">(Observer) </span>
										<span className="editor-name">(E) </span>
									</span>
								) : chat.staffRole === 'admin' ? (
									<span data-tooltip="Admin" data-inverted>
										<span className="observer-chat">(Observer) </span>
										<span className="admin-name">(A) </span>
									</span>
								) : (
									<span className="observer-chat">(Observer) </span>
								)}
								{this.props.isReplay || gameInfo.gameState.isTracksFlipped
									? isSeated
										? isBlind
											? `${
													gameInfo.general.replacementNames[gameInfo.publicPlayersState.findIndex(publicPlayer => publicPlayer.userName === chat.userName)]
											  } {${gameInfo.publicPlayersState.findIndex(publicPlayer => publicPlayer.userName === chat.userName) + 1}}`
											: `${chat.userName} {${gameInfo.publicPlayersState.findIndex(publicPlayer => publicPlayer.userName === chat.userName) + 1}}`
										: chat.userName
									: isBlind
										? '?'
										: chat.userName}
								{': '}
							</span>
							<span className={isGreenText ? 'greentext' : ''}>{chatContents}</span>{' '}
						</div>
					);
				});
		}
	}

	render() {
		const { socket, userInfo, gameInfo, isReplay, userList } = this.props;
		const selectedWhitelistplayer = playerName => {
			const { playersToWhitelist } = this.state;
			const playerIndex = playersToWhitelist.findIndex(player => player.userName === playerName);

			playersToWhitelist[playerIndex].isSelected = !playersToWhitelist[playerIndex].isSelected;

			this.setState(playersToWhitelist);
		};
		const submitWhitelist = () => {
			const whitelistPlayers = this.state.playersToWhitelist.filter(player => player.isSelected).map(player => player.userName);
			this.props.socket.emit('updateGameWhitelist', {
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
		const WatchReplayButton = () => {
			const { summary } = gameInfo;

			if (summary) {
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
			this.props.updateUser(userInfo);
			window.location.hash = isRound1TableThatFinished2nd
				? `${hash.substr(0, hash.length - 1)}Final`
				: tableUidLastLetter === 'A'
					? `${hash.substr(0, hash.length - 1)}B`
					: `${hash.substr(0, hash.length - 1)}A`;
		};
		const isStaff = Boolean(userInfo && userInfo.staffRole && userInfo.staffRole.length && userInfo.staffRole !== 'contributor');
		const hasNoAEM = players => {
			if (!userList || !userList.list) return false;
			return userList.list.every(user => {
				if (players.includes(user.userName) && user.staffRole && user.staffRole.length > 0 && user.staffRole !== 'contributor') return false;
				else return true;
			});
		};
		const sendModEndGame = winningTeamName => {
			socket.emit('updateModAction', {
				modName: userInfo.userName,
				userName: userInfo.userName,
				comment: `End game ${gameInfo.general.uid} with team ${winningTeamName} winning`,
				uid: gameInfo.general.uid,
				winningTeamName,
				action: 'modEndGame'
			});

			$(this.modendgameModal).modal('hide');
		};

		return (
			<section className="gamechat">
				<section className="ui pointing menu">
					<a className={this.state.chatFilter === 'All' ? 'item active' : 'item'} onClick={this.handleChatFilterClick}>
						All
					</a>
					<a className={this.state.chatFilter === 'Chat' ? 'item active' : 'item'} onClick={this.handleChatFilterClick}>
						Chat
					</a>
					<a className={this.state.chatFilter === 'Game' ? 'item active' : 'item'} onClick={this.handleChatFilterClick}>
						Game
					</a>
					{gameInfo.general &&
						!gameInfo.general.disableObserver && (
							<a className={this.state.chatFilter === 'No observer chat' ? 'item active' : 'item'} onClick={this.handleChatFilterClick}>
								No observer chat
							</a>
						)}
					{userInfo.userName && (
						<i
							title="Click here to pop out notes"
							className={this.state.notesEnabled ? 'large window minus icon' : 'large edit icon'}
							onClick={this.handleNoteClick}
						/>
					)}
					{!isReplay && (
						<i
							title="Click here to lock or unlock scrolling of chat"
							className={this.state.lock ? 'large lock icon' : 'large unlock alternate icon'}
							onClick={this.handleChatLockClick}
						/>
					)}
					{/* {isStaff && gameInfo.gameState.isTracksFlipped && this.renderModEndGameButtons()} */}
					{isStaff && this.renderModEndGameButtons()}

					{gameInfo.general &&
						gameInfo.general.tournyInfo &&
						(gameInfo.general.tournyInfo.showOtherTournyTable || gameInfo.general.tournyInfo.isRound1TableThatFinished2nd) && (
							<button className="ui primary button tourny-button" onClick={routeToOtherTournyTable}>
								Observe {gameInfo.general.tournyInfo.isRound1TableThatFinished2nd ? 'final' : 'other'} tournament table
							</button>
						)}
					<div className="right menu">
						<WhiteListButton />
						<WatchReplayButton />
						{!this.props.isReplay && <LeaveGameButton />}
					</div>
				</section>
				<section
					style={{
						fontSize: userInfo.gameSettings && userInfo.gameSettings.fontSize ? `${userInfo.gameSettings.fontSize}px` : '16px'
					}}
					className={this.state.claim ? 'segment chats blurred' : 'segment chats'}
				>
					<Scrollbars ref={c => (this.scrollbar = c)} onScroll={this.handleChatScrolled}>
						<div className="ui list">{this.processChats()}</div>
					</Scrollbars>
				</section>
				<section className={this.state.claim ? 'claim-container active' : 'claim-container'}>
					{(() => {
						if (this.state.claim) {
							const handleClaimButtonClick = (e, claim) => {
								const chat = {
									userName: userInfo.userName,
									claimState: claim,
									claim: this.state.claim,
									uid: gameInfo.general.uid
								};

								e.preventDefault();

								this.props.socket.emit('addNewClaim', chat);
								this.setState({ claim: '' });
							};

							switch (this.state.claim) {
								case 'wasPresident':
									return (
										<div>
											<p> As president, I drew...</p>
											<button
												onClick={e => {
													handleClaimButtonClick(e, 'threefascist');
												}}
												className="ui button threefascist"
											>
												3 Fascist policies
											</button>
											<button
												onClick={e => {
													handleClaimButtonClick(e, 'twofascistoneliberal');
												}}
												className="ui button twofascistoneliberal"
											>
												2 Fascist and a Liberal policy
											</button>
											<button
												onClick={e => {
													handleClaimButtonClick(e, 'twoliberalonefascist');
												}}
												className="ui button twoliberalonefascist"
											>
												2 Liberal and a Fascist policy
											</button>
											<button
												onClick={e => {
													handleClaimButtonClick(e, 'threeliberal');
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
													handleClaimButtonClick(e, 'twofascist');
												}}
												className="ui button threefascist"
											>
												2 Fascist policies
											</button>
											<button
												onClick={e => {
													handleClaimButtonClick(e, 'onefascistoneliberal');
												}}
												className="ui button onefascistoneliberal"
											>
												A Fascist and a Liberal policy
											</button>
											<button
												onClick={e => {
													handleClaimButtonClick(e, 'twoliberal');
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
								case 'didPolicyPeek':
									return (
										<div>
											<p> As president, I peeked and saw... </p>
											<button
												onClick={e => {
													handleClaimButtonClick(e, 'threefascist');
												}}
												className="ui button threefascist"
											>
												3 Fascist policies
											</button>
											<button
												onClick={e => {
													handleClaimButtonClick(e, 'twofascistoneliberal');
												}}
												className="ui button twofascistoneliberal"
											>
												2 Fascist and a Liberal policy
											</button>
											<button
												onClick={e => {
													handleClaimButtonClick(e, 'twoliberalonefascist');
												}}
												className="ui button twoliberalonefascist"
											>
												2 Liberal and a Fascist policy
											</button>
											<button
												onClick={e => {
													handleClaimButtonClick(e, 'threeliberal');
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
				{!this.props.isReplay && (
					<form className="segment inputbar" onSubmit={this.handleSubmit}>
						{(() => {
							if (gameInfo.gameState && gameInfo.gameState.isStarted && isStaff) {
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
							<input
								onSubmit={this.handleSubmit}
								maxLength="300"
								autoComplete="off"
								spellCheck="false"
								placeholder={this.gameChatStatus().placeholder}
								id="gameChatInput"
								ref={c => {
									this.gameChatInput = c;
								}}
							/>
							{this.gameChatStatus().isDisabled ? null : renderEmotesButton(this.handleInsertEmote)}
							<button type="submit" className="ui primary button">
								Chat
							</button>
						</div>
						{(() => {
							if (
								gameInfo.playersState &&
								gameInfo.playersState.length &&
								userInfo.userName &&
								gameInfo.playersState[gameInfo.publicPlayersState.findIndex(player => player.userName === userInfo.userName)].claim
							) {
								return (
									<div className="claim-button" title="Click here to make a claim in chat" onClick={this.handleClickedClaimButton}>
										C
									</div>
								);
							}
						})()}
					</form>
				)}
				<div
					className="ui basic fullscreen modal leavegamemodals"
					ref={c => {
						this.leaveGameModal = c;
					}}
				>
					<h2 className="ui header">
						DANGER. Leaving an in-progress game will ruin it for the other players (unless you've been executed). Do this only in the case of a game already
						ruined by an AFK/disconnected player or if someone has already left.
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
						{this.state.playersToWhitelist.sort((a, b) => (a.userName > b.userName ? 1 : -1)).map((player, index) => {
							const uid = Math.random()
								.toString(36)
								.substring(2);

							return (
								<li key={index}>
									<input
										type="checkbox"
										id={uid}
										defaultChecked={true}
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
	isReplay: PropTypes.bool,
	clickedGameRole: PropTypes.object,
	clickedPlayer: PropTypes.object,
	roleState: PropTypes.func,
	selectedGamerole: PropTypes.object,
	selectedPlayer: PropTypes.object,
	userInfo: PropTypes.object,
	gameInfo: PropTypes.object,
	socket: PropTypes.object,
	userList: PropTypes.object
};

export default connect(mapStateToProps, mapDispatchToProps)(Gamechat);
