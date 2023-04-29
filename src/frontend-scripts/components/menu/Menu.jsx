import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { viewPatchNotes } from '../../actions/actions';
import { Popup } from 'semantic-ui-react';
import * as Swal from 'sweetalert2';
import socket from '../../socket';

const mapStateToProps = ({ version }) => ({ version });

const mapDispatchToProps = dispatch => ({
	readPatchNotes: () => {
		dispatch(viewPatchNotes());
		fetch('/viewPatchNotes', {
			credentials: 'same-origin'
		});
		window.location.hash = '#/changelog';
	}
});

class Menu extends React.Component {
	constructor() {
		super();
	}

	state = {
		workCountdown: !window.localStorage.getItem('hideWorkPopup') ? 10 : 0,
		timer: !window.localStorage.getItem('hideWorkPopup')
			? window.setInterval(() => {
					this.setState(prevState => ({
						workCountdown: prevState.workCountdown - 1
					}));
			  }, 1000)
			: null
	};

	componentDidUpdate(prevProps, prevState) {
		if (!this.state.workCountdown && prevState.workCountdown) {
			window.localStorage.setItem('hideWorkPopup', true);
			window.clearInterval(this.state.timer);
		}
	}

	renderWork = () => {
		return (
			<div style={{ padding: '0 20%' }}>
				<span style={{ background: '#474747', color: '#fff', margin: '0 5px' }}> I'm looking for work!</span>
				<span style={{ color: '#ff9898' }}>
					Need an experienced senior JavaScript/TypeScript front-end/React (or fullstack JS) developer? Hit me up on{' '}
					<a href="https://www.linkedin.com/in/chris-ozols-8a277559/" rel="noopener noreferrer" target="_blank">
						LinkedIn
					</a>{' '}
					or <a href="mailto:chris.v.ozols@gmail.com">email</a>. -Chris
					<span style={{ background: '#333', color: '#ddd', margin: '0 10px' }}>{this.state.workCountdown || ''}</span>
				</span>
			</div>
		);
	};

