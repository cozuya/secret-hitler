import React from 'react';
import { connect } from 'react-redux';
import { fetchProfile, updateStatus } from '../../actions/actions';
import cn from 'classnames';
import { PLAYERCOLORS, TRIALMODS, CONTRIBUTORS } from '../../constants';
import $ from 'jquery';
import Modal from 'semantic-ui-modal';
import classnames from 'classnames';
import PropTypes from 'prop-types';
import { Scrollbars } from 'react-custom-scrollbars';
import { Popup } from 'semantic-ui-react';

$.fn.modal = Modal;

const mapStateToProps = ({ midSection }) => ({ midSection });
const mapDispatchToProps = dispatch => ({
	fetchProfile: username => dispatch(fetchProfile(username)),
	fetchReplay: gameId => {
		updateStatus('replay', uid);
		dispatch({ type: 'FETCH_REPLAY', gameId });
	}
});
const mergeProps = (stateProps, dispatchProps, ownProps) => {
	const isUserClickable = stateProps.midSection !== 'game' && stateProps.midSection !== 'replay';

	return Object.assign({}, ownProps, dispatchProps, { isUserClickable });
};

class Playerlist extends React.Component {
	constructor() {
		super();
		this.clickInfoIcon = this.clickInfoIcon.bind(this);
		this.state = {
			userListFilter: 'all',
			expandInfo: {
				AEM: true,
				cont: true,
				exp: true,
				inexp: false,
				priv: false
			}
		};
	}

	clickInfoIcon() {
		$('.playerlistinfo')
			.modal('setting', 'transition', 'scale')
			.modal('show');
	}

	routeToGame(gameId) {
		window.location = `#/table/${gameId}`;
	}

	alphabetical(sort) {
		return (a, b) => (a.userName.toLowerCase() > b.userName.toLowerCase() ? 1 : -1);
	}

	winRate(sort) {
		const { gameSettings } = this.props.userInfo;
		const w =
			gameSettings && gameSettings.disableSeasonal
				? this.state.userListFilter === 'all'
					? 'wins'
					: 'rainbowWins'
				: this.state.userListFilter === 'all'
				? 'winsSeason'
				: 'rainbowWinsSeason';
		const l =
			gameSettings && gameSettings.disableSeasonal
				? this.state.userListFilter === 'all'
					? 'losses'
					: 'rainbowLosses'
				: this.state.userListFilter === 'all'
				? 'lossesSeason'
				: 'rainbowLossesSeason';

		return (a, b) => {
			const awr = a[w] / a[l];
			const bwr = b[w] / b[l];
			if (awr !== bwr) {
				return awr < bwr ? 1 : -1;
			} else {
				return sort(a, b);
			}
		};
	}

	sortByElo(sort) {
		const { gameSettings } = this.props.userInfo;
		const elo = gameSettings && gameSettings.disableSeasonal ? 'eloOverall' : 'eloSeason';
		const w =
			gameSettings && gameSettings.disableSeasonal
				? this.state.userListFilter === 'all'
					? 'wins'
					: 'rainbowWins'
				: this.state.userListFilter === 'all'
				? 'winsSeason'
				: 'rainbowWinsSeason';
		const l =
			gameSettings && gameSettings.disableSeasonal
				? this.state.userListFilter === 'all'
					? 'losses'
					: 'rainbowLosses'
				: this.state.userListFilter === 'all'
				? 'lossesSeason'
				: 'rainbowLossesSeason';

		return (a, b) => {
			const wl1 = a[w] + a[l];
			const wl2 = b[w] + b[l];
			const e1 = wl1 >= 50 && a[elo] ? a[elo] : 0;
			const e2 = wl2 >= 50 && b[elo] ? b[elo] : 0;
			if (e1 !== e2) {
				return e1 < e2 ? 1 : -1;
			} else {
				return sort(a, b);
			}
		};
	}

	renderFilterIcons() {
		const filterClick = filter => {
			this.setState({
				userListFilter: this.state.userListFilter === 'all' ? 'rainbow' : 'all'
			});
		};

		return (
			<span className="filter-container" title="Click this to toggle the userlist filter between regular and rainbow games">
				<span className={this.state.userListFilter} onClick={filterClick} />
			</span>
		);
	}

