import React from 'react';
import $ from 'jquery';
import {PLAYERCOLORS, MODERATORS} from '../../constants';

export default class Gamechat extends React.Component {
	constructor() {
		super();
		this.handleChatFilterClick = this.handleChatFilterClick.bind(this);
		this.handleSubmit = this.handleSubmit.bind(this);
		this.handleChatLockClick = this.handleChatLockClick.bind(this);
		this.handleChatClearClick = this.handleChatClearClick.bind(this);
		this.handleInputChange = this.handleInputChange.bind(this);
		this.handleClickedLeaveGame = this.handleClickedLeaveGame.bind(this);
		this.handleClickedClaimButton = this.handleClickedClaimButton.bind(this);
		this.handleWhitelistPlayers = this.handleWhitelistPlayers.bind(this);
		this.handleBadKarmaCheck = this.handleBadKarmaCheck.bind(this);

		this.state = {
			chatFilter: 'All',
			lock: false,
			inputValue: '',
			claim: '',
			badKarma: '',
			playersToWhitelist: [],
			disabled: false
		};
	}

	componentDidMount() {
		this.scrollChats();

		$(this.leaveGameModal).on('click', '.leave-game.button', () => {  // modal methods dont seem to work.
			this.props.onLeaveGame(this.props.userInfo.isSeated, false, this.state.badKarma);
			$(this.leaveGameModal).modal('hide');
		});
	}

	componentDidUpdate(prevProps) {
		const {userInfo, gameInfo} = this.props;
		this.scrollChats();

		if (prevProps && userInfo.userName && prevProps.gameInfo.publicPlayersState.filter(player => player.isDead).length !== gameInfo.publicPlayersState.filter(player => player.isDead).length && gameInfo.publicPlayersState.find(player => userInfo.userName === player.userName).isDead
			|| (prevProps && userInfo.userName && gameInfo.gameState.phase === 'presidentSelectingPolicy' && (gameInfo.publicPlayersState.find(player => userInfo.userName === player.userName) && gameInfo.publicPlayersState.find(player => userInfo.userName === player.userName).governmentStatus === 'isPresident'
			|| gameInfo.publicPlayersState.find(player => userInfo.userName === player.userName) && gameInfo.publicPlayersState.find(player => userInfo.userName === player.userName).governmentStatus === 'isChancellor') && prevProps.gameInfo.gameState.phase !== 'presidentSelectingPolicy')) {
			this.setState({inputValue: ''});
			$(this.gameChatInput).blur();
		}
	}

	handleBadKarmaCheck(playerName) {
		this.setState({badKarma: playerName});
	}

	handleWhitelistPlayers() {
		this.setState({
			playersToWhitelist: this.props.userList.list.filter(user => user.userName !== this.props.userInfo.userName).map(user => ({userName: user.userName, isSelected: true}))
		});

		$(this.whitelistModal).modal('show');
	}

	handleClickedLeaveGame() {
		if (this.props.userInfo.isSeated && this.props.gameInfo.gameState.isStarted && !this.props.gameInfo.gameState.isCompleted) {
			$(this.leaveGameModal).modal('show');
		} else {
			this.props.onLeaveGame(this.props.userInfo.isSeated);
		}
	}

	handleChatClearClick() {
		this.setState({inputValue: ''});
	}

	handleInputChange(e) {
		this.setState({inputValue: `${e.target.value}`});
	}

	handleSubmit(e) {
		const currentValue = this.state.inputValue,
			{gameInfo, userInfo} = this.props;

		e.preventDefault();

		if (currentValue.length) {
			const chat = {
				userName: userInfo.userName,
				chat: currentValue,
				gameChat: false,
				uid: gameInfo.general.uid,
				inProgress: gameInfo.gameState.isStarted
			};

			this.props.socket.emit('addNewGameChat', chat);
			this.setState({
				inputValue: '',
				disabled: true
			});
			this.gameChatInput.blur();
			setTimeout(() => {
				this.setState({disabled: false});
				this.gameChatInput.focus();
			}, 150);
		}
	}

	scrollChats() {
		if (!this.state.lock) {
			document.querySelector('section.segment.chats > .ui.list').scrollTop = 99999999;
		}
	}

	handleChatFilterClick(e) {
		this.setState({chatFilter: $(e.currentTarget).text()});
	}

