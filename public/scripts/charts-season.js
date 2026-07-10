document.addEventListener('DOMContentLoaded', function(event) {
	// this page/code is total shit but I would need to get a different graphing library to make it better.
	// Sibling of charts.js (the overall-stats page). Same payload from /statsData.json, but this reads the
	// per-bucket `...Season` fields so it shows only the CURRENT season's games instead of all-time.

	const processWinrateData = (fascistWinCount, totalGameCount) => {
		// Guard the 0-games case: dividing by 0 yields NaN% labels and a broken pie. Common on the season
		// page early in a season, before a given player-count bucket has any games.
		if (!totalGameCount) {
			return { series: [1], labels: ['No games yet'] };
		}
		const fWins = Math.round((fascistWinCount / totalGameCount) * 100000) / 1000;
		const lWins = Math.round(((totalGameCount - fascistWinCount) / totalGameCount) * 100000) / 1000;

		return {
			series: [fWins, lWins],
			labels: [`${fWins.toFixed()}% Fascist wins`, `${lWins.toFixed()}% Liberal wins`]
		};
	};

	$.ajax({
		url: 'statsData.json',
		success: function(data) {
			new Chartist.Pie('#chart-allplayer-games-winrate', processWinrateData(data.allPlayerGameData.fascistWinCountSeason, data.allPlayerGameData.totalGameCountSeason), {
				width: '400px',
				height: '400px'
			});

			$('#chart-allplayer-games-winrate').after(
				`<p style="text-align: center">Total games played: ${data.allPlayerGameData.totalGameCountSeason.toLocaleString()}</p>`
			);

			new Chartist.Pie('#chart-fiveplayer-games-winrate', processWinrateData(data.fivePlayerGameData.fascistWinCountSeason, data.fivePlayerGameData.totalGameCountSeason), {
				width: '400px',
				height: '400px'
			});

			$('#chart-fiveplayer-games-winrate').after(
				`<p style="text-align: center">Total 5 player games played: ${data.fivePlayerGameData.totalGameCountSeason.toLocaleString()} | Percentage of Fascists in game: <span style="color: red; font-weight: bold">40%</span></p>`
			);

			new Chartist.Pie('#chart-sixplayer-games-winrate', processWinrateData(data.sixPlayerGameData.fascistWinCountSeason, data.sixPlayerGameData.totalGameCountSeason), {
				width: '400px',
				height: '400px'
			});

			$('#chart-sixplayer-games-winrate').after(
				`<p style="text-align: center">Total 6 player games played: ${data.sixPlayerGameData.totalGameCountSeason.toLocaleString()} | Percentage of Fascists in game: <span style="color: red; font-weight: bold">33%</span></p><h2 class="ui header centered">Winrate for 6 player games (rebalanced)</h2><div class="chart" id="chart-sixplayer-rebalanced-games-winrate"></div><p style="text-align: center">Total 6 player rebalanced games played: ${
					data.sixPlayerGameData.rebalancedTotalGameCountSeason
				} | Percentage of Fascists in game: <span style="color: red; font-weight: bold">33%</span></p>`
			);

			new Chartist.Pie(
				'#chart-sixplayer-rebalanced-games-winrate',
				processWinrateData(data.sixPlayerGameData.rebalancedFascistWinCountSeason, data.sixPlayerGameData.rebalancedTotalGameCountSeason),
				{ width: '400px', height: '400px' }
			);

			new Chartist.Pie(
				'#chart-sevenplayer-games-winrate',
				processWinrateData(data.sevenPlayerGameData.fascistWinCountSeason, data.sevenPlayerGameData.totalGameCountSeason),
				{ width: '400px', height: '400px' }
			);

			$('#chart-sevenplayer-games-winrate').after(
				`<p style="text-align: center">Total 7 player games played: ${data.sevenPlayerGameData.totalGameCountSeason.toLocaleString()} | Percentage of Fascists in game: <span style="color: red; font-weight: bold">43%</span></p><h2 class="ui header centered">Winrate for 7 player games (rebalanced)</h2><div class="chart" id="chart-sevenplayer-rebalanced-games-winrate"></div><p style="text-align: center">Total 7 player rebalanced games played: ${
					data.sevenPlayerGameData.rebalancedTotalGameCountSeason
				} | Percentage of Fascists in game: <span style="color: red; font-weight: bold">43%</span></p>`
			);

			new Chartist.Pie(
				'#chart-sevenplayer-rebalanced-games-winrate',
				processWinrateData(data.sevenPlayerGameData.rebalancedFascistWinCountSeason, data.sevenPlayerGameData.rebalancedTotalGameCountSeason),
				{ width: '400px', height: '400px' }
			);

			new Chartist.Pie(
				'#chart-eightplayer-games-winrate',
				processWinrateData(data.eightPlayerGameData.fascistWinCountSeason, data.eightPlayerGameData.totalGameCountSeason),
				{ width: '400px', height: '400px' }
			);

			$('#chart-eightplayer-games-winrate').after(
				`<p style="text-align: center">Total 8 player games played: ${data.eightPlayerGameData.totalGameCountSeason.toLocaleString()} | Percentage of Fascists in game: <span style="color: red; font-weight: bold">38%</span></p>`
			);

			new Chartist.Pie('#chart-nineplayer-games-winrate', processWinrateData(data.ninePlayerGameData.fascistWinCountSeason, data.ninePlayerGameData.totalGameCountSeason), {
				width: '400px',
				height: '400px'
			});

			$('#chart-nineplayer-games-winrate').after(
				`<p style="text-align: center">Total 9 player games played: ${data.ninePlayerGameData.totalGameCountSeason.toLocaleString()} | Percentage of Fascists in game: <span style="color: red; font-weight: bold">44%</span></p><h2 class="ui header centered">Winrate for 9 player games (rebalanced)</h2><div class="chart" id="chart-nineplayer-rebalanced-games-winrate"></div><p style="text-align: center">Total 9 player rebalanced games played: ${
					data.ninePlayerGameData.rebalanced2fTotalGameCountSeason
				} | Percentage of Fascists in game: <span style="color: red; font-weight: bold">44%</span></p>`
			);

			new Chartist.Pie(
				'#chart-nineplayer-rebalanced-games-winrate',
				processWinrateData(data.ninePlayerGameData.rebalanced2fFascistWinCountSeason, data.ninePlayerGameData.rebalanced2fTotalGameCountSeason),
				{ width: '400px', height: '400px' }
			);

			new Chartist.Pie('#chart-tenplayer-games-winrate', processWinrateData(data.tenPlayerGameData.fascistWinCountSeason, data.tenPlayerGameData.totalGameCountSeason), {
				width: '400px',
				height: '400px'
			});

			$('#chart-tenplayer-games-winrate').after(
				`<p style="text-align: center">Total 10 player games played: ${data.tenPlayerGameData.totalGameCountSeason.toLocaleString()} | Percentage of Fascists in game: <span style="color: red; font-weight: bold">40%</span></p>`
			);
		}
	});
});
