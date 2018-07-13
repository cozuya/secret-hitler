import React from 'react';
import $ from 'jquery';
import PropTypes from 'prop-types';
import HostGameSettings from './HostGameSettings.jsx';
import ConfirmPrompt from './ConfirmPrompt.jsx';
import { Popup, Header, Portal, Button } from 'semantic-ui-react';
import HostOverlay from './HostOverlay.jsx';

class HostMenu extends React.Component {
	constructor() {
		super();
		this.hostKickPlayer = this.hostKickPlayer.bind(this);
		this.hostBlacklistPlayer = this.hostBlacklistPlayer.bind(this);
		this.hostRemakeGame = this.hostRemakeGame.bind(this);
		this.handleOpenHostMenu = this.handleOpenHostMenu.bind(this);
		this.handleCloseHostMenu = this.handleCloseHostMenu.bind(this);
		this.handleOpenWarning = this.handleOpenWarning.bind(this);
		this.handleCloseWarning = this.handleCloseWarning.bind(this);
		this.handleOpenConfirmPrompt = this.handleOpenConfirmPrompt.bind(this);
		this.handleCloseConfirmPrompt = this.handleCloseConfirmPrompt.bind(this);
		this.handleOpenGameSettings = this.handleOpenGameSettings.bind(this);
		this.handleCloseGameSettings = this.handleCloseGameSettings.bind(this);
		this.handleStoreTableSettings = this.handleStoreTableSettings.bind(this);
		this.handleEmitTableSettings = this.handleEmitTableSettings.bind(this);
		this.showBlacklist = this.showBlacklist.bind(this);

		this.state = {
			openWarning: false,
			openConfirmPrompt: false,
			openHostMenu: false,
			openGameSettings: false
		};

		this.kickUserName;
		this.playerIndex;
		this.hostAction;
		this.warningMsg;
		this.tableSettingsData;
	}

	showBlacklist() {
		$(this.blacklistModal).modal('show');
		this.setState({ openHostMenu: false });
	}

	handleOpenHostMenu() {
		this.setState({ openHostMenu: true });
	}

	handleCloseHostMenu() {
		this.setState({ openHostMenu: false });
	}

	handleOpenWarning(warningMsg) {
		this.warningMsg = warningMsg;
		this.setState({ openWarning: true });
	}

	handleCloseWarning() {
		this.setState({ openWarning: false });
	}

	handleOpenConfirmPrompt(action, userName, index) {
		this.hostAction = action;
		this.kickUserName = userName;
		this.playerIndex = index;
		this.setState({ openConfirmPrompt: true, openHostMenu: false });
	}

	handleCloseConfirmPrompt() {
		this.hostAction = undefined;
		this.kickUserName = undefined;
		this.playerIndex = undefined;
		this.setState({ openConfirmPrompt: false });
	}

	handleOpenGameSettings() {
		this.setState({ openGameSettings: true, openHostMenu: false });
	}

	handleCloseGameSettings() {
		this.setState({ openGameSettings: false });
	}

	handleEmitTableSettings(data) {
		if (data) {
			this.props.socket.emit('hostUpdateTableSettings', data);
		} else {
			this.props.socket.emit('hostUpdateTableSettings', this.tableSettingsData);
		}
		this.handleCloseConfirmPrompt();
	}

	handleStoreTableSettings(data) {
		this.tableSettingsData = data;
	}

	hostKickPlayer() {
		const { gameInfo, socket } = this.props,
			playerIndex = gameInfo.publicPlayersState.findIndex(player => this.kickUserName === player.userName);
		if (gameInfo.publicPlayersState[playerIndex] && !gameInfo.publicPlayersState[playerIndex].kicked) {
			socket.emit('hostKickPlayer', { uid: gameInfo.general.uid, userName: this.kickUserName });
		}
		this.handleCloseConfirmPrompt();
	}

	hostBlacklistPlayer() {
		const { gameInfo, socket } = this.props,
			playerIndex = gameInfo.publicPlayersState.findIndex(player => this.kickUserName === player.userName);
		if (gameInfo.publicPlayersState[playerIndex] && !gameInfo.publicPlayersState[playerIndex].kicked) {
			socket.emit('hostBlacklistPlayer', { uid: gameInfo.general.uid, userName: this.kickUserName });
		}
		this.handleCloseConfirmPrompt();
	}

	hostRemakeGame() {
		const { gameInfo, socket } = this.props;
		if (gameInfo.gameState.isTracksFlipped && !gameInfo.general.isRemaking) {
			socket.emit('hostRemake', { uid: this.props.gameInfo.general.uid });
		}
		this.handleCloseConfirmPrompt();
	}

	renderHostWarning() {
		return (
			<Portal closeOnDocumentClick={false} onClose={this.handleCloseWarning} open={this.state.openWarning}>
				<div className="host-warning-portal">
					<Header className="warning-text">{this.warningMsg}</Header>
					<Button onClick={this.handleCloseWarning}>Ok</Button>
				</div>
			</Portal>
		);
	}