	handleTimestamps(timestamp) {
		const {userInfo} = this.props;

		if (userInfo.userName && userInfo.gameSettings && userInfo.gameSettings.enableTimestamps) {
			const minutes = (`0${new Date(timestamp).getMinutes()}`).slice(-2),
				seconds = (`0${new Date(timestamp).getSeconds()}`).slice(-2);

			return <span className="chat-timestamp">({minutes}: {seconds})</span>;
		}
	}

	handleChatLockClick() {
		if (this.state.lock) {
			this.setState({lock: false});
		} else {
			this.setState({lock: true});
		}
	}

	handleClickedClaimButton() {
		const {gameInfo, userInfo} = this.props,
			playerIndex = gameInfo.publicPlayersState.findIndex(player => player.userName === userInfo.userName);

		this.setState({claim: this.state.claim ? '' : gameInfo.playersState[playerIndex].claim});
	}

	processChats() {
		const {gameInfo, userInfo, userList} = this.props,
			seatedUserNames = gameInfo.publicPlayersState.map(player => player.userName),
			{chatFilter} = this.state;

		return gameInfo.chats.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
			.filter(chat => (chatFilter === 'No observer chat' && (chat.gameChat || seatedUserNames.includes(chat.userName))) || (chat.gameChat && (chatFilter === 'Game' || chatFilter === 'All')) || (!chat.gameChat && chatFilter !== 'Game' && chatFilter !== 'No observer chat'))
			.map((chat, i) => {
				const chatContents = chat.chat,
					isSeated = seatedUserNames.includes(chat.userName),
					playerListPlayer = Object.keys(userList).length ? userList.list.find(player => player.userName === chat.userName) : undefined;

				return chat.gameChat ? (
					<div className="item" key={i}>
						<span className="chat-user--game">[GAME]{this.handleTimestamps(chat.timestamp)}: </span>
						<span className="game-chat">
							{(() => {
								return chatContents.map((chatSegment, index) => {
									if (chatSegment.type) {
										let classes;

										if (chatSegment.type === 'player') {
											classes = 'chat-player';
										} else {
											classes = `chat-role--${chatSegment.type}`;
										}

										return <span key={index} className={classes}>{chatSegment.text}</span>;
									}

									return chatSegment.text;
								});
							})()}
						</span>
					</div>
			) : chat.isClaim ? (
				<div className="item" key={i}>
					<span className="chat-user--claim">[CLAIM]{this.handleTimestamps(chat.timestamp)}: </span>
					<span className="claim-chat">
						{(() => {
							return chatContents.map((chatSegment, index) => {
								if (chatSegment.type) {
									let classes;

									if (chatSegment.type === 'player') {
										classes = 'chat-player';
									} else {
										classes = `chat-role--${chatSegment.type}`;
									}

									return <span key={index} className={classes}>{chatSegment.text}</span>;
								}

								return chatSegment.text;
							});
						})()}
					</span>
				</div>
			) :	chat.isBroadcast ? (
				<div className="item" key={i}>
					<span className="chat-user--broadcast">[BROADCAST]{this.handleTimestamps(chat.timestamp)}: </span>
					<span className="broadcast-chat">{chat.chat}</span>
				</div>
			) : (
				<div className="item" key={i}>
					<span className={playerListPlayer ? (userInfo.gameSettings && userInfo.gameSettings.disablePlayerColorsInChat) ? 'chat-user' : `chat-user ${PLAYERCOLORS(playerListPlayer)}` : 'chat-user'}>
						{gameInfo.gameState.isTracksFlipped ? isSeated ? `${chat.userName} {${gameInfo.publicPlayersState.findIndex(publicPlayer => publicPlayer.userName === chat.userName) + 1}}` : chat.userName : chat.userName}{isSeated ? '' : MODERATORS.includes(chat.userName) ? <span><span className="moderator-name"> (M)</span><span className="observer-chat"> (Observer)</span></span> : <span className="observer-chat"> (Observer)</span>}{this.handleTimestamps(chat.timestamp)}:
					</span>
					<span> {chatContents}</span>
				</div>
				);
			});
	}

