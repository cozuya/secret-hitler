const mongoose = require('mongoose');
const Game = require('../models/game');
const moment = require('moment');
const _ = require('lodash');
const fs = require('fs');
const labels = [];
const data = {};
const allPlayerGameData = {
	fascistWinCount: 0,
	totalGameCount: 0
};
const fivePlayerGameData = {
	fascistWinCount: 0,
	totalGameCount: 0
};
const sixPlayerGameData = {
	fascistWinCount: 0,
	totalGameCount: 0,
	rebalancedFascistWinCount: 0,
	rebalancedTotalGameCount: 0
};
const sevenPlayerGameData = {
	fascistWinCount: 0,
	totalGameCount: 0,
	rebalancedFascistWinCount: 0,
	rebalancedTotalGameCount: 0
};
const eightPlayerGameData = {
	fascistWinCount: 0,
	totalGameCount: 0
};
const ninePlayerGameData = {
	fascistWinCount: 0,
	totalGameCount: 0,
	rebalancedFascistWinCount: 0,
	rebalancedTotalGameCount: 0
};
const tenPlayerGameData = {
	fascistWinCount: 0,
	totalGameCount: 0
};

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:15726/secret-hitler-app`);

Game.find({})
	.cursor()
	.eachAsync(game => {
		const playerCount = game.losingPlayers.length + game.winningPlayers.length;
		const fascistsWon = game.winningTeam === 'fascist';
		const gameDate = moment(new Date(game.date)).format('l');
		const rebalanced = (game.rebalance6p && playerCount === 6) || (game.rebalance7p && playerCount === 7) || (game.rebalance9p && playerCount === 9);

		if (
			gameDate === '5/13/2017' ||
			gameDate === moment(new Date()).format('l') ||
			(rebalanced &&
				playerCount === 9 &&
				(gameDate === '10/29/2017' || gameDate === '10/30/2017' || gameDate === '10/31/2017' || gameDate === '11/1/2017' || gameDate === '11/2/2017'))
		) {
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
				if (rebalanced) {
					if (fascistsWon) {
						sixPlayerGameData.rebalancedFascistWinCount++;
					}
					sixPlayerGameData.rebalancedTotalGameCount++;
				} else {
					if (fascistsWon) {
						sixPlayerGameData.fascistWinCount++;
					}
					sixPlayerGameData.totalGameCount++;
				}
				break;
			case 7:
				if (rebalanced) {
					if (fascistsWon) {
						sevenPlayerGameData.rebalancedFascistWinCount++;
					}
					sevenPlayerGameData.rebalancedTotalGameCount++;
				} else {
					if (fascistsWon) {
						sevenPlayerGameData.fascistWinCount++;
					}
					sevenPlayerGameData.totalGameCount++;
				}
				break;
			case 8:
				eightPlayerGameData.totalGameCount++;
				if (fascistsWon) {
					eightPlayerGameData.fascistWinCount++;
				}
				break;
			case 9:
				if (rebalanced) {
					if (fascistsWon) {
						ninePlayerGameData.rebalancedFascistWinCount++;
					}
					ninePlayerGameData.rebalancedTotalGameCount++;
				} else {
					if (fascistsWon) {
						ninePlayerGameData.fascistWinCount++;
					}
					ninePlayerGameData.totalGameCount++;
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
		fs.writeFile('/var/www/secret-hitler/data/data.json', JSON.stringify(data), () => {
			mongoose.connection.close();
		});
	});
