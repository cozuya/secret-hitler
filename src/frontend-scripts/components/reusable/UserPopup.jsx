import React, { useState } from 'react'; // eslint-disable-line
import { connect } from 'react-redux';
import { Popup, List, Grid, Button, Form } from 'semantic-ui-react';

const mapStateToProps = state => state;

const Report = ({ socket, userInfo, gameInfo, reportedPlayer }) => {
	const defaultOptions = ['Abusive chat', 'Other']; // outside started games.
	const casualOptions = ['AFK/Leaving Game', 'Abusive chat', 'Other'];
	const ratedOptions = ['AFK/Leaving Game', 'Abusive chat', 'Cheating', 'Gamethrowing', 'Stalling', 'Other'];

	const inGame = gameInfo && gameInfo.gameState;
	const inStartedGame = inGame && gameInfo.gameState.isStarted;
	const casualGame = inGame && gameInfo.general && gameInfo.general.casualGame;
	const opt = inStartedGame ? (casualGame ? casualOptions : ratedOptions) : defaultOptions;

	const [reason, setReason] = useState('');
	const [comment, setComment] = useState('');
	const [submittingReport, setSubmittingReport] = useState(false);
	const [showWarningMessage, setShowWarningMessage] = useState(true);
	const [errorMessage, setErrorMessage] = useState(null);
	const [successMessage, setSuccessMessage] = useState(null);

	const submitReport = () => {
		if (!reason || !comment || comment.length > 140) {
			return;
		}
		setSubmittingReport(true);

		const index = inStartedGame ? gameInfo.publicPlayersState.findIndex(player => player.userName === reportedPlayer) : undefined;
		if (comment.length <= 140) {
			socket.emit(
				'playerReport',
				{
					uid: inGame && gameInfo.general.uid,
					userName: userInfo.userName || 'from replay',
					gameType: inGame ? (gameInfo.general.isTourny ? 'tournament' : gameInfo.general.casualGame ? 'casual' : 'standard') : 'homepage',
					reportedPlayer: `${inStartedGame ? `{${index + 1}} ${reportedPlayer}` : reportedPlayer}`,
					reason: reason,
					comment: comment
				},
				response => {
					if (response.success) {
						setSuccessMessage('Report submitted successfully.');
					} else {
						setErrorMessage(reponse.error);
					}
					setSubmittingReport(false);
				}
			);
		}
	};

	return (
		<>
			{!inStartedGame && showWarningMessage && (
				<div>
					<span>Warning: You are reporting a player outside an active game. Please make your report as detailed as possible.</span>
					<a onClick={() => setShowWarningMessage(false)}>(hide)</a>
				</div>
			)}
			{!successMessage && !errorMessage && (
				<Form inverted>
					<Form.Select
						placeholder="Reason"
						fluid
						selection
						options={opt.map(option => ({ text: option, key: option, value: option.toLowerCase() }))}
						onChange={(_event, props) => setReason(props.value)}
					/>
					<Form.TextArea placeholder="Comment" onChange={(_event, props) => setComment(props.value)} />
					<span className={comment.length > 140 ? 'counter error' : 'counter'}>{140 - comment.length}</span>
					<Button inverted disabled={submittingReport || !reason || !comment || comment.length > 140} onClick={() => submitReport()}>
						Submit
					</Button>
				</Form>
			)}
			{successMessage && <span>{successMessage}</span>}
			{errorMessage && <span className="error">{errorMessage}</span>}
		</>
	);
};

const UserPopup = ({ socket, userInfo, gameInfo, userList, children, userName, position = 'top center', index }) => {
	const [reportVisible, setReportVisible] = useState(false);
	const user = userList && userList.list && userList.list.find(play => play.userName === userName);
	const { gameSettings } = userInfo;

	const toggleBlacklist = () => {
		if (!gameSettings) return;

		if (gameSettings.blacklist !== undefined && gameSettings.blacklist.includes(userName)) {
			gameSettings.blacklist.splice(gameSettings.blacklist.indexOf(userName), 1);
		} else if (!gameSettings.blacklist) {
			gameSettings.blacklist = [userName];
		} else {
			gameSettings.blacklist.push(userName);
		}

		socket.emit('updateGameSettings', { blacklist: gameSettings.blacklist });
		socket.emit('sendUser', userInfo); // To force a new playerlist pull
	};

	const gameStarted = gameInfo?.gameState?.isStarted;
	const isTracksFlipped = gameInfo?.gameState?.isTracksFlipped;
	const userSeated = userInfo?.isSeated;
	const blindMode = gameInfo?.general?.blindMode;
	const privateGame = gameInfo?.general?.private;
	const isMe = userName === userInfo?.userName;

	console.log(userName, userInfo?.userName);
	return (
		<Popup
			inverted
			trigger={children}
			pinned
			on="click"
			onClose={() => {
				setReportVisible(false);
			}}
			position={position}
			className="user-popup"
		>
			<Popup.Header>{blindMode ? (isTracksFlipped ? gameInfo?.general?.replacementNames[index] : '?') : userName}</Popup.Header>
			<Popup.Content>
				<List>
					{!blindMode && (
						<List.Item>
							<List.Content>
								<Grid columns={2} divided inverted>
									<Grid.Row>
										<Grid.Column textAlign="center" data-tooltip="Overall Elo">
											<List.Icon name="chart line" />
											{user && (user.eloOverall || 1600)}
										</Grid.Column>
										<Grid.Column textAlign="center" data-tooltip="Seasonal Elo">
											<List.Icon name="calendar alternate outline" />
											{user && (user.eloSeasonal || 1600)}
										</Grid.Column>
									</Grid.Row>
								</Grid>
							</List.Content>
						</List.Item>
					)}
					{userSeated && gameStarted && !isMe && (
						<List.Item>
							<Button
								fluid
								size="small"
								onClick={() =>
									socket.emit('addNewGameChat', {
										chat: `ping${gameInfo.publicPlayersState.findIndex(player => player.userName === userName) + 1}`,
										uid: gameInfo.general.uid
									})
								}
							>
								Ping
							</Button>
						</List.Item>
					)}
					{!blindMode && (
						<List.Item>
							<Button fluid size="small" onClick={() => (window.location.hash = `#/profile/${userName}`)}>
								View Profile
							</Button>
						</List.Item>
					)}
					{!privateGame && (!isMe || (!gameStarted && blindMode)) && (
						<List.Item>
							<List.Icon name="gavel" />
							<List.Content>
								<a onClick={() => setReportVisible(!reportVisible)}>Report</a>
							</List.Content>
						</List.Item>
					)}
					{reportVisible && <Report socket={socket} userInfo={userInfo} gameInfo={gameInfo} reportedPlayer={userName} />}
					{!blindMode && !isMe && (
						<List.Item>
							<List.Icon name="x" />
							<List.Content>
								<a onClick={() => toggleBlacklist()}>{gameSettings?.blacklist.includes(userName) ? 'Unblacklist' : 'Blacklist'}</a>
							</List.Content>
						</List.Item>
					)}
				</List>
			</Popup.Content>
		</Popup>
	);
};

export default connect(mapStateToProps, null)(UserPopup);
