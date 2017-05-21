document.addEventListener('DOMContentLoaded', function(event) {
	const processWinrateData = data => {
		const fWins = Math.round((data.fascistWinCount / data.totalGameCount) * 100000) / 1000,
			lWins = Math.round((data.totalGameCount - data.fascistWinCount) / data.totalGameCount * 100000) / 1000;

		return {
			series: [fWins, lWins],
			labels: [`${fWins.toFixed()}% Fascist wins`, `${lWins.toFixed()}% Liberal wins`]
		};
	};

	$.ajax({
		url: 'data',
		success: function (data) {
			console.log(data);

			new Chartist.Line('#chart-completed-games', {
				labels: data.completedGames.labels,
				series: [data.completedGames.series]
			});

			new Chartist.Pie('#chart-fiveplayer-games-winrate', processWinrateData(data.fivePlayerGameData), {width: '400px', height: '400px'});

			$('#chart-fiveplayer-games-winrate').after(`<p style="text-align: center">Total 5 player games played: ${data.fivePlayerGameData.totalGameCount} | Expected Fascist winrate: ${data.fivePlayerGameData.expectedFascistWinCount}%</p>`);

			new Chartist.Pie('#chart-sixplayer-games-winrate', processWinrateData(data.sixPlayerGameData));

			$('#chart-sixplayer-games-winrate').after(`<p style="text-align: center">Expected Fascist winrate: ${data.sixPlayerGameData.expectedFascistWinCount}%</p>`);

			new Chartist.Pie('#chart-sevenplayer-games-winrate', processWinrateData(data.sevenPlayerGameData));

			$('#chart-sevenplayer-games-winrate').after(`<p style="text-align: center">Expected Fascist winrate: ${data.sevenPlayerGameData.expectedFascistWinCount}%</p>`);

			new Chartist.Pie('#chart-eightplayer-games-winrate', processWinrateData(data.eightPlayerGameData));

			$('#chart-eightplayer-games-winrate').after(`<p style="text-align: center">Expected Fascist winrate: ${data.eightPlayerGameData.expectedFascistWinCount}%</p>`);

			new Chartist.Pie('#chart-nineplayer-games-winrate', processWinrateData(data.ninePlayerGameData));

			$('#chart-nineplayer-games-winrate').after(`<p style="text-align: center">Expected Fascist winrate: ${data.ninePlayerGameData.expectedFascistWinCount}%</p>`);

			new Chartist.Pie('#chart-tenplayer-games-winrate', processWinrateData(data.tenPlayerGameData));

			$('#chart-tenplayer-games-winrate').after(`<p style="text-align: center">Expected Fascist winrate: ${data.tenPlayerGameData.expectedFascistWinCount}%</p>`);
		}
	});
});