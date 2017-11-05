import React from 'react';
import classnames from 'classnames';
import { MODERATORS, EDITORS, ADMINS } from '../../constants';
import PropTypes from 'prop-types';
import { processEmotes } from '../../emotes';
import moment from 'moment';

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
			disabled: false,
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
		if (!this.state.lock && !this.state.discordEnabled) {
			document.querySelector('.genchat-container').scrollTop = 99999999;
		}
	}

	handleChatLockClick() {
		this.setState({ lock: !this.state.lock });
	}

	handleChatScrolled(e) {
		const el = e.currentTarget;

		if (this.state.lock && el.scrollTop - (el.scrollHeight - el.offsetHeight) >= -20) {
			this.setState({
				lock: false
			});
		} else if (el.scrollTop - (el.scrollHeight - el.offsetHeight) < -20 && !this.state.lock) {
			this.setState({
				lock: true
			});
		}
	}

	renderInput() {
		return this.state.discordEnabled ? null : (
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
		);
	}

	renderChats() {
		const { userInfo, generalChats } = this.props;

		return this.state.discordEnabled ? (
			<embed height="272" width="100%" src="https://widgetbot.io/embed/323243744914571264/323243744914571264/0003/" />
		) : Object.keys(generalChats).length ? (
			generalChats.list.map((chat, i) => {
				const userClasses = classnames(
					{
						[chat.color]: !(userInfo.gameSettings && userInfo.gameSettings.disablePlayerColorsInChat)
					},
					'chat-user',
					'genchat-user'
				);

				return (
					<div className="item" title={moment(chat.time).format('h:mm')} key={i}>
						<span className={chat.isBroadcast ? 'chat-user--broadcast' : 'chat-user genchat-user'}>
							<a href={`#/profile/${chat.userName}`} className={userClasses}>
								{chat.userName}
							</a>
							{MODERATORS.includes(chat.userName) && <span className="moderator-name"> (M)</span>}
							{EDITORS.includes(chat.userName) && <span className="editor-name"> (E)</span>}
							{ADMINS.includes(chat.userName) && <span className="admin-name"> (A)</span>}
							{chat.userName && ':'}{' '}
						</span>
						<span className={chat.isBroadcast ? 'broadcast-chat' : ''}>{processEmotes(chat.chat)}</span>
					</div>
				);
			})
		) : null;
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
				<section className="generalchat-header hoz-gradient">
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
					<div className="ui divider right-sidebar-divider" />
				</section>
				<section className={this.state.discordEnabled ? 'segment chats discord' : 'segment chats'}>
					{!this.state.discordEnabled && this.renderSticky()}
					<div className="ui list genchat-container" onScroll={this.handleChatScrolled}>
						{this.renderChats()}
					</div>
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
