document.addEventListener('DOMContentLoaded', function(event) {
	// this page/code is total shit but I would need to get a different graphing library to make it better.

	const processWinrateData = data => {
		const fWins = Math.round(data.fascistWinCount / data.totalGameCount * 100000) / 1000,
			lWins = Math.round((data.totalGameCount - data.fascistWinCount) / data.totalGameCount * 100000) / 1000;

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
				const { labels } = data.completedGames,
					$labels = $('#chart-completed-games .ct-label.ct-horizontal'),
					showingLabelIndexes = [0, Math.round(labels.length / 4), Math.round(labels.length / 2), Math.round(labels.length / 1.5), labels.length - 1],
					$shownlabels = $labels.filter(index => showingLabelIndexes.includes(index));

				$shownlabels.show(); // barf
			}, 500);

			new Chartist.Pie('#chart-allplayer-games-winrate', processWinrateData(data.allPlayerGameData), { width: '400px', height: '400px' });

			$('#chart-allplayer-games-winrate').after(`<p style="text-align: center">Total games played: ${data.allPlayerGameData.totalGameCount}</p>`);

			new Chartist.Pie('#chart-fiveplayer-games-winrate', processWinrateData(data.fivePlayerGameData), { width: '400px', height: '400px' });

			$('#chart-fiveplayer-games-winrate').after(
				`<p style="text-align: center">Total 5 player games played: ${data.fivePlayerGameData
					.totalGameCount} | Percentage of Fascists in game: <span style="color: red; font-weight: bold">40%</span></p>`
			);

			new Chartist.Pie('#chart-sixplayer-games-winrate', processWinrateData(data.sixPlayerGameData), { width: '400px', height: '400px' });

			$('#chart-sixplayer-games-winrate').after(
				`<p style="text-align: center">Total 6 player games played: ${data.sixPlayerGameData
					.totalGameCount} | Percentage of Fascists in game: <span style="color: red; font-weight: bold">33%</span></p>`
			);

			new Chartist.Pie('#chart-sevenplayer-games-winrate', processWinrateData(data.sevenPlayerGameData), { width: '400px', height: '400px' });

			$('#chart-sevenplayer-games-winrate').after(
				`<p style="text-align: center">Total 7 player games played: ${data.sevenPlayerGameData
					.totalGameCount} | Percentage of Fascists in game: <span style="color: red; font-weight: bold">43%</span></p>`
			);

			new Chartist.Pie('#chart-eightplayer-games-winrate', processWinrateData(data.eightPlayerGameData), { width: '400px', height: '400px' });

			$('#chart-eightplayer-games-winrate').after(
				`<p style="text-align: center">Total 8 player games played: ${data.eightPlayerGameData
					.totalGameCount} | Percentage of Fascists in game: <span style="color: red; font-weight: bold">38%</span></p>`
			);

			new Chartist.Pie('#chart-nineplayer-games-winrate', processWinrateData(data.ninePlayerGameData), { width: '400px', height: '400px' });

			$('#chart-nineplayer-games-winrate').after(
				`<p style="text-align: center">Total 9 player games played: ${data.ninePlayerGameData
					.totalGameCount} | Percentage of Fascists in game: <span style="color: red; font-weight: bold">44%</span></p>`
			);

			new Chartist.Pie('#chart-tenplayer-games-winrate', processWinrateData(data.tenPlayerGameData), { width: '400px', height: '400px' });

			$('#chart-tenplayer-games-winrate').after(
				`<p style="text-align: center">Total 10 player games played: ${data.tenPlayerGameData
					.totalGameCount} | Percentage of Fascists in game: <span style="color: red; font-weight: bold">40%</span></p>`
			);
		}
	});
});
