import React from 'react';
import classnames from 'classnames';
import { MODERATORS, EDITORS, ADMINS } from '../../constants';
import PropTypes from 'prop-types';
import { processEmotes } from '../../emotes';

export default class Generalchat extends React.Component {
	constructor() {
		super();
		this.handleChatLockClick = this.handleChatLockClick.bind(this);
		this.handleSubmit = this.handleSubmit.bind(this);
		this.handleInputChange = this.handleInputChange.bind(this);
		this.handleChatClearClick = this.handleChatClearClick.bind(this);
		this.handleChatScrolled = this.handleChatScrolled.bind(this);
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

		e.preventDefault();
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
			document.querySelector('.genchat-container').scrollTop = 99999999;
		}
	}

	processChats() {
		const { userInfo } = this.props;

		return this.props.generalChats.list.map((chat, i) => {
			const userClasses = classnames(
				{
					[chat.color]: !(userInfo.gameSettings && userInfo.gameSettings.disablePlayerColorsInChat)
				},
				'chat-user'
			);

			return (
				<div className="item" key={i}>
					<span className={chat.isBroadcast ? 'chat-user--broadcast' : userClasses}>
						{chat.userName}
						{(() => {
							if (MODERATORS.includes(chat.userName)) {
								return <span className="moderator-name"> (M)</span>;
							}

							if (EDITORS.includes(chat.userName)) {
								return <span className="editor-name"> (E)</span>;
							}

							if (ADMINS.includes(chat.userName)) {
								return <span className="admin-name"> (A)</span>;
							}
						})()}
						{chat.userName && ':'}{' '}
					</span>
					<span className={chat.isBroadcast ? 'broadcast-chat' : ''}>{processEmotes(chat.chat)}</span>
				</div>
			);
		});
	}

	handleChatLockClick() {
		this.setState({ lock: !this.state.lock });
	}

	handleChatScrolled(e) {
		const el = e.currentTarget;

		if (el.scrollTop === el.scrollHeight - el.offsetHeight && this.state.lock) {
			this.setState({
				lock: false
			});
		} else if (el.scrollTop !== el.scrollHeight - el.offsetHeight && !this.state.lock) {
			this.setState({
				lock: true
			});
		}
	}

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
					<div className="ui divider right-sidebar-divider" />
				</section>
				<section className="segment chats">
					<div className="ui list genchat-container" onScroll={this.handleChatScrolled}>
						{this.processChats()}
					</div>
				</section>
				<form className="segment inputbar" onSubmit={this.handleSubmit}>
					<div className={this.props.userInfo.userName ? (!this.state.disabled ? 'ui action input' : 'ui action input disabled') : 'ui action input disabled'}>
						<input
							placeholder="Chat.."
							value={this.state.inputValue}
							onChange={this.handleInputChange}
							maxLength="300"
							spellCheck="false"
							ref={c => {
								this.input = c;
							}}
						/>
						<button className={this.state.inputValue ? 'ui primary button' : 'ui primary button disabled'}>Chat</button>
					</div>
					<i className={this.state.inputValue ? 'large delete icon' : 'large delete icon app-visibility-hidden'} onClick={this.handleChatClearClick} />
				</form>
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
