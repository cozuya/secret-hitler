import React, { useMemo } from 'react';
import { getNumberWithOrdinal, PLAYERCOLORS } from '../../constants';
import { processEmotes } from '../../emotes';

const GameChatItem = ({ chat, playerListPlayer, seatedUserNames, gameSettings, allEmotes, gameInfo }) => {
	const timestamp = (
		<span className="chat-timestamp">{`${`0${new Date(chat.timestamp).getHours()}`.slice(-2)}:${`0${new Date(chat.timestamp).getMinutes()}`.slice(
			-2
		)}:${`0${new Date(chat.timestamp).getSeconds()}`.slice(-2)} `}</span>
	);
	const isMod = playerListPlayer?.staffRole && (playerListPlayer.staffRole === 'admin' || playerListPlayer.staffRole === 'moderator');
	const getChatContents = () => processEmotes(chat.chat, isMod, allEmotes);
	const chatContents = useMemo(getChatContents, [chat, isMod]);
	const isSeated = seatedUserNames.includes(chat.userName);
	const isGreenText = useMemo(() => chatContents && chatContents[0] && /^>/i.test(chatContents[0]), [chatContents]);
	const isBlind = gameInfo?.general?.blindMode && !gameInfo?.gameState.isCompleted;
	const playerColorsClasses = useMemo(() => PLAYERCOLORS(playerListPlayer, !gameSettings?.disableSeasonal, 'chat-user'), [playerListPlayer, gameSettings]);

	console.log('----DEBUG----');
	console.log('chat', chat);
	console.log('playerListPlayer', playerListPlayer);
	console.log('chat contents', chatContents);
	console.log('timestamp', timestamp);
	console.log('isMod', isMod);
	console.log('isSeated', isSeated);
	console.log('isGreenText', isGreenText);
	console.log('isBlind', isBlind);
	console.log('playerColorsClasses', playerColorsClasses);
	console.log('----DEBUG----');

	const chatIndex = JSON.stringify(chat);

	const renderPreviousSeasonAward = type => {
		switch (type) {
			case 'bronze':
				return <span title="This player was in the 3rd tier of ranks in the previous season" className="season-award bronze" />;
			case 'silver':
				return <span title="This player was in the 2nd tier of ranks in the previous season" className="season-award silver" />;
			case 'gold':
				return <span title="This player was in the top tier of ranks in the previous season" className="season-award gold" />;
			case 'gold1':
				return <span title="This player was the #1 ranked player of the previous season" className="season-award gold1" />;
			case 'gold2':
				return <span title="This player was 2nd highest player of the previous season" className="season-award gold2" />;
			case 'gold3':
				return <span title="This player was 3rd highest player of the previous season" className="season-award gold3" />;
			case 'gold4':
				return <span title="This player was 4th highest player of the previous season" className="season-award gold4" />;
			case 'gold5':
				return <span title="This player was 5th highest player of the previous season" className="season-award gold5" />;
		}
	};

	const getClassesFromType = type => {
		if (type === 'player') {
			return 'chat-player';
		} else {
			return `chat-role--${type}`;
		}
	};

	const parseClaim = claim => {
		const mode = gameSettings?.claimCharacters || 'legacy';
		let liberalChar = 'L';
		let fascistChar = 'F';
		if (mode === 'legacy') {
			liberalChar = 'B';
			fascistChar = 'R';
		} else if (mode === 'full') {
			liberalChar = 'liberal';
			fascistChar = 'fascist';
		}
		const claims = Array.from(claim);
		const elements = claims.map((claimChar, index) => {
			const isLiberal = claimChar === 'b';

			return (
				<span key={`claim${index}`}>
					<span className={getClassesFromType(isLiberal ? 'liberal' : 'fascist')}>{isLiberal ? liberalChar : fascistChar}</span>
					{mode === 'full' && index < claims.length - 1 ? <span>, </span> : <React.Fragment />}
				</span>
			);
		});
		return elements;
	};

	const result = useMemo(() => {
		return chat.gameChat ? (
			<div className={`item game-chat ${chat?.chat[1]?.type || ''}`} key={chatIndex}>
				{timestamp}
				<span className="game-chat">
					{chatContents.map((chatSegment, index) => {
						if (chatSegment.type) {
							const classes = getClassesFromType(chatSegment.type);

							return (
								<span key={index} className={classes}>
									{chatSegment.text}
								</span>
							);
						}

						return chatSegment.text;
					})}
				</span>
			</div>
		) : chat.isClaim ? (
			<div className="item claim-item" key={chatIndex}>
				{timestamp}
				<span className="claim-chat">
					{chatContents &&
						chatContents.length &&
						chatContents.map((chatSegment, index) => {
							if (chatSegment.type) {
								return (
									<span key={index} className={getClassesFromType(chatSegment.type)}>
										{chatSegment.text}
									</span>
								);
							} else if (chatSegment.claim) {
								return <span key={index}>{parseClaim(chatSegment.claim)}</span>;
							}
							return chatSegment.text;
						})}
				</span>
			</div>
		) : chat.isRemainingPolicies ? (
			<div className={'item game-chat'} key={chatIndex}>
				{timestamp}
				<span className="game-chat">
					{chatContents &&
						chatContents.length &&
						chatContents.map((chatSegment, index) => {
							if (chatSegment.type) {
								return (
									<span key={index} className={getClassesFromType(chatSegment.type)}>
										{chatSegment.text}
									</span>
								);
							} else if (chatSegment.policies) {
								return <span key={index}>{parseClaim(chatSegment.policies)}</span>;
							}
							return chatSegment.text;
						})}
				</span>
			</div>
		) : chat.isBroadcast ? (
			<div className="item" key={chatIndex}>
				<span className="chat-user broadcast">
					{timestamp} {`${chat.userName}: `}{' '}
				</span>
				<span className="broadcast-chat">{processEmotes(chat.chat, true, allEmotes)}</span>
			</div>
		) : (
			<div className="item" key={chatIndex}>
				{timestamp}
				{!gameSettings?.disableCrowns && chat.previousSeasonAward && !isBlind && renderPreviousSeasonAward(chat.previousSeasonAward)}
				{!gameSettings?.disableCrowns && chat.specialTournamentStatus && chat.specialTournamentStatus.slice(1) === 'captain' && !isBlind && (
					<span
						title={`This player a Captain of the winning team of the ${getNumberWithOrdinal(chat.specialTournamentStatus[0])} Official Tournament.`}
						className="crown-captain-icon"
					/>
				)}
				{!gameSettings?.disableCrowns && chat.specialTournamentStatus && chat.specialTournamentStatus.slice(1) === 'tourney' && !isBlind && (
					<span
						title={`This player was part of the winning team of the ${getNumberWithOrdinal(chat.specialTournamentStatus[0])} Official Tournament.`}
						className="crown-icon"
					/>
				)}
				<span
					className={
						chat.staffRole === 'moderator' && chat.userName === 'Incognito'
							? 'chat-user moderatorcolor'
							: !playerListPlayer || gameSettings?.disablePlayerColorsInChat || isBlind
							? isMod && (!isBlind || !isSeated)
								? playerColorsClasses
								: 'chat-user'
							: playerColorsClasses
					}
				>
					{isSeated ? (
						''
					) : chat?.staffRole === 'moderator' && chat.userName === 'Incognito' && canSeeIncognito ? (
						<span data-tooltip="Incognito" data-inverted>
							<span className="admincolor">(Incognito) 🚫</span>
						</span>
					) : chat?.staffRole === 'moderator' ? (
						<span data-tooltip="Moderator" data-inverted>
							<span className="moderatorcolor">(Mod) 🌀</span>
						</span>
					) : chat?.staffRole === 'editor' ? (
						<span data-tooltip="Editor" data-inverted>
							<span
								className={
									!playerListPlayer || gameSettings?.disablePlayerColorsInChat || isBlind
										? isMod && (!isBlind || !isSeated)
											? playerColorsClasses
											: 'chat-user'
										: playerColorsClasses
								}
							>
								(Editor) 🔰
							</span>
						</span>
					) : chat.staffRole === 'admin' ? (
						<span data-tooltip="Admin" data-inverted>
							<span className="admincolor">(Admin) 📛</span>
						</span>
					) : (
						<span className="observer-chat">(Observer) </span>
					)}
					{gameInfo.gameState.isTracksFlipped
						? isSeated
							? isBlind
								? `${
										gameInfo.general.replacementNames[gameInfo.publicPlayersState.findIndex(publicPlayer => publicPlayer.userName === chat.userName)]
								  } {${gameInfo.publicPlayersState.findIndex(publicPlayer => publicPlayer.userName === chat.userName) + 1}}`
								: `${chat.userName} {${gameInfo.publicPlayersState.findIndex(publicPlayer => publicPlayer.userName === chat.userName) + 1}}`
							: chat.staffRole === 'moderator' && chat.userName === 'Incognito' && canSeeIncognito
							? chat.hiddenUsername
							: isBlind && !isMod
							? '?'
							: chat.userName
						: isBlind && (!isMod || (isMod && isSeated))
						? '?'
						: chat.staffRole === 'moderator' && chat.userName === 'Incognito' && canSeeIncognito
						? chat.hiddenUsername
						: chat.userName}
					{': '}
				</span>
				<span className={isGreenText ? 'greentext' : ''}>{chatContents}</span>{' '}
			</div>
		);
	}, [chatContents, timestamp, playerColorsClasses, isSeated, gameSettings, playerListPlayer, isMod]);

	return result;
};

export default GameChatItem;
