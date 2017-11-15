import React from 'react';
import { connect } from 'react-redux';
import $ from 'jquery';
import { PLAYERCOLORS, MODERATORS, ADMINS, EDITORS } from '../../constants';
import { loadReplay, toggleNotes } from '../../actions/actions';
import classnames from 'classnames';
import PropTypes from 'prop-types';
import { renderEmotesButton, processEmotes } from '../../emotes';
import PerfectScrollbar from 'react-perfect-scrollbar';

const mapDispatchToProps = dispatch => ({
	loadReplay: summary => dispatch(loadReplay(summary)),
	toggleNotes: notesStatus => dispatch(toggleNotes(notesStatus))
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
		this.handleChatScrolledToBottom = this.handleChatScrolledToBottom.bind(this);
		this.handleInsertEmote = this.handleInsertEmote.bind(this);
		this.checkIsChatDisabled = this.checkIsChatDisabled.bind(this);

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
	}

	componentDidUpdate(prevProps, nextProps) {
		const { userInfo, gameInfo } = this.props;
		this.scrollChats();

		if (
			(prevProps &&
				userInfo.userName &&
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

	handleChatScrolled() {
		if (this.state.lock !== true) {
			this.setState({ lock: true });
		}
	}

	handleChatScrolledToBottom() {
		if (this.state.lock !== false) {
			this.setState({ lock: false });
		}
	}

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
		if (this.props.userInfo.isSeated && this.props.gameInfo.gameState.isStarted && !this.props.gameInfo.gameState.isCompleted) {
			$(this.leaveGameModal).modal('show');
		} else {
			window.location.hash = '#/';
		}
	}

	handleSubmit(e) {
		const currentValue = this.gameChatInput.value,
			{ gameInfo, userInfo } = this.props;

		e.preventDefault();

		if (currentValue.length < 300 && currentValue && !$('.expando-container + div').hasClass('disabled')) {
			const chat = {
				userName: userInfo.userName,
				chat: currentValue,
				gameChat: false,
				uid: gameInfo.general.uid,
				inProgress: gameInfo.gameState.isStarted
			};

			this.props.socket.emit('addNewGameChat', chat);

			this.gameChatInput.value = '';

			this.gameChatInput.blur();
			setTimeout(() => {
				this.gameChatInput.focus();
			}, 300);
		}
	}

	scrollChats() {
		if (!this.state.lock) {
			this.refs.perfectScrollbar.setScrollTop(document.querySelectorAll('div.item').length * 1000);
		}
	}

	handleChatFilterClick(e) {
		this.setState({ chatFilter: $(e.currentTarget).text() });
	}

	handleTimestamps(timestamp) {
		const { userInfo } = this.props;

		if (userInfo.userName && userInfo.gameSettings && userInfo.gameSettings.enableTimestamps) {
			const hours = `0${new Date(timestamp).getHours()}`.slice(-2),
				minutes = `0${new Date(timestamp).getMinutes()}`.slice(-2),
				seconds = `0${new Date(timestamp).getSeconds()}`.slice(-2);

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
		const { gameInfo, userInfo } = this.props,
			playerIndex = gameInfo.publicPlayersState.findIndex(player => player.userName === userInfo.userName);

		this.setState({
			claim: this.state.claim ? '' : gameInfo.playersState[playerIndex].claim
		});
	}

	handleInsertEmote(emote) {
		this.gameChatInput.value += ` ${emote}`;
		this.gameChatInput.focus();
	}

	checkIsChatDisabled() {
		const { userInfo, gameInfo } = this.props,
			{ gameState, publicPlayersState } = gameInfo,
			{ gameSettings, userName, isSeated } = userInfo,
			isDead = (() => {
				if (userName && publicPlayersState.length && publicPlayersState.find(player => userName === player.userName)) {
					return publicPlayersState.find(player => userName === player.userName).isDead;
				}
			})(),
			isGovernmentDuringPolicySelection = (() => {
				if (gameState && (gameState.phase === 'presidentSelectingPolicy' || gameState.phase === 'chancellorSelectingPolicy') && userName && isSeated) {
					return (
						publicPlayersState.find(player => player.userName === userName).governmentStatus === 'isPresident' ||
						publicPlayersState.find(player => player.userName === userName).governmentStatus === 'isChancellor'
					);
				}
			})();

		if (
			!userName ||
			(isDead && !gameState.isCompleted) ||
			isGovernmentDuringPolicySelection ||
			gameInfo.general.disableChat ||
			(gameInfo.general.private &&
				!userInfo.isSeated &&
				!MODERATORS.includes(userInfo.userName) &&
				!ADMINS.includes(userInfo.userName) &&
				!EDITORS.includes(userInfo.userName)) ||
			(gameSettings && gameSettings.unbanTime && new Date(userInfo.gameSettings.unbanTime) > new Date())
		) {
			return true;
		} else {
			return false;
		}
	}

	processChats() {
		const { gameInfo, userInfo, userList, isReplay } = this.props,
			seatedUserNames = gameInfo.publicPlayersState ? gameInfo.publicPlayersState.map(player => player.userName) : [],
			{ chatFilter } = this.state,
			compareChatStrings = (a, b) => {
				const stringA = typeof a.chat === 'string' ? a.chat : a.chat.map(object => object.text).join('');
				const stringB = typeof b.chat === 'string' ? b.chat : b.chat.map(object => object.text).join('');
				return stringA > stringB ? 1 : -1;
			};

		if (
			isReplay ||
			!gameInfo.general.private ||
			userInfo.isSeated ||
			(userInfo.userName && (MODERATORS.includes(userInfo.userName) || ADMINS.includes(userInfo.userName) || EDITORS.includes(userInfo.userName)))
		) {
			return gameInfo.chats
				.sort((a, b) => (a.timestamp === b.timestamp ? compareChatStrings(a, b) : new Date(a.timestamp) - new Date(b.timestamp)))
				.filter(
					chat =>
						(chatFilter === 'No observer chat' && (chat.gameChat || seatedUserNames.includes(chat.userName))) ||
						(chat.gameChat && (chatFilter === 'Game' || chatFilter === 'All')) ||
						(!chat.gameChat && chatFilter !== 'Game' && chatFilter !== 'No observer chat')
				)
				.map((chat, i) => {
					const chatContents = processEmotes(chat.chat),
						isSeated = seatedUserNames.includes(chat.userName),
						playerListPlayer = Object.keys(userList).length ? userList.list.find(player => player.userName === chat.userName) : undefined;
					// ? <div className={chat.chat[2] && chat.chat[2].item.type ? `gamechat-item ${chat.chat[2].item.type}` : 'gamechat-item'} key={i}>
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
							<span className="broadcast-chat">{processEmotes(chat.chat)}</span>
						</div>
					) : (
						<div className="item" key={i}>
							{this.handleTimestamps(chat.timestamp)}
							<span
								className={
									playerListPlayer ? userInfo.gameSettings && userInfo.gameSettings.disablePlayerColorsInChat ? (
										'chat-user'
									) : playerListPlayer.wins + playerListPlayer.losses > 49 ? (
										`chat-user ${PLAYERCOLORS(playerListPlayer)}`
									) : (
										'chat-user'
									) : (
										'chat-user'
									)
								}
							>
								{isReplay || isSeated ? (
									''
								) : MODERATORS.includes(chat.userName) ? (
									<span data-tooltip="Moderator" data-inverted>
										<span className="observer-chat">(Observer) </span>
										<span className="moderator-name">(M) </span>
									</span>
								) : EDITORS.includes(chat.userName) ? (
									<span data-tooltip="Editor" data-inverted>
										<span className="observer-chat">(Observer) </span>
										<span className="editor-name">(E) </span>
									</span>
								) : ADMINS.includes(chat.userName) ? (
									<span data-tooltip="Admin" data-inverted>
										<span className="observer-chat">(Observer) </span>
										<span className="admin-name">(A) </span>
									</span>
								) : (
									<span className="observer-chat">(Observer) </span>
								)}
								{this.props.isReplay || gameInfo.gameState.isTracksFlipped ? isSeated ? (
									`${chat.userName} {${gameInfo.publicPlayersState.findIndex(publicPlayer => publicPlayer.userName === chat.userName) + 1}}`
								) : (
									chat.userName
								) : (
									chat.userName
								)}
								{': '}
							</span>
							<span>{chatContents}</span>
						</div>
					);
				});
		}
	}

	render() {
		const { userInfo, gameInfo, isReplay } = this.props,
			selectedWhitelistplayer = playerName => {
				const { playersToWhitelist } = this.state,
					playerIndex = playersToWhitelist.findIndex(player => player.userName === playerName);

				playersToWhitelist[playerIndex].isSelected = !playersToWhitelist[playerIndex].isSelected;

				this.setState(playersToWhitelist);
			},
			submitWhitelist = () => {
				const whitelistPlayers = this.state.playersToWhitelist.filter(player => player.isSelected).map(player => player.userName);
				this.props.socket.emit('updateGameWhitelist', {
					uid: gameInfo.general.uid,
					whitelistPlayers
				});
				$(this.whitelistModal).modal('hide');
			},
			MenuButton = ({ children }) => <div className="item">{children}</div>,
			WhiteListButton = () => {
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
			},
			WatchReplayButton = () => {
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
			},
			LeaveGameButton = () => {
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
					<a className={this.state.chatFilter === 'No observer chat' ? 'item active' : 'item'} onClick={this.handleChatFilterClick}>
						No observer chat
					</a>
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
					className={(() => {
						let classes = 'segment chats';

						if (this.state.claim) {
							classes += ' blurred';
						}

						return classes;
					})()}
				>
					<PerfectScrollbar
						ref="perfectScrollbar"
						onScrollY={this.handleChatScrolled}
						onYReachEnd={this.handleChatScrolledToBottom}
						option={{ suppressScrollX: true }}
					>
						<div className="ui list" onScroll={this.handleChatScroll}>
							{this.processChats()}
						</div>
					</PerfectScrollbar>
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
						<div className={this.checkIsChatDisabled() ? 'ui action input disabled' : 'ui action input'}>
							<input
								onSubmit={this.handleSubmit}
								maxLength="300"
								autoComplete="off"
								spellCheck="false"
								placeholder="Send a message"
								id="gameChatInput"
								ref={c => {
									this.gameChatInput = c;
								}}
							/>
							{this.checkIsChatDisabled() ? null : renderEmotesButton(this.handleInsertEmote)}
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
					className="ui basic fullscreen modal whitelistmodal"
					ref={c => {
						this.whitelistModal = c;
					}}
				>
					<h2 className="ui header">Select player(s) below to whitelist for seating in this private game.</h2>
					<ul>
						{this.state.playersToWhitelist.map((player, index) => {
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
	onNewGameChat: PropTypes.func,
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
