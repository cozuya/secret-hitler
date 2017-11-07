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
			discordEnabled: false,
			stickyEnabled: true
		};
	}

	componentDidMount() {
		this.scrollChats();
	}

	componentDidUpdate() {
		this.scrollChats();
	}

	componentWillReceiveProps(nextProps) {
		if (!this.state.stickyEnabled && this.props.generalChats.sticky !== nextProps.generalChats.sticky) {
			this.setState({
				stickyEnabled: true
			});
		}
	}

	handleChatClearClick() {
		this.setState({ inputValue: '' });
	}

	handleInputChange(e) {
		this.setState({ inputValue: `${e.target.value}` });
	}

	handleSubmit(e) {
		const inputValue = this.chatInput.value;

		if (inputValue && inputValue.length < 300) {
			this.props.socket.emit('addNewGeneralChat', {
				userName: this.props.userInfo.userName,
				chat: inputValue
			});

			this.chatInput.value = '';

			this.chatInput.blur();
			setTimeout(() => {
				this.chatInput.focus();
			}, 300);
		}
	}

	scrollChats() {
		if (!this.state.lock && !this.state.discordEnabled) {
			this.refs.perfectScrollbar.setScrollTop(document.querySelectorAll('div.item').length * 300);
		}
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
		this.chatInput.value += ` ${emote}`;
		this.chatInput.focus();
	}

	handleKeyPress(e) {
		if (e.keyCode === 13 && e.shiftKey === false) {
			e.preventDefault();
			this.handleSubmit();
		}
	}

	renderInput() {
		return this.state.discordEnabled ? null : (
			<div className={this.props.userInfo.userName ? 'ui action input' : 'ui action input disabled'}>
				<textarea
					disabled={!this.props.userInfo.userName}
					className="chat-input-box"
					placeholder="Send a message"
					maxLength="300"
					spellCheck="false"
					onKeyDown={this.handleKeyPress}
					ref={c => (this.chatInput = c)}
				/>
				{this.props.userInfo.userName ? renderEmotesButton(this.handleInsertEmote) : null}
				<div className="chat-button">
					<button onClick={this.handleSubmit} className="ui primary button">
						Chat
					</button>
				</div>
			</div>
		);
	}

	renderChats() {
		const { userInfo, generalChats } = this.props;
		let timestamp;

		return generalChats.list
			? generalChats.list.map((chat, i) => {
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
						<div className="item" key={i}>
							{timestamp}
							<span className={chat.isBroadcast ? 'chat-user broadcast' : userClasses}>
								{MODERATORS.includes(chat.userName) && <span className="moderator-name">(M) </span>}
								{EDITORS.includes(chat.userName) && <span className="editor-name">(E) </span>}
								{ADMINS.includes(chat.userName) && <span className="admin-name">(A) </span>}
								<a
									href={chat.isBroadcast ? '#/profile/' + chat.userName.split(' ').pop() : `#/profile/${chat.userName}`}
									className={'genchat-user ' + userClasses}
								>
									{`${chat.userName}: `}
								</a>
							</span>
							<span className={chat.isBroadcast ? 'broadcast-chat' : ''}>{processEmotes(chat.chat)}</span>
						</div>
					);
				})
			: null;
	}

	renderSticky() {
		if (this.state.stickyEnabled && this.props.generalChats.sticky) {
			const dismissSticky = () => {
				this.setState({ stickyEnabled: false });
			};

			return (
				<div className="sticky">
					<span>
						<span>Sticky: </span>
						{this.props.generalChats.sticky}
					</span>
					<i className="remove icon" onClick={dismissSticky} />
				</div>
			);
		}
	}

	render() {
		const { userInfo } = this.props,
			discordIconClick = () => {
				this.setState({
					discordEnabled: !this.state.discordEnabled
				});
			};

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
						{userInfo &&
							userInfo.userName && (
								<img
									title="Click to show our discord general chat instead of the site's general chat"
									className={this.state.discordEnabled ? 'active discord-icon' : 'discord-icon'}
									src="/images/discord-icon.png"
									onClick={discordIconClick}
								/>
							)}
					</div>
				</section>
				<section className="segment chats">
					{!this.state.discordEnabled && this.renderSticky()}
					{(() => {
						return this.state.discordEnabled ? (
							<embed height="100%" width="100%" src="https://widgetbot.io/embed/323243744914571264/323243744914571264/0003/" />
						) : (
							<PerfectScrollbar ref="perfectScrollbar" onScrollY={this.handleChatScrolled} onYReachEnd={this.handleChatScrolledToBottom}>
								<div className="ui list genchat-container" onScroll={this.handleChatScrolled}>
									{this.renderChats()}
								</div>
							</PerfectScrollbar>
						);
					})()}
				</section>
				{this.renderInput()}
			</section>
		);
	}
}

Generalchat.propTypes = {
	gameInfo: PropTypes.object,
	userInfo: PropTypes.object,
	socket: PropTypes.object,
	generalChats: PropTypes.object,
	userList: PropTypes.object
};
