import React from 'react';
import { connect } from 'react-redux';
import { fetchProfile } from '../../actions/actions';
import cn from 'classnames';
import {ADMINS, PLAYERCOLORS, MODERATORS} from '../../constants';
import $ from 'jquery';
import Modal from 'semantic-ui-modal';
import classnames from 'classnames';
import PropTypes from 'prop-types';

$.fn.modal = Modal;

const mapStateToProps = ({ midSection }) => ({ midSection }),

	mapDispatchToProps = dispatch => ({
		fetchProfile: username => dispatch(fetchProfile(username)),
		fetchReplay: gameId => dispatch({ type: 'FETCH_REPLAY', gameId })
	}),

	mergeProps = (stateProps, dispatchProps, ownProps) => {
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
		this.props.socket.emit('getGameInfo', gameId);
	}

	renderFilterIcons() {
		const filterClick = filter => {
			this.setState({userListFilter: this.state.userListFilter === 'all' ? 'rainbow' : 'all'});
		};

		return (
			<span className="filter-container" title="Click this to toggle the userlist filter between regular and rainbow games">
				<span className={this.state.userListFilter} onClick={filterClick} />
			</span>
		);
	}

	renderModerationButton() {
		const {userInfo} = this.props;

		if (userInfo && userInfo.userName && (MODERATORS.includes(userInfo.userName) || ADMINS.includes(userInfo.userName))) {
			return <a onClick={() => {this.props.onModerationButtonClick('moderation');}} className="mod-button">M</a>;
		}
	}

	render() {
		return (
			<section className="playerlist">
				<div className="playerlist-header">
					<div className="clearfix">
						<h3 className="ui header">Lobby</h3>
						<i className="info circle icon" onClick={this.clickInfoIcon} title="Click to get information about player colors" />
						{this.renderFilterIcons()}
						{this.renderModerationButton()}
						<div className="ui basic modal playerlistinfo">
							<div className="header">Lobby and player color info</div>
							<p>Players in the lobby, general chat, and game chat are grey/white until they reach 50 games played.  These are known as "rainbow players" and have access to play in special rainbow player only games.</p>
							<p>After that, if they have less than 52% win rate, their player color varies between <span className="experienced1">light green</span> and <span className="experienced5">dark green</span>, depending on how many games played they have.</p>
							<p>Additionally, if a player has at least 50 games played and a win rate of 52% or higher, their player color ranges from <span className="onfire1">light purple</span> to <span className="onfire10">dark purple</span> depending on how high it is.</p>
							<p>Also <span className="admin">admins</span> are always on top, and <span className="contributer">contributers</span> get a special color as well.</p>
						</div>
						{(() => {
							if (Object.keys(this.props.userList).length) {
								return (
									<div>
										<span>{this.props.userList.list.length}</span>
										<i className="large user icon" title="Number of players logged in" />
										<span>{this.props.userList.totalSockets - this.props.userList.list.length >= 0 ? this.props.userList.totalSockets - this.props.userList.list.length : 0}</span>
										<i className="large unhide icon" title="Number of observers" />
									</div>
								);
							}
						})()}
					</div>
				</div>
				<div className="playerlist-body">
					{(() => {
						if (Object.keys(this.props.userList).length) {
							const {list} = this.props.userList,
								w = this.state.userListFilter === 'all' ? 'wins' : 'rainbowWins',
								l = this.state.userListFilter === 'all' ? 'losses' : 'rainbowLosses';

							return list.sort((a, b) => {
								const aTotal = a[w] + a[l],
									bTotal = b[w] + b[l];

								if (ADMINS.includes(a.userName)) {
									return -1;
								}

								if (ADMINS.includes(b.userName)) {
									return 1;
								}

								if (MODERATORS.includes(a.userName) && !ADMINS.includes(b.userName)) {
									return -1;
								}

								if (MODERATORS.includes(b.userName) && !ADMINS.includes(a.userName)) {
									return 1;
								}

								if (MODERATORS.includes(a.userName) && MODERATORS.includes(b.userName)) {
									return b[w] - a[w];
								}

								if (aTotal > 49 && bTotal > 49) {
									return (b[w] / bTotal) - (a[w] / aTotal);
								} else if (aTotal > 49) {
									return -1;
								} else if (bTotal > 49) {
									return 1;
								}

								return b[w] - a[w];
							})
							.filter(user => this.state.userListFilter === 'all' || user.wins + user.losses > 49)
							.map((user, i) => {
								const percent = ((user[w] / (user[w] + user[l])) * 100).toFixed(0),
									percentDisplay = (user[w] + user[l]) > 9 ? `${percent}%` : '',
									disableIfUnclickable = f => {
										if (this.props.isUserClickable)
											return f;

										return () => null;
									},
									userClasses = (user.wins + user.losses > 49) ? cn(
										PLAYERCOLORS(user),
										{ unclickable: !this.props.isUserClickable },
										{ clickable: this.props.isUserClickable },
										'username'
									) : 'username',
									renderStatus = () => {
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

											return (
												<i
													title={title[status.type]}
													className={iconClasses}
													onClick={disableIfUnclickable(onClick[status.type]).bind(this, status.gameId)} />
											);
										}
									};

								return (
									<div key={i} className="user-container">
										<div className="userlist-username">
											<span
												className={userClasses}
												onClick={disableIfUnclickable(this.props.fetchProfile).bind(null, user.userName)}>
												{user.userName}
												{(() => {
													if (MODERATORS.includes(user.userName)) {
														return <span className="moderator-name" title="This user is a moderator"> (M)</span>;
													}
												})()}
											</span>
											{renderStatus()}
										</div>
										{(() => {
											if (!ADMINS.includes(user.userName)) {
												const w = this.state.userListFilter === 'all' ? 'wins' : 'rainbowWins',
													l = this.state.userListFilter === 'all' ? 'losses' : 'rainbowLosses';

												return (
													<div className="userlist-stats-container">(
														<span className="userlist-stats">{user[w]}</span> / <span className="userlist-stats">{user[l]}</span>) <span className="userlist-stats"> {percentDisplay}</span>
													</div>
												);
											}
										})()}
									</div>
								);
							});
						}
					})()}
				</div>
			</section>
		);
	}
}

Playerlist.propTypes = {
	userInfo: PropTypes.object,
	userList: PropTypes.object,
	onModerationButtonClick: PropTypes.func,
};

export default connect(
	mapStateToProps,
	mapDispatchToProps,
	mergeProps
)(Playerlist);