	renderConfirmPrompt() {
		if (this.state.openConfirmPrompt) {
			let onConfirm, message, action;
			switch (this.hostAction) {
				case 'Kick':
					onConfirm = this.hostKickPlayer;
					message = 'This player will be unable to rejoin for 20 seconds.';
					break;
				case 'Blacklist':
					onConfirm = this.hostBlacklistPlayer;
					message = 'This player will be unable to join your games.';
					break;
				case 'Update Settings maxPlayers':
					onConfirm = () => this.handleEmitTableSettings();
					action = 'Update Settings';
					message = 'This will kick all players above the max player count.';
					break;
				case 'Update Settings rainbow':
					onConfirm = () => this.handleEmitTableSettings();
					action = 'Update Settings';
					message = 'This will kick any non-rainbow players.';
					break;
				case 'Remake Game':
					onConfirm = this.hostRemakeGame;
					break;
			}
			return (
				<ConfirmPrompt
					onConfirm={onConfirm}
					message={message}
					action={action ? action : this.hostAction}
					userName={this.kickUserName}
					onClose={this.handleCloseConfirmPrompt}
					gameInfo={this.props.gameInfo}
				/>
			);
		}
	}

	renderGameSettings() {
		if (this.state.openGameSettings) {
			return (
				<div className="host-game-settings-container">
					<HostGameSettings
						userInfo={this.props.userInfo}
						userList={this.props.userList}
						socket={this.props.socket}
						gameInfo={this.props.gameInfo}
						handleCloseGameSettings={this.handleCloseGameSettings}
						handleOpenConfirmPrompt={this.handleOpenConfirmPrompt}
						handleStoreTableSettings={this.handleStoreTableSettings}
						handleEmitTableSettings={this.handleEmitTableSettings}
					/>
				</div>
			);
		}
	}

	renderPlayerMenu(action) {
		const { gameInfo, userInfo } = this.props;

		if (action === 'Kick' && gameInfo.gameState.isCompleted) {
			return <div className="link inactive">Kick Player</div>;
		} else {
			return (
				<Popup
					className="host-popup-menu"
					inverted
					hoverable
					on="click"
					position="right center"
					trigger={<div className="host-popup-menu link">{action} Player</div>}
				>
					<div className="host-popup-menu title">{action} Player: </div>
					{gameInfo.publicPlayersState.map((player, index) => {
						let classes = 'host-popup-menu link',
							onClick = () => this.handleOpenConfirmPrompt(action, player.userName, index);

						if (player.userName === userInfo.userName || player.kicked) {
							classes += ' inactive';
							onClick = null;
						}
						return (
							<div className={classes} key={player.userName} onClick={onClick}>
								{index + 1}. {!gameInfo.general.blindMode && player.userName}
							</div>
						);
					})}
				</Popup>
			);
		}
	}

	render() {
		const { gameInfo, userInfo } = this.props;
		if (gameInfo.general.host === userInfo.userName) {
			return (
				<div className="host-container">
					{this.renderHostWarning()}
					{this.renderConfirmPrompt()}
					{this.renderGameSettings()}
					<HostOverlay socket={this.props.socket} gameInfo={this.props.gameInfo} handleOpenWarning={this.handleOpenWarning} />
					<Popup
						inverted
						on="click"
						open={this.state.openHostMenu}
						onOpen={this.handleOpenHostMenu}
						onClose={this.handleCloseHostMenu}
						trigger={
							<div className="host-icon button">
								<img src="../../images/host-icon.png" />
							</div>
						}
						content={
							<div className="host-popup-menu">
								<div className="host-popup-menu title">Host menu:</div>
								{this.renderPlayerMenu('Kick')}
								{this.renderPlayerMenu('Blacklist')}
								<div className="host-popup-menu link" onClick={this.showBlacklist}>
									Remove From Blacklist
								</div>
								{(() => {
									let classes = 'link';
									let onClick = this.handleOpenGameSettings;
									if (gameInfo.gameState.isStarted) {
										classes += ' inactive';
										onClick = null;
									}
									return (
										<div className={classes} onClick={onClick}>
											Game Settings
										</div>
									);
								})()}
								{(() => {
									let classes = 'link',
										onClick = () => this.handleOpenConfirmPrompt('Remake Game');
									if (!gameInfo.gameState.isTracksFlipped || gameInfo.general.isRemaking) {
										classes += ' inactive';
										onClick = null;
									}
									return (
										<div className={classes} onClick={onClick}>
											Remake game
										</div>
									);
								})()}
							</div>
						}
					/>
					<div
						className="ui basic small modal blacklistmodal"
						ref={c => {
							this.blacklistModal = c;
						}}
					>
						<div className="ui header">Your blacklist</div>
						{this.props.userInfo.gameSettings &&
							this.props.userInfo.gameSettings.blacklist.map(playerName => (
								<div key={playerName} className={`blacklist-${playerName}`}>
									<i
										onClick={() => {
											const { gameInfo, socket } = this.props;
											socket.emit('hostRemoveFromBlacklist', { uid: gameInfo.general.uid, userName: playerName });
										}}
										className="large close icon"
										style={{ cursor: 'pointer' }}
									/>
									{playerName}
								</div>
							))}
					</div>
				</div>
			);
		} else {
			return null;
		}
	}
}

HostMenu.propTypes = {
	userInfo: PropTypes.object,
	gameInfo: PropTypes.object,
	socket: PropTypes.object,
	userList: PropTypes.object
};

export default HostMenu;
