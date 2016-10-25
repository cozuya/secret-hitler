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
			inputValue: ''
		};
	}

	componentDidMount() {
		this.scrollChats();
	}

	componentDidUpdate() {
		this.scrollChats();
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
				inputValue: ''
			});
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

	processChats() {
		const {gameInfo} = this.props,
			{chatFilter} = this.state;

		return gameInfo.chats.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
			.filter(chat => ((chat.gameChat && (chatFilter === 'Game' || chatFilter === 'All'))) || (!chat.gameChat && chatFilter !== 'Game'))
			.map((chat, i) => {
				const chatContents = chat.chat,
					isSeated = Boolean(gameInfo.seatedPlayers.find(player => player.userName === chat.userName));

				return chat.gameChat ? (
					<div className="item" key={i}>
						<span className="chat-user--game">[GAME] {this.handleTimestamps(chat.timestamp)}: </span>
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
			) :
			(
				<div className="item" key={i}>
					<span className="chat-user">{chat.userName}{isSeated ? '' : ' (Observer)'}{this.handleTimestamps(chat.timestamp)}: </span>
					<span>{chatContents}</span>
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