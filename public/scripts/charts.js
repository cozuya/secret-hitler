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

			new Chartist.Pie('#chart-sixplayer-games-winrate', processWinrateData(data.sixPlayerGameData), {width: '400px', height: '400px'});

			$('#chart-sixplayer-games-winrate').after(`<p style="text-align: center">Total 6 player games played: ${data.sixPlayerGameData.totalGameCount} | Expected Fascist winrate: ${Math.round(data.sixPlayerGameData.expectedFascistWinCount)}%</p>`);

			new Chartist.Pie('#chart-sevenplayer-games-winrate', processWinrateData(data.sevenPlayerGameData), {width: '400px', height: '400px'});

			$('#chart-sevenplayer-games-winrate').after(`<p style="text-align: center">Total 7 player games played: ${data.sevenPlayerGameData.totalGameCount} | Expected Fascist winrate: ${Math.round(data.sevenPlayerGameData.expectedFascistWinCount)}%</p>`);

			new Chartist.Pie('#chart-eightplayer-games-winrate', processWinrateData(data.eightPlayerGameData), {width: '400px', height: '400px'});

			$('#chart-eightplayer-games-winrate').after(`<p style="text-align: center">Total 8 player games played: ${data.eightPlayerGameData.totalGameCount} | Expected Fascist winrate: ${data.eightPlayerGameData.expectedFascistWinCount}%</p>`);

			new Chartist.Pie('#chart-nineplayer-games-winrate', processWinrateData(data.ninePlayerGameData), {width: '400px', height: '400px'});

			$('#chart-nineplayer-games-winrate').after(`<p style="text-align: center">Total 9 player games played: ${data.ninePlayerGameData.totalGameCount} | Expected Fascist winrate: ${Math.round(data.ninePlayerGameData.expectedFascistWinCount)}%</p>`);

			new Chartist.Pie('#chart-tenplayer-games-winrate', processWinrateData(data.tenPlayerGameData), {width: '400px', height: '400px'});

			$('#chart-tenplayer-games-winrate').after(`<p style="text-align: center">Total 10 player games played: ${data.tenPlayerGameData.totalGameCount} | Expected Fascist winrate: ${data.tenPlayerGameData.expectedFascistWinCount}%</p>`);
		}
	});
});