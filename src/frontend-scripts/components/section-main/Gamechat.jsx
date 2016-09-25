import React from 'react';
import $ from 'jquery';
// import _ from 'lodash';

export default class Gamechat extends React.Component {
	constructor() {
		super();

		this.handleChatFilterClick = this.handleChatFilterClick.bind(this);
		this.handleSubmit = this.handleSubmit.bind(this);
		this.handleChatClearClick = this.handleChatClearClick.bind(this);
		this.handleInputChange = this.handleInputChange.bind(this);
		this.state = {
			chatFilter: 'All',
			lock: false,
			hotkey: 'init',
			altClaim: '',
			inputValue: ''
		};
	}

	componentDidMount() {
		this.scrollChats();
	}

	componentDidUpdate() {
		// const $input = $(this.gameChatInput)
		// 	// ,
		// 	// {selectedPlayer} = this.props,
		// 	// currentValue = this.state.inputValue
		// 	;
		this.scrollChats();
		// if (prevProps && !prevProps.gameInfo.gameState.cardsDealt && this.props.gameInfo.gameState.cardsDealt) {
		// 	this.setState({inputValue: ''});
		// 	$input.blur();
		// }
	}

	handleChatClearClick() {
		this.setState({
			inputValue: '',
			altClaim: '',
			hotkey: 'init'
		});
	}

	handleInputChange(e) {
		this.setState({inputValue: `${e.target.value}`});
	}

	handleSubmit(e) {
		const currentValue = this.state.inputValue,
			{gameInfo, userInfo} = this.props
			// ,
			// {hotkey, altClaim} = this.state
		;

		e.preventDefault();

		if (currentValue.length) {
			const chat = {
				userName: userInfo.userName,
				chat: currentValue,
				gameChat: false,
				uid: gameInfo.general.uid,
				inProgress: gameInfo.gameState.isStarted
			};

			// if (gameInfo.gameState.isStarted && !gameInfo.gameState.isCompleted && userInfo.seatNumber && hotkey !== 'init') {
			// 	chat.claim = altClaim || hotkey;
			// }

			this.props.socket.emit('addNewGameChat', chat);
			this.setState({
				inputValue: '',
				altClaim: '',
				hotkey: 'init'
			});
		}
	}

	scrollChats() {
		const chatsContainer = document.querySelector('section.segment.chats > .ui.list');

		if (!this.state.lock) {
			chatsContainer.scrollTop = 99999999;
		}
	}

	handleChatFilterClick(e) {
		this.setState({
			chatFilter: $(e.currentTarget).text()
		});
	}

	handleTimestamps(timestamp) {
		const {userInfo} = this.props;

		if (userInfo.userName && userInfo.gameSettings && userInfo.gameSettings.enableTimestamps) {
			const minutes = (`0${new Date(timestamp).getMinutes()}`).slice(-2),
				seconds = (`0${new Date(timestamp).getSeconds()}`).slice(-2);

			return (
				<span className="chat-timestamp">
					({minutes}: {seconds})
				</span>
			);
		}
	}

	handleChatLockClick() {
		if (this.state.lock) {
			this.setState({lock: false});
		} else {
			this.setState({lock: true});
		}
	}

