import React from 'react';

class Leaderboard extends React.Component {
	constructor() {
		super();

		this.state = {
			seasonalLeaderboard: [],
			dailyLeaderboard: [],
		};
	}

	componentDidMount() {
		fetch('../leaderboardData.json', { cache: 'no-store' })
			.then((res) => res.json())
			.then((data) => {
				this.setState({
					seasonalLeaderboard: data.seasonalLeaderboard || [],
					dailyLeaderboard: data.dailyLeaderboard || [],
					errored: false,
				});
			})
			.catch((e) => {
				console.log('Error in Getting Current Leaderboard', e);
				this.setState({
					errored: true,
				});
			});
	}

	render() {
		return (
			<section className="leaderboards">
				<a href="#/">
					<i className="remove icon" style={{ marginTop: '30px' }} />
				</a>
				{this.state.seasonalLeaderboard.length + this.state.dailyLeaderboard.length && !this.state.errored ? (
					<div className="ui grid">
						<div className="eight wide column">
							{this.state.seasonalLeaderboard.length > 0 && (
								<>
									<h2 className="ui header">Seasonal leaders</h2>
									<ul>
										{this.state.seasonalLeaderboard.map((user) => (
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
							{this.state.dailyLeaderboard.length > 0 && (
								<>
									<h2 className="ui header">Daily leaders</h2>
									<ul>
										{this.state.dailyLeaderboard.map(
											(user) =>
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
