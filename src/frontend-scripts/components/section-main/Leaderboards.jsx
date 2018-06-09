import React from 'react';
import $ from 'jquery';

class Leaderboard extends React.Component {
	constructor() {
		super();

		this.state = {
			seasonalLeaderboard: [],
			dailyLeaderboard: []
		};
	}

	componentDidMount() {
		const self = this;

		$.ajax({
			// url: 'leaderboardData.json',
			url: '../temp.json',
			success(data) {
				self.setState({
					seasonalLeaderboard: data.seasonalLeaderboard,
					dailyLeaderboard: data.dailyLeaderboard
				});
			}
		});
	}

	render() {
		return (
			<section className="leaderboards">
				<a href="#/">
					<i className="remove icon" style={{ marginTop: '30px' }} />
				</a>
				<div className="ui grid">
					<div className="eight wide column">
						<h2 className="ui header">Seasonal leaders</h2>
						<ul>
							{this.state.seasonalLeaderboard.map(user => (
								<li key={user.userName}>
									<p>
										<a href={`#/profile/${user.userName}`}>{user.userName}</a>
									</p>
									<p>{user.elo.toFixed(0)}</p>
								</li>
							))}
						</ul>
					</div>
					<div className="eight wide column">
						<h2 className="ui header">Daily leaders</h2>
						<ul>
							{this.state.dailyLeaderboard.map(user => (
								<li key={user.userName}>
									<p>
										<a href={`#/profile/${user.userName}`}>{user.userName}</a>
									</p>
									<p>+{user.dailyEloDifference.toFixed(0)}</p>
								</li>
							))}
						</ul>
					</div>
				</div>
			</section>
		);
	}
}

export default Leaderboard;
