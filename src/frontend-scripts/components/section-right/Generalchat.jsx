import React from 'react';
import classnames from 'classnames';
import { MODERATORS, EDITORS, ADMINS } from '../../constants';
import PropTypes from 'prop-types';
import { renderEmotesButton, processEmotes } from '../../emotes';
import PerfectScrollbar from 'react-perfect-scrollbar';
import moment from 'moment';

export default class Generalchat extends React.Component {
	constructor() {
		super();
		this.handleChatLockClick = this.handleChatLockClick.bind(this);
		this.handleSubmit = this.handleSubmit.bind(this);
		this.handleInputChange = this.handleInputChange.bind(this);
		this.handleChatClearClick = this.handleChatClearClick.bind(this);
		this.handleChatScrolled = this.handleChatScrolled.bind(this);
		this.handleChatScrolledToBottom = this.handleChatScrolledToBottom.bind(this);
		this.handleInsertEmote = this.handleInsertEmote.bind(this);
		this.handleKeyPress = this.handleKeyPress.bind(this);
		this.state = {
			lock: false,
			inputValue: '',
			disabled: false
		};
	}

	componentDidMount() {
		this.scrollChats();
	}

	componentDidUpdate() {
		this.scrollChats();
	}

	handleChatClearClick() {
		this.setState({ inputValue: '' });
	}

	handleInputChange(e) {
		this.setState({ inputValue: `${e.target.value}` });
	}

	handleSubmit(e) {
		const { inputValue } = this.state;

		if (inputValue.length < 300 && inputValue) {
			this.props.socket.emit('addNewGeneralChat', {
				userName: this.props.userInfo.userName,
				chat: inputValue
			});

			this.setState({
				inputValue: '',
				disabled: true
			});

			this.input.blur();
			setTimeout(() => {
				this.setState({ disabled: false });
				this.input.focus();
			}, 300);
		}
	}

	scrollChats() {
		if (!this.state.lock) {
			this.refs.perfectScrollbar.setScrollTop(document.querySelectorAll('div.item').length * 300);
		}
	}

	processChats() {
		const { userInfo } = this.props;
		let timestamp;

		return this.props.generalChats.map((chat, i) => {
			const userClasses = classnames(
				{
					[chat.color]: !(userInfo.gameSettings && userInfo.gameSettings.disablePlayerColorsInChat)
				},
				'chat-user'
			);
			if (userInfo.userName && userInfo.gameSettings && userInfo.gameSettings.enableTimestamps) {
				timestamp = <span className="timestamp">{moment(chat.time).format('HH:mm')} </span>;
			}
			return (
				<div key={i} className="item">
					{timestamp}
					<span className={chat.isBroadcast ? 'chat-user broadcast' : userClasses}>
						{MODERATORS.includes(chat.userName) && <span className="moderator-name">(M) </span>}
						{EDITORS.includes(chat.userName) && <span className="editor-name">(E) </span>}
						{ADMINS.includes(chat.userName) && <span className="admin-name">(A) </span>}
						{`${chat.userName}: `}
					</span>
					<span className={chat.isBroadcast ? 'broadcast-chat' : ''}>{processEmotes(chat.chat)}</span>
				</div>
			);
		});
	}

	handleChatLockClick() {
		this.setState({ lock: !this.state.lock });
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

	handleInsertEmote(emote) {
		const newMsg = this.state.inputValue + ` ${emote}`;
		this.setState({ inputValue: newMsg });
		this.input.focus();
	}

	handleKeyPress(e) {
		if (e.keyCode === 13 && e.shiftKey === false) {
			this.handleSubmit(this.state.inputValue);
		}
	}

	// <embed height='400' width='400' src='https://widgetbot.io/embed/323243744914571264/323243744914571264/0002/' />

	render() {
		return (
			<section className="generalchat">
				<section className="generalchat-header">
					<div className="clearfix">
						<h3 className="ui header">Chat</h3>
						<i
							title="Click here to lock chat and prevent from scrolling"
							className={this.state.lock ? 'large lock icon' : 'large unlock alternate icon'}
							onClick={this.handleChatLockClick}
						/>
					</div>
				</section>
				<section className="segment chats">
					<PerfectScrollbar ref="perfectScrollbar" onScrollY={this.handleChatScrolled} onYReachEnd={this.handleChatScrolledToBottom}>
						<div className="ui list genchat-container" onScroll={this.handleChatScrolled}>
							{this.processChats()}
						</div>
					</PerfectScrollbar>
				</section>
				<div className={this.props.userInfo.userName ? (!this.state.disabled ? 'ui action input' : 'ui action input disabled') : 'ui action input disabled'}>
					<textarea
						disabled={!this.props.userInfo.userName}
						className="chat-input-box"
						placeholder="Send a message"
						value={this.state.inputValue}
						onChange={this.handleInputChange}
						maxLength="300"
						spellCheck="false"
						onKeyDown={this.handleKeyPress}
						ref={c => {
							this.input = c;
						}}
					/>
					{this.props.userInfo.userName ? renderEmotesButton(this.handleInsertEmote) : null}
					<div className="chat-button">
						<button onClick={this.handleSubmit} className={this.state.inputValue ? 'ui primary button' : 'ui primary button disabled'}>
							Chat
						</button>
					</div>
				</div>
			</section>
		);
	}
}

Generalchat.propTypes = {
	gameInfo: PropTypes.object,
	userInfo: PropTypes.object,
	socket: PropTypes.object,
	generalChats: PropTypes.array,
	userList: PropTypes.object
};