	render() {
		const {userInfo, gameInfo} = this.props,
			selectedWhitelistplayer = (playerName) => {
				const {playersToWhitelist} = this.state,
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
			};

		return (
			<section className="gamechat">
				<section className="ui pointing menu">
					<a className={this.state.chatFilter === 'All' ? 'item active' : 'item'} onClick={this.handleChatFilterClick}>All</a>
					<a className={this.state.chatFilter === 'Chat' ? 'item active' : 'item'} onClick={this.handleChatFilterClick}>Chat</a>
					<a className={this.state.chatFilter === 'Game' ? 'item active' : 'item'} onClick={this.handleChatFilterClick}>Game</a>
					<a className={this.state.chatFilter === 'No observer chat' ? 'item active' : 'item'} onClick={this.handleChatFilterClick}>No observer chat</a>
					<i className={this.state.lock ? 'large lock icon' : 'large unlock alternate icon'} onClick={this.handleChatLockClick} />
					{(() => {
						if (userInfo.isSeated && gameInfo.general.private && !gameInfo.gameState.isStarted) {
							return <div className='ui button whitelist' onClick={this.handleWhitelistPlayers}>Whitelist Players</div>;
						}
					})()}
					<div className={
						(() => {
							let classes = 'ui primary button';

							if (userInfo.isSeated && (gameInfo.gameState.isStarted && !gameInfo.gameState.isCompleted)) {
								classes += ' ui-disabled';
							}

							return classes;
						})()
					} onClick={this.handleClickedLeaveGame}>Leave Game</div>
				</section>
				<section style={{fontSize: (userInfo.gameSettings && userInfo.gameSettings.fontSize) ? `${userInfo.gameSettings.fontSize}px` : '18px'}} className={
					(() => {
						let classes = 'segment chats';

						if (this.state.claim) {
							classes += ' blurred';
						}

						return classes;
					})()
				}>
					<div className="ui list">
						{this.processChats()}
					</div>
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
								this.setState({claim: ''});
							};

							switch (this.state.claim) {
							case 'wasPresident':
								return (
									<div>
										<p> As president, I drew...</p>
										<button onClick={(e) => {
											handleClaimButtonClick(e, 'threefascist');
										}} className="ui button threefascist">3 Fascist policies</button>
										<button onClick={(e) => {
											handleClaimButtonClick(e, 'twofascistoneliberal');
										}} className="ui button twofascistoneliberal">2 Fascist and a Liberal policy</button>
										<button onClick={(e) => {
											handleClaimButtonClick(e, 'twoliberalonefascist');
										}} className="ui button twoliberalonefascist">2 Liberal and a Fascist policy</button>
										<button onClick={(e) => {
											handleClaimButtonClick(e, 'threeliberal');
										}} className="ui button threeliberal">3 Liberal policies</button>
									</div>
								);
							case 'wasChancellor':
								return (
									<div>
										<p> As chancellor, I received...</p>
										<button onClick={(e) => {
											handleClaimButtonClick(e, 'twofascist');
										}} className="ui button threefascist">2 Fascist policies</button>
										<button onClick={(e) => {
											handleClaimButtonClick(e, 'onefascistoneliberal');
										}} className="ui button onefascistoneliberal">A Fascist and a Liberal policy</button>
										<button onClick={(e) => {
											handleClaimButtonClick(e, 'twoliberal');
										}} className="ui button threeliberal">2 Liberal policies</button>
									</div>
								);
							case 'didInvestigateLoyalty':
								return (
									<div>
										<p> As president, when I looked at the party membership I saw that he or she was on the...</p>
										<button onClick={(e) => {
											handleClaimButtonClick(e, 'fascist');
										}} className="ui button threefascist">Fascist team</button>
										<button onClick={(e) => {
											handleClaimButtonClick(e, 'liberal');
										}} className="ui button threeliberal">Liberal team</button>
									</div>
								);
							case 'didPolicyPeek':
								return (
									<div>
										<p> As president, I peeked and saw... </p>
										<button onClick={(e) => {
											handleClaimButtonClick(e, 'threefascist');
										}} className="ui button threefascist">3 Fascist policies</button>
										<button onClick={(e) => {
											handleClaimButtonClick(e, 'twofascistoneliberal');
										}} className="ui button twofascistoneliberal">2 Fascist and a Liberal policy</button>
										<button onClick={(e) => {
											handleClaimButtonClick(e, 'twoliberalonefascist');
										}} className="ui button twoliberalonefascist">2 Liberal and a Fascist policy</button>
										<button onClick={(e) => {
											handleClaimButtonClick(e, 'threeliberal');
										}} className="ui button threeliberal">3 Liberal policies</button>
									</div>
								);
							}
						}
					})()}
				</section>
				<form className="segment inputbar" onSubmit={this.handleSubmit}>
					{(() => {
						const {gameInfo, userInfo} = this.props;

						let classes = 'expando-container';

						if (!userInfo.isSeated || gameInfo.gameState.isNight || gameInfo.gameState.isCompleted || (gameInfo.gameState.isStarted && !gameInfo.gameState.isDay)) {
							classes += ' app-visibility-hidden';
						}

						return (
							<div className={classes}>
								<i
									className={
										(() => {
											let classes = 'large delete icon';

											if (!this.state.inputValue.length) {
												classes += ' app-visibility-hidden';
											}

											return classes;
										})()
									}
									onClick={this.handleChatClearClick}
								/>
							</div>
						);
					})()}
					<div
						className={
							(() => {
								let classes = 'ui action input';

								const {userInfo, gameInfo} = this.props,
									{gameState, publicPlayersState} = gameInfo,
									{gameSettings, userName, isSeated} = userInfo,
									isDead = (() => {
										if (userName
											&& publicPlayersState.length
											&& publicPlayersState.find(player => userName === player.userName)) {
											return publicPlayersState.find(player => userName === player.userName).isDead;
										}
									})(),
									isGovernmentDuringPolicySelection = (() => {
										if ((gameState.phase === 'presidentSelectingPolicy'
											|| gameState.phase === 'chancellorSelectingPolicy') && userName && isSeated) {
											return publicPlayersState.find(player => player.userName === userName).governmentStatus === 'isPresident' || publicPlayersState.find(player => player.userName === userName).governmentStatus === 'isChancellor';
										}
									})();

								if (!userName
									|| this.state.disabled
									|| (isDead && !gameState.isCompleted)
									|| isGovernmentDuringPolicySelection
									|| gameInfo.general.disableChat
									|| (gameInfo.general.private && !userInfo.isSeated)
									|| (gameSettings && gameSettings.unbanTime && new Date(userInfo.gameSettings.unbanTime) > new Date())) {
									classes += ' disabled';
								}

								return classes;
							})()
						}
					>
						<input value={this.state.inputValue} autoComplete="off" spellCheck="false" placeholder="Chat.." id="gameChatInput" ref={c => {
							this.gameChatInput = c;
						}} onChange={this.handleInputChange} maxLength="300" />
						<button className={this.state.inputValue.length ? 'ui primary button' : 'ui primary button disabled'}>Chat</button>
					</div>
					{(() => {
						if (gameInfo.playersState.length && userInfo.userName && gameInfo.playersState[gameInfo.publicPlayersState.findIndex(player => player.userName === userInfo.userName)].claim) {
							return <div className="claim-button" title="Click here to make a claim in chat" onClick={this.handleClickedClaimButton}>C</div>;
						}
					})()}
				</form>
				<div className="ui basic fullscreen modal leavegamemodals" ref={c => {
					this.leaveGameModal = c;
				}}>
					<h2 className="ui header">DANGER.  Leaving an in-progress game will ruin it for the other players (unless you've been executed).  Do this only in the case of a game already ruined by an AFK/disconnected player or if someone has already left.</h2>
					<div className="ui green positive inverted leave-game button">
						<i className="checkmark icon"></i>
						Leave game
					</div>
				</div>
				<div className="ui basic fullscreen modal whitelistmodal" ref={c => {
					this.whitelistModal = c;
				}}>
					<h2 className="ui header">Select player(s) below to whitelist for seating in this private game.</h2>
					<ul>
						{this.state.playersToWhitelist.map((player, index) => {
							const uid = Math.random().toString(36).substring(2);

							return (
								<li key={index}>
									<input type="checkbox" id={uid} defaultChecked={true} onChange={() => {
										selectedWhitelistplayer(player.userName);
									}}/>
									<label htmlFor={uid}>{player.userName}</label>
								</li>
							);
						})}
					</ul>
					<div className="ui green positive inverted whitelist-submit button" onClick={submitWhitelist}>Submit</div>
				</div>
			</section>
		);
	}
}

Gamechat.propTypes = {
	onNewGameChat: React.PropTypes.func,
	clickedGameRole: React.PropTypes.object,
	clickedPlayer: React.PropTypes.object,
	roleState: React.PropTypes.func,
	selectedGamerole: React.PropTypes.object,
	selectedPlayer: React.PropTypes.object,
	userInfo: React.PropTypes.object,
	gameInfo: React.PropTypes.object,
	socket: React.PropTypes.object,
	userList: React.PropTypes.object
};