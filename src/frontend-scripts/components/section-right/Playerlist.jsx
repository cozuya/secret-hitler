import React from 'react';
import { connect } from 'react-redux';
import { fetchProfile } from '../../actions/actions';
import cn from 'classnames';
import {ADMINS, PLAYERCOLORS, MODERATORS} from '../../constants';
import $ from 'jquery';
import Modal from 'semantic-ui-modal';
import classnames from 'classnames';

$.fn.modal = Modal;

const mapStateToProps = ({ midSection }) => ({ midSection }),

	mapDispatchToProps = dispatch => ({
		fetchProfile: username => dispatch(fetchProfile(username))
	}),

	mergeProps = (stateProps, dispatchProps, ownProps) => {
		const isUserClickable = stateProps.midSection !== 'game';

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
						<i className="info circle icon" onClick={this.clickInfoIcon} title="Click to get information about player's colors" />
						{this.renderFilterIcons()}
						{this.renderModerationButton()}
						<div className="ui basic modal playerlistinfo">
							<div className="header">Lobby and player color info</div>
							<h4>Players in the lobby, general chat, and game chat are grey/white until:</h4>
							<p>50 games played: <span className="experienced">light green</span></p>
							<p>100 games played: <span className="veryexperienced">darker green</span></p>
							<p>200 games played: <span className="veryveryexperienced">even darker green</span></p>
							<p>300 games played: <span className="superexperienced">even darker green</span></p>
							<p>500 games played: <span className="supersuperexperienced">really dark green</span></p>
							<h4>Additionally, if a player has at least 50 games played and a win rate of</h4>
							<p>greater than 55%: <span className="sortaonfire experienced">light purple</span></p>
							<p>greater than 60%: <span className="onfire experienced">darker purple</span></p>
							<p>greater than 65%: <span className="veryonfire experienced">really dark purple</span></p>
							<h4>Also <span className="admin">admins</span> are always on top, and <span className="contributer">contributers</span> get a special color as well</h4>
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

								if (aTotal > 49 && bTotal > 49) {
									return (b[w] / bTotal) - (a[w] / aTotal);
								} else if (aTotal > 49) {
									return -1;
								} else if (bTotal > 49) {
									return 1;
								}

								return b[w] - a[w];
							})
							.filter(user => this.state.userListFilter === 'all' || user[w] + user[l] > 49)
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

										if (!status || status === 'none') {
											return null;
										} else {
											const iconClasses = classnames(
												'status',
												{ unclickable: !this.props.isUserClickable },
												{ clickable: this.props.isUserClickable },
												{ search: status.type === 'observing' },
												{ fav: status.type === 'playing' },
												{ rainbow: status.type === 'rainbow' },
												'icon'
											);

											return (
												<i
													title={status.type === 'playing' ? 'This player is playing in a standard game.' : status.type === 'observing' ? 'This player is observing a game.' : status.type === 'rainbow' ? 'This player is playing in a experienced-player-only game.' : ''}
													className={iconClasses}
													onClick={disableIfUnclickable(this.routeToGame).bind(this, status.gameId)} />
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
	userInfo: React.PropTypes.object,
	userList: React.PropTypes.object,
	onModerationButtonClick: React.PropTypes.func,
};

export default connect(
	mapStateToProps,
	mapDispatchToProps,
	mergeProps
)(Playerlist);