	processChats() {
		const {gameInfo} = this.props,
			{chatFilter} = this.state;

		return gameInfo.chats.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
			.filter(chat => ((chat.gameChat && (chatFilter === 'Game' || chatFilter === 'All'))) || (!chat.gameChat && chatFilter !== 'Game'))
			.map((chat, i) => {
				const chatContents = chat.chat,
					players = Object.keys(gameInfo.seated).map(seatName => {
						return {
							name: gameInfo.seated[seatName].userName
						};
					}),
					isSeated = () => Boolean(Object.keys(gameInfo.seated).find(seatName => gameInfo.seated[seatName].userName === chat.userName)),
					roles = [
						{
							name: 'liberal',
							team: 'liberal'
						},
						{
							name: 'fascist',
							team: 'fascist'
						},
						{
							name: 'hitler',
							team: 'fascist'
						}
					];

				return chat.gameChat ? (
					<div className="item" key={i}>
						<span className="chat-user--game">[GAME] {this.handleTimestamps(chat.timestamp)}: </span>
						<span className="game-chat">
							{(() => {
								return chatContents.map((chatSegment, index) => {
									if (chatSegment.type) {
										let classes;

										if (chatSegment.type === 'playerName') {
											classes = 'chat-player';
										} else {
											classes = `chat-role--${roles.find(role => role.name === chatSegment.text).team}`;
										}

										return <span key={index} className={classes}>{chatSegment.text}</span>;
									}

									return chatSegment.text;
								});
							})()}
						</span>
					</div>
			) :
			(
					<div className="item" key={i}>
						<span className="chat-user">{chat.userName}{isSeated() ? '' : ' (Observer)'}{this.handleTimestamps(chat.timestamp)}: </span>
						<span>
							{(() => {
								const toProcessChats = [],
									splitChat = chatContents.split((() => {
										const toRegex = players.map(player => {
											return player.name;
										}).concat(roles.map(role => {
											return role.name;
										})).join('|');

										return new RegExp(toRegex, 'i');
									})()),
									combinedToProcess = roles.concat(players);

								combinedToProcess.forEach(item => {
									const split = chatContents.split(new RegExp(item.name, 'i'));

									if (split.length > 1) {
										split.forEach((piece, i) => {
											if (i < split.length - 1) {
												const processor = { // todo-alpha there's a bug here with chats that go (playername)(rolename)(same rolename) but it will have to wait until I have some time to dig into it
													text: item.name,
													index: (() => {
														let _index = i;

														/**
															* Recusively processes split chunks.
														* @param {int} splitIndex The index of the split to process
														* @return {int} tbd
														*/
														function processSplits(splitIndex) {
															if (typeof split[_index - 1] !== 'undefined' && !split[splitIndex].length && split[splitIndex - 1].substr(0, item.name.length) !== item.name) {
																return processSplits(_index--);
															}
															const spliceSplit = split.splice(0, splitIndex || splitIndex + 1),
																reducedSplit = spliceSplit.length > 1 ? spliceSplit.reduce((prev, curr) => {
																	return !prev.length ? item.name.length : 0 + !curr.length ? item.name.length : curr.length;
																}) : spliceSplit[splitIndex].length ? spliceSplit[splitIndex].length : item.name.length;

															// console.log(spliceSplit);

															// console.log(reducedSplit);

															// console.log(split[splitIndex].length);

															// return split[splitIndex].length ?

															return split[splitIndex].length || reducedSplit ? reducedSplit : item.name.length;
														}

														// return split[index].length;
														return processSplits(_index);
													})(),
													type: item.team ? 'roleName' : 'playerName'
												};

												// console.log(processor);

												// seer seer robber seer == seer seer seer robber

												if (item.team) {
													processor.team = item.team;
												}

												toProcessChats.push(processor);
											}
										});
									}
								});

								toProcessChats.sort((a, b) => {
									return a.index - b.index;
								});

								return splitChat.map((piece, index) => {
									if (index) {
										const item = toProcessChats[index - 1];

										return (
											<span key={index}>
												<span className={item.team ? `chat-role--${item.team}` : 'chat-player'}>{item.text}</span>{piece}
											</span>
										);
									}

									return piece;
								});
							})()}
						</span>
					</div>
				);
			});
	}

	render() {
		return (
			<section className="gamechat">
				<section className="ui pointing menu">
					<a className={this.state.chatFilter === 'All' ? 'item active' : 'item'} onClick={this.handleChatFilterClick}>All</a>
					<a className={this.state.chatFilter === 'Chat' ? 'item active' : 'item'} onClick={this.handleChatFilterClick}>Chat</a>
					<a className={this.state.chatFilter === 'Game' ? 'item active' : 'item'} onClick={this.handleChatFilterClick}>Game</a>
					<i className={this.state.lock ? 'large lock icon' : 'large unlock alternate icon'} onClick={this.handleChatLockClick} />
				</section>
				<section className="segment chats">
					<div className="ui list">
						{this.processChats()}
					</div>
				</section>
				<form className="segment inputbar" onSubmit={this.handleSubmit}>
					{(() => {
						const {gameInfo, userInfo} = this.props;

						let classes = 'expando-container';

						if (!userInfo.seatNumber || gameInfo.gameState.isNight || gameInfo.gameState.isCompleted || (gameInfo.gameState.isStarted && !gameInfo.gameState.isDay)) {
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
								{(() => {
									if (gameInfo.gameState.isStarted && userInfo.seatNumber) {
										return this.createHotkeys();
									}
								})()}
							</div>
						);
					})()}
					<div
						className={
							(() => {
								let classes = 'ui action input';

								const {gameState} = this.props.gameInfo;

								if (!this.props.userInfo.userName || (gameState.cardsDealt && !gameState.isDay)) {
									classes += ' disabled';
								}

								return classes;
							})()
						}
					>
						<input value={this.state.inputValue} autoComplete="off" placeholder="Chat.." id="gameChatInput" ref={c => {
							this.gameChatInput = c;
						}} onChange={this.handleInputChange} maxLength="300" />
						<button className={this.state.inputValue.length ? 'ui primary button' : 'ui primary button disabled'}>Chat</button>
					</div>
				</form>
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
	socket: React.PropTypes.object
};