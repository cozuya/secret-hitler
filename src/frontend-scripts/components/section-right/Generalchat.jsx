import React from 'react';
import classnames from 'classnames';
import {MODERATORS} from '../../constants';

export default class Generalchat extends React.Component {
	constructor() {
		super();
		this.handleChatLockClick = this.handleChatLockClick.bind(this);
		this.handleSubmit = this.handleSubmit.bind(this);
		this.handleInputChange = this.handleInputChange.bind(this);
		this.handleChatClearClick = this.handleChatClearClick.bind(this);
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
		this.setState({inputValue: ''});
	}

	handleInputChange(e) {
		this.setState({inputValue: `${e.target.value}`});
	}

	handleSubmit(e) {
		const {inputValue} = this.state;

		e.preventDefault();
		if (inputValue) {
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
				this.setState({disabled: false});
				this.input.focus();
			}, 150);
		}
	}

	scrollChats() {
		if (!this.state.lock) {
			document.querySelector('.genchat-container').scrollTop = 99999999;
		}
	}

	processChats() {
		const {userInfo} = this.props;

		return this.props.generalChats.map((chat, i) => {
			const userClasses = classnames(
				{ [chat.color]: !(userInfo.gameSettings && userInfo.gameSettings.disablePlayerColorsInChat) },
				'chat-user'
			);

			return (
				<div className="item" key={i}>
					<span className={chat.isBroadcast ? 'chat-user--broadcast' : userClasses}>{chat.userName}
						{(() => {
							if (MODERATORS.includes(chat.userName)) {
								return <span className="moderator-name"> (M)</span>;
							}
						})()}
					: </span>
					<span className={chat.isBroadcast ? 'broadcast-chat' : ''}>{chat.chat}</span>
				</div>
			);
		});
	}

	handleChatLockClick() {
		this.setState({lock: !this.state.lock});
	}

	render() {
		return (
			<section className="generalchat">
				<section className="generalchat-header">
					<div className="clearfix">
						<h3 className="ui header">Chat</h3>
						<i title="Click here to lock chat and prevent from scrolling" className={this.state.lock ? 'large lock icon' : 'large unlock alternate icon'} onClick={this.handleChatLockClick} />
					</div>
					<div className="ui divider right-sidebar-divider" />
				</section>
				<section className="segment chats">
					<div className="ui list genchat-container">
						{this.processChats()}
					</div>
				</section>
				<form className="segment inputbar" onSubmit={this.handleSubmit}>
					<div className={this.props.userInfo.userName ? !this.state.disabled ? 'ui action input' : 'ui action input disabled' : 'ui action input disabled'}>
						<input placeholder="Chat.." value={this.state.inputValue} onChange={this.handleInputChange} maxLength="300" spellCheck="false" ref={c => {
							this.input = c;
						}}/>
						<button className={this.state.inputValue ? 'ui primary button' : 'ui primary button disabled'}>Chat</button>
					</div>
					<i className={this.state.inputValue ? 'large delete icon' : 'large delete icon app-hidden'} onClick={this.handleChatClearClick} />
				</form>
			</section>
		);
	}
}

Generalchat.propTypes = {
	gameInfo: React.PropTypes.object,
	userInfo: React.PropTypes.object,
	socket: React.PropTypes.object,
	generalChats: React.PropTypes.array,
	userList: React.PropTypes.object
};