import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { PLAYERCOLORS } from '../../constants';
import { viewPatchNotes } from '../../actions/actions';
import { Popup } from 'semantic-ui-react';

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

	render() {
		let classes = 'ui menu nav-menu';

		if (this.props.midSection === 'game') {
			classes += ' game';
		}

		return (
			<div className="menu-container">
				<section className={classes}>
					<a href="/" target="_blank">
						<img src="../images/navbar_logo2.png" />
					</a>
					<div className="center-menu-links">
						<span>
							<a style={{ textDecoration: 'underline' }} target="_blank" href="/about#TOU">
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
								Changelog {this.props.version.current.number}{' '}
							</a>
							|{' '}
							<a target="_blank" href="https://github.com/cozuya/secret-hitler/issues">
								Feedback
							</a>{' '}
							|{' '}
							<a target="_blank" href="https://github.com/cozuya/secret-hitler/wiki">
								Wiki
							</a>{' '}
							|{' '}
							<a target="_blank" href="https://discord.gg/secrethitlerio">
								Discord
							</a>
						</span>
					</div>
					<div className="item right">
						{(() => {
							const { gameInfo, userInfo } = this.props;
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
 + +										inverted
 + +										className="loggedin"
 + +										trigger={
 + +											<a href={`#/profile/${userInfo.userName}`}>
 + +												<span className={`${PLAYERCOLORS(userInfo.userName)} playername`}>{userInfo.userName}</span>
 + +											</a>
 + +										}
 + +										content="Profile"
 + +									/>
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
								<a className="ui button" href="/observe">
									Logout
								</a>
							</div>
						)}
					</div>
				</section>
			</div>
		);
	}
}

Menu.propTypes = {
	userInfo: PropTypes.object,
	gameInfo: PropTypes.object,
	midSection: PropTypes.string
};

export default connect(mapStateToProps, mapDispatchToProps)(Menu);