	renderModerationButton() {
		const { userInfo } = this.props;

		if (Object.keys(userInfo).length && Boolean(userInfo.staffRole)) {
			return (
				<a href="#/moderation">
					<i className="fire icon mod-button" />
				</a>
			);
		}
	}

	renderPlayerReportButton() {
		const { userInfo } = this.props;

		if ((Object.keys(userInfo).length && Boolean(userInfo.staffRole)) || TRIALMODS.includes(userInfo.userName)) {
			let classes = 'comment icon report-button';

			const reportClick = () => {
				if (userInfo.gameSettings.newReport) {
					this.props.socket.emit('playerReportDismiss');
				}

				window.location.hash = '#/playerreports';
			};

			if (userInfo.gameSettings && userInfo.gameSettings.newReport) {
				classes += ' active';
			}

			return (
				<a href="#/playerreports" onClick={reportClick}>
					<i className={classes} />
				</a>
			);
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

	renderPlayerlist() {
		if (Object.keys(this.props.userList).length) {
			const { list } = this.props.userList;
			const { userInfo } = this.props;
			const { expandInfo } = this.state;
			const { gameSettings } = userInfo;
			const w =
				gameSettings && gameSettings.disableSeasonal
					? this.state.userListFilter === 'all'
						? 'wins'
						: 'rainbowWins'
					: this.state.userListFilter === 'all'
					? 'winsSeason'
					: 'rainbowWinsSeason';
			const l =
				gameSettings && gameSettings.disableSeasonal
					? this.state.userListFilter === 'all'
						? 'losses'
						: 'rainbowLosses'
					: this.state.userListFilter === 'all'
					? 'lossesSeason'
					: 'rainbowLossesSeason';
			const elo = !(gameSettings && gameSettings.disableElo) ? (gameSettings && gameSettings.disableSeasonal ? 'eloOverall' : 'eloSeason') : null;
			const routeToProfile = userName => {
				window.location.hash = `#/profile/${userName}`;
			};
			const isStaff = Boolean(Object.keys(userInfo).length && userInfo.staffRole);
			const visible = list.filter(user => (this.state.userListFilter === 'all' || user[w] + user[l] > 49) && (!user.isPrivate || isStaff));
			const admins = visible.filter(user => user.staffRole === 'admin').sort(this.alphabetical());
			let aem = [...admins];
			const editors = visible.filter(user => user.staffRole === 'editor').sort(this.alphabetical());
			aem.push(...editors);
			const moderators = visible.filter(user => user.staffRole === 'moderator').sort(this.alphabetical());
			aem.push(...moderators);
			const nonStaff = visible.filter(user => !aem.includes(user));
			const contributors = nonStaff.filter(user => CONTRIBUTORS.includes(user.userName)).sort(this.alphabetical());

			const privateUser = nonStaff.filter(user => !contributors.includes(user) && user.isPrivate);
			const experienced = elo
				? nonStaff
						.filter(user => !contributors.includes(user) && !privateUser.includes(user) && user[w] + user[l] >= 50)
						.sort(this.sortByElo(this.alphabetical()))
				: nonStaff
						.filter(user => !contributors.includes(user) && !privateUser.includes(user) && user[w] + user[l] >= 50)
						.sort(this.winRate(this.alphabetical()));

			const inexperienced = nonStaff.filter(user => !contributors.includes(user) && !experienced.includes(user)).sort(this.alphabetical());

			const makeUser = (user, i) => {
				const percent = ((user[w] / (user[w] + user[l])) * 100).toFixed(0);
				const percentDisplay = user[w] + user[l] > 9 ? `${percent}%` : '';
				const disableIfUnclickable = f => {
					if (this.props.isUserClickable) {
						return f;
					}

					return () => null;
				};

				const userClasses =
					user[w] + user[l] > 49 || Boolean(user.staffRole && user.staffRole.length) || CONTRIBUTORS.includes(user.userName)
						? cn(
								PLAYERCOLORS(user, !(gameSettings && gameSettings.disableSeasonal), 'username', gameSettings && gameSettings.disableElo),
								{ blacklisted: gameSettings && gameSettings.blacklist.includes(user.userName) },
								{ unclickable: !this.props.isUserClickable },
								{ clickable: this.props.isUserClickable }
						  )
						: cn({ blacklisted: gameSettings && gameSettings.blacklist.includes(user.userName) }, 'username');
				const renderStatus = () => {
					const status = user.status;

					if (!status || status.type === 'none') {
						return <i className={'status unclickable icon'} />;
					} else {
						const iconClasses = classnames(
							'status',
							{ unclickable: !this.props.isUserClickable },
							{ clickable: this.props.isUserClickable },
							{ search: status.type === 'observing' },
							{ fav: status.type === 'playing' },
							{ rainbow: status.type === 'rainbow' },
							{ record: status.type === 'replay' },
							'icon'
						);
						const title = {
							playing: 'This player is playing in a standard game.',
							observing: 'This player is observing a game.',
							rainbow: 'This player is playing in a experienced-player-only game.',
							replay: 'This player is watching a replay.'
						};
						const onClick = {
							playing: this.routeToGame,
							observing: this.routeToGame,
							rainbow: this.routeToGame,
							replay: this.props.fetchReplay
						};

						return <i title={title[status.type]} className={iconClasses} onClick={disableIfUnclickable(onClick[status.type]).bind(this, status.gameId)} />;
					}
				};

				// const renderCrowns = () =>
				// 	user.tournyWins
				// 		.filter(winTime => time - winTime < 10800000)
				// 		.map(crown => <span key={crown} title="This player has recently won a tournament." className="crown-icon" />);

				return (
					<div key={i} className="user-container">
						<div className="userlist-username">
							{renderStatus()}
							{/* {!(gameSettings && Object.keys(gameSettings).length && gameSettings.disableCrowns) && user.tournyWins && renderCrowns()} */}
							{!(gameSettings && Object.keys(gameSettings).length && gameSettings.disableCrowns) &&
								user.previousSeasonAward &&
								this.renderPreviousSeasonAward(user.previousSeasonAward)}
							{(() => {
								const userAdminRole =
									user.staffRole === 'admin'
										? 'Admin'
										: user.staffRole === 'editor'
										? 'Editor'
										: user.staffRole === 'moderator'
										? 'Moderator'
										: CONTRIBUTORS.includes(user.userName)
										? 'Contributor'
										: null;

								if (userAdminRole) {
									const prefix = userAdminRole !== 'Contributor' ? `(${userAdminRole.charAt(0)})` : null;

									return (
										<Popup
											inverted
											className="admin-popup"
											trigger={
												<span className={userClasses} onClick={disableIfUnclickable(routeToProfile).bind(null, user.userName)}>
													{prefix}
													{` ${user.userName}`}
												</span>
											}
											content={userAdminRole}
										/>
									);
								} else {
									return (
										<span className={userClasses} onClick={disableIfUnclickable(routeToProfile).bind(null, user.userName)}>
											{user.userName}
										</span>
									);
								}
							})()}
						</div>
						{user.staffRole !== 'admin' &&
							Boolean(!user.staffDisableVisibleElo) &&
							(() => {
								return elo ? (
									<div className="userlist-stats-container">
										<span className="userlist-stats">{user[elo] ? user[elo] : 1600}</span>
									</div>
								) : (
									<div className="userlist-stats-container">
										(<span className="userlist-stats">{user[w] ? user[w] : '0'}</span> / <span className="userlist-stats">{user[l] ? user[l] : '0'}</span>){' '}
										<span className="userlist-stats"> {percentDisplay}</span>
									</div>
								);
							})()}
					</div>
				);
			};

			const toggleGroup = cat => {
				this.state.expandInfo[cat] = !this.state.expandInfo[cat];
				this.setState({});
			};
			return (
				<div>
					<span onClick={() => toggleGroup('AEM')} style={{ cursor: 'pointer' }}>
						<i className={`caret ${expandInfo.AEM ? 'down' : 'right'} icon`} />
						<span style={{ userSelect: 'none' }}>Staff: {aem.length}</span>
					</span>
					<div>{expandInfo.AEM && aem.map(makeUser)}</div>
					<span onClick={() => toggleGroup('cont')} style={{ cursor: 'pointer' }}>
						<i className={`caret ${expandInfo.cont ? 'down' : 'right'} icon`} />
						<span style={{ userSelect: 'none' }}>Contributors: {contributors.length}</span>
					</span>
					<div>{expandInfo.cont && contributors.map(makeUser)}</div>
					<span onClick={() => toggleGroup('exp')} style={{ cursor: 'pointer' }}>
						<i className={`caret ${expandInfo.exp ? 'down' : 'right'} icon`} />
						<span style={{ userSelect: 'none' }}>Experienced: {experienced.length}</span>
					</span>
					<div>{expandInfo.exp && experienced.map(makeUser)}</div>
					<span onClick={() => toggleGroup('inexp')} style={{ cursor: 'pointer' }}>
						<i className={`caret ${expandInfo.inexp ? 'down' : 'right'} icon`} />
						<span style={{ userSelect: 'none' }}>Inexperienced: {inexperienced.length}</span>
					</span>
					<div>{expandInfo.inexp && inexperienced.map(makeUser)}</div>
					{isStaff && (
						<div>
							<span onClick={() => toggleGroup('priv')} style={{ cursor: 'pointer' }}>
								<i className={`caret ${expandInfo.priv ? 'down' : 'right'} icon`} />
								<span style={{ userSelect: 'none' }}>Private: {privateUser.length}</span>
							</span>
							<div>{expandInfo.priv && privateUser.map(makeUser)}</div>
						</div>
					)}
				</div>
			);
		}
	}

	render() {
		return (
			<section className="playerlist">
				<div className="playerlist-header">
					<span className="header-name-container">
						<h3 className="ui header">Lobby</h3>
						<i className="info circle icon" onClick={this.clickInfoIcon} title="Click to get information about player colors" />
					</span>
					{this.renderFilterIcons()}
					{this.renderModerationButton()}
					{this.renderPlayerReportButton()}
					<div className="ui basic modal playerlistinfo">
						<div className="header">Lobby and player color info:</div>
						<p>
							Players in the lobby, general chat, and game chat are grey/white until they reach 50 games played. After that, they are known as "rainbow players"
							because their color changes based on their stats. Rainbow players have access to play in special rainbow player only games.
						</p>
						<p>
							The color of a rainbow player depends on their ELO, a type of matchmaking rating. The spectrum of colors goes from deep green as lowest ELO to
							deep purple as highest ELO, passing through yellow and orange on its way.
						</p>
						<p>
							Additionally, <span className="admin">Administrators</span> have a <span className="admin">red color</span> with a{' '}
							<span className="admin-name">dark red (A)</span> and are always at the top of the list.
							<br />
							<span className="cbell">Ed</span>
							<span className="max">it</span>
							<span className="invidia">or</span>
							<span className="faaiz">s</span>, placed at the top just below <span className="admin">Administrators</span>, have a range of special colors to
							stand out, as well as a <span className="editor-name">red (E)</span>.<br />
							<span className="moderatorcolor">Moderators</span>, placed at the top below <span className="cbell">Ed</span>
							<span className="max">it</span>
							<span className="invidia">or</span>
							<span className="faaiz">s</span>, have a <span className="moderatorcolor">blue color</span> with a{' '}
							<span className="moderator-name">light red (M)</span>.<br />
							Lastly, <span className="contributor">Contributors</span> get a <span className="contributor">special color</span> as well! Contribute code to
							this open source project!.
						</p>
					</div>
					{Object.keys(this.props.userList).length && (
						<span>
							<span>{this.props.userList.list.length}</span>
							<i className="large user icon" title="Number of players logged in" />
						</span>
					)}
				</div>
				<Scrollbars>
					<div className="playerlist-body">{this.renderPlayerlist()}</div>
				</Scrollbars>
			</section>
		);
	}
}

Playerlist.defaultProps = {
	userInfo: {},
	userList: { list: [] },
	socket: {}
};

Playerlist.propTypes = {
	userInfo: PropTypes.object,
	userList: PropTypes.object,
	socket: PropTypes.object
};

export default connect(
	mapStateToProps,
	mapDispatchToProps,
	mergeProps
)(Playerlist);
