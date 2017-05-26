import React from 'react';
import {ADMINS, PLAYERCOLORS} from '../../constants';
import $ from 'jquery';
import Modal from 'semantic-ui-modal';

$.fn.modal = Modal;

export default class Playerlist extends React.Component {
	constructor() {
		super();
		this.clickInfoIcon = this.clickInfoIcon.bind(this);
	}

	clickInfoIcon() {
		$('.playerlistinfo')
			.modal('setting', 'transition', 'scale')
			.modal('show');
	}

	render() {
		return (
			<section className="playerlist">
				<div className="playerlist-header">
					<div className="clearfix">
						<h3 className="ui header">Lobby</h3>
						<i className="info circle icon" onClick={this.clickInfoIcon} />
						<div className="ui modal playerlistinfo">
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
										<i className="large user icon" />
										<span>{this.props.userList.totalSockets - this.props.userList.list.length >= 0 ? this.props.userList.totalSockets - this.props.userList.list.length : 0}</span>
										<i className="large unhide icon" />
									</div>
								);
							}
						})()}
					</div>
					<div className="ui divider" />
				</div>
				<div className="playerlist-body">
					{(() => {
						if (Object.keys(this.props.userList).length) {
							const {list} = this.props.userList;

							list.sort((a, b) => {
								const aTotal = a.wins + a.losses,
									bTotal = b.wins + b.losses;

								if (ADMINS.includes(a.userName)) {
									return -1;
								}

								if (ADMINS.includes(b.userName)) {
									return 1;
								}

								if (aTotal > 29 && bTotal > 29) {
									return (b.wins / bTotal) - (a.wins / aTotal);
								} else if (aTotal > 29) {
									return -1;
								} else if (bTotal > 29) {
									return 1;
								}

								return b.wins - a.wins;
							});

							return list.map((user, i) => {
								const percent = ((user.wins / (user.wins + user.losses)) * 100).toFixed(0),
									percentDisplay = (user.wins + user.losses) > 9 ? `${percent}%` : '';

								return (
									<div key={i}>
										<span className={PLAYERCOLORS(user)}>{user.userName}</span>
										<div className="userlist-stats-container">(
											<span className="userlist-stats">{user.wins}</span> / <span className="userlist-stats">{user.losses}</span>) <span className="userlist-stats"> {percentDisplay}</span>
										</div>
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
	userList: React.PropTypes.object
};
