import React from 'react';

export default class Playerlist extends React.Component {
	render() {
		return (
			<section className="playerlist">
				<div className="playerlist-header">
					<div className="clearfix">
						<h3 className="ui header">Lobby</h3>
						{(() => {
							if (this.props.userList.length) {
								return (
									<div>
										<span>{this.props.userList.length}</span>
										<i className="large user icon" />
										<span>{this.props.userList.totalSockets - this.props.userList.length}</span>
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
					const {userList} = this.props,
						{list} = userList;

					if (Object.keys(userList).length) {
						list.sort((a, b) => {
							const aTotal = a.wins + a.losses,
								bTotal = b.wins + b.losses;

							if (a.userName === 'coz' || a.userName === 'stine') {
								return -1;
							}

							if (b.userName === 'coz' || b.userName === 'stine') {
								return 1;
							}

							if (aTotal > 9 && bTotal > 9) {
								return (b.wins / bTotal) - (a.wins / aTotal);
							} else if (aTotal > 9) {
								return -1;
							} else if (bTotal > 9) {
								return 1;
							}

							return b.wins - a.wins;
						});

						return list.map((user, i) => {
							const percent = ((user.wins / (user.wins + user.losses)) * 100).toFixed(0),
								percentDisplay = (user.wins + user.losses) > 9 ? `${percent}%` : '';

							return (
								<div key={i}>
									<span style={{color: user.userName === 'coz' ? 'red' : user.userName === 'stine' ? 'red' : ''}}>{user.userName}</span>
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