import React from 'react';

export default class Generalchat extends React.Component {
	constructor() {
		super();
		this.handleChatLockClick = this.handleChatLockClick.bind(this);
		this.handleSubmit = this.handleSubmit.bind(this);
		this.handleInputChange = this.handleInputChange.bind(this);
		this.handleChatClearClick = this.handleChatClearClick.bind(this);
		this.state = {
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
		const {inputValue} = this.state;

		e.preventDefault();
		if (inputValue) {
			this.props.socket.emit('addNewGeneralChat', {
				userName: this.props.userInfo.userName,
				chat: inputValue,
				private: Object.keys(this.props.gameInfo).length ? this.props.gameInfo.general.private : null
			});

			this.setState({inputValue: ''});
		}
	}

	scrollChats() {
		if (!this.state.lock) {
			document.querySelector('.genchat-container').scrollTop = 99999999;
		}
	}

	processChats() {
		return this.props.generalChats.map((chat, i) => {
			return (
				<div className="item" key={i}>
					<span className={chat.userName === 'coz' ? 'chat-user admin' : chat.userName === 'stine' ? 'chat-user admin' : 'chat-user'}>{chat.userName}: </span>
					<span>{chat.chat}</span>
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
						<i className={this.state.lock ? 'large lock icon' : 'large unlock alternate icon'} onClick={this.handleChatLockClick} />
					</div>
					<div className="ui divider right-sidebar-divider" />
				</section>
				<section className="segment chats">
					<div className="ui list genchat-container">
						{this.processChats()}
					</div>
				</section>
				<form className="segment inputbar" onSubmit={this.handleSubmit}>
					<div className={this.props.userInfo.userName ? 'ui action input' : 'ui action input disabled'}>
						<input placeholder="Chat.." value={this.state.inputValue} onChange={this.handleInputChange} maxLength="300" spellCheck="false"/>
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
	generalChats: React.PropTypes.array
};