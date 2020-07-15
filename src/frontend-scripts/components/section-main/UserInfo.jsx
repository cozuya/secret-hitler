import React, { useState } from 'react'; // eslint-disable-line
import { connect } from 'react-redux';
import { Popup, List, Grid, Button, Form } from 'semantic-ui-react';

const mapStateToProps = state => state;

const Report = ({ socket, userInfo, gameInfo, reportedPlayer, onSubmitReport }) => {
	const opt = ['AFK/Leaving Game', 'Abusive chat', 'Cheating', 'Gamethrowing', 'Stalling', 'Other'];
	const [reason, setReason] = useState('');
	const [comment, setComment] = useState('');
	const [submittingReport, setSubmittingReport] = useState(false);
	const [errorMessage, setErrorMessage] = useState(null);
	const [successMessage, setSuccessMessage] = useState(null);

	const submitReport = () => {
		if (!reason || !comment || comment.length > 140) {
			return;
		}
		setSubmittingReport(true);

		const index = gameInfo.gameState.isStarted ? gameInfo.publicPlayersState.findIndex(player => player.userName === reportedPlayer) : undefined;
		if (comment.length <= 140) {
			socket.emit(
				'playerReport',
				{
					uid: gameInfo.general.uid,
					userName: userInfo.userName || 'from replay',
					gameType: gameInfo.general.isTourny ? 'tournament' : gameInfo.general.casualGame ? 'casual' : 'standard',
					reportedPlayer: `${gameInfo.gameState.isStarted ? `{${index + 1}} ${reportedPlayer}` : reportedPlayer}`,
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
		<div>
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
		</div>
	);
};

const UserInfo = ({ socket, userInfo, gameInfo, userList, children, userName, onPing, onBlacklist }) => {
	const [reportVisible, setReportVisible] = useState(false);
	const user = userList && userList.list && userList.list.find(play => play.userName === userName);
	return (
		<Popup
			inverted
			trigger={children}
			pinned
			on="click"
			onClose={() => {
				setReportVisible(false);
			}}
		>
			<Popup.Header>{userName}</Popup.Header>
			<Popup.Content>
				<List>
					<List.Item>
						<List.Icon name="chart line" />
						<List.Content>
							<Grid columns={2} divided inverted>
								<Grid.Row textAlign="center">
									<Grid.Column>{user && (user.eloOverall || 1600)}</Grid.Column>
									<Grid.Column>{user && (user.eloSeasonal || 1600)}</Grid.Column>
								</Grid.Row>
							</Grid>
						</List.Content>
					</List.Item>
					{onPing && (
						<List.Item>
							<Button fluid size="small">
								Ping
							</Button>
						</List.Item>
					)}
					<List.Item>
						<Button fluid size="small" onClick={() => (window.location.hash = `#/profile/${userName}`)}>
							View Profile
						</Button>
					</List.Item>
					<List.Item>
						<List.Icon name="gavel" />
						<List.Content>
							<a onClick={() => setReportVisible(!reportVisible)}>Report</a>
						</List.Content>
					</List.Item>
					{onBlacklist && (
						<List.Item>
							<List.Icon name="x" />
							<List.Content>
								<a>Blacklist</a>
							</List.Content>
						</List.Item>
					)}
				</List>
				{reportVisible && <Report socket={socket} userInfo={userInfo} gameInfo={gameInfo} reportedPlayer={userName} />}
			</Popup.Content>
		</Popup>
	);
};

export default connect(mapStateToProps, null)(UserInfo);
