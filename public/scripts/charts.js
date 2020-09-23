document.addEventListener('DOMContentLoaded', function(event) {
	// this page/code is total shit but I would need to get a different graphing library to make it better.

	const processWinrateData = (fascistWinCount, totalGameCount) => {
		const fWins = Math.round((fascistWinCount / totalGameCount) * 100000) / 1000;
		const lWins = Math.round(((totalGameCount - fascistWinCount) / totalGameCount) * 100000) / 1000;

		return {
			series: [fWins, lWins],
			labels: [`${fWins.toFixed()}% Fascist wins`, `${lWins.toFixed()}% Liberal wins`]
		};
	};

	$.ajax({
		url: 'data',
		success: function(data) {
			new Chartist.Pie('#chart-allplayer-games-winrate', processWinrateData(data.allPlayerGameData.fascistWinCount, data.allPlayerGameData.totalGameCount), {
				width: '400px',
				height: '400px'
			});

			$('#chart-allplayer-games-winrate').after(
				`<p style="text-align: center">Total games played: ${data.allPlayerGameData.totalGameCount.toLocaleString()}</p>`
			);

			new Chartist.Pie('#chart-fiveplayer-games-winrate', processWinrateData(data.fivePlayerGameData.fascistWinCount, data.fivePlayerGameData.totalGameCount), {
				width: '400px',
				height: '400px'
			});

			$('#chart-fiveplayer-games-winrate').after(
				`<p style="text-align: center">Total 5 player games played: ${data.fivePlayerGameData.totalGameCount.toLocaleString()} | Percentage of Fascists in game: <span style="color: red; font-weight: bold">40%</span></p>`
			);

			new Chartist.Pie('#chart-sixplayer-games-winrate', processWinrateData(data.sixPlayerGameData.fascistWinCount, data.sixPlayerGameData.totalGameCount), {
				width: '400px',
				height: '400px'
			});

			$('#chart-sixplayer-games-winrate').after(
				`<p style="text-align: center">Total 6 player games played: ${data.sixPlayerGameData.totalGameCount.toLocaleString()} | Percentage of Fascists in game: <span style="color: red; font-weight: bold">33%</span></p><h2 class="ui header centered">Winrate for 6 player games (rebalanced)</h2><div class="chart" id="chart-sixplayer-rebalanced-games-winrate"></div><p style="text-align: center">Total 6 player rebalanced games played: ${
					data.sixPlayerGameData.rebalancedTotalGameCount
				} | Percentage of Fascists in game: <span style="color: red; font-weight: bold">33%</span></p>`
			);

			new Chartist.Pie(
				'#chart-sixplayer-rebalanced-games-winrate',
				processWinrateData(data.sixPlayerGameData.rebalancedFascistWinCount, data.sixPlayerGameData.rebalancedTotalGameCount),
				{ width: '400px', height: '400px' }
			);

			new Chartist.Pie(
				'#chart-sevenplayer-games-winrate',
				processWinrateData(data.sevenPlayerGameData.fascistWinCount, data.sevenPlayerGameData.totalGameCount),
				{ width: '400px', height: '400px' }
			);

			$('#chart-sevenplayer-games-winrate').after(
				`<p style="text-align: center">Total 7 player games played: ${data.sevenPlayerGameData.totalGameCount.toLocaleString()} | Percentage of Fascists in game: <span style="color: red; font-weight: bold">43%</span></p><h2 class="ui header centered">Winrate for 7 player games (rebalanced)</h2><div class="chart" id="chart-sevenplayer-rebalanced-games-winrate"></div><p style="text-align: center">Total 7 player rebalanced games played: ${
					data.sevenPlayerGameData.rebalancedTotalGameCount
				} | Percentage of Fascists in game: <span style="color: red; font-weight: bold">43%</span></p>`
			);

			new Chartist.Pie(
				'#chart-sevenplayer-rebalanced-games-winrate',
				processWinrateData(data.sevenPlayerGameData.rebalancedFascistWinCount, data.sevenPlayerGameData.rebalancedTotalGameCount),
				{ width: '400px', height: '400px' }
			);

			new Chartist.Pie(
				'#chart-eightplayer-games-winrate',
				processWinrateData(data.eightPlayerGameData.fascistWinCount, data.eightPlayerGameData.totalGameCount),
				{ width: '400px', height: '400px' }
			);

			$('#chart-eightplayer-games-winrate').after(
				`<p style="text-align: center">Total 8 player games played: ${data.eightPlayerGameData.totalGameCount.toLocaleString()} | Percentage of Fascists in game: <span style="color: red; font-weight: bold">38%</span></p>`
			);

			new Chartist.Pie('#chart-nineplayer-games-winrate', processWinrateData(data.ninePlayerGameData.fascistWinCount, data.ninePlayerGameData.totalGameCount), {
				width: '400px',
				height: '400px'
			});

			$('#chart-nineplayer-games-winrate').after(
				`<p style="text-align: center">Total 9 player games played: ${data.ninePlayerGameData.totalGameCount.toLocaleString()} | Percentage of Fascists in game: <span style="color: red; font-weight: bold">44%</span></p><h2 class="ui header centered">Winrate for 9 player games (rebalanced)</h2><div class="chart" id="chart-nineplayer-rebalanced-games-winrate"></div><p style="text-align: center">Total 9 player rebalanced games played: ${
					data.ninePlayerGameData.rebalanced2fFascistWinCount
				} | Percentage of Fascists in game: <span style="color: red; font-weight: bold">44%</span></p>`
			);

			new Chartist.Pie(
				'#chart-nineplayer-rebalanced-games-winrate',
				processWinrateData(data.ninePlayerGameData.rebalanced2fFascistWinCount, data.ninePlayerGameData.rebalanced2fTotalGameCount),
				{ width: '400px', height: '400px' }
			);

			new Chartist.Pie('#chart-tenplayer-games-winrate', processWinrateData(data.tenPlayerGameData.fascistWinCount, data.tenPlayerGameData.totalGameCount), {
				width: '400px',
				height: '400px'
			});

			$('#chart-tenplayer-games-winrate').after(
				`<p style="text-align: center">Total 10 player games played: ${data.tenPlayerGameData.totalGameCount.toLocaleString()} | Percentage of Fascists in game: <span style="color: red; font-weight: bold">40%</span></p>`
			);
		}
	});
});
