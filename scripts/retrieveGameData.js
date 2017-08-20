const mongoose = require('mongoose'),
	Game = require('../models/game'),
	moment = require('moment'),
	_ = require('lodash'),
	fs = require('fs'),
	labels = [],
	data = {},
	allPlayerGameData = (fivePlayerGameData = sixPlayerGameData = sevenPlayerGameData = eightPlayerGameData = ninePlayerGameData = tenPlayerGameData = {
		fascistWinCount: 0,
		totalGameCount: 0
	});

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:15726/secret-hitler-app');

Game.find({})
	.limit(1000)
	.cursor()
	.eachAsync(game => {
		const playerCount = game.losingPlayers.length + game.winningPlayers.length,
			fascistsWon = game.winningTeam === 'fascist';

		switch (playerCount) {
			case 5:
				fivePlayerGameData.totalGameCount++;
				if (fascistsWon) {
					fivePlayerGameData.fascistWinCount++;
				}
				break;
			case 6:
				sixPlayerGameData.totalGameCount++;
				sixPlayerGameData.fascistWinCount = fascistsWon
					? sixPlayerGameData.fascistWinCount + 1
					: sixPlayerGameData.fascistWinCount;
				break;
			case 7:
				sevenPlayerGameData.totalGameCount++;
				sevenPlayerGameData.fascistWinCount = fascistsWon
					? sevenPlayerGameData.fascistWinCount + 1
					: sevenPlayerGameData.fascistWinCount;
				break;
			case 8:
				eightPlayerGameData.totalGameCount++;
				eightPlayerGameData.fascistWinCount = fascistsWon
					? eightPlayerGameData.fascistWinCount + 1
					: eightPlayerGameData.fascistWinCount;
				break;
			case 9:
				ninePlayerGameData.totalGameCount++;
				ninePlayerGameData.fascistWinCount = fascistsWon
					? ninePlayerGameData.fascistWinCount + 1
					: ninePlayerGameData.fascistWinCount;
				break;
			case 10:
				tenPlayerGameData.totalGameCount++;
				tenPlayerGameData.fascistWinCount = fascistsWon
					? tenPlayerGameData.fascistWinCount + 1
					: tenPlayerGameData.fascistWinCount;
				break;
		}
		allPlayerGameData.totalGameCount++;
		allPlayerGameData.fascistWinCount = fascistsWon
			? allPlayerGameData.fascistWinCount + 1
			: allPlayerGameData;
		labels.push(moment(new Date(game.date)).format('l'));
	})
	.then(() => {
		const uLabels = _.uniq(labels),
			series = new Array(uLabels.length).fill(0);

		labels.forEach(date => {
			series[uLabels.indexOf(date)]++;
		});

		data.completedGames = {
			labels: uLabels,
			series
		};
		data.allPlayerGameData = allPlayerGameData;
		data.fivePlayerGameData = fivePlayerGameData;
		data.sixPlayerGameData = sixPlayerGameData;
		data.sevenPlayerGameData = sevenPlayerGameData;
		data.eightPlayerGameData = eightPlayerGameData;
		data.ninePlayerGameData = ninePlayerGameData;
		data.tenPlayerGameData = tenPlayerGameData;

		fs.writeFile('data/data.json', JSON.stringify(data), () => {
			mongoose.connection.close();
		});
	});

// 		getDataOnGameByPlayerCount = (count) => {
// 			const games = count ? data.filter(game => game.losingPlayers.length + game.winningPlayers.length === count) : data,
// 				fascistWinCount = games.filter(game => game.winningTeam === 'fascist').length,
// 				totalGameCount = games.length;

// 			return {
// 				fascistWinCount,
// 				totalGameCount,
// 				expectedFascistWinCount: (() => {
// 					if (games.length) {
// 						const game = games.find(game => game.winningTeam === 'fascist'),
// 							fascistCount = game.winningPlayers.length,
// 							{playerCount} = game;

// 						return (fascistCount / playerCount) * 100;
// 					}
// 				})()
// 			};
// 		};

// 	gamesData = {
// 		completedGames
// 		// ,
// 		// allPlayerGameData: getDataOnGameByPlayerCount(),
// 		// fivePlayerGameData: getDataOnGameByPlayerCount(5),
// 		// sixPlayerGameData: getDataOnGameByPlayerCount(6),
// 		// sevenPlayerGameData: getDataOnGameByPlayerCount(7),
// 		// eightPlayerGameData: getDataOnGameByPlayerCount(8),
// 		// ninePlayerGameData: getDataOnGameByPlayerCount(9),
// 		// tenPlayerGameData: getDataOnGameByPlayerCount(10)
// 	};
