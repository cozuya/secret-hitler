import React from 'react';
import { PLAYERCOLORS, getBadWord } from '../../constants';
import PropTypes from 'prop-types';
import { renderEmotesButton, processEmotes } from '../../emotes';
import { Scrollbars } from 'react-custom-scrollbars';
import moment from 'moment';

export default class Generalchat extends React.Component {
	state = {
		lock: false,
		discordEnabled: false,
		stickyEnabled: true,
		badWord: [null, null],
		textLastChanged: 0,
		textChangeTimer: -1,
		chatValue: ''
	};

	componentDidMount() {
		if (this.scrollbar) {
			this.scrollbar.scrollToBottom();
		}
	}

	componentWillReceiveProps(nextProps) {
		const { generalChats } = this.props;
		const nextGeneralChats = nextProps.generalChats;

		if (!this.state.stickyEnabled && generalChats.sticky !== nextGeneralChats.sticky) {
			this.setState({
				stickyEnabled: true
			});
		}
	}

	componentDidUpdate() {
		if (!this.state.lock && !this.state.discordEnabled) {
			this.scrollbar.scrollToBottom();
		}
	}

	renderPreviousSeasonAward(type) {
		switch (type) {
			case 'bronze':
				return <span title="This player was in the 3rd tier of ranks in the previous season" className="season-award bronze" />;
			case 'silver':
				return <span title="This player was in the 2nd tier of ranks in the previous season" className="season-award silver" />;
			case 'gold':
				return <span title="This player was in the top tier of ranks in the previous season" className="season-award gold" />;
			case 'gold1':
				return <span title="This player was the top player of the previous season" className="season-award gold1" />;
			case 'gold2':
				return <span title="This player was 2nd highest player of the previous season" className="season-award gold2" />;
			case 'gold3':
				return <span title="This player was 3rd highest player of the previous season" className="season-award gold3" />;
			case 'gold4':
				return <span title="This player was 4th highest player of the previous season" className="season-award gold4" />;
			case 'gold5':
				return <span title="This player was 5th highest player of the previous season" className="season-award gold5" />;
		}
	}

	handleTyping = e => {
		e.preventDefault();

		this.setState({
			chatValue: e.target.value
		});
		const chatValue = e.target.value;

		const foundWord = getBadWord(chatValue);
		if (this.state.badWord[0] !== foundWord[0]) {
			if (this.state.textChangeTimer !== -1) clearTimeout(this.state.textChangeTimer);
			if (foundWord[0]) {
				this.setState({
					badWord: foundWord,
					textLastChanged: Date.now(),
					textChangeTimer: setTimeout(() => {
						this.setState({ textChangeTimer: -1 });
					}, 2000)
				});
			} else {
				this.setState({
					badWord: [null, null],
					textChangeTimer: -1
				});
			}
		}
	};

	chatDisabled = () => {
		return this.state.badWord[0] && Date.now() - this.state.textLastChanged < 1000;
	};

	handleSubmit = e => {
		if (this.chatDisabled()) return;

		const { chatValue } = this.state;

		if (chatValue && chatValue.length <= 300) {
			this.props.socket.emit('addNewGeneralChat', {
				chat: chatValue
			});

			this.setState({
				chatValue: '',
				badWord: [null, null]
			});
		}
	};

	handleChatLockClick = () => {
		this.setState({ lock: !this.state.lock });
	};

	handleChatScrolled = () => {
		const bar = this.scrollbar;

		if (this.state.lock && bar.getValues().top > 0.96) {
			this.setState({ lock: false });
			this.scrollbar.scrollToBottom();
		} else if (!this.state.lock && bar.getValues().top <= 0.96) {
			this.setState({ lock: true });
		}
	};

	handleInsertEmote = emote => {
		this.setState({
			chatValue: this.state.chatValue + ' ' + emote
		});
		this.chatInput.focus();
	};

	handleKeyPress = e => {
		if (e.keyCode === 13 && e.shiftKey === false) {
			e.preventDefault();
			this.handleSubmit();
		}
	};

	renderInput() {
		const { userInfo } = this.props;

		return this.state.discordEnabled ? null : (
			<div className={userInfo.userName ? 'ui action input' : 'ui action input disabled'}>
				{this.state.badWord[0] && (
					<span
						style={{
							position: 'absolute',
							top: '-22px',
							height: '40px',
							backgroundColor: 'indianred',
							padding: '7px',
							borderRadius: '10px 10px 0px 0px',
							border: '1px solid #8c8c8c'
						}}
					>
						"{this.state.badWord[1]}"{this.state.badWord[0] !== this.state.badWord[1] ? ` (${this.state.badWord[0]})` : ''} is forbidden.
					</span>
				)}
				{this.state.chatValue.length > 300 && !this.state.badWord[0] && (
					<span
						style={{
							position: 'absolute',
							top: '-22px',
							height: '40px',
							backgroundColor: 'indianred',
							padding: '7px',
							borderRadius: '10px 10px 0px 0px',
							border: '1px solid #8c8c8c'
						}}
					>
						{`This message is too long ${300 - this.state.chatValue.length}`}
					</span>
				)}
				<textarea
					style={{ zIndex: 1 }}
					disabled={!userInfo.userName || (userInfo.gameSettings && userInfo.gameSettings.isPrivate)}
					className="chat-input-box"
					placeholder="Send a message"
					value={this.state.chatValue}
					spellCheck="false"
					onKeyDown={this.handleKeyPress}
					onChange={this.handleTyping}
					ref={c => (this.chatInput = c)}
				/>
				{userInfo.userName ? renderEmotesButton(this.handleInsertEmote, this.props.allEmotes) : null}
				<div className="chat-button">
					<button onClick={this.handleSubmit} className={`ui primary button ${this.chatDisabled() ? 'disabled' : ''}`}>
						Chat
					</button>
				</div>
			</div>
		);
	}

