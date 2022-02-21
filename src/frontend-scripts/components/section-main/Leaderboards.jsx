import React from 'react';
import moment from 'moment';

class Leaderboard extends React.Component {
	constructor() {
		super();

		this.state = {
			seasonalLeaderboardElo: [],
			seasonalLeaderboardXP: [],
			dailyLeaderboardElo: [],
			dailyLeaderboardXP: [],
			rainbowLeaderboard: []
		};
	}

	componentDidMount() {
		fetch('../leaderboardData.json', { cache: 'no-store' })
			.then(res => res.json())
			.then(data => {
				this.setState({
					seasonalLeaderboardElo: data.seasonalLeaderboardElo || [],
					seasonalLeaderboardXP: data.seasonalLeaderboardXP || [],
					dailyLeaderboardElo: data.dailyLeaderboardElo || [],
					dailyLeaderboardXP: data.dailyLeaderboardXP || [],
					rainbowLeaderboard: data.rainbowLeaderboard || [],
					errored: false
				});
			})
			.catch(e => {
				console.log('Error in Getting Current Leaderboard', e);
				this.setState({
					errored: true
				});
			});
	}

	render() {
		return (
			<section className="leaderboards">
				<a href="#/">
					<i className="remove icon" style={{ marginTop: '30px' }} />
				</a>
				{this.state.seasonalLeaderboardElo.length && !this.state.errored ? (
					<>
						<div className="ui grid">
							<div className="eight wide column">
								{this.state.seasonalLeaderboardElo.length > 0 && (
									<>
										<h2 className="ui header">Seasonal Elo leaders</h2>
										<ul>
											{this.state.seasonalLeaderboardElo.map(user => (
												<li key={user.userName}>
													<p>
														<a href={`#/profile/${user.userName}`}>{user.userName}</a>
													</p>
													<p>{user.elo.toFixed(0)}</p>
												</li>
											))}
										</ul>
									</>
								)}
							</div>
							<div className="eight wide column">
								{this.state.dailyLeaderboardElo.length > 0 && (
									<>
										<h2 className="ui header">Daily Elo leaders</h2>
										<ul>
											{this.state.dailyLeaderboardElo.map(
												user =>
													user.dailyEloDifference.toFixed(0) >= 0 && (
														<li key={user.userName}>
															<p>
																<a href={`#/profile/${user.userName}`}>{user.userName}</a>
															</p>
															<p>+{user.dailyEloDifference.toFixed(0)}</p>
														</li>
													)
											)}
										</ul>
									</>
								)}
							</div>
						</div>
						<div className="ui grid">
							<div className="eight wide column">
								{this.state.seasonalLeaderboardXP.length > 0 && (
									<>
										<h2 className="ui header">Seasonal XP leaders</h2>
										<ul>
											{this.state.seasonalLeaderboardXP.map(user => (
												<li key={user.userName}>
													<p>
														<a href={`#/profile/${user.userName}`}>{user.userName}</a>
													</p>
													<p>{user.xp.toFixed(0)}</p>
												</li>
											))}
										</ul>
									</>
								)}
							</div>
							<div className="eight wide column">
								{this.state.dailyLeaderboardXP.length > 0 && (
									<>
										<h2 className="ui header">Daily XP leaders</h2>
										<ul>
											{this.state.dailyLeaderboardXP.map(
												user =>
													user.dailyXPDifference.toFixed(0) >= 0 && (
														<li key={user.userName}>
															<p>
																<a href={`#/profile/${user.userName}`}>{user.userName}</a>
															</p>
															<p>+{user.dailyXPDifference.toFixed(0)}</p>
														</li>
													)
											)}
										</ul>
									</>
								)}
							</div>
						</div>
						<div className="ui grid">
							<div className="eight wide column">
								{this.state.rainbowLeaderboard.length > 0 && (
									<>
										<h2 className="ui header">Most recent rainbow players</h2>
										<ul>
											{this.state.rainbowLeaderboard.map(user => (
												<li key={user.userName}>
													<p>
														<a href={`#/profile/${user.userName}`}>{user.userName}</a>
													</p>
													<p>{moment(user.date).format('DD-MM-YYYY')}</p>
												</li>
											))}
										</ul>
									</>
								)}
							</div>
						</div>
					</>
				) : this.state.errored ? (
					<h2 className="ui header">Leaderboard Error</h2>
				) : (
					<>
						<h2 className="ui header">No Leaderboard Data</h2>
						<br />
						<h2 className="ui header">Check back tomorrow!</h2>
					</>
				)}
			</section>
		);
	}
}

export default Leaderboard;
