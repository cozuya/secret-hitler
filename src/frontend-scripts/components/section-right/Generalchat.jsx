import React from 'react';
import { PLAYERCOLORS, getBadWord } from '../../constants';
import PropTypes from 'prop-types';
import { renderEmotesButton, processEmotes } from '../../emotes';
import { Scrollbars } from 'react-custom-scrollbars';
import moment from 'moment';

export default class Generalchat extends React.Component {
	defaultEmotes = ['ja', 'nein', 'blobsweat', 'wethink', 'limes'];

	state = {
		lock: false,
		stickyEnabled: true,
		badWord: [null, null],
		textLastChanged: 0,
		textChangeTimer: -1,
		chatValue: '',
		emoteHelperSelectedIndex: 0,
		emoteHelperElements: this.defaultEmotes,
		emoteColonIndex: -1,
		excludedColonIndices: []
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
		if (!this.state.lock) {
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
		const { allEmotes } = this.props;
		const { badWord, textChangeTimer, emoteHelperSelectedIndex, emoteHelperElements } = this.state;
		let { excludedColonIndices } = this.state;
		const { value } = e.target;
		const emoteNames = Object.keys(allEmotes).map(emoteName => emoteName.slice(1, emoteName.length - 1));
		let emoteColonIndex = value.substring(0, e.target.selectionStart).lastIndexOf(':');
		let filteredEmotes = [];
		const colonSplitText = value.substring(0, emoteColonIndex).split(':');

		if (
			value.substring(emoteColonIndex + 1, e.target.selectionStart).indexOf(' ') !== -1 ||
			excludedColonIndices.includes(emoteColonIndex) ||
			(colonSplitText.length > 1 && colonSplitText.slice(-1)[0].indexOf(' ') === -1)
		) {
			emoteColonIndex = -1;
		}

		excludedColonIndices = excludedColonIndices.map(i => (value.length <= i || value[i] !== ':' ? null : i)).filter(Number.isInteger);

		if (value.lastIndexOf(':') === value.length - 1) {
			this.setState({ emoteHelperSelectedIndex: 0 });
		}

		if (emoteColonIndex >= 0) {
			const textAfterColon = value
				.slice(emoteColonIndex + 1)
				.split(' ')[0]
				.split(':')[0];
			filteredEmotes = textAfterColon ? emoteNames.filter(emote => emote.toLowerCase().includes(textAfterColon.toLowerCase())).slice(0, 5) : this.defaultEmotes;
			emoteColonIndex = emoteNames.includes(textAfterColon + ':') ? -1 : emoteColonIndex;
		}
		this.setState({
			emoteHelperElements: filteredEmotes.length ? filteredEmotes : this.defaultEmotes,
			chatValue: value,
			emoteColonIndex,
			excludedColonIndices,
			emoteHelperSelectedIndex: emoteHelperSelectedIndex > emoteHelperElements.length ? 0 : emoteHelperSelectedIndex
		});

		const foundWord = getBadWord(value);

		if (badWord[0] !== foundWord[0]) {
			if (textChangeTimer !== -1) {
				clearTimeout(textChangeTimer);
			}

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

	generalChatStatus = () => {
		const { userInfo } = this.props;
		const { userName } = userInfo;

		if (!userName) {
			return {
				isDisabled: true,
				placeholder: 'You must log in to use chat'
			};
		}

		const user = Object.keys(this.props.userList).length ? this.props.userList.list.find(play => play.userName === userName) : undefined;

		if (!user) {
			return {
				isDisabled: true,
				placeholder: 'Please reload...'
			};
		}

		if (userInfo.gameSettings && userInfo.gameSettings.isPrivate) {
			return {
				isDisabled: true,
				placeholder: 'Your account is private and cannot participate in general chat'
			};
		}

		if ((user.wins || 0) + (user.losses || 0) < 10) {
			return {
				isDisabled: true,
				placeholder: 'You must finish ten games to use general chat'
			};
		}

		return {
			isDisabled: false,
			placeholder: 'Send a message'
		};
	};

	chatDisabled = () => this.state.badWord[0] && Date.now() - this.state.textLastChanged < 1000;

	handleSubmit = e => {
		if (this.chatDisabled()) {
			return;
		}

		const { chatValue } = this.state;

		if (chatValue && chatValue.length <= 300) {
			this.props.socket.emit('addNewGeneralChat', {
				chat: chatValue
			});

			this.setState({
				chatValue: '',
				badWord: [null, null],
				excludedColonIndices: [],
				emoteColonIndex: -1,
				emoteHelperElements: this.defaultEmotes,
				emoteHelperSelectedIndex: 0
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

	handleInsertEmote = (emote, isHelper) => {
		const { chatValue, emoteColonIndex } = this.state;
		const textAfterColon =
			':' +
			chatValue
				.slice(emoteColonIndex + 1)
				.split(' ')[0]
				.split(':')[0];
		let helperChatArr;

		if (isHelper) {
			helperChatArr = chatValue.split('');
			helperChatArr.splice(emoteColonIndex, textAfterColon.length, `:${emote}: `);
		}

		this.setState({
			chatValue: isHelper ? helperChatArr.join('') : `${chatValue}${emote} `,
			emoteColonIndex: -1,
			emoteHelperSelectedIndex: 0
		});

		if (!isHelper) this.chatInput.focus();
	};

	handleKeyPress = e => {
		const { emoteHelperSelectedIndex, emoteHelperElements, emoteColonIndex, excludedColonIndices } = this.state;
		const { keyCode } = e;
		const emoteHelperElementCount = emoteHelperElements && emoteHelperElements.length;

		if (emoteColonIndex >= 0) {
			if (keyCode === 27) {
				// esc
				this.setState({
					excludedColonIndices: [...excludedColonIndices, emoteColonIndex],
					emoteColonIndex: -1
				});
			} else if (keyCode === 40) {
				// arrow key
				const nextIndex = emoteHelperSelectedIndex + 1;
				e.preventDefault(); // prevents moving to home and end of textarea
				this.setState({
					emoteHelperSelectedIndex: nextIndex === emoteHelperElementCount ? 0 : nextIndex
				});
			} else if (keyCode === 38) {
				// arrow key
				e.preventDefault(); // prevents moving to home and end of textarea
				this.setState({
					emoteHelperSelectedIndex: emoteHelperSelectedIndex ? emoteHelperSelectedIndex - 1 : emoteHelperElementCount - 1
				});
			} else if (keyCode === 9 || keyCode === 13) {
				// enter and tab
				e.preventDefault(); // prevents from tabbing out of input
				this.handleInsertEmote(emoteHelperElements[emoteHelperSelectedIndex], true);
				this.setState({
					emoteColonIndex: -1
				});
			}
		} else if (keyCode === 13 && !e.shiftKey) {
			e.preventDefault();
			this.handleSubmit();
		}
	};

	renderInput() {
		const { allEmotes } = this.props;

		return (
			<div className={this.generalChatStatus().isDisabled ? 'ui action input disabled' : 'ui action input'}>
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
					disabled={this.generalChatStatus().isDisabled}
					className="chat-input-box"
					placeholder={this.generalChatStatus().placeholder}
					value={this.state.chatValue}
					spellCheck="false"
					onKeyDown={this.handleKeyPress}
					onChange={this.handleTyping}
					ref={c => (this.chatInput = c)}
				/>
				{this.generalChatStatus().isDisabled ? null : renderEmotesButton(this.handleInsertEmote, allEmotes)}
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

		return (
			generalChats.list &&
			generalChats.list.map((chat, i) => {
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
						{!(userInfo.gameSettings && Object.keys(userInfo.gameSettings).length && userInfo.gameSettings.disableCrowns) &&
							chat.specialTournamentStatus &&
							chat.specialTournamentStatus === 'spring2020captain' && (
								<span title="This player was the captain of the winning team of the Spring 2020 tournament." className="crown-captain-icon" />
							)}
						{!(userInfo.gameSettings && Object.keys(userInfo.gameSettings).length && userInfo.gameSettings.disableCrowns) &&
							chat.specialTournamentStatus &&
							chat.specialTournamentStatus === 'spring2020' && (
								<span title="This player was part of the winning team of the Spring 2020 tournament." className="crown-icon" />
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
							{chat.staffRole === 'moderator' &&
								!(chat.userName === 'Incognito' && userInfo.staffRole && userInfo.staffRole !== 'altmod' && userInfo.staffRole !== 'veteran') && (
									<span className="moderatorcolor">(M) 🌀</span>
								)}
							{chat.staffRole === 'editor' && <span className="editor-name">(E) 🔰</span>}
							{chat.staffRole === 'admin' && <span className="admin-name">(A) 📛</span>}
							{chat.staffRole === 'moderator' &&
								chat.userName === 'Incognito' &&
								userInfo.staffRole &&
								userInfo.staffRole !== 'altmod' &&
								userInfo.staffRole !== 'veteran' && (
									<span data-tooltip="Incognito" data-inverted>
										<span className="admin-name">(I) 🚫</span>
									</span>
								)}
							<a
								href={chat.isBroadcast ? '#/profile/' + chat.userName.split(' ').pop() : `#/profile/${chat.userName}`}
								className={chat.staffRole === 'moderator' && chat.userName === 'Incognito' && !userInfo.staffRole ? 'genchat-user moderatorcolor' : userClasses}
							>
								{`${
									chat.staffRole === 'moderator' &&
									chat.userName === 'Incognito' &&
									userInfo.staffRole &&
									userInfo.staffRole !== 'altmod' &&
									userInfo.staffRole !== 'veteran'
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
		);
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

	renderEmoteHelper() {
		const { allEmotes } = this.props;
		const { emoteHelperSelectedIndex, emoteHelperElements } = this.state;
		const helperHover = index => {
			this.setState({
				emoteHelperSelectedIndex: index
			});
		};

		if (emoteHelperSelectedIndex > emoteHelperElements.length) this.setState({ emoteHelperSelectedIndex: 0 });

		if (!Number.isInteger(emoteHelperSelectedIndex) || !emoteHelperElements.length) return;

		return (
			<div className="emote-helper-container">
				{emoteHelperElements.map((el, index) => (
					<div
						onMouseOver={() => {
							helperHover(index);
						}}
						onClick={() => {
							this.handleInsertEmote(el, true);
							this.chatInput.focus();
						}}
						key={index}
						className={emoteHelperSelectedIndex === index ? 'selected' : ''}
					>
						<img
							src="../images/blank.png"
							style={{
								width: '28px',
								height: '28px',
								backgroundImage: 'url("../images/emotesheet.png")',
								backgroundPositionX: `-${allEmotes[`:${el}:`][0] * 28}px`,
								backgroundPositionY: `-${allEmotes[`:${el}:`][1] * 28}px`,
								margin: '2px 10px 2px 5px'
							}}
						/>
						{`${el}`}
					</div>
				))}
			</div>
		);
	}

	render() {
		const { lock, emoteColonIndex } = this.state;

		return (
			<section className="generalchat">
				<section className="generalchat-header">
					<div className="clearfix">
						<h3 className="ui header">Chat</h3>
						<i
							title="Click here to lock chat and prevent from scrolling"
							className={lock ? 'large lock icon' : 'large unlock alternate icon'}
							onClick={this.handleChatLockClick}
						/>
					</div>
				</section>
				<section className="segment chats">
					{this.renderSticky()}
					{emoteColonIndex >= 0 && this.renderEmoteHelper()}
					<Scrollbars
						ref={c => (this.scrollbar = c)}
						onScroll={this.handleChatScrolled}
						renderThumbVertical={props => <div {...props} className="thumb-vertical" />}
					>
						<div className="ui list genchat-container">{this.renderChats()}</div>
					</Scrollbars>
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
	allEmotes: PropTypes.object
};