	render() {
		let classes = 'ui menu nav-menu';
		const { userInfo } = this.props;

		if (this.props.midSection === 'game') {
			classes += ' game';
		}

		if (userInfo && userInfo.gameSettings && userInfo.gameSettings.safeForWork) {
			window.document.title = 'SH.io';
		}

		return (
			<div>
				{this.state.workCountdown ? this.renderWork() : null}
				<div className="menu-container" style={{ zIndex: 9999 }}>
					<section className={classes}>
						<a href="/">{userInfo && userInfo.gameSettings && userInfo.gameSettings.safeForWork ? 'SH.io' : 'SECRET HITLER.io'}</a>
						<div className="center-menu-links">
							<span>
								<a style={{ textDecoration: 'underline' }} target="_blank" href="/tou">
									Site Rules
								</a>{' '}
								|{' '}
								<a
									className={
										this.props.midSection !== 'game' && this.props.version.lastSeen && this.props.version.current.number !== this.props.version.lastSeen
											? 'patch-alert'
											: null
									}
									onClick={this.props.readPatchNotes}
								>
									{' '}
									{`v${this.props.version.current.number}`}{' '}
								</a>
								|{' '}
								<a
									onClick={() => {
										if (userInfo.userName) {
											Swal.fire({
												allowOutsideClick: false,
												title: 'Feedback',
												html:
													'Please enter your feedback here. Reporting players and other time-sensitive moderation issues should go to #mod-support on our Discord.',
												input: 'textarea',
												inputAttributes: {
													maxlength: 1900
												},
												confirmButtonText: 'Submit',
												showCancelButton: true,
												cancelButtonText: 'Cancel'
											}).then(result => {
												if (result.value) {
													// result.value holds the feedback
													socket.emit('feedbackForm', {
														feedback: result.value
													});
												}
											});
										} else {
											Swal.fire({
												icon: 'error',
												title: 'You must log in to submit feedback!'
											});
										}
									}}
								>
									Feedback
								</a>{' '}
								|{' '}
								<a rel="noopener noreferrer" target="_blank" href="https://github.com/cozuya/secret-hitler/wiki">
									Wiki
								</a>{' '}
								|{' '}
								<a rel="noopener noreferrer" target="_blank" href="https://discord.gg/secrethitlerio">
									Discord
								</a>
							</span>
						</div>
						<div className="item right menu">
							{(() => {
								const { gameInfo, userInfo } = this.props;

								/**
								 * @return {string} classnames
								 */
								const iconClasses = () => {
									let classes = 'setting icon large';

									if (gameInfo.gameState && gameInfo.gameState.isStarted && !gameInfo.gameState.isCompleted) {
										classes += ' disabled';
									}

									return classes;
								};

								return !userInfo.userName ? (
									<div className="ui buttons">
										<div className="ui button" id="signin">
											Log in
										</div>
										<div className="or" />
										<div className="ui button" id="signup">
											Sign up
										</div>
									</div>
								) : (
									<div>
										<Popup
											inverted
											className="loggedin"
											trigger={
												<a href={`#/profile/${userInfo.userName}`}>
													<span className="playername">{userInfo.userName}</span>
												</a>
											}
											content="Profile"
										/>
										<Popup
											inverted
											className="settings-popup"
											trigger={
												<a href="#/settings">
													<i className={iconClasses()} />
												</a>
											}
											content="Settings"
										/>
									</div>
								);
							})()}
							{this.props.userInfo.userName && (
								<div className="item right">
									<a className="ui button" href="/logout">
										Logout
									</a>
								</div>
							)}
						</div>
					</section>
				</div>
				<div className="menu-container-mobile" style={{ zIndex: 9999 }}>
					<section className="nav-menu">
						<div className="center-menu-links">
							<span>
								<a style={{ textDecoration: 'underline' }} target="_blank" href="/tou">
									Site Rules
								</a>{' '}
								|{' '}
								<a
									className={
										this.props.midSection !== 'game' && this.props.version.lastSeen && this.props.version.current.number !== this.props.version.lastSeen
											? 'patch-alert'
											: null
									}
									onClick={this.props.readPatchNotes}
								>
									{' '}
									{`v${this.props.version.current.number}`}{' '}
								</a>
								|{' '}
								<a rel="noopener noreferrer" target="_blank" href="https://github.com/cozuya/secret-hitler/issues">
									Feedback
								</a>{' '}
								|{' '}
								<a rel="noopener noreferrer" target="_blank" href="https://github.com/cozuya/secret-hitler/wiki">
									Wiki
								</a>{' '}
								|{' '}
								<a rel="noopener noreferrer" target="_blank" href="https://discord.gg/secrethitlerio">
									Discord
								</a>
							</span>
						</div>
					</section>
				</div>
				<div className="menu-container-mobile" style={{ zIndex: 9999 }}>
					<section className={classes}>
						<div className="item left menu">
							{(() => {
								const { gameInfo, userInfo } = this.props;

								/**
								 * @return {string} classnames
								 */
								const iconClasses = () => {
									let classes = 'setting icon large';

									if (gameInfo.gameState && gameInfo.gameState.isStarted && !gameInfo.gameState.isCompleted) {
										classes += ' disabled';
									}

									return classes;
								};

								return !userInfo.userName ? (
									<div className="ui buttons">
										<div className="ui button" id="signin">
											Log in
										</div>
										<div className="or" />
										<div className="ui button" id="signup">
											Sign up
										</div>
									</div>
								) : (
									<div>
										<Popup
											inverted
											className="loggedin"
											trigger={
												<a href={`#/profile/${userInfo.userName}`}>
													<span className="playername">{userInfo.userName}</span>
												</a>
											}
											content="Profile"
										/>
										<Popup
											inverted
											className="settings-popup"
											trigger={
												<a href="#/settings">
													<i className={iconClasses()} />
												</a>
											}
											content="Settings"
										/>
									</div>
								);
							})()}
							{this.props.userInfo.userName && (
								<div className="item right">
									<a className="ui button" href="/logout">
										Logout
									</a>
								</div>
							)}
						</div>
						<div className="item right menu">
							<button className="ui button floating primary button" id="chatsidebar">
								Chat
							</button>
						</div>
					</section>
				</div>
			</div>
		);
	}
}

Menu.propTypes = {
	userInfo: PropTypes.object,
	gameInfo: PropTypes.object,
	midSection: PropTypes.string,
	version: PropTypes.object,
	readPatchNotes: PropTypes.func
};

export default connect(mapStateToProps, mapDispatchToProps)(Menu);
