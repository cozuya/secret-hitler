import React from 'react';
import { connect } from 'react-redux';
import { fetchProfile, updateStatus } from '../../actions/actions';
import cn from 'classnames';
import { EDITORS, ADMINS, PLAYERCOLORS, MODERATORS, TRIALMODS, CONTRIBUTORS, CURRENTSEASONNUMBER } from '../../constants';
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
			userListFilter: 'all'
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
		return (a, b) => (a.userName > b.userName ? 1 : -1);
	}

	winRate(sort) {
		const { gameSettings } = this.props.userInfo;
		const w =
			gameSettings && gameSettings.disableSeasonal
				? this.state.userListFilter === 'all'
					? 'wins'
					: 'rainbowWins'
				: this.state.userListFilter === 'all'
					? `winsSeason${CURRENTSEASONNUMBER}`
					: `rainbowWinsSeason${CURRENTSEASONNUMBER}`;
		const l =
			gameSettings && gameSettings.disableSeasonal
				? this.state.userListFilter === 'all'
					? 'losses'
					: 'rainbowLosses'
				: this.state.userListFilter === 'all'
					? `lossesSeason${CURRENTSEASONNUMBER}`
					: `rainbowLossesSeason${CURRENTSEASONNUMBER}`;

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

	tounryWins(sort) {
		return sort(a, b);
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

		if (
			userInfo &&
			userInfo.userName &&
			(MODERATORS.includes(userInfo.userName) || ADMINS.includes(userInfo.userName) || EDITORS.includes(userInfo.userName))
		) {
			return (
				<a href="#/moderation">
					<i className="fire icon mod-button" />
				</a>
			);
		}
	}

	renderPlayerReportButton() {
		const { userInfo } = this.props;

		if (
			userInfo &&
			userInfo.userName &&
			(MODERATORS.includes(userInfo.userName) ||
				TRIALMODS.includes(userInfo.userName) ||
				ADMINS.includes(userInfo.userName) ||
				EDITORS.includes(userInfo.userName))
		) {
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
				return <span title="This player was in the 3rd tier of winrate in the previous season" className="season-award bronze" />;
			case 'silver':
				return <span title="This player was in the 2nd tier of winrate in the previous season" className="season-award silver" />;
			case 'gold':
				return <span title="This player was in the top tier of winrate in the previous season" className="season-award gold" />;
		}
	}

	renderPlayerlist() {
		if (Object.keys(this.props.userList).length) {
			const { list } = this.props.userList;
			const { userInfo } = this.props;
			const { gameSettings } = userInfo;
			const w =
				gameSettings && gameSettings.disableSeasonal
					? this.state.userListFilter === 'all'
						? 'wins'
						: 'rainbowWins'
					: this.state.userListFilter === 'all'
						? `winsSeason${CURRENTSEASONNUMBER}`
						: `rainbowWinsSeason${CURRENTSEASONNUMBER}`;
			const l =
				gameSettings && gameSettings.disableSeasonal
					? this.state.userListFilter === 'all'
						? 'losses'
						: 'rainbowLosses'
					: this.state.userListFilter === 'all'
						? `lossesSeason${CURRENTSEASONNUMBER}`
						: `rainbowLossesSeason${CURRENTSEASONNUMBER}`;
			const elo = !(gameSettings && gameSettings.disableElo) ? (gameSettings && gameSettings.disableSeasonal ? 'eloOverall' : 'eloSeason') : null;
			// const time = new Date().getTime();
			const routeToProfile = userName => {
				window.location.hash = `#/profile/${userName}`;
			};
			const isStaff = MODERATORS.includes(userInfo.userName) || ADMINS.includes(userInfo.userName) || EDITORS.includes(userInfo.userName);
			const visible = list.filter(user => (this.state.userListFilter === 'all' || user[w] + user[l] > 49) && (!user.isPrivate || isStaff));
			const admins = visible.filter(user => ADMINS.includes(user.userName)).sort(this.alphabetical());
			let aem = [...admins];
			const editors = visible.filter(user => !aem.includes(user) && EDITORS.includes(user.userName)).sort(this.alphabetical());
			aem.push(...editors);
			const moderators = visible.filter(user => !aem.includes(user) && MODERATORS.includes(user.userName)).sort(this.alphabetical());
			aem.push(...moderators);
			const contributors = visible.filter(user => !aem.includes(user) && CONTRIBUTORS.includes(user.userName)).sort(this.alphabetical());
			aem.push(...contributors);

			const tournyWinners = visible.filter(user => !aem.includes(user) && user.tournyWins.length).sort(this.tounryWins(this.winRate(this.alphabetical())));

			const experienced = elo
				? visible.filter(user => !aem.includes(user) && !tournyWinners.includes(user)).sort((a, b) => a[elo] < b[elo])
				: visible.filter(user => !aem.includes(user) && !tournyWinners.includes(user) && user[w] + user[l] >= 50).sort(this.winRate(this.alphabetical()));

			const inexperienced = visible
				.filter(user => !aem.includes(user) && !tournyWinners.includes(user) && !experienced.includes(user))
				.sort(this.alphabetical());

			return [...aem, ...tournyWinners, ...experienced, ...inexperienced].map((user, i) => {
				const percent = (user[w] / (user[w] + user[l]) * 100).toFixed(0);
				const percentDisplay = user[w] + user[l] > 9 ? `${percent}%` : '';
				const disableIfUnclickable = f => {
					if (this.props.isUserClickable) {
						return f;
					}

					return () => null;
				};

				const userClasses =
					user[w] + user[l] > 49 ||
					ADMINS.includes(user.userName) ||
					EDITORS.includes(user.userName) ||
					MODERATORS.includes(user.userName) ||
					CONTRIBUTORS.includes(user.userName)
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
						return null;
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
							{/* {!(gameSettings && Object.keys(gameSettings).length && gameSettings.disableCrowns) && user.tournyWins && renderCrowns()} */}
							{!(gameSettings && Object.keys(gameSettings).length && gameSettings.disableCrowns) &&
								user.previousSeasonAward &&
								this.renderPreviousSeasonAward(user.previousSeasonAward)}
							{(() => {
								const userAdminRole = ADMINS.includes(user.userName)
									? 'Admin'
									: EDITORS.includes(user.userName)
										? 'Editor'
										: MODERATORS.includes(user.userName)
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
											{user.isPrivate ? 'P - ' : ''}
											{user.userName}
										</span>
									);
								}
							})()}
							{renderStatus()}
						</div>
						{!ADMINS.includes(user.userName) &&
							(() => {
								return elo ? (
									<div className="userlist-stats-container">
										<span className="userlist-stats">{user[elo] ? user[elo].toFixed(0) : 1600}</span>
									</div>
								) : (
									<div className="userlist-stats-container">
										(
										<span className="userlist-stats">{user[w] ? user[w] : '0'}</span> / <span className="userlist-stats">{user[l] ? user[l] : '0'}</span>){' '}
										<span className="userlist-stats"> {percentDisplay}</span>
									</div>
								);
							})()}
					</div>
				);
			});
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
							If rainbow players have a less than 52% win rate, their player color varies between <span className="experienced1">light green</span> and{' '}
							<span className="experienced5">dark green</span>, depending on how many games they have played. Conversely, with a win rate of 52% or higher,
							their player color ranges from <span className="onfire1">light purple</span> to <span className="onfire10">dark purple</span> depending on how
							high it is. The highest tier is 70%.
						</p>
						<p>
							Additionally, <span className="admin">Administrators</span> have a <span className="admin">red color</span> with a{' '}
							<span className="admin-name">dark red (A)</span> and are always at the top of the list.<br />
							<span className="cbell">Ed</span>
							<span className="max">it</span>
							<span className="invidia">or</span>
							<span className="faaiz">s</span>, placed at the top just below <span className="admin">Administrators</span>, have a range of special colors to
							stand out, as well as a <span className="editor-name">red (E)</span>.<br />
							<span className="moderatorcolor">Moderators</span>, placed at the top below <span className="cbell">Ed</span>
							<span className="max">it</span>
							<span className="invidia">or</span>
							<span className="faaiz">s</span>, have a <span className="moderatorcolor">blue color</span> with a{' '}
							<span className="moderator-name">light red (M)</span>.<br />Lastly, <span className="contributer">Contributors</span> get a{' '}
							<span className="contributer">special orange color</span> as well! Contribute code to this open source project to be endlessly pestered about why
							you're <span className="contributer">orange</span>.
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

Playerlist.propTypes = {
	userInfo: PropTypes.object,
	userList: PropTypes.object,
	socket: PropTypes.object
};

export default connect(mapStateToProps, mapDispatchToProps, mergeProps)(Playerlist);
