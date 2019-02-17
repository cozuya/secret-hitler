import React from 'react'; // eslint-disable-line
import PropTypes from 'prop-types';
import { Scrollbars } from 'react-custom-scrollbars';
import { Modal, Header, Button, Icon } from 'semantic-ui-react';

import GamesList from './GamesList.jsx';
import Creategame from './Creategame.jsx';
import Settings from './Settings.jsx';
import Game from './Game.jsx';
import Profile from './Profile.jsx';
import Replay from './replay/Replay.jsx';
import Changelog from './Changelog.jsx';
import Moderation from './Moderation.jsx';
import Reports from './Reports.jsx';
import Leaderboards from './Leaderboards.jsx';

export class Main extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			gameFilter: {
				priv: false,
				pub: false,
				unstarted: false,
				inprogress: false,
				completed: false,
				timedMode: false,
				rainbow: false,
				standard: false,
				customgame: false,
				casualgame: false
			},
			showNewPlayerModal: Boolean(window.hasNotDismissedSignupModal),
			newPlayerModalPageIndex: 0
		};
	}

	componentDidMount() {
		const { Notification, hasNotDismissedSignupModal } = window;
		const { socket } = this.props;

		if ('Notification' in window && Notification.permission === 'default') {
			Notification.requestPermission(permission => {
				if (permission === 'granted') {
					new Notification('Players may now "ping" you.');
				}
			});
		}

		if (hasNotDismissedSignupModal) {
			socket.emit('hasSeenNewPlayerModal');
		}
	}

	static getDerivedStateFromProps(props) {
		return props.userInfo.gameSettings ? { gameFilter: props.userInfo.gameSettings.gameFilters } : null;
	}

	handleDismissSignupModal = () => {
		this.setState({
			showNewPlayerModal: false
		});
	};

	handleChangeModalPageIndex = newPlayerModalPageIndex => {
		this.setState({
			newPlayerModalPageIndex
		});
	};

	renderNewPlayerModal() {
		const { showNewPlayerModal, newPlayerModalPageIndex } = this.state;

		return (
			<Modal open={showNewPlayerModal} onClose={this.handleDismissSignupModal} closeOnEscape={false} closeOnDimmerClick={false}>
				<Header content="Welcome to SH.io" />
				<Modal.Content>
					<h4>Please take a minute to read through this brief walkthrough before you start playing.</h4>
				</Modal.Content>
				<Modal.Actions>
					<Button onClick={this.handleDismissSignupModal} inverted>
						<Icon name="checkmark" /> Skip and dismiss forever
					</Button>
					<Button
						onClick={() => {
							this.handleChangeModalPageIndex(newPlayerModalPageIndex - 1);
						}}
					>
						<Icon name="angle left" /> Previous
					</Button>
					<Button
						onClick={() => {
							this.handleChangeModalPageIndex(newPlayerModalPageIndex + 1);
						}}
					>
						Next
						<Icon name="angle right" />
					</Button>
				</Modal.Actions>
			</Modal>
		);
	}

	render() {
		let classes = 'section-main';

		const { midSection, userList, userInfo, socket, gameInfo } = this.props;
		const changeGameFilter = gameFilter => {
			this.setState(gameFilter);

			if (userInfo.gameSettings) {
				socket.emit('updateGameSettings', {
					gameFilters: gameFilter
				});
			}
		};
		const RenderMidSection = () => {
			switch (midSection) {
				case 'createGame':
					return <Creategame userList={userList} userInfo={userInfo} socket={socket} />;
				case 'changelog':
					return <Changelog />;
				case 'game':
					if (Object.keys(gameInfo).length) {
						return (
							<Game
								onClickedTakeSeat={this.props.onClickedTakeSeat}
								onSeatingUser={this.props.onSeatingUser}
								onLeaveGame={this.props.onLeaveGame}
								userInfo={userInfo}
								gameInfo={gameInfo}
								userList={userList}
								socket={socket}
								allEmotes={this.props.allEmotes}
							/>
						);
					}
					break;
				case 'moderation':
					return <Moderation userInfo={userInfo} socket={socket} userList={userList} />;
				case 'settings':
					return <Settings userInfo={userInfo} socket={socket} />;
				case 'profile':
					return <Profile userInfo={userInfo} socket={socket} userList={userList} />;
				case 'replay':
					return <Replay allEmotes={this.props.allEmotes} />;
				case 'reports':
					return <Reports socket={socket} userInfo={userInfo} />;
				case 'leaderboards':
					return <Leaderboards />;
				default:
					return (
						<GamesList
							userList={userList}
							userInfo={userInfo}
							midSection={midSection}
							gameList={this.props.gameList}
							socket={socket}
							changeGameFilter={changeGameFilter}
							gameFilter={this.state.gameFilter}
						/>
					);
			}
		};

		if (midSection === 'game' || midSection === 'replay') {
			classes += ' game';
		}

		return (
			<section className={classes}>
				{this.state.showNewPlayerModal && this.renderNewPlayerModal()}
				{midSection === 'game' || midSection === 'replay' ? (
					RenderMidSection()
				) : (
					<Scrollbars className="scrollbar-container-main" renderThumbVertical={props => <div {...props} className="thumb-vertical" />}>
						<div className="section-main-content-container">{RenderMidSection()}</div>
					</Scrollbars>
				)}
			</section>
		);
	}
}

Main.propTypes = {
	midSection: PropTypes.string,
	userInfo: PropTypes.object,
	gameInfo: PropTypes.object,
	socket: PropTypes.object,
	userList: PropTypes.object,
	gameList: PropTypes.array,
	allEmotes: PropTypes.array,
	onClickedTakeSeat: PropTypes.func,
	onSeatingUser: PropTypes.func,
	onLeaveGame: PropTypes.func
};

export default Main;
