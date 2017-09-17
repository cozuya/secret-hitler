const mongoose = require('mongoose'),
	Game = require('../models/game'),
	moment = require('moment'),
	_ = require('lodash'),
	fs = require('fs'),
	labels = [],
	data = {},
	allPlayerGameData = {
		fascistWinCount: 0,
		totalGameCount: 0
	},
	fivePlayerGameData = {
		fascistWinCount: 0,
		totalGameCount: 0
	},
	sixPlayerGameData = {
		fascistWinCount: 0,
		totalGameCount: 0
	},
	sevenPlayerGameData = {
		fascistWinCount: 0,
		totalGameCount: 0
	},
	eightPlayerGameData = {
		fascistWinCount: 0,
		totalGameCount: 0
	},
	ninePlayerGameData = {
		fascistWinCount: 0,
		totalGameCount: 0
	},
	tenPlayerGameData = {
		fascistWinCount: 0,
		totalGameCount: 0
	};

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:${process.env.MONGOPORT}/secret-hitler-app`);

Game.find({})
	.cursor()
	.eachAsync(game => {
		const playerCount = game.losingPlayers.length + game.winningPlayers.length,
			fascistsWon = game.winningTeam === 'fascist',
			gameDate = moment(new Date(game.date)).format('l');

		if (gameDate === '5/13/2017' || gameDate === moment(new Date()).format('l')) {
			return;
		}

		switch (playerCount) {
			case 5:
				fivePlayerGameData.totalGameCount++;
				if (fascistsWon) {
					fivePlayerGameData.fascistWinCount++;
				}
				break;
			case 6:
				sixPlayerGameData.totalGameCount++;
				if (fascistsWon) {
					sixPlayerGameData.fascistWinCount++;
				}
				break;
			case 7:
				sevenPlayerGameData.totalGameCount++;
				if (fascistsWon) {
					sevenPlayerGameData.fascistWinCount++;
				}
				break;
			case 8:
				eightPlayerGameData.totalGameCount++;
				if (fascistsWon) {
					eightPlayerGameData.fascistWinCount++;
				}
				break;
			case 9:
				ninePlayerGameData.totalGameCount++;
				if (fascistsWon) {
					ninePlayerGameData.fascistWinCount++;
				}
				break;
			case 10:
				tenPlayerGameData.totalGameCount++;
				if (fascistsWon) {
					tenPlayerGameData.fascistWinCount++;
				}
				break;
		}
		allPlayerGameData.totalGameCount++;
		if (fascistsWon) {
			allPlayerGameData.fascistWinCount++;
		}
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
