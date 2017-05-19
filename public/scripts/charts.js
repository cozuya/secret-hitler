document.addEventListener('DOMContentLoaded', function(event) {
	$.ajax({
		url: 'data',
		success: function (data) {
			console.log(data);
			const completedGameData = {
				labels: data.completedGames.labels,
				series: [data.completedGames.series]
			};

			new Chartist.Line('#chart-completed-games', completedGameData);
		}
	});
});