	renderChats() {
		let timestamp;
		const { userInfo, userList, generalChats } = this.props;
		const time = Date.now();

		/**
		 * @param {array} tournyWins - array of tournywins in epoch ms numbers (date.getTime())
		 * @return {jsx}
		 */
		const renderCrowns = tournyWins =>
			tournyWins
				.filter(winTime => time - winTime < 10800000)
				.map(crown => <span key={crown} title="This player has recently won a tournament." className="crown-icon" />);

		return generalChats.list
			? generalChats.list.map((chat, i) => {
					const { gameSettings } = userInfo;
					const isMod = Boolean(chat.staffRole) || chat.userName.substring(0, 11) == '[BROADCAST]';
					const user = chat.userName && Object.keys(userList).length ? userList.list.find(player => player.userName === chat.userName) : undefined;
					const userClasses =
						!user || (gameSettings && gameSettings.disablePlayerColorsInChat)
							? 'chat-user'
							: PLAYERCOLORS(user, !(gameSettings && gameSettings.disableSeasonal), 'chat-user');

					if (userInfo.gameSettings && userInfo.gameSettings.enableTimestamps) {
						timestamp = <span className="timestamp">{moment(chat.time).format('HH:mm')} </span>;
					}

					return (
						<div className="item" key={i}>
							{timestamp}
							{!(userInfo.gameSettings && Object.keys(userInfo.gameSettings).length && userInfo.gameSettings.disableCrowns) &&
								chat.tournyWins &&
								renderCrowns(chat.tournyWins)}
							{!(userInfo.gameSettings && Object.keys(userInfo.gameSettings).length && userInfo.gameSettings.disableCrowns) &&
								chat.previousSeasonAward &&
								this.renderPreviousSeasonAward(chat.previousSeasonAward)}
							{!(userInfo.gameSettings && Object.keys(userInfo.gameSettings).length && userInfo.gameSettings.disableCrowns) && chat.specialTournamentStatus && (
								<span title="This player was part of the winning team of the Fall 2019 tournament." className="crown-icon" />
							)}
							<span
								className={
									chat.isBroadcast
										? 'chat-user broadcast'
										: chat.staffRole === 'moderator' && chat.userName === 'Incognito' && !userInfo.staffRole
										? 'chat-user moderatorcolor'
										: userClasses
								}
							>
								{chat.staffRole === 'moderator' && !(chat.userName === 'Incognito' && userInfo.staffRole && userInfo.staffRole !== 'altmod') && (
									<span className="moderator-name">(M) 🌀</span>
								)}
								{chat.staffRole === 'editor' && <span className="editor-name">(E) 🔰</span>}
								{chat.staffRole === 'admin' && <span className="admin-name">(A) 📛</span>}
								{chat.staffRole === 'moderator' && chat.userName === 'Incognito' && userInfo.staffRole && userInfo.staffRole !== 'altmod' && (
									<span data-tooltip="Incognito" data-inverted>
										<span className="admin-name">(I) 🚫</span>
									</span>
								)}
								<a
									href={chat.isBroadcast ? '#/profile/' + chat.userName.split(' ').pop() : `#/profile/${chat.userName}`}
									className={
										chat.staffRole === 'moderator' && chat.userName === 'Incognito' && !userInfo.staffRole ? 'genchat-user moderatorcolor' : userClasses
									}
								>
									{`${
										chat.staffRole === 'moderator' && chat.userName === 'Incognito' && userInfo.staffRole && userInfo.staffRole !== 'altmod'
											? chat.hiddenUsername
											: chat.userName
									}: `}
								</a>
							</span>
							<span className={chat.isBroadcast ? 'broadcast-chat' : /^>/i.test(chat.chat) ? 'greentext' : ''}>
								{processEmotes(chat.chat, isMod, this.props.allEmotes)}
							</span>
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
						{processEmotes(this.props.generalChats.sticky, true, this.props.allEmotes)}
					</span>
					<i className="remove icon" onClick={dismissSticky} />
				</div>
			);
		}
	}

	render() {
		const { userInfo } = this.props;
		const discordIconClick = () => {
			this.setState({
				discordEnabled: this.state.discordEnabled
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
						{userInfo && userInfo.userName && <img onClick={discordIconClick} />}
					</div>
				</section>
				<section className="segment chats">
					{!this.state.discordEnabled && this.renderSticky()}
					{this.state.discordEnabled ? (
						<embed height="100%" width="100%" src="https://discord.gg/secrethitlerio" />
					) : (
						<Scrollbars
							ref={c => (this.scrollbar = c)}
							onScroll={this.handleChatScrolled}
							renderThumbVertical={props => <div {...props} className="thumb-vertical" />}
						>
							<div className="ui list genchat-container">{this.renderChats()}</div>
						</Scrollbars>
					)}
				</section>
				{this.renderInput()}
			</section>
		);
	}
}

Generalchat.defaultProps = {
	generalChats: {},
	userInfo: {}
};

Generalchat.propTypes = {
	gameInfo: PropTypes.object,
	userInfo: PropTypes.object,
	socket: PropTypes.object,
	generalChats: PropTypes.object,
	userList: PropTypes.object,
	allEmotes: PropTypes.array
};
