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
		$.ajax({
			url: 'data/leaderboardData.json',
			success(data) {
				console.log(data, 'd');
			}
		});
	}

	render() {
		return <section className="changelog">hi</section>;
	}
}

export default Leaderboard;
