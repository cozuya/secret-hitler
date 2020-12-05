import React from 'react'; // eslint-disable-line
import 'sweetalert2/src/sweetalert2.scss';
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
import Signups from './Signups.jsx';
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
		const { Notification } = window;

		if ('Notification' in window && Notification.permission === 'default') {
			Notification.requestPermission(permission => {
				if (permission === 'granted') {
					new Notification('Players may now "ping" you.');
				}
			});
		}
	}

	static getDerivedStateFromProps(props) {
		return props.userInfo.gameSettings ? { gameFilter: props.userInfo.gameSettings.gameFilters } : null;
	}

	handleDismissSignupModal = () => {
		this.setState({
			showNewPlayerModal: false
		});

		this.props.socket.emit('hasSeenNewPlayerModal');
	};

	handleChangeModalPageIndex = newPlayerModalPageIndex => {
		this.setState({
			newPlayerModalPageIndex
		});
	};

	renderNewPlayerModal() {
		const { showNewPlayerModal, newPlayerModalPageIndex } = this.state;
		const headerContent = (() => {
			switch (newPlayerModalPageIndex) {
				case 0:
					return 'Welcome to SH.io';
				case 1:
					return 'Site rules and support';
				case 2:
					return 'Site details';
				case 3:
					return 'FAQ';
				case 4:
					return "That's it!"; //eslint-disable-line
			}
		})();

		return (
			<Modal id="newplayer-modal" open={showNewPlayerModal} onClose={this.handleDismissSignupModal} closeOnEscape={false} closeOnDimmerClick={false}>
				<Header content={headerContent} />
				<Modal.Content>
					{(() => {
						switch (newPlayerModalPageIndex) {
							case 0:
								return <h4>Please take a minute to read through this brief walkthrough before you start playing.</h4>;
							case 1:
								return (
									<React.Fragment>
										<p>
											As you've already agreed to, you must follow the{' '}
											<a href="/tou" target="_blank" rel="noopener noreferrer">
												rules of the site
											</a>{' '}
											to play here. Cliffs: No NSFW/No hate speech/No player abuse. These rules are "relaxed" if you are only here to play private games.
										</p>
										<p>
											If you need moderator help or support, the best way is on the <b>#mod-support</b> channel of our{' '}
											<a href="https://discord.gg/secrethitlerio" target="_blank" rel="noopener noreferrer">
												Discord server.
											</a>{' '}
											You can also make reports by double clicking someone's name in game.
										</p>
									</React.Fragment>
								);
							case 2:
								return (
									<React.Fragment>
										<h4>If you're only here to play in private games:</h4>
										<p>
											Welcome! You may want to toggle off the public games filter. This can be found on the <Icon name="filter" /> icon next to the "create a
											new game" button. If you have insisted on naming yourself something NSFW, you will want to toggle on the "private-games-only" setting (if
											you did not check that box while signing up) found by clicking on the upper right corner button that looks like <Icon name="setting" />.
											There are many other interesting account settings that can be found there as well.
										</p>
										<h4>Public game players:</h4>
										<p>Also welcome! You'll probably want to filter off of private games as well. These filters save on application.</p>
										<p>
											Please familiarize yourself with the{' '}
											<a href="/how-to-play" target="_blank" rel="noopener noreferrer">
												how to play
											</a>{' '}
											section of the site. Our{' '}
											<a href="https://github.com/cozuya/secret-hitler/wiki" target="_blank" rel="noopener noreferrer">
												wiki
											</a>{' '}
											is a great read on how the site works and how to be successful while playing here. Ranked games (this site uses an "ELO" system - cliffs:
											your ELO points go up more if you win against better players by aggregate ELO than if you win against worse players) are taken seriously
											by many so you might want to play in some casual (often custom) games to learn how this game works online and the basics of the
											established metagame before jumping into ranked. They will have this <Icon name="handshake outline" /> icon in the game list.
										</p>
									</React.Fragment>
								);
							case 3:
								return (
									<React.Fragment>
										<h5>How do you get a cool player color or upload your own personal cardback?</h5>
										<p>
											Play 50 games to attain "rainbow" status and have a color based off your ELO. Click on the info icon next to "Lobby" in the upper right
											corner to learn more. These games must be ranked (not private or casual). You can check to see where you're at in your profile page -
											click on your name in the upper right corner.
										</p>
										<h5>How do you get a medal (seasonal reward)?</h5>
										<p>Be a top performing player by ELO at the end of a season. Seasons last for 3 months and start at the first of the year.</p>
										<h5>Is my information secure?</h5>
										<p>
											As per our{' '}
											<a href="/about" target="_blank" rel="noopener noreferrer">
												Privacy Policy
											</a>{' '}
											your password is securely encrypted per industry standards and your email address will never be used for anything other than password
											resets and verification. Verifying your account is strongly recommended. Accounts that were created by signing up/in with discord or
											github are automatically verified.
										</p>
									</React.Fragment>
								);
							case 4:
								return (
									<h4>
										Have fun playing this open source site. We are always looking for contributors, if you do add to this site's code, you get a cool
										contributor color! Check out the{' '}
										<a href="https://github.com/cozuya/secret-hitler" target="_blank" rel="noopener noreferrer">
											github repo
										</a>{' '}
										if you're interested. Thanks for playing! -coz (site admin)
									</h4>
								);
						}
					})()}
				</Modal.Content>
				<Modal.Actions>
					<Button
						onClick={this.handleDismissSignupModal}
						inverted
						style={{ background: newPlayerModalPageIndex === 4 ? '#db2828' : 'var(--theme-tertiary)', color: '#fff' }}
					>
						<Icon name="checkmark" />
						{newPlayerModalPageIndex === 4 ? 'Close' : 'Skip and dismiss forever'}
					</Button>
					<div className="navigation-container">
						<Button
							onClick={() => {
								this.handleChangeModalPageIndex(newPlayerModalPageIndex - 1);
							}}
							primary
							disabled={!newPlayerModalPageIndex}
						>
							<Icon name="angle left" /> Previous
						</Button>
						<Button
							onClick={() => {
								this.handleChangeModalPageIndex(newPlayerModalPageIndex + 1);
							}}
							primary
							disabled={newPlayerModalPageIndex === 4}
						>
							Next
							<Icon name="angle right" />
						</Button>
					</div>
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
				case 'signups':
					return <Signups socket={socket} />;
				case 'settings':
					return <Settings userInfo={userInfo} socket={socket} />;
				case 'profile':
					return <Profile userInfo={userInfo} socket={socket} userList={userList} />;
				case 'replay':
					return <Replay allEmotes={this.props.allEmotes} userList={userList} />;
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
							generalChats={this.props.generalChats}
							allEmotes={this.props.allEmotes}
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
	allEmotes: PropTypes.object,
	onClickedTakeSeat: PropTypes.func,
	onSeatingUser: PropTypes.func,
	onLeaveGame: PropTypes.func
};

export default Main;
