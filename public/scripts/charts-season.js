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
			new Chartist.Line('#chart-completed-games', {
				labels: data.completedGames.labels,
				series: [data.completedGames.series]
			});

			setTimeout(() => {
				const { labels } = data.completedGames;
				const $labels = $('#chart-completed-games .ct-label.ct-horizontal');
				const showingLabelIndexes = [0, Math.round(labels.length / 4), Math.round(labels.length / 2), Math.round(labels.length / 1.5), labels.length - 1];
				const $shownlabels = $labels.filter(index => showingLabelIndexes.includes(index));

				$shownlabels.show(); // barf
			}, 500);

			new Chartist.Pie(
				'#chart-allplayer-games-winrate',
				processWinrateData(data.allPlayerGameData.fascistWinCountSeason, data.allPlayerGameData.totalGameCountSeason),
				{
					width: '400px',
					height: '400px'
				}
			);

			$('#chart-allplayer-games-winrate').after(`<p style="text-align: center">Total games played: ${data.allPlayerGameData.totalGameCountSeason}</p>`);

			new Chartist.Pie(
				'#chart-fiveplayer-games-winrate',
				processWinrateData(data.fivePlayerGameData.fascistWinCountSeason, data.fivePlayerGameData.totalGameCountSeason),
				{
					width: '400px',
					height: '400px'
				}
			);

			$('#chart-fiveplayer-games-winrate').after(
				`<p style="text-align: center">Total 5 player games played: ${data.fivePlayerGameData.totalGameCountSeason} | Percentage of Fascists in game: <span style="color: red; font-weight: bold">40%</span></p>`
			);

			new Chartist.Pie(
				'#chart-sixplayer-games-winrate',
				processWinrateData(data.sixPlayerGameData.fascistWinCountSeason, data.sixPlayerGameData.totalGameCountSeason),
				{
					width: '400px',
					height: '400px'
				}
			);

			$('#chart-sixplayer-games-winrate').after(
				`<p style="text-align: center">Total 6 player games played: ${data.sixPlayerGameData.totalGameCountSeason} | Percentage of Fascists in game: <span style="color: red; font-weight: bold">33%</span></p><h2 class="ui header centered">Winrate for 6 player games (rebalanced)</h2><div class="chart" id="chart-sixplayer-rebalanced-games-winrate"></div><p style="text-align: center">Total 6 player rebalanced games played: ${data.sixPlayerGameData.rebalancedTotalGameCountSeason} | Percentage of Fascists in game: <span style="color: red; font-weight: bold">33%</span></p>`
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
				`<p style="text-align: center">Total 7 player games played: ${data.sevenPlayerGameData.totalGameCountSeason} | Percentage of Fascists in game: <span style="color: red; font-weight: bold">43%</span></p><h2 class="ui header centered">Winrate for 7 player games (rebalanced)</h2><div class="chart" id="chart-sevenplayer-rebalanced-games-winrate"></div><p style="text-align: center">Total 7 player rebalanced games played: ${data.sevenPlayerGameData.rebalancedTotalGameCountSeason} | Percentage of Fascists in game: <span style="color: red; font-weight: bold">43%</span></p>`
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
				`<p style="text-align: center">Total 8 player games played: ${data.eightPlayerGameData.totalGameCountSeason} | Percentage of Fascists in game: <span style="color: red; font-weight: bold">38%</span></p>`
			);

			new Chartist.Pie(
				'#chart-nineplayer-games-winrate',
				processWinrateData(data.ninePlayerGameData.fascistWinCountSeason, data.ninePlayerGameData.totalGameCountSeason),
				{
					width: '400px',
					height: '400px'
				}
			);

			$('#chart-nineplayer-games-winrate').after(
				`<p style="text-align: center">Total 9 player games played: ${data.ninePlayerGameData.totalGameCountSeason} | Percentage of Fascists in game: <span style="color: red; font-weight: bold">44%</span></p><h2 class="ui header centered">Winrate for 9 player games (rebalanced)</h2><div class="chart" id="chart-nineplayer-rebalanced-games-winrate"></div><p style="text-align: center">Total 9 player rebalanced games played: ${data.ninePlayerGameData.rebalanced2fFascistWinCountSeason} | Percentage of Fascists in game: <span style="color: red; font-weight: bold">44%</span></p>`
			);

			new Chartist.Pie(
				'#chart-nineplayer-rebalanced-games-winrate',
				processWinrateData(data.ninePlayerGameData.rebalanced2fFascistWinCountSeason, data.ninePlayerGameData.rebalanced2fTotalGameCountSeason),
				{ width: '400px', height: '400px' }
			);

			new Chartist.Pie(
				'#chart-tenplayer-games-winrate',
				processWinrateData(data.tenPlayerGameData.fascistWinCountSeason, data.tenPlayerGameData.totalGameCountSeason),
				{
					width: '400px',
					height: '400px'
				}
			);

			$('#chart-tenplayer-games-winrate').after(
				`<p style="text-align: center">Total 10 player games played: ${data.tenPlayerGameData.totalGameCountSeason} | Percentage of Fascists in game: <span style="color: red; font-weight: bold">40%</span></p>`
			);
		}
	});
});